import { NextRequest, NextResponse } from 'next/server';
import path from 'path';
import fs from 'fs';
import { getCurrentUser } from '@/lib/auth';
import { createPersonalCreatorAsset, upsertPersonalCreatorProfile } from '@/lib/db';
import { storage } from '@/lib/storage';
import { personalVoiceService } from '@/lib/providers/personalVoiceService';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const formData = await req.formData();
    const file = formData.get('file') as File | null;
    const type = (formData.get('type') as string) || 'photo'; // 'photo' | 'voice_sample'
    const consentAgreed = formData.get('consent') === 'true';

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 });
    }

    // 1. File Size Validation (Max 25MB)
    if (file.size > 25 * 1024 * 1024) {
      return NextResponse.json({ error: 'File exceeds maximum allowed size of 25MB' }, { status: 400 });
    }

    const fileName = file.name || 'uploaded_file';
    const ext = path.extname(fileName).toLowerCase().replace('.', '') || (type === 'photo' ? 'jpg' : 'mp3');

    // 2. Allowed Format Validation
    const allowedPhotoExts = ['jpg', 'jpeg', 'png', 'webp'];
    const allowedVoiceExts = ['mp3', 'wav', 'm4a', 'ogg', 'webm'];

    if (type === 'photo' && !allowedPhotoExts.includes(ext)) {
      return NextResponse.json({
        error: `Invalid photo format. Supported formats: JPG, JPEG, PNG, WEBP.`
      }, { status: 400 });
    }

    if (type === 'voice_sample' && !allowedVoiceExts.includes(ext)) {
      return NextResponse.json({
        error: `Invalid audio format. Supported formats: MP3, WAV, M4A.`
      }, { status: 400 });
    }

    // 3. Save to Tenant-Isolated Local Storage
    const assetId = `ast_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    const storageKey = `personal-ai/${user.id}/${type === 'photo' ? 'photos' : 'voices'}/${assetId}.${ext}`;
    const destinationPath = storage.getFilePath(storageKey);
    const destDir = path.dirname(destinationPath);
    if (!fs.existsSync(destDir)) {
      fs.mkdirSync(destDir, { recursive: true });
    }

    const arrayBuffer = await file.arrayBuffer();
    const buffer = Buffer.from(arrayBuffer);
    await fs.promises.writeFile(destinationPath, buffer);

    // 4. Voice Specific Validation (Duration & Silence Check)
    let audioMetadata = null;
    let voiceResult = null;
    if (type === 'voice_sample') {
      const val = await personalVoiceService.validateAudioSample(destinationPath);
      if (!val.isValid) {
        // Clean up invalid upload
        try { await fs.promises.unlink(destinationPath); } catch {}
        return NextResponse.json({ error: val.errorMessage || 'Invalid audio sample' }, { status: 400 });
      }

      audioMetadata = { durationSec: val.durationSec, isSilent: val.isSilent };

      // Check voice cloning capability
      voiceResult = await personalVoiceService.setupPersonalVoice({
        userId: user.id,
        sampleFilePath: destinationPath,
        voiceName: `${user.name || 'User'}'s Voice`,
      });
    }

    // 5. Create Asset in Database
    const asset = createPersonalCreatorAsset({
      userId: user.id,
      type,
      storageKey,
      mimeType: file.type || (type === 'photo' ? 'image/jpeg' : 'audio/mpeg'),
      size: file.size,
      metadata: {
        originalName: fileName,
        audioMetadata,
        voiceResult,
      },
    });

    // 6. Update Profile References & Consent
    if (type === 'photo') {
      upsertPersonalCreatorProfile(user.id, {
        avatar_asset_id: asset.id,
        consent_agreed_at: consentAgreed ? new Date().toISOString() : undefined,
      });
    } else if (type === 'voice_sample') {
      upsertPersonalCreatorProfile(user.id, {
        voice_asset_id: asset.id,
        consent_agreed_at: consentAgreed ? new Date().toISOString() : undefined,
      });
    }

    return NextResponse.json({
      success: true,
      asset: {
        id: asset.id,
        type: asset.type,
        url: `/api/personal-ai/assets/${asset.id}`,
        size: asset.size,
        metadata: asset.metadata_json ? JSON.parse(asset.metadata_json) : null,
      },
      voiceResult,
    });
  } catch (err: any) {
    console.error('[API /api/personal-ai/upload] Error:', err);
    return NextResponse.json({ error: err.message || 'File upload failed' }, { status: 500 });
  }
}
