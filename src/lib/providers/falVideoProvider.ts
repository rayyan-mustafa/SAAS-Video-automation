import fs from 'fs';
import path from 'path';
import { getApiKey } from '../db';
import { VideoGenerationProvider, ClipGenerationParams, ClipGenerationResult, AspectRatio } from './video-provider.types';

/**
 * FAL.ai AI Video Generation Provider
 * 
 * Uses FAL.ai's hosted models for real text-to-video generation:
 * - Primary: Wan 2.1 14B (best quality-to-cost, ~$0.05/sec)
 * - Fallback: LTX-Video (ultra-fast, ~$0.02/sec, slightly lower quality)
 * 
 * Each scene's visual_prompt is sent directly to the T2V model,
 * producing actual AI-generated motion video (not stock footage).
 */

// FAL.ai model identifiers
const FAL_MODEL_WAN_2_1 = 'fal-ai/wan/v2.1/text-to-video';
const FAL_MODEL_LTX = 'fal-ai/ltx-video/v0.9.7';
const FAL_MODEL_KLING = 'fal-ai/kling-video/v2.1/standard/text-to-video';

// API base URL
const FAL_API_BASE = 'https://queue.fal.run';

interface FalQueueResponse {
  request_id: string;
  status: string;
  response_url: string;
  status_url: string;
  cancel_url: string;
}

interface FalStatusResponse {
  status: 'IN_QUEUE' | 'IN_PROGRESS' | 'COMPLETED' | 'FAILED';
  response_url?: string;
  error?: string;
  logs?: Array<{ message: string }>;
}

interface FalVideoResult {
  video?: { url: string; content_type?: string; file_name?: string; file_size?: number };
  videos?: Array<{ url: string }>;
  output?: string;
}

export class FalVideoProvider implements VideoGenerationProvider {
  readonly id = 'fal-ai-video';
  readonly name = 'FAL.ai AI Video Generation (Wan 2.1 / LTX-Video)';

  isConfigured(): boolean {
    const key = this.getKey();
    return !!(key && key.trim().length > 10);
  }

  private getKey(): string | null {
    return getApiKey('fal') || getApiKey('fal_key') || process.env.FAL_KEY || process.env.FAL_AI_KEY || null;
  }

  private getApiKey(): string {
    const key = this.getKey();
    if (!key) {
      throw new Error('FAL.ai API key is not configured. Set FAL_KEY environment variable.');
    }
    return key.trim();
  }

  /**
   * Format the visual prompt for optimal AI video generation
   */
  private formatPrompt(params: ClipGenerationParams): string {
    const {
      prompt,
      aspectRatio,
      visualStyle = 'cinematic',
      niche,
      cameraMovement,
      lighting,
      colorStyle,
      continuityNotes,
    } = params;

    const parts = [
      prompt.trim(),
      cameraMovement ? `Camera: ${cameraMovement}` : 'Smooth cinematic camera movement',
      lighting ? `Lighting: ${lighting}` : 'Cinematic atmospheric lighting',
      colorStyle ? `Color: ${colorStyle}` : '',
      `Style: ${visualStyle}, photorealistic, high quality, detailed textures`,
      aspectRatio === '9:16' ? 'Vertical portrait composition' : 'Widescreen landscape composition',
    ];

    return parts.filter(Boolean).join('. ');
  }

  /**
   * Submit a video generation request to FAL.ai queue
   */
  private async submitToQueue(
    apiKey: string,
    model: string,
    prompt: string,
    aspectRatio: AspectRatio,
    durationSec: number
  ): Promise<FalQueueResponse> {
    // Build input based on model
    const input: Record<string, any> = { prompt };

    if (model === FAL_MODEL_WAN_2_1) {
      input.num_frames = Math.min(81, Math.max(33, Math.round(durationSec * 16))); // ~16fps for Wan 2.1
      input.resolution = '720p';
      input.aspect_ratio = aspectRatio === '9:16' ? '9:16' : '16:9';
      input.enable_safety_checker = false;
    } else if (model.includes('ltx')) {
      input.num_frames = Math.min(97, Math.max(33, Math.round(durationSec * 24)));
      input.resolution = '720p';
      input.aspect_ratio = aspectRatio === '9:16' ? '9:16' : '16:9';
    } else if (model.includes('kling')) {
      input.duration = String(Math.min(10, Math.max(5, Math.round(durationSec))));
      input.aspect_ratio = aspectRatio === '9:16' ? '9:16' : '16:9';
    }

    const res = await fetch(`${FAL_API_BASE}/${model}`, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`FAL.ai queue submit failed (HTTP ${res.status}): ${errText.substring(0, 300)}`);
    }

    return await res.json() as FalQueueResponse;
  }

  /**
   * Poll the FAL.ai queue until the video is ready
   */
  private async pollUntilDone(
    apiKey: string,
    statusUrl: string,
    responseUrl: string,
    maxWaitMs: number = 180000 // 3 minutes max
  ): Promise<FalVideoResult> {
    const startTime = Date.now();
    const pollIntervalMs = 3000; // Poll every 3 seconds

    while (Date.now() - startTime < maxWaitMs) {
      await new Promise(resolve => setTimeout(resolve, pollIntervalMs));

      try {
        const statusRes = await fetch(statusUrl, {
          headers: { 'Authorization': `Key ${apiKey}` },
        });

        if (!statusRes.ok) {
          console.warn(`[FalVideoProvider] Status poll returned ${statusRes.status}, retrying...`);
          continue;
        }

        const status = await statusRes.json() as FalStatusResponse;

        if (status.status === 'COMPLETED') {
          // Fetch the actual result
          const resultRes = await fetch(responseUrl, {
            headers: { 'Authorization': `Key ${apiKey}` },
          });
          if (!resultRes.ok) {
            throw new Error(`Failed to fetch FAL.ai result: HTTP ${resultRes.status}`);
          }
          return await resultRes.json() as FalVideoResult;
        }

        if (status.status === 'FAILED') {
          throw new Error(`FAL.ai generation failed: ${status.error || 'Unknown error'}`);
        }

        // Log progress
        if (status.logs && status.logs.length > 0) {
          const lastLog = status.logs[status.logs.length - 1];
          console.log(`[FalVideoProvider] Progress: ${lastLog.message}`);
        } else {
          console.log(`[FalVideoProvider] Status: ${status.status} (${Math.round((Date.now() - startTime) / 1000)}s elapsed)`);
        }
      } catch (pollErr: any) {
        if (pollErr.message.includes('FAL.ai generation failed')) {
          throw pollErr;
        }
        console.warn(`[FalVideoProvider] Poll error: ${pollErr.message}, retrying...`);
      }
    }

    throw new Error(`FAL.ai generation timed out after ${maxWaitMs / 1000}s`);
  }

  /**
   * Download a video from URL and save to disk
   */
  private async downloadVideo(url: string, outputPath: string): Promise<void> {
    const dir = path.dirname(outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }

    const res = await fetch(url, { signal: AbortSignal.timeout(120000) });
    if (!res.ok) {
      throw new Error(`Failed to download video: HTTP ${res.status}`);
    }

    const arrayBuf = await res.arrayBuffer();
    if (arrayBuf.byteLength < 5000) {
      throw new Error(`Downloaded video too small (${arrayBuf.byteLength} bytes), likely invalid`);
    }

    await fs.promises.writeFile(outputPath, Buffer.from(arrayBuf));
    console.log(`[FalVideoProvider] Video saved: ${outputPath} (${(arrayBuf.byteLength / 1024 / 1024).toFixed(2)} MB)`);
  }

  async generateClip(params: ClipGenerationParams): Promise<ClipGenerationResult> {
    const apiKey = this.getApiKey();
    const prompt = this.formatPrompt(params);
    const targetDuration = Math.min(8, Math.max(3, Math.round(params.durationSec || 5)));

    console.log(`[FalVideoProvider] Generating AI video for Scene ${params.sceneIndex} (${targetDuration}s, ${params.aspectRatio})...`);
    console.log(`[FalVideoProvider] Prompt: ${prompt.substring(0, 120)}...`);

    // Try Wan 2.1 first (best quality), then LTX-Video (fastest/cheapest)
    const modelsToTry = [FAL_MODEL_WAN_2_1, FAL_MODEL_LTX];
    let lastError = '';

    for (const model of modelsToTry) {
      try {
        console.log(`[FalVideoProvider] Trying model: ${model}`);

        // Submit to queue
        const queueResponse = await this.submitToQueue(apiKey, model, prompt, params.aspectRatio || '9:16', targetDuration);
        console.log(`[FalVideoProvider] Queued: request_id=${queueResponse.request_id}`);

        // Poll until done
        const result = await this.pollUntilDone(
          apiKey,
          queueResponse.status_url,
          queueResponse.response_url,
          180000 // 3 minute timeout
        );

        // Extract video URL from result
        const videoUrl = result.video?.url || result.videos?.[0]?.url || result.output;
        if (!videoUrl) {
          throw new Error('FAL.ai response did not contain a video URL');
        }

        // Download to output path
        await this.downloadVideo(videoUrl, params.outputPath);

        // Verify file
        const stat = await fs.promises.stat(params.outputPath);
        if (stat.size < 5000) {
          throw new Error(`Generated video file too small: ${stat.size} bytes`);
        }

        console.log(`[FalVideoProvider] ✅ AI video generated successfully with ${model} for Scene ${params.sceneIndex}`);

        return {
          filePath: params.outputPath,
          durationSec: targetDuration,
          providerId: this.id,
          metadata: {
            model,
            aspectRatio: params.aspectRatio,
            prompt,
            requestId: queueResponse.request_id,
          },
        };
      } catch (err: any) {
        lastError = err.message;
        console.warn(`[FalVideoProvider] Model ${model} failed: ${err.message}`);
        // Try next model
      }
    }

    throw new Error(`FAL.ai video generation failed on all models. Last error: ${lastError}`);
  }
}

export const falVideoProvider = new FalVideoProvider();
