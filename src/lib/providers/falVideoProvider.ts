import fs from 'fs';
import path from 'path';
import { getApiKey } from '../db';
import { VideoGenerationProvider, ClipGenerationParams, ClipGenerationResult, AspectRatio } from './video-provider.types';

/**
 * FAL.ai AI Video Generation Provider
 * 
 * Uses FAL.ai's hosted models for real motion text-to-video and image-to-video:
 * - Wan 2.1 14B (Flagship open-weights video model, photorealistic physics)
 * - Kling 2.5 / 3.0 (Cinema quality, dynamic motion, character realism)
 * - LTX-Video (Ultra-fast preview generation)
 * 
 * Supports both Text-to-Video and Image-to-Video workflows.
 */

const FAL_MODEL_WAN_T2V = 'fal-ai/wan/v2.1/text-to-video';
const FAL_MODEL_WAN_I2V = 'fal-ai/wan/v2.1/image-to-video';
const FAL_MODEL_KLING_T2V = 'fal-ai/kling-video/v1.5/pro/text-to-video';
const FAL_MODEL_KLING_I2V = 'fal-ai/kling-video/v1.5/pro/image-to-video';
const FAL_MODEL_LTX = 'fal-ai/ltx-video/v0.9.7';

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
  readonly name = 'FAL.ai AI Video Generation (Wan 2.1 / Kling / LTX-Video)';

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
    return getApiKey('fal') || getApiKey('fal_key') || process.env.FAL_KEY || process.env.FAL_AI_KEY || null;
  }

  private getApiKey(): string {
    const key = this.getKey();
    if (!key) {
      throw new Error('FAL.ai API key is not configured. Set FAL_KEY in environment or admin settings.');
    }
    return key.trim();
  }

  private formatPrompt(params: ClipGenerationParams): string {
    const {
      prompt,
      aspectRatio,
      visualStyle = 'cinematic',
      cameraMovement,
      lighting,
      colorStyle,
      characterRef,
    } = params;

    const parts = [
      prompt.trim(),
      cameraMovement ? `Camera: ${cameraMovement}` : 'Smooth cinematic camera movement',
      lighting ? `Lighting: ${lighting}` : 'Cinematic atmospheric lighting',
      colorStyle ? `Color: ${colorStyle}` : '',
      `Style: ${visualStyle}, photorealistic, high quality, realistic motion physics`,
      aspectRatio === '9:16' ? 'Vertical 9:16 composition' : 'Widescreen 16:9 composition',
    ];

    if (characterRef) {
      parts.push(`Character anchor: ${characterRef.name} (${characterRef.description}), maintain identical visual identity`);
    }

    return parts.filter(Boolean).join('. ');
  }

  private async submitToQueue(
    apiKey: string,
    model: string,
    params: ClipGenerationParams,
    targetDuration: number
  ): Promise<FalQueueResponse> {
    const prompt = this.formatPrompt(params);
    const isI2V = params.generationMode === 'image-to-video' || !!params.referenceImageUrl;

    const input: Record<string, any> = { prompt };

    if (isI2V && params.referenceImageUrl) {
      input.image_url = params.referenceImageUrl;
    }

    if (model.includes('wan')) {
      input.num_frames = Math.min(81, Math.max(33, Math.round(targetDuration * 16)));
      input.resolution = '720p';
      input.aspect_ratio = params.aspectRatio === '9:16' ? '9:16' : '16:9';
      input.enable_safety_checker = false;
    } else if (model.includes('kling')) {
      input.duration = String(Math.min(10, Math.max(5, Math.round(targetDuration))));
      input.aspect_ratio = params.aspectRatio === '9:16' ? '9:16' : '16:9';
    } else if (model.includes('ltx')) {
      input.num_frames = Math.min(97, Math.max(33, Math.round(targetDuration * 24)));
      input.resolution = '720p';
      input.aspect_ratio = params.aspectRatio === '9:16' ? '9:16' : '16:9';
    }

    const res = await fetch(`${FAL_API_BASE}/${model}`, {
      method: 'POST',
      headers: {
        'Authorization': `Key ${apiKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(input),
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`FAL.ai queue submit failed (HTTP ${res.status}): ${errText.substring(0, 300)}`);
    }

    return (await res.json()) as FalQueueResponse;
  }

  private async pollUntilDone(
    apiKey: string,
    statusUrl: string,
    responseUrl: string,
    maxWaitMs: number = 240000 // 4 minutes
  ): Promise<FalVideoResult> {
    const startTime = Date.now();
    const pollIntervalMs = 4000;

    while (Date.now() - startTime < maxWaitMs) {
      await new Promise(resolve => setTimeout(resolve, pollIntervalMs));

      try {
        const statusRes = await fetch(statusUrl, {
          headers: { 'Authorization': `Key ${apiKey}` },
          signal: AbortSignal.timeout(15000),
        });

        if (!statusRes.ok) {
          console.warn(`[FalVideoProvider] Status poll returned HTTP ${statusRes.status}, retrying...`);
          continue;
        }

        const status = (await statusRes.json()) as FalStatusResponse;

        if (status.status === 'COMPLETED') {
          const resultRes = await fetch(responseUrl, {
            headers: { 'Authorization': `Key ${apiKey}` },
            signal: AbortSignal.timeout(15000),
          });
          if (!resultRes.ok) {
            throw new Error(`Failed to fetch FAL.ai result: HTTP ${resultRes.status}`);
          }
          return (await resultRes.json()) as FalVideoResult;
        }

        if (status.status === 'FAILED') {
          throw new Error(`FAL.ai generation failed: ${status.error || 'Unknown error'}`);
        }

        console.log(`[FalVideoProvider] Status: ${status.status} (${Math.round((Date.now() - startTime) / 1000)}s elapsed)`);
      } catch (pollErr: any) {
        if (pollErr.message.includes('FAL.ai generation failed')) throw pollErr;
        console.warn(`[FalVideoProvider] Poll error: ${pollErr.message}`);
      }
    }

    throw new Error(`FAL.ai generation timed out after ${maxWaitMs / 1000}s`);
  }

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
      throw new Error(`Downloaded video too small (${arrayBuf.byteLength} bytes)`);
    }

    await fs.promises.writeFile(outputPath, Buffer.from(arrayBuf));
    console.log(`[FalVideoProvider] Video saved: ${outputPath} (${(arrayBuf.byteLength / 1024 / 1024).toFixed(2)} MB)`);
  }

  async generateClip(params: ClipGenerationParams): Promise<ClipGenerationResult> {
    const apiKey = this.getApiKey();
    const targetDuration = Math.min(8, Math.max(3, Math.round(params.durationSec || 5)));
    const isI2V = params.generationMode === 'image-to-video' || !!params.referenceImageUrl;

    console.log(`[FalVideoProvider] Generating AI video (${isI2V ? 'I2V' : 'T2V'}) for Scene ${params.sceneIndex}...`);

    const modelsToTry = isI2V
      ? [FAL_MODEL_WAN_I2V, FAL_MODEL_KLING_I2V]
      : [FAL_MODEL_WAN_T2V, FAL_MODEL_KLING_T2V, FAL_MODEL_LTX];

    let lastError = '';

    for (const model of modelsToTry) {
      try {
        console.log(`[FalVideoProvider] Trying model: ${model}`);

        const queueResponse = await this.submitToQueue(apiKey, model, params, targetDuration);
        console.log(`[FalVideoProvider] Queued: request_id=${queueResponse.request_id}`);

        const result = await this.pollUntilDone(
          apiKey,
          queueResponse.status_url,
          queueResponse.response_url,
          240000
        );

        const videoUrl = result.video?.url || result.videos?.[0]?.url || result.output;
        if (!videoUrl) {
          throw new Error('FAL.ai response did not contain a valid video URL');
        }

        await this.downloadVideo(videoUrl, params.outputPath);

        return {
          filePath: params.outputPath,
          durationSec: targetDuration,
          providerId: this.id,
          hasNativeAudio: false,
          metadata: {
            model,
            aspectRatio: params.aspectRatio,
            prompt: params.prompt,
            requestId: queueResponse.request_id,
          },
        };
      } catch (err: any) {
        lastError = err.message;
        console.warn(`[FalVideoProvider] Model ${model} failed: ${err.message}`);
      }
    }

    throw new Error(`FAL.ai video generation failed on all models. Last error: ${lastError}`);
  }
}

export const falVideoProvider = new FalVideoProvider();
