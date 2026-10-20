import fs from 'fs';
import path from 'path';
import { getApiKey } from '../db';
import { VideoGenerationProvider, ClipGenerationParams, ClipGenerationResult, AspectRatio } from './video-provider.types';

/**
 * Google Veo 3.1 AI Video Generation Provider
 * 
 * Uses Google's Veo video generation model via the Gemini API:
 * - Primary: veo-3.1-lite-generate-preview ($0.05/sec at 720p)
 * - Fallback: veo-3.1-fast-generate-preview ($0.10/sec at 720p)
 * 
 * Uses the predictLongRunning endpoint which returns an operation
 * that must be polled until completion.
 * 
 * Requires GEMINI_API_KEY with billing enabled for video generation.
 */

const VEO_MODEL_PRIMARY = 'veo-3.1-generate-preview';
const VEO_MODEL_FAST = 'veo-3.1-fast-generate-preview';
const GEMINI_API_BASE = 'https://generativelanguage.googleapis.com/v1beta';

interface VeoOperation {
  name: string;
  done?: boolean;
  error?: { code: number; message: string };
  response?: {
    generateVideoResponse?: {
      generatedSamples?: Array<{
        video?: {
          uri?: string;
          encoding?: string;
          data?: string; // base64 video data
        };
      }>;
    };
    '@type'?: string;
  };
  metadata?: any;
}

export class VeoVideoProvider implements VideoGenerationProvider {
  readonly id = 'google-veo-video';
  readonly name = 'Google Veo 3.1 AI Video Generation';

  isConfigured(): boolean {
    const key = this.getKey();
    return !!(key && key.trim().length > 10);
  }

  private getKey(): string | null {
    return getApiKey('gemini') || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || null;
  }

  private getApiKey(): string {
    const key = this.getKey();
    if (!key) {
      throw new Error('Gemini API key is not configured for Veo video generation.');
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
    } = params;

    const parts = [
      prompt.trim(),
      cameraMovement ? `Camera: ${cameraMovement}` : 'Smooth cinematic camera movement',
      lighting ? `Lighting: ${lighting}` : 'Cinematic volumetric lighting',
      colorStyle ? `Colors: ${colorStyle}` : '',
      `Style: ${visualStyle}, photorealistic, high quality`,
      aspectRatio === '9:16' ? 'Vertical portrait framing for mobile' : 'Widescreen landscape framing',
    ];

    return parts.filter(Boolean).join('. ');
  }

  /**
   * Submit a video generation request using predictLongRunning
   */
  private async submitGeneration(
    apiKey: string,
    model: string,
    prompt: string,
    aspectRatio: AspectRatio,
    durationSec: number
  ): Promise<string> {
    // Map duration to closest supported value
    const supportedDurations = [4, 6, 8];
    const targetDuration = supportedDurations.reduce((prev, curr) =>
      Math.abs(curr - durationSec) < Math.abs(prev - durationSec) ? curr : prev
    );

    // Map aspect ratio
    const veoAspectRatio = aspectRatio === '9:16' ? '9:16' : '16:9';

    const url = `${GEMINI_API_BASE}/models/${model}:predictLongRunning?key=${apiKey}`;

    const body = {
      instances: [
        {
          prompt,
        },
      ],
      parameters: {
        aspectRatio: veoAspectRatio,
        personGeneration: 'allow_all',
        resolution: '720p',
      },
    };

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`Veo API returned HTTP ${res.status}: ${errText.substring(0, 300)}`);
    }

    const operation = await res.json() as VeoOperation;
    if (!operation.name) {
      throw new Error('Veo API did not return an operation name');
    }

    return operation.name;
  }

  /**
   * Poll the long-running operation until complete
   */
  private async pollOperation(
    apiKey: string,
    operationName: string,
    maxWaitMs: number = 180000 // 3 minutes
  ): Promise<VeoOperation> {
    const startTime = Date.now();
    const pollUrl = `${GEMINI_API_BASE}/${operationName}?key=${apiKey}`;

    while (Date.now() - startTime < maxWaitMs) {
      await new Promise(resolve => setTimeout(resolve, 5000)); // Poll every 5s

      try {
        const res = await fetch(pollUrl, {
          headers: {
            'x-goog-api-key': apiKey,
          },
          signal: AbortSignal.timeout(15000),
        });

        if (!res.ok) {
          console.warn(`[VeoVideoProvider] Poll returned ${res.status}, retrying...`);
          continue;
        }

        const operation = await res.json() as VeoOperation;

        if (operation.done) {
          if (operation.error) {
            throw new Error(`Veo generation failed: [${operation.error.code}] ${operation.error.message}`);
          }
          return operation;
        }

        console.log(`[VeoVideoProvider] Operation in progress (${Math.round((Date.now() - startTime) / 1000)}s elapsed)...`);
      } catch (err: any) {
        if (err.message.includes('Veo generation failed')) throw err;
        console.warn(`[VeoVideoProvider] Poll error: ${err.message}`);
      }
    }

    throw new Error(`Veo video generation timed out after ${maxWaitMs / 1000}s`);
  }

  /**
   * Extract video data from a completed operation
   */
  private extractVideoFromOperation(operation: VeoOperation): { data?: string; uri?: string } {
    const response = operation.response;
    if (!response) {
      throw new Error('Veo operation completed but has no response');
    }

    const samples = response.generateVideoResponse?.generatedSamples;
    if (!samples || samples.length === 0) {
      throw new Error('Veo response has no generated samples');
    }

    const video = samples[0].video;
    if (!video) {
      throw new Error('Veo sample has no video data');
    }

    return {
      data: video.data,
      uri: video.uri,
    };
  }

  async generateClip(params: ClipGenerationParams): Promise<ClipGenerationResult> {
    const apiKey = this.getApiKey();
    const prompt = this.formatPrompt(params);
    const targetDuration = Math.min(8, Math.max(4, Math.round(params.durationSec || 5)));

    console.log(`[VeoVideoProvider] Generating AI video for Scene ${params.sceneIndex} (${targetDuration}s, ${params.aspectRatio})...`);

    const modelsToTry = [VEO_MODEL_PRIMARY, VEO_MODEL_FAST];
    let lastError = '';

    for (const model of modelsToTry) {
      try {
        console.log(`[VeoVideoProvider] Trying model: ${model}`);

        // Submit generation
        const operationName = await this.submitGeneration(
          apiKey,
          model,
          prompt,
          params.aspectRatio || '9:16',
          targetDuration
        );
        console.log(`[VeoVideoProvider] Operation started: ${operationName}`);

        // Poll until done
        const completedOp = await this.pollOperation(apiKey, operationName);

        // Extract video
        const videoInfo = this.extractVideoFromOperation(completedOp);

        let videoBuf: Buffer;

        if (videoInfo.data) {
          // Base64-encoded video data
          videoBuf = Buffer.from(videoInfo.data, 'base64');
        } else if (videoInfo.uri) {
          // Download from URI
          const dlRes = await fetch(videoInfo.uri, { signal: AbortSignal.timeout(60000) });
          if (!dlRes.ok) {
            throw new Error(`Failed to download Veo video: HTTP ${dlRes.status}`);
          }
          const arrayBuf = await dlRes.arrayBuffer();
          videoBuf = Buffer.from(arrayBuf);
        } else {
          throw new Error('No video data or URI in Veo response');
        }

        if (videoBuf.length < 5000) {
          throw new Error(`Veo video data too small: ${videoBuf.length} bytes`);
        }

        // Write to disk
        const dir = path.dirname(params.outputPath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        await fs.promises.writeFile(params.outputPath, videoBuf);

        console.log(`[VeoVideoProvider] ✅ AI video saved: ${params.outputPath} (${(videoBuf.length / 1024 / 1024).toFixed(2)} MB)`);

        return {
          filePath: params.outputPath,
          durationSec: targetDuration,
          providerId: this.id,
          metadata: {
            model,
            operationName,
            aspectRatio: params.aspectRatio,
            prompt,
          },
        };
      } catch (err: any) {
        lastError = err.message;
        console.warn(`[VeoVideoProvider] Model ${model} failed: ${err.message}`);

        // If it's a billing/auth error, don't try the next model
        if (err.message.includes('403') || err.message.includes('billing') || err.message.includes('PERMISSION_DENIED')) {
          console.warn(`[VeoVideoProvider] Auth/billing error — skipping remaining models`);
          break;
        }
      }
    }

    throw new Error(`Veo video generation failed. Last error: ${lastError}`);
  }
}

export const veoVideoProvider = new VeoVideoProvider();
