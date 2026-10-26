import fs from 'fs';
import path from 'path';
import { VideoGenerationProvider, ClipGenerationParams, ClipGenerationResult, AspectRatio } from './video-provider.types';
import { EngineError } from '../video/engineErrors';
import { motionStillRenderer, MotionType } from '../video/motionStillRenderer';
import { getTempDir } from '../storage';
import { isCloudflareConfigured, runCloudflareBinary, getCloudflareCredentials } from './cloudflareAiClient';

/**
 * Cloudflare Workers AI Video Generation & Motion Keyframe Provider
 * 
 * Pipeline:
 * 1. Primary: @cf/black-forest-labs/flux-1-schnell (Ultra-fast 4-step high-res generation)
 * 2. Fallback 1: @cf/bytedance/stable-diffusion-xl-lightning (4-step SDXL)
 * 3. Fallback 2: @cf/stabilityai/stable-diffusion-xl-base-1.0 (20-step base SDXL)
 * 4. Fallback 3: @cf/minimax/video-01 (Direct generative video if enabled)
 * 
 * Takes the generated high-fidelity keyframe image and renders a 60fps cinematic
 * Ken Burns dynamic motion MP4 video clip matching the exact durationSec and aspectRatio.
 * 
 * Honest Failure Contract (WP0):
 * If credentials are missing or models fail, throws structured EngineError.
 * Never returns mock/fake URLs or creates dummy files.
 */

const CF_MODEL_FLUX_SCHNELL = '@cf/black-forest-labs/flux-1-schnell';
const CF_MODEL_SDXL_LIGHTNING = '@cf/bytedance/stable-diffusion-xl-lightning';
const CF_MODEL_SDXL_BASE = '@cf/stabilityai/stable-diffusion-xl-base-1.0';
const CF_MODEL_HAILUO = '@cf/minimax/hailuo-2.3';

export class CloudflareVideoProvider implements VideoGenerationProvider {
  readonly id = 'cloudflare-minimax-video';
  readonly name = 'Cloudflare Workers AI (FLUX.1 Schnell & Motion Still)';

  isConfigured(): boolean {
    return isCloudflareConfigured();
  }

  supportsImageToVideo(): boolean {
    return true;
  }

  supportsCharacterReference(): boolean {
    return false;
  }

  supportsNativeAudio(): boolean {
    return false;
  }

  private formatPrompt(params: ClipGenerationParams): string {
    const {
      prompt,
      aspectRatio,
      visualStyle = 'Cinematic High-Contrast',
      cameraMovement,
      lighting,
      colorStyle,
      environment,
    } = params;

    const parts = [
      prompt.trim(),
      environment ? `Setting: ${environment}` : '',
      cameraMovement ? `Camera: ${cameraMovement}` : 'Cinematic directional camera motion',
      lighting ? `Lighting: ${lighting}` : 'Atmospheric volumetric lighting with deep shadows',
      colorStyle ? `Color grade: ${colorStyle}` : '35mm anamorphic film color grading',
      `Style: ${visualStyle}, 8k photorealistic, hyper-detailed, award-winning cinematography`,
      aspectRatio === '9:16' ? 'Vertical 9:16 composition' : 'Widescreen 16:9 composition',
    ];

    return parts.filter(Boolean).join('. ');
  }

  private resolveMotionType(cameraMovement?: string): MotionType {
    if (!cameraMovement) return 'zoom_in';
    const lower = cameraMovement.toLowerCase();
    if (lower.includes('out') || lower.includes('pull') || lower.includes('wide') || lower.includes('crane')) {
      return 'zoom_out';
    }
    if (lower.includes('pan') || lower.includes('track') || lower.includes('glide') || lower.includes('dolly right')) {
      return 'pan_right';
    }
    if (lower.includes('subtle') || lower.includes('pulse') || lower.includes('breathe') || lower.includes('static')) {
      return 'subtle_pulse';
    }
    return 'zoom_in';
  }

  async generateClip(params: ClipGenerationParams): Promise<ClipGenerationResult> {
    if (!this.isConfigured()) {
      throw new EngineError(
        'STAGE_EXECUTION_FAILED',
        'Cloudflare Workers AI credentials missing or unconfigured. Set CLOUDFLARE_ACCOUNT_ID and CLOUDFLARE_API_TOKEN.'
      );
    }

    const prompt = this.formatPrompt(params);
    const targetDuration = Math.max(2, Math.round((params.durationSec || 4) * 10) / 10);
    const aspectRatio: AspectRatio = params.aspectRatio || '9:16';
    const projectId = params.projectId || 'proj_cf_' + Date.now();
    const tempDir = getTempDir(projectId);

    console.log(`[CloudflareVideoProvider] Generating visual clip for Scene ${params.sceneIndex} (${targetDuration}s, ${aspectRatio})...`);

    let keyframeBuffer: Buffer | null = null;
    let selectedModel = '';
    let lastError = '';

    // Model sequence: FLUX.1 Schnell -> SDXL Lightning -> SDXL Base
    const imageModels = [
      { id: CF_MODEL_FLUX_SCHNELL, steps: 4 },
      { id: CF_MODEL_SDXL_LIGHTNING, steps: 4 },
      { id: CF_MODEL_SDXL_BASE, steps: 20 },
    ];

    for (const entry of imageModels) {
      try {
        console.log(`[CloudflareVideoProvider] Generating keyframe via ${entry.id}...`);
        keyframeBuffer = await runCloudflareBinary(
          entry.id,
          {
            prompt,
            num_steps: entry.steps,
            steps: entry.steps,
          },
          { timeoutMs: 60_000 }
        );

        if (keyframeBuffer && keyframeBuffer.length > 5000) {
          selectedModel = entry.id;
          console.log(`[CloudflareVideoProvider] Keyframe rendered successfully (${keyframeBuffer.length} bytes) via ${entry.id}.`);
          break;
        }
      } catch (err: any) {
        lastError = err.message;
        console.warn(`[CloudflareVideoProvider] Model ${entry.id} failed: ${err.message}`);
        if (err.message.includes('429') || err.message.includes('rate')) {
          break;
        }
      }
    }

    // Direct generative video model fallback if image models did not succeed
    if (!keyframeBuffer) {
      const creds = getCloudflareCredentials();
      try {
        console.log(`[CloudflareVideoProvider] Attempting direct video model: ${CF_MODEL_HAILUO}...`);
        const videoRes = await fetch(
          `https://api.cloudflare.com/client/v4/accounts/${creds.accountId}/ai/run/${CF_MODEL_HAILUO}`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${creds.apiToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              prompt,
              num_frames: Math.min(81, Math.max(25, Math.round(targetDuration * 16))),
              aspect_ratio: aspectRatio,
            }),
            signal: AbortSignal.timeout(120_000),
          }
        );

        if (videoRes.ok) {
          const contentType = videoRes.headers.get('content-type') || '';
          if (contentType.includes('video/') || contentType.includes('octet-stream')) {
            const arrayBuf = await videoRes.arrayBuffer();
            const videoBuf = Buffer.from(arrayBuf);
            if (videoBuf.length > 10000) {
              const dir = path.dirname(params.outputPath);
              if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
              await fs.promises.writeFile(params.outputPath, videoBuf);
              return {
                filePath: params.outputPath,
                durationSec: targetDuration,
                providerId: this.id,
                metadata: { model: CF_MODEL_HAILUO, aspectRatio, prompt },
              };
            }
          }
        }
      } catch (hailuoErr: any) {
        lastError = hailuoErr.message;
      }
    }

    // Fail closed if no keyframe or video could be synthesized
    if (!keyframeBuffer || keyframeBuffer.length < 5000) {
      throw new EngineError(
        'NO_VALID_CLIPS',
        `Cloudflare Workers AI visual generation failed across all models. Last error: ${lastError || 'Empty buffer'}`
      );
    }

    // Save keyframe to disk temporarily for FFmpeg motion still compilation
    const rand = Math.random().toString(36).substring(2, 8);
    const tempKeyframePath = path.join(tempDir, `cf_keyframe_${params.sceneIndex}_${rand}.png`);
    await fs.promises.writeFile(tempKeyframePath, keyframeBuffer);

    try {
      const motionType = this.resolveMotionType(params.cameraMovement);
      const motionResult = await motionStillRenderer.renderMotionStill({
        projectId,
        sceneIndex: params.sceneIndex,
        durationSec: targetDuration,
        sourceImagePath: tempKeyframePath,
        promptDescription: prompt,
        motionType,
        aspectRatio: aspectRatio === '16:9' ? '16:9' : '9:16',
      });

      // Ensure target output path has the resulting video
      if (fs.existsSync(motionResult.filePath)) {
        const outDir = path.dirname(params.outputPath);
        if (!fs.existsSync(outDir)) {
          fs.mkdirSync(outDir, { recursive: true });
        }
        if (path.resolve(motionResult.filePath) !== path.resolve(params.outputPath)) {
          await fs.promises.copyFile(motionResult.filePath, params.outputPath);
        }

        console.log(`[CloudflareVideoProvider] ✅ Motion video rendered: ${params.outputPath} (${targetDuration}s, ${selectedModel})`);

        return {
          filePath: params.outputPath,
          durationSec: targetDuration,
          providerId: this.id,
          metadata: {
            model: selectedModel,
            aspectRatio,
            motionType,
            prompt,
          },
        };
      } else {
        throw new Error('Motion still compilation did not produce output video.');
      }
    } finally {
      if (fs.existsSync(tempKeyframePath)) {
        await fs.promises.unlink(tempKeyframePath).catch(() => {});
      }
    }
  }
}

export const cloudflareVideoProvider = new CloudflareVideoProvider();
