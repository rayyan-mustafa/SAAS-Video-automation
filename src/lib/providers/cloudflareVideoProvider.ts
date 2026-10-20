import fs from 'fs';
import path from 'path';
import { getApiKey } from '../db';
import { VideoGenerationProvider, ClipGenerationParams, ClipGenerationResult, AspectRatio } from './video-provider.types';

/**
 * Cloudflare Workers AI Video Generation Provider
 * 
 * Uses Cloudflare's hosted MiniMax Hailuo models for text-to-video generation:
 * - Primary: @cf/minimax/hailuo-2.3 (high quality)
 * - Fallback: @cf/minimax/hailuo-2.3-fast (faster, slightly lower quality)
 * 
 * Leverages the existing Cloudflare account credentials.
 * Free tier: 10,000 Neurons/day (roughly 2-5 video generations).
 */

const CF_MODEL_HAILUO = '@cf/minimax/hailuo-2.3';
const CF_MODEL_HAILUO_FAST = '@cf/minimax/hailuo-2.3-fast';

interface CloudflareAiResponse {
  success: boolean;
  result?: {
    video?: string; // base64 encoded video
    url?: string; // direct URL
    task_id?: string; // for async polling
  };
  errors?: Array<{ code: number; message: string }>;
  messages?: Array<{ message: string }>;
}

interface CloudflareTaskStatus {
  success: boolean;
  result?: {
    status: 'pending' | 'processing' | 'completed' | 'failed';
    video?: string;
    url?: string;
    error?: string;
  };
  errors?: Array<{ code: number; message: string }>;
}

export class CloudflareVideoProvider implements VideoGenerationProvider {
  readonly id = 'cloudflare-minimax-video';
  readonly name = 'Cloudflare Workers AI (MiniMax Hailuo 2.3)';

  isConfigured(): boolean {
    const token = this.getToken();
    const accountId = this.getAccountId();
    return !!(token && accountId && token.length > 10 && accountId.length > 5);
  }

  private getToken(): string | null {
    return getApiKey('cloudflare_api_token') || process.env.CLOUDFLARE_API_TOKEN || null;
  }

  private getAccountId(): string | null {
    return getApiKey('cloudflare_account_id') || process.env.CLOUDFLARE_ACCOUNT_ID || null;
  }

  private formatPrompt(params: ClipGenerationParams): string {
    const {
      prompt,
      aspectRatio,
      visualStyle = 'cinematic',
      cameraMovement,
      lighting,
      colorStyle,
    } = params;

    const parts = [
      prompt.trim(),
      cameraMovement ? `Camera movement: ${cameraMovement}` : 'Smooth cinematic camera motion',
      lighting ? `Lighting: ${lighting}` : 'Cinematic atmospheric lighting',
      colorStyle ? `Color palette: ${colorStyle}` : '',
      `Style: ${visualStyle}, photorealistic, high fidelity, detailed`,
      aspectRatio === '9:16' ? 'Vertical portrait video' : 'Horizontal widescreen video',
    ];

    return parts.filter(Boolean).join('. ');
  }

  /**
   * Call Cloudflare Workers AI to generate video
   */
  private async callCfAi(
    token: string,
    accountId: string,
    model: string,
    prompt: string,
    aspectRatio: AspectRatio,
    durationSec: number
  ): Promise<CloudflareAiResponse> {
    const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`;

    const body: Record<string, any> = {
      prompt,
      num_frames: Math.min(81, Math.max(25, Math.round(durationSec * 16))),
    };

    // Add aspect ratio if the model supports it
    if (aspectRatio === '9:16') {
      body.aspect_ratio = '9:16';
      body.width = 720;
      body.height = 1280;
    } else {
      body.aspect_ratio = '16:9';
      body.width = 1280;
      body.height = 720;
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(180000), // 3 minute timeout for video gen
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`Cloudflare AI returned HTTP ${res.status}: ${errText.substring(0, 300)}`);
    }

    // Check if response is JSON (metadata) or binary (direct video)
    const contentType = res.headers.get('content-type') || '';
    
    if (contentType.includes('video/') || contentType.includes('octet-stream')) {
      // Direct binary video response
      const arrayBuf = await res.arrayBuffer();
      return {
        success: true,
        result: {
          video: Buffer.from(arrayBuf).toString('base64'),
        },
      };
    }

    return await res.json() as CloudflareAiResponse;
  }

  /**
   * Poll for async task completion
   */
  private async pollTask(
    token: string,
    accountId: string,
    taskId: string,
    maxWaitMs: number = 180000
  ): Promise<string> {
    const startTime = Date.now();
    const pollUrl = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/tasks/${taskId}`;

    while (Date.now() - startTime < maxWaitMs) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Poll every 5s

      try {
        const res = await fetch(pollUrl, {
          headers: { 'Authorization': `Bearer ${token}` },
        });

        if (!res.ok) continue;

        const data = await res.json() as CloudflareTaskStatus;

        if (data.result?.status === 'completed') {
          if (data.result.video) return data.result.video;
          if (data.result.url) {
            // Download from URL
            const dlRes = await fetch(data.result.url);
            const buf = await dlRes.arrayBuffer();
            return Buffer.from(buf).toString('base64');
          }
          throw new Error('Completed but no video data');
        }

        if (data.result?.status === 'failed') {
          throw new Error(`Task failed: ${data.result.error || 'Unknown'}`);
        }

        console.log(`[CloudflareVideoProvider] Task ${taskId}: ${data.result?.status || 'processing'} (${Math.round((Date.now() - startTime) / 1000)}s)`);
      } catch (err: any) {
        if (err.message.includes('Task failed')) throw err;
        console.warn(`[CloudflareVideoProvider] Poll error: ${err.message}`);
      }
    }

    throw new Error(`Cloudflare video generation timed out after ${maxWaitMs / 1000}s`);
  }

  async generateClip(params: ClipGenerationParams): Promise<ClipGenerationResult> {
    const token = this.getToken();
    const accountId = this.getAccountId();
    if (!token || !accountId) {
      throw new Error('Cloudflare credentials not configured');
    }

    const prompt = this.formatPrompt(params);
    const targetDuration = Math.min(6, Math.max(3, Math.round(params.durationSec || 5)));

    console.log(`[CloudflareVideoProvider] Generating AI video for Scene ${params.sceneIndex} (${targetDuration}s)...`);

    const modelsToTry = [CF_MODEL_HAILUO, CF_MODEL_HAILUO_FAST];
    let lastError = '';

    for (const model of modelsToTry) {
      try {
        console.log(`[CloudflareVideoProvider] Trying model: ${model}`);

        const response = await this.callCfAi(
          token,
          accountId,
          model,
          prompt,
          params.aspectRatio || '9:16',
          targetDuration
        );

        if (!response.success) {
          const errMsg = response.errors?.map(e => e.message).join(', ') || 'Unknown error';
          throw new Error(`Cloudflare AI error: ${errMsg}`);
        }

        let videoBase64: string | undefined;

        if (response.result?.video) {
          videoBase64 = response.result.video;
        } else if (response.result?.url) {
          // Download from provided URL
          const dlRes = await fetch(response.result.url, { signal: AbortSignal.timeout(60000) });
          if (!dlRes.ok) throw new Error(`Failed to download: HTTP ${dlRes.status}`);
          const buf = await dlRes.arrayBuffer();
          videoBase64 = Buffer.from(buf).toString('base64');
        } else if (response.result?.task_id) {
          // Async task — poll for completion
          videoBase64 = await this.pollTask(token, accountId, response.result.task_id);
        }

        if (!videoBase64) {
          throw new Error('No video data in Cloudflare response');
        }

        // Write video to disk
        const videoBuf = Buffer.from(videoBase64, 'base64');
        if (videoBuf.length < 5000) {
          throw new Error(`Video data too small: ${videoBuf.length} bytes`);
        }

        const dir = path.dirname(params.outputPath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }

        await fs.promises.writeFile(params.outputPath, videoBuf);
        console.log(`[CloudflareVideoProvider] ✅ AI video saved: ${params.outputPath} (${(videoBuf.length / 1024 / 1024).toFixed(2)} MB)`);

        return {
          filePath: params.outputPath,
          durationSec: targetDuration,
          providerId: this.id,
          metadata: {
            model,
            aspectRatio: params.aspectRatio,
            prompt,
          },
        };
      } catch (err: any) {
        lastError = err.message;
        console.warn(`[CloudflareVideoProvider] Model ${model} failed: ${err.message}`);

        // If rate-limited (429), don't try the next model — it'll also be limited
        if (err.message.includes('429') || err.message.includes('rate')) {
          break;
        }
      }
    }

    throw new Error(`Cloudflare video generation failed. Last error: ${lastError}`);
  }
}

export const cloudflareVideoProvider = new CloudflareVideoProvider();
