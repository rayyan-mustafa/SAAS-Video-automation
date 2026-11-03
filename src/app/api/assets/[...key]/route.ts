import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { storage } from '@/lib/storage';
import { getDb } from '@/lib/db';
import { getCurrentUser } from '@/lib/auth';

export async function GET(request: NextRequest, { params }: { params: any }) {
  try {
    const resolvedParams = await Promise.resolve(params);
    const keyParts = resolvedParams?.key;
    const key = Array.isArray(keyParts) ? keyParts.join('/') : String(keyParts || '');

    // Strict Path Traversal Protection (raw, decoded, and resolved boundaries)
    const decodedKey = decodeURIComponent(key);
    if (key.includes('..') || key.includes('\\') || decodedKey.includes('..') || decodedKey.includes('\\')) {
      return new NextResponse('Invalid asset key', { status: 400 });
    }

    const parts = key.split('/');
    const category = parts[0];

    // 1. Authorize Private Voice Samples
    if (category === 'voices') {
      const targetUserId = parts[1];
      const filename = parts[2] || '';
      const voiceIdWithoutExt = path.parse(filename).name;

      const user = await getCurrentUser(request);
      if (!user) {
        return new NextResponse('Authentication required', { status: 401 });
      }
      const isAdmin = user.role === 'ADMIN' || user.role === 'admin';
      if (user.id !== targetUserId && !isAdmin) {
        return new NextResponse('Access denied', { status: 403 });
      }

      // Verify voice sample is not deleted from user account
      try {
        const db = getDb();
        const voiceRow = db.prepare(
          'SELECT id FROM user_voices WHERE user_id = ? AND (voice_id = ? OR id = ?)'
        ).get(targetUserId, voiceIdWithoutExt, voiceIdWithoutExt);
        if (!voiceRow) {
          return new NextResponse('Voice sample not found or deleted', { status: 404 });
        }
      } catch (_) {}
    }

    // 2. Authorize Project Private Assets (video outputs, narration, clips, scripts, subtitles)
    if (['final', 'clips', 'audio', 'scripts', 'subtitles', 'thumbnails'].includes(category)) {
      const candidateProjectId = parts[1];
      if (candidateProjectId) {
        const user = await getCurrentUser(request);
        if (!user) {
          return new NextResponse('Authentication required', { status: 401 });
        }
        const isAdmin = user.role === 'ADMIN' || user.role === 'admin';
        try {
          const db = getDb();
          const project = db.prepare('SELECT user_id FROM content_projects WHERE id = ?').get(candidateProjectId) as any;
          if (project && project.user_id && project.user_id !== user.id && !isAdmin) {
            return new NextResponse('Access denied', { status: 403 });
          }
        } catch (_) {}
      }
    }

    const ext = path.extname(key).toLowerCase();

// Direct R2 redirect moved after local disk check

    let filePath = storage.getFilePath(key);

    // 2. If file is not yet cached locally, check R2 remote storage
    if (!fs.existsSync(filePath) && storage.name === 'r2') {
      try {
        const remoteBuf = await storage.getObject(key);
        if (remoteBuf && remoteBuf.length > 0) {
          const dir = path.dirname(filePath);
          if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
          await fs.promises.writeFile(filePath, remoteBuf);
        }
      } catch (r2Err) {
        console.warn(`[AssetsAPI] R2 fetch error for ${key}:`, r2Err);
      }
    }

    // Resolve real project final video if requested by project ID or legacy path
    if (ext === '.mp4' && !fs.existsSync(filePath)) {
      const parts = key.split('/');
      const candidateProjectId = parts[0] === 'final' ? parts[1] : parts[0];
      if (candidateProjectId) {
        const directFinal = path.join(process.cwd(), 'storage', 'final', candidateProjectId, 'output.mp4');
        if (fs.existsSync(directFinal)) {
          filePath = directFinal;
        } else {
          try {
            const db = getDb();
            const vo = db.prepare('SELECT storage_key FROM video_outputs WHERE project_id = ?').get(candidateProjectId) as any;
            if (vo?.storage_key) {
              const voPath = storage.getFilePath(vo.storage_key);
              if (fs.existsSync(voPath)) {
                filePath = voPath;
              }
            }
          } catch (_) {}
        }
      }
    }

    // Missing assets are never fabricated or replaced by stock/sample media: they fall through to 404.
    // (Previously this region redirected missing MP4s to stock CDN clips, copied public/sample.mp4,
    // synthesized generic placeholder narration and wrote fake subtitles. Removed for engine integrity.)

    if (!fs.existsSync(filePath)) {
      // Only thumbnails may fall back to a neutral gradient image; never video, audio, subtitles or data.
      if ((ext === ".jpg" || ext === ".jpeg" || ext === ".png" || ext === ".webp") && /thumb/i.test(key)) {
        const fallbackImg = path.join(process.cwd(), "public", "sample_thumb.jpg");
        if (fs.existsSync(fallbackImg)) filePath = fallbackImg;
      }
    }

    if (!fs.existsSync(filePath)) {
      return new NextResponse('Asset Not Found', { status: 404 });
    }

    const resolvedPath = path.resolve(filePath);
    const storageRoot = path.resolve(process.cwd(), 'storage');
    const publicRoot = path.resolve(process.cwd(), 'public');
    const tempRoot = path.resolve(process.cwd(), 'temp');
    if (!resolvedPath.startsWith(storageRoot) && !resolvedPath.startsWith(publicRoot) && !resolvedPath.startsWith(tempRoot)) {
      return new NextResponse('Access Denied', { status: 403 });
    }

    const stat = await fs.promises.stat(filePath);
    const fileSize = stat.size;

    let contentType = 'application/octet-stream';
    if (ext === '.mp4') contentType = 'video/mp4';
    else if (ext === '.mp3') contentType = 'audio/mpeg';
    else if (ext === '.wav') contentType = 'audio/wav';
    else if (ext === '.jpg' || ext === '.jpeg') contentType = 'image/jpeg';
    else if (ext === '.png') contentType = 'image/png';
    else if (ext === '.webp') contentType = 'image/webp';
    else if (ext === '.svg') contentType = 'image/svg+xml';
    else if (ext === '.srt') contentType = 'text/plain; charset=utf-8';
    else if (ext === '.vtt') contentType = 'text/vtt; charset=utf-8';
    else if (ext === '.json') contentType = 'application/json';

    // Handle range request for smooth video playback and seeking
    const range = request.headers.get('range');
    if (range && (ext === '.mp4' || ext === '.mp3' || ext === '.wav')) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;

      if (start >= fileSize || end >= fileSize) {
        return new NextResponse(null, {
          status: 416,
          headers: { 'Content-Range': `bytes */${fileSize}` },
        });
      }

      const chunkSize = end - start + 1;
      const fileStream = fs.createReadStream(filePath, { start, end });

      // Convert Node.js readable to Web ReadableStream
      const stream = new ReadableStream({
        start(controller) {
          fileStream.on('data', (chunk) => controller.enqueue(chunk));
          fileStream.on('end', () => controller.close());
          fileStream.on('error', (err) => controller.error(err));
        },
      });

      return new NextResponse(stream as any, {
        status: 206,
        headers: {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': String(chunkSize),
          'Content-Type': contentType,
        },
      });
    }

    // Standard whole file response
    const fileBuffer = await fs.promises.readFile(filePath);
    return new NextResponse(fileBuffer, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Length': String(fileSize),
        'Accept-Ranges': 'bytes',
      },
    });
  } catch (err: any) {
    return new NextResponse(err.message || 'Error reading asset', { status: 500 });
  }
}
