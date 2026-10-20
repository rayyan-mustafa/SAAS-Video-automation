import { NextRequest, NextResponse } from 'next/server';
import fs from 'fs';
import path from 'path';
import { getCurrentUser } from '@/lib/auth';
import { getPersonalCreatorAsset } from '@/lib/db';
import { storage } from '@/lib/storage';

export const dynamic = 'force-dynamic';

export async function GET(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const { id } = params;
    const asset = getPersonalCreatorAsset(id);

    if (!asset) {
      return NextResponse.json({ error: 'Asset not found' }, { status: 404 });
    }

    // Strict Tenant Isolation: User A cannot view User B's photo, voice, or video
    if (asset.user_id !== user.id && user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'You do not have access to this asset' }, { status: 403 });
    }

    // Path traversal check
    const decodedKey = decodeURIComponent(asset.storage_key);
    if (decodedKey.includes('..') || decodedKey.includes('\\')) {
      return NextResponse.json({ error: 'Invalid asset path' }, { status: 400 });
    }

    const filePath = storage.getFilePath(decodedKey);
    if (!fs.existsSync(filePath)) {
      return NextResponse.json({ error: 'Media file does not exist on disk' }, { status: 404 });
    }

    const stat = await fs.promises.stat(filePath);
    const fileSize = stat.size;
    const mimeType = asset.mime_type || 'application/octet-stream';

    // Handle Range Requests (HTTP 206) for video/audio seeking
    const range = req.headers.get('range');
    if (range) {
      const parts = range.replace(/bytes=/, '').split('-');
      const start = parseInt(parts[0], 10);
      const end = parts[1] ? parseInt(parts[1], 10) : fileSize - 1;
      const chunkSize = end - start + 1;

      const fileStream = fs.createReadStream(filePath, { start, end });
      // Convert Node readable stream to Web ReadableStream
      const webStream = new ReadableStream({
        start(controller) {
          fileStream.on('data', (chunk) => controller.enqueue(chunk));
          fileStream.on('end', () => controller.close());
          fileStream.on('error', (err) => controller.error(err));
        },
      });

      return new NextResponse(webStream as any, {
        status: 206,
        headers: {
          'Content-Range': `bytes ${start}-${end}/${fileSize}`,
          'Accept-Ranges': 'bytes',
          'Content-Length': chunkSize.toString(),
          'Content-Type': mimeType,
          'Cache-Control': 'private, no-cache, no-store, must-revalidate',
        },
      });
    }

    // Full Content Response (HTTP 200)
    const fileStream = fs.createReadStream(filePath);
    const webStream = new ReadableStream({
      start(controller) {
        fileStream.on('data', (chunk) => controller.enqueue(chunk));
        fileStream.on('end', () => controller.close());
        fileStream.on('error', (err) => controller.error(err));
      },
    });

    return new NextResponse(webStream as any, {
      status: 200,
      headers: {
        'Content-Length': fileSize.toString(),
        'Content-Type': mimeType,
        'Accept-Ranges': 'bytes',
        'Cache-Control': 'private, no-cache, no-store, must-revalidate',
      },
    });
  } catch (err: any) {
    console.error('[API /api/personal-ai/assets/[id] GET] Error:', err);
    return NextResponse.json({ error: 'Failed to stream media asset' }, { status: 500 });
  }
}
