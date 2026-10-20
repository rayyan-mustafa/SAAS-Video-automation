import path from 'path';
import fs from 'fs';
import { execFile } from 'child_process';
import util from 'util';
import { getFfmpegPath, inspectMedia } from './videoProvider';
import { storage, getTempDir } from '../storage';

const execFileAsync = util.promisify(execFile);

export type AvatarProviderStatus = 'REAL' | 'STANDARD_PRESENTER' | 'UNAVAILABLE';

export interface AvatarGenerationParams {
  projectId: string;
  sceneId: string;
  photoPath: string;
  audioPath?: string;
  durationSec: number;
  aspectRatio: '16:9' | '9:16' | '1:1';
  style?: 'PODCAST' | 'VLOG' | 'EDUCATIONAL' | 'NEWS' | 'STORYTELLING';
  presenterPosition?: 'center' | 'left' | 'right';
  presenterFraming?: 'close-up' | 'medium' | 'wide';
  cameraMotion?: 'static' | 'slow_zoom' | 'push_in' | 'pull_out' | 'cinematic';
}

export interface AvatarGenerationResult {
  videoPath: string;
  storageKey: string;
  url: string;
  durationSec: number;
  providerStatus: AvatarProviderStatus;
  statusLabel: string;
}

export interface AvatarProvider {
  name: string;
  isAvailable(): Promise<boolean>;
  generatePresenterClip(params: AvatarGenerationParams): Promise<AvatarGenerationResult>;
}

export class MultiEngineAvatarProvider implements AvatarProvider {
  name = 'MultiEngineAvatarProvider';

  /**
   * Checks whether external real talking-avatar APIs (D-ID / HeyGen / Replicate) are configured
   */
  async isAvailable(): Promise<boolean> {
    const hasDid = !!process.env.DID_API_KEY;
    const hasHeygen = !!process.env.HEYGEN_API_KEY;
    const hasReplicate = !!process.env.REPLICATE_API_TOKEN;
    return hasDid || hasHeygen || hasReplicate;
  }

  /**
   * Generates presenter clip. If external talking avatar API is configured, dispatches to it.
   * Otherwise, renders high-production Standard Presenter Studio Mode using FFmpeg
   * without faking lip-sync, clearly reporting STANDARD_PRESENTER.
   */
  async generatePresenterClip(params: AvatarGenerationParams): Promise<AvatarGenerationResult> {
    const {
      projectId,
      sceneId,
      photoPath,
      durationSec = 5,
      aspectRatio = '16:9',
      style = 'PODCAST',
      presenterPosition = 'center',
      presenterFraming = 'medium',
      cameraMotion = 'cinematic',
    } = params;

    if (!photoPath || !fs.existsSync(photoPath)) {
      throw new Error(`Photo file does not exist at: ${photoPath}`);
    }

    const tempDir = getTempDir(projectId);
    const outputFileName = `avatar_${sceneId}_${Date.now()}.mp4`;
    const outputPath = path.join(tempDir, outputFileName);
    const storageKey = `projects/${projectId}/avatar/${outputFileName}`;

    // 1. Check for external real talking avatar provider
    const isExternalConfigured = await this.isAvailable();
    if (isExternalConfigured && params.audioPath && fs.existsSync(params.audioPath)) {
      try {
        const externalResult = await this.callExternalTalkingAvatar(params, outputPath);
        if (externalResult) {
          const finalStoragePath = storage.getFilePath(storageKey);
          const finalDir = path.dirname(finalStoragePath);
          if (!fs.existsSync(finalDir)) fs.mkdirSync(finalDir, { recursive: true });
          await fs.promises.copyFile(outputPath, finalStoragePath);

          return {
            videoPath: finalStoragePath,
            storageKey,
            url: storage.getUrl(storageKey),
            durationSec,
            providerStatus: 'REAL',
            statusLabel: 'Real AI Talking Avatar (Lip-Synced)',
          };
        }
      } catch (err: any) {
        console.warn('[MultiEngineAvatarProvider] External avatar generation failed, falling back to Standard Presenter:', err.message);
      }
    }

    // 2. Standard Presenter Studio Mode (Honest high-quality presenter framing)
    await this.renderStandardPresenterStudioClip({
      photoPath,
      outputPath,
      durationSec,
      aspectRatio,
      style,
      presenterPosition,
      presenterFraming,
      cameraMotion,
    });

    const finalStoragePath = storage.getFilePath(storageKey);
    const finalDir = path.dirname(finalStoragePath);
    if (!fs.existsSync(finalDir)) fs.mkdirSync(finalDir, { recursive: true });
    await fs.promises.copyFile(outputPath, finalStoragePath);

    return {
      videoPath: finalStoragePath,
      storageKey,
      url: storage.getUrl(storageKey),
      durationSec,
      providerStatus: isExternalConfigured ? 'UNAVAILABLE' : 'STANDARD_PRESENTER',
      statusLabel: isExternalConfigured
        ? 'Avatar generation unavailable — rendered in Standard Presenter Mode'
        : 'Standard Presenter Studio Mode (No Lip-Sync Fake)',
    };
  }

  /**
   * Render Standard Presenter Studio Clip with FFmpeg
   */
  private async renderStandardPresenterStudioClip(options: {
    photoPath: string;
    outputPath: string;
    durationSec: number;
    aspectRatio: '16:9' | '9:16' | '1:1';
    style: string;
    presenterPosition: string;
    presenterFraming: string;
    cameraMotion: string;
  }): Promise<void> {
    const ffmpegPath = getFfmpegPath();
    const { photoPath, outputPath, durationSec, aspectRatio, cameraMotion, style } = options;

    let targetWidth = 1920;
    let targetHeight = 1080;
    if (aspectRatio === '9:16') {
      targetWidth = 1080;
      targetHeight = 1920;
    } else if (aspectRatio === '1:1') {
      targetWidth = 1080;
      targetHeight = 1080;
    }

    const totalFrames = Math.max(30, Math.round(durationSec * 30));

    // Dynamic zoompan motion expression based on camera motion preference
    let zoomExpr = `min(zoom+0.0006,1.15)`;
    let xExpr = `(iw-iw/zoom)/2`;
    let yExpr = `(ih-ih/zoom)/2`;

    if (cameraMotion === 'push_in') {
      zoomExpr = `min(zoom+0.0008,1.20)`;
    } else if (cameraMotion === 'pull_out') {
      zoomExpr = `if(lte(zoom,1.0),1.18,max(1.001,zoom-0.0007))`;
    } else if (cameraMotion === 'cinematic') {
      zoomExpr = `min(zoom+0.0005,1.12)`;
      xExpr = `if(lte(on,1),(iw-iw/zoom)/2,max(0,min(iw-iw/zoom,x+0.35)))`;
    } else if (cameraMotion === 'static') {
      zoomExpr = `1.0`;
      xExpr = `(iw-iw/zoom)/2`;
      yExpr = `(ih-ih/zoom)/2`;
    }

    // Color grading based on visual style
    let gradingFilter = `eq=contrast=1.06:brightness=0.01:saturation=1.06`;
    if (style === 'PODCAST') {
      gradingFilter = `eq=contrast=1.08:brightness=-0.01:saturation=1.05,vignette=PI/6`;
    } else if (style === 'VLOG') {
      gradingFilter = `eq=contrast=1.04:brightness=0.03:saturation=1.12`;
    } else if (style === 'NEWS') {
      gradingFilter = `eq=contrast=1.08:brightness=0.01:saturation=1.02`;
    } else if (style === 'STORYTELLING') {
      gradingFilter = `eq=contrast=1.12:brightness=-0.02:saturation=0.96,vignette=PI/4`;
    }

    const filterComplex = [
      `scale=${targetWidth * 2}:${targetHeight * 2}:force_original_aspect_ratio=increase,crop=${targetWidth * 2}:${targetHeight * 2}`,
      `zoompan=z='${zoomExpr}':x='${xExpr}':y='${yExpr}':d=${totalFrames}:s=${targetWidth}x${targetHeight}:fps=30`,
      `${gradingFilter}`,
      `format=yuv420p`
    ].join(',');

    const args = [
      '-y',
      '-loop', '1',
      '-i', photoPath,
      '-t', durationSec.toFixed(2),
      '-vf', filterComplex,
      '-c:v', 'libx264',
      '-preset', 'veryfast',
      '-crf', '20',
      '-pix_fmt', 'yuv420p',
      '-r', '30',
      outputPath,
    ];

    try {
      await execFileAsync(ffmpegPath, args);
    } catch (err: any) {
      // Simple fallback without complex filters if error
      const simpleFilter = `scale=${targetWidth}:${targetHeight}:force_original_aspect_ratio=increase,crop=${targetWidth}:${targetHeight},format=yuv420p`;
      const fallbackArgs = [
        '-y',
        '-loop', '1',
        '-i', photoPath,
        '-t', durationSec.toFixed(2),
        '-vf', simpleFilter,
        '-c:v', 'libx264',
        '-preset', 'ultrafast',
        '-pix_fmt', 'yuv420p',
        '-r', '30',
        outputPath,
      ];
      await execFileAsync(ffmpegPath, fallbackArgs);
    }
  }

  /**
   * External talking avatar API dispatcher (D-ID / HeyGen / Replicate)
   */
  private async callExternalTalkingAvatar(
    params: AvatarGenerationParams,
    outputPath: string
  ): Promise<boolean> {
    const didKey = process.env.DID_API_KEY;
    if (didKey) {
      // D-ID API implementation stub
      return false; // Safely fall back if live webhook/polling not complete
    }
    return false;
  }
}

export const avatarProvider = new MultiEngineAvatarProvider();
