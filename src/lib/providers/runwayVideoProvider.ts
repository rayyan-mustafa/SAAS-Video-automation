import fs from 'fs';
import path from 'path';
import { getApiKey } from '../db';
import { VideoGenerationProvider, ClipGenerationParams, ClipGenerationResult, AspectRatio } from './video-provider.types';

/**
 * Runway Developer API Video Generation Provider
 * 
 * Supports:
 * - Gen-4.5 (flagship text-to-video & image-to-video)
 * - Gen-4 Turbo (speed/cost optimized)
 * - Image-to-Video with character conditioning (`promptImage`)
 * - Native 9:16 and 16:9 aspect ratios
 * 
 * API: https://docs.dev.runwayml.com/
 */

const RUNWAY_API_BASE = 'https://api.dev.runwayml.com/v1';
const RUNWAY_VERSION = '2024-11-06';
const RUNWAY_MODEL = 'gen4.5';

interface RunwayTaskResponse {
  id: string;
  status: 'PENDING' | 'THROTTLED' | 'RUNNING' | 'SUCCEEDED' | 'FAILED' | 'CANCELLED';
  createdAt?: string;
  output?: string[]; // Array of MP4 URLs
  failure?: string;
  failureCode?: string;
}

export class RunwayVideoProvider implements VideoGenerationProvider {
  readonly id = 'runway-video';
  readonly name = 'Runway Developer API (Gen-4.5 / Gen-4 Turbo)';

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
    return false;
  }

  private getKey(): string | null {
    return getApiKey('runway') || getApiKey('runway_api_key') || process.env.RUNWAY_API_KEY || process.env.RUNWAY_API_SECRET || null;
  }

  private getApiKey(): string {
    const key = this.getKey();
    if (!key) {
      throw new Error('Runway API key is not configured. Set RUNWAY_API_KEY in environment or admin settings.');
    }
    return key.trim();
  }

  private mapRatio(aspectRatio: AspectRatio): string {
    if (aspectRatio === '9:16') return '720:1280';
    if (aspectRatio === '1:1') return '1024:1024';
    return '1280:720'; // 16:9
  }

  /**
   * Submit text-to-video or image-to-video task to Runway
   */
  private async submitTask(
    apiKey: string,
    params: ClipGenerationParams
  ): Promise<RunwayTaskResponse> {
    const isI2V = params.generationMode === 'image-to-video' || !!params.referenceImageUrl;
    const endpoint = isI2V ? `${RUNWAY_API_BASE}/image_to_video` : `${RUNWAY_API_BASE}/text_to_video`;

    const ratio = this.mapRatio(params.aspectRatio || '9:16');
    const duration = Math.min(10, Math.max(5, Math.round(params.durationSec || 5)));

    const body: Record<string, any> = {
      model: RUNWAY_MODEL,
      promptText: params.prompt,
      ratio,
      duration: duration <= 5 ? 5 : 10,
    };

    if (isI2V && params.referenceImageUrl) {
      body.promptImage = params.referenceImageUrl;
    }

    const res = await fetch(endpoint, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'X-Runway-Version': RUNWAY_VERSION,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`Runway API returned HTTP ${res.status}: ${errText.substring(0, 300)}`);
    }

    return (await res.json()) as RunwayTaskResponse;
  }

  /**
   * Poll Runway task until completion
   */
  private async pollTask(
    apiKey: string,
    taskId: string,
    maxWaitMs: number = 240000 // 4 minutes max
  ): Promise<string> {
    const startTime = Date.now();
    const pollIntervalMs = 5000;

    while (Date.now() - startTime < maxWaitMs) {
      await new Promise(resolve => setTimeout(resolve, pollIntervalMs));

      try {
        const res = await fetch(`${RUNWAY_API_BASE}/tasks/${taskId}`, {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'X-Runway-Version': RUNWAY_VERSION,
          },
          signal: AbortSignal.timeout(15000),
        });

        if (!res.ok) {
          console.warn(`[Runway] Status poll returned HTTP ${res.status}, retrying...`);
          continue;
        }

        const task = (await res.json()) as RunwayTaskResponse;

        if (task.status === 'SUCCEEDED') {
          if (task.output && task.output.length > 0) {
            return task.output[0];
          }
          throw new Error('Runway task succeeded but returned no output URLs');
        }

        if (task.status === 'FAILED' || task.status === 'CANCELLED') {
          throw new Error(`Runway generation failed: ${task.failure || task.failureCode || 'Unknown error'}`);
        }

        console.log(`[Runway] Task ${taskId}: ${task.status} (${Math.round((Date.now() - startTime) / 1000)}s elapsed)...`);
      } catch (err: any) {
        if (err.message.includes('Runway generation failed')) throw err;
        console.warn(`[Runway] Poll error: ${err.message}`);
      }
    }

    throw new Error(`Runway video generation timed out after ${maxWaitMs / 1000}s`);
  }

  /**
   * Download MP4 video to target file path
   */
  private async downloadVideo(url: string, outputPath: string): Promise<void> {
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const res = await fetch(url, { signal: AbortSignal.timeout(120000) });
    if (!res.ok) {
      throw new Error(`Failed to download Runway video: HTTP ${res.status}`);
    }

    const arrayBuf = await res.arrayBuffer();
    if (arrayBuf.byteLength < 5000) {
      throw new Error(`Downloaded video too small (${arrayBuf.byteLength} bytes)`);
    }

    await fs.promises.writeFile(outputPath, Buffer.from(arrayBuf));
    console.log(`[Runway] Video saved: ${outputPath} (${(arrayBuf.byteLength / 1024 / 1024).toFixed(2)} MB)`);
  }

  async generateClip(params: ClipGenerationParams): Promise<ClipGenerationResult> {
    const apiKey = this.getApiKey();
    const duration = Math.min(10, Math.max(5, Math.round(params.durationSec || 5)));

    console.log(`[Runway] Submitting ${params.generationMode || 'text-to-video'} for Scene ${params.sceneIndex}...`);
    const task = await this.submitTask(apiKey, params);
    console.log(`[Runway] Task queued: id=${task.id}`);

    const videoUrl = await this.pollTask(apiKey, task.id);
    await this.downloadVideo(videoUrl, params.outputPath);

    return {
      filePath: params.outputPath,
      durationSec: duration,
      providerId: this.id,
      hasNativeAudio: false,
      metadata: {
        model: RUNWAY_MODEL,
        taskId: task.id,
        aspectRatio: params.aspectRatio,
        prompt: params.prompt,
      },
    };
  }
}

export const runwayVideoProvider = new RunwayVideoProvider();
