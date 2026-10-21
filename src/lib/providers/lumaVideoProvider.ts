import fs from 'fs';
import path from 'path';
import { getApiKey } from '../db';
import { VideoGenerationProvider, ClipGenerationParams, ClipGenerationResult } from './video-provider.types';

/**
 * Luma Dream Machine API Video Generation Provider
 * 
 * Supports:
 * - Ray 2 & Ray 2 Flash
 * - Text-to-Video & Image-to-Video (via keyframes.frame0)
 * - 9:16 portrait and 16:9 landscape
 * - Dedicated sound effects & audio endpoint
 * 
 * API: https://docs.lumalabs.ai/docs/api
 */

const LUMA_API_BASE = 'https://api.lumalabs.ai/dream-machine/v1';
const LUMA_MODEL = 'ray-2';

interface LumaGenerationResponse {
  id: string;
  state: 'queued' | 'dreaming' | 'completed' | 'failed';
  failure_reason?: string;
  assets?: {
    video?: string; // MP4 URL
    image?: string;
  };
  created_at?: string;
}

export class LumaVideoProvider implements VideoGenerationProvider {
  readonly id = 'luma-video';
  readonly name = 'Luma Dream Machine (Ray 2)';

  isConfigured(): boolean {
    const key = this.getKey();
    return !!(key && key.trim().length > 10);
  }

  supportsImageToVideo(): boolean {
    return true;
  }

  supportsCharacterReference(): boolean {
    return true;
  }

  supportsNativeAudio(): boolean {
    return true;
  }

  private getKey(): string | null {
    return getApiKey('luma') || getApiKey('luma_api_key') || process.env.LUMA_API_KEY || process.env.LUMAAI_API_KEY || null;
  }

  private getApiKey(): string {
    const key = this.getKey();
    if (!key) {
      throw new Error('Luma Dream Machine API key is not configured. Set LUMA_API_KEY.');
    }
    return key.trim();
  }

  /**
   * Submit generation to Luma API
   */
  private async submitGeneration(
    apiKey: string,
    params: ClipGenerationParams
  ): Promise<LumaGenerationResponse> {
    const isI2V = params.generationMode === 'image-to-video' || !!params.referenceImageUrl;
    const duration = params.durationSec && params.durationSec > 6 ? '9s' : '5s';

    const body: Record<string, any> = {
      prompt: params.prompt,
      model: LUMA_MODEL,
      aspect_ratio: params.aspectRatio === '9:16' ? '9:16' : '16:9',
      duration,
    };

    if (isI2V && params.referenceImageUrl) {
      body.keyframes = {
        frame0: {
          type: 'image',
          url: params.referenceImageUrl,
        },
      };
    }

    const res = await fetch(`${LUMA_API_BASE}/generations`, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`Luma API returned HTTP ${res.status}: ${errText.substring(0, 300)}`);
    }

    return (await res.json()) as LumaGenerationResponse;
  }

  /**
   * Poll Luma generation until completed
   */
  private async pollGeneration(
    apiKey: string,
    id: string,
    maxWaitMs: number = 240000 // 4 minutes
  ): Promise<string> {
    const startTime = Date.now();
    const pollIntervalMs = 5000;

    while (Date.now() - startTime < maxWaitMs) {
      await new Promise(resolve => setTimeout(resolve, pollIntervalMs));

      try {
        const res = await fetch(`${LUMA_API_BASE}/generations/${id}`, {
          headers: { 'Authorization': `Bearer ${apiKey}` },
          signal: AbortSignal.timeout(15000),
        });

        if (!res.ok) {
          console.warn(`[Luma] Poll status returned HTTP ${res.status}, retrying...`);
          continue;
        }

        const gen = (await res.json()) as LumaGenerationResponse;

        if (gen.state === 'completed') {
          if (gen.assets?.video) {
            return gen.assets.video;
          }
          throw new Error('Luma generation completed but assets.video is missing');
        }

        if (gen.state === 'failed') {
          throw new Error(`Luma generation failed: ${gen.failure_reason || 'Unknown reason'}`);
        }

        console.log(`[Luma] Task ${id}: ${gen.state} (${Math.round((Date.now() - startTime) / 1000)}s elapsed)...`);
      } catch (err: any) {
        if (err.message.includes('Luma generation failed')) throw err;
        console.warn(`[Luma] Poll error: ${err.message}`);
      }
    }

    throw new Error(`Luma generation timed out after ${maxWaitMs / 1000}s`);
  }

  /**
   * Download video from URL to disk
   */
  private async downloadVideo(url: string, outputPath: string): Promise<void> {
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const res = await fetch(url, { signal: AbortSignal.timeout(120000) });
    if (!res.ok) {
      throw new Error(`Failed to download Luma video: HTTP ${res.status}`);
    }

    const arrayBuf = await res.arrayBuffer();
    if (arrayBuf.byteLength < 5000) {
      throw new Error(`Downloaded video too small (${arrayBuf.byteLength} bytes)`);
    }

    await fs.promises.writeFile(outputPath, Buffer.from(arrayBuf));
    console.log(`[Luma] Video saved: ${outputPath} (${(arrayBuf.byteLength / 1024 / 1024).toFixed(2)} MB)`);
  }

  async generateClip(params: ClipGenerationParams): Promise<ClipGenerationResult> {
    const apiKey = this.getApiKey();
    const duration = params.durationSec && params.durationSec > 6 ? 9 : 5;

    console.log(`[Luma] Submitting ${params.generationMode || 'text-to-video'} for Scene ${params.sceneIndex}...`);
    const gen = await this.submitGeneration(apiKey, params);
    console.log(`[Luma] Generation started: id=${gen.id}`);

    const videoUrl = await this.pollGeneration(apiKey, gen.id);
    await this.downloadVideo(videoUrl, params.outputPath);

    return {
      filePath: params.outputPath,
      durationSec: duration,
      providerId: this.id,
      hasNativeAudio: false,
      metadata: {
        model: LUMA_MODEL,
        generationId: gen.id,
        aspectRatio: params.aspectRatio,
        prompt: params.prompt,
      },
    };
  }
}

export const lumaVideoProvider = new LumaVideoProvider();
