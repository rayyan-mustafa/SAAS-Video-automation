import fs from 'fs';
import path from 'path';
import { getApiKey } from '../db';
import { VideoGenerationProvider, ClipGenerationParams, ClipGenerationResult, AspectRatio } from './video-provider.types';

/**
 * Google Veo 3.1 AI Video Generation Provider
 * 
 * Uses Google's state-of-the-art Veo model via the Gemini API:
 * - Primary: veo-3.1-generate-preview (Flagship, cinematic quality, native audio)
 * - Fast: veo-3.1-fast-generate-preview (Ultra-fast, lower latency)
 * - Lite: veo-3.1-lite-generate-preview (Budget/high-throughput)
 * 
 * Features:
 * - Real Text-to-Video and Image-to-Video
 * - Character reference conditioning (referenceImages)
 * - Native synchronized sound effects and dialogue
 * - 9:16 vertical and 16:9 widescreen
 * 
 * Requires GEMINI_API_KEY with video generation enabled.
 */

const VEO_MODEL_PRIMARY = 'veo-3.1-generate-preview';
const VEO_MODEL_FAST = 'veo-3.1-fast-generate-preview';
const VEO_MODEL_LITE = 'veo-3.1-lite-generate-preview';
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
  readonly name = 'Google Veo 3.1 AI Video Generation (Native Audio & Character Consistency)';

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
      characterRef,
    } = params;

    const parts = [
      prompt.trim(),
      cameraMovement ? `Camera: ${cameraMovement}` : 'Smooth cinematic camera movement',
      lighting ? `Lighting: ${lighting}` : 'Cinematic volumetric lighting',
      colorStyle ? `Colors: ${colorStyle}` : '',
      `Style: ${visualStyle}, photorealistic, high visual fidelity`,
      aspectRatio === '9:16' ? 'Vertical portrait framing for mobile YouTube Shorts' : 'Widescreen landscape framing for YouTube 4K',
    ];

    if (characterRef) {
      parts.push(`Character: Keep character "${characterRef.name}" visually consistent with description: ${characterRef.description}`);
    }

    return parts.filter(Boolean).join('. ');
  }

  /**
   * Submit a video generation request using predictLongRunning
   */
  private async submitGeneration(
    apiKey: string,
    model: string,
    params: ClipGenerationParams
  ): Promise<string> {
    const supportedDurations = [4, 6, 8];
    const targetDuration = supportedDurations.reduce((prev, curr) =>
      Math.abs(curr - (params.durationSec || 5)) < Math.abs(prev - (params.durationSec || 5)) ? curr : prev
    );

    const veoAspectRatio = params.aspectRatio === '9:16' ? '9:16' : '16:9';
    const prompt = this.formatPrompt(params);

    const url = `${GEMINI_API_BASE}/models/${model}:predictLongRunning?key=${apiKey}`;

    const instance: Record<string, any> = { prompt };

    // Support Image-to-Video via reference image URI or base64
    if (params.referenceImageUrl) {
      instance.image = {
        imageUri: params.referenceImageUrl,
      };
    }

    const parameters: Record<string, any> = {
      aspectRatio: veoAspectRatio,
      personGeneration: 'allow_all',
      resolution: '720p',
      durationSeconds: targetDuration,
    };

    // Support Character Reference images
    if (params.characterRef?.referenceImageUrl) {
      parameters.referenceImages = [
        {
          imageUri: params.characterRef.referenceImageUrl,
          referenceType: 'REFERENCE_TYPE_SUBJECT',
        },
      ];
    }

    const res = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-goog-api-key': apiKey,
      },
      body: JSON.stringify({
        instances: [instance],
        parameters,
      }),
      signal: AbortSignal.timeout(30000),
    });

    if (!res.ok) {
      const errText = await res.text().catch(() => '');
      throw new Error(`Veo API returned HTTP ${res.status}: ${errText.substring(0, 300)}`);
    }

    const operation = (await res.json()) as VeoOperation;
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
    maxWaitMs: number = 240000 // 4 minutes
  ): Promise<VeoOperation> {
    const startTime = Date.now();
    const pollUrl = `${GEMINI_API_BASE}/${operationName}?key=${apiKey}`;

    while (Date.now() - startTime < maxWaitMs) {
      await new Promise(resolve => setTimeout(resolve, 5000));

      try {
        const res = await fetch(pollUrl, {
          headers: { 'x-goog-api-key': apiKey },
          signal: AbortSignal.timeout(15000),
        });

        if (!res.ok) {
          console.warn(`[VeoVideoProvider] Poll returned HTTP ${res.status}, retrying...`);
          continue;
        }

        const operation = (await res.json()) as VeoOperation;

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
   * Extract video data from completed operation
   */
  private extractVideoFromOperation(operation: VeoOperation): { data?: string; uri?: string } {
    const response = operation.response;
    if (!response) {
      throw new Error('Veo operation completed but has no response payload');
    }

    const samples = response.generateVideoResponse?.generatedSamples;
    if (!samples || samples.length === 0) {
      throw new Error('Veo response has no generated video samples');
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
    const duration = Math.min(8, Math.max(4, Math.round(params.durationSec || 5)));

    console.log(`[VeoVideoProvider] Generating real AI video for Scene ${params.sceneIndex} (${duration}s, ${params.aspectRatio})...`);

    const modelsToTry = [VEO_MODEL_PRIMARY, VEO_MODEL_FAST, VEO_MODEL_LITE];
    let lastError = '';

    for (const model of modelsToTry) {
      try {
        console.log(`[VeoVideoProvider] Trying model: ${model}`);

        const operationName = await this.submitGeneration(apiKey, model, params);
        console.log(`[VeoVideoProvider] Operation started: ${operationName}`);

        const completedOp = await this.pollOperation(apiKey, operationName);
        const videoInfo = this.extractVideoFromOperation(completedOp);

        let videoBuf: Buffer;
        if (videoInfo.data) {
          videoBuf = Buffer.from(videoInfo.data, 'base64');
        } else if (videoInfo.uri) {
          const dlRes = await fetch(videoInfo.uri, { signal: AbortSignal.timeout(60000) });
          if (!dlRes.ok) {
            throw new Error(`Failed to download Veo video from URI: HTTP ${dlRes.status}`);
          }
          const arrayBuf = await dlRes.arrayBuffer();
          videoBuf = Buffer.from(arrayBuf);
        } else {
          throw new Error('No video data or URI in Veo response');
        }

        if (videoBuf.length < 5000) {
          throw new Error(`Veo video data too small (${videoBuf.length} bytes)`);
        }

        const dir = path.dirname(params.outputPath);
        if (!fs.existsSync(dir)) {
          fs.mkdirSync(dir, { recursive: true });
        }
        await fs.promises.writeFile(params.outputPath, videoBuf);

        console.log(`[VeoVideoProvider] ✅ AI video saved: ${params.outputPath} (${(videoBuf.length / 1024 / 1024).toFixed(2)} MB)`);

        return {
          filePath: params.outputPath,
          durationSec: duration,
          providerId: this.id,
          hasNativeAudio: true, // Veo 3.1 includes native audio
          metadata: {
            model,
            operationName,
            aspectRatio: params.aspectRatio,
            prompt: params.prompt,
          },
        };
      } catch (err: any) {
        lastError = err.message;
        console.warn(`[VeoVideoProvider] Model ${model} failed: ${err.message}`);

        if (err.message.includes('403') || err.message.includes('billing') || err.message.includes('PERMISSION_DENIED')) {
          console.warn(`[VeoVideoProvider] Billing/permission error on model ${model}`);
          break;
        }
      }
    }

    throw new Error(`Veo video generation failed on all models. Last error: ${lastError}`);
  }
}

export const veoVideoProvider = new VeoVideoProvider();
