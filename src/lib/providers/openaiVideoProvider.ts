import fs from 'fs';
import path from 'path';
import { getApiKey } from '../db';
import { VideoGenerationProvider, ClipGenerationParams, ClipGenerationResult } from './video-provider.types';

export class OpenAIVideoProvider implements VideoGenerationProvider {
  readonly id = 'openai-video';
  readonly name = 'OpenAI Video Generation (Sora Engine)';

  isConfigured(): boolean {
    const key = getApiKey('openai') || process.env.OPENAI_API_KEY;
    return !!(key && key.trim().length > 10);
  }

  private getApiKey(): string {
    const key = getApiKey('openai') || process.env.OPENAI_API_KEY;
    if (!key) {
      throw new Error('OpenAI API key is not configured.');
    }
    return key.trim();
  }

  private formatPrompt(params: ClipGenerationParams): string {
    const {
      prompt,
      aspectRatio,
      visualStyle = 'Cinematic High-Contrast',
      niche,
      cameraMovement,
      lighting,
      colorStyle,
      continuityNotes,
    } = params;

    const orientationDesc = aspectRatio === '9:16'
      ? 'Vertical 9:16 portrait video for YouTube Shorts and Reels'
      : 'Horizontal 16:9 widescreen video';

    const motionGuide = cameraMovement
      ? `Camera motion: ${cameraMovement}`
      : 'Smooth dynamic camera glide tracking subject with subtle depth of field';

    const lightingGuide = lighting ? `Lighting: ${lighting}` : 'Volumetric atmospheric cinematic lighting';
    const paletteGuide = colorStyle ? `Color grade: ${colorStyle}` : `${visualStyle} color grading`;
    const continuityGuide = continuityNotes ? `Scene continuity: ${continuityNotes}` : '';

    return [
      prompt.trim(),
      orientationDesc,
      motionGuide,
      lightingGuide,
      paletteGuide,
      continuityGuide,
      `Aesthetic: ${visualStyle}, ${niche} domain, photorealistic, 60fps fluid motion, 4k ultra high fidelity`,
    ]
      .filter(Boolean)
      .join('. ');
  }

  async generateClip(params: ClipGenerationParams): Promise<ClipGenerationResult> {
    const apiKey = this.getApiKey();
    const prompt = this.formatPrompt(params);
    const baseUrl = process.env.OPENAI_API_BASE || 'https://api.openai.com/v1';
    const model = process.env.OPENAI_VIDEO_MODEL || 'sora-1.0';

    const aspectDimension = params.aspectRatio === '9:16' ? '1080x1920' : '1920x1080';
    const targetDuration = Math.min(10, Math.max(4, Math.round(params.durationSec || 5)));

    console.log(`[OpenAIVideoProvider] Requesting clip for Scene ${params.sceneIndex} (${aspectDimension}, ${targetDuration}s)...`);

    // 1. Initiate video generation
    // Endpoints supported: /videos/generations or /video/generations
    const endpoints = [
      `${baseUrl}/video/generations`,
      `${baseUrl}/videos/generations`,
      `${baseUrl}/video`,
    ];

    let generationData: any = null;
    let lastError: string = '';

    for (const endpoint of endpoints) {
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          signal: AbortSignal.timeout(30000),
          headers: {
            'Authorization': `Bearer ${apiKey}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            model,
            prompt,
            size: aspectDimension,
            duration: targetDuration,
            fps: 30,
            response_format: 'url',
          }),
        });

        if (res.ok) {
          generationData = await res.json();
          break;
        } else {
          const errText = await res.text().catch(() => '');
          lastError = `Endpoint ${endpoint} returned HTTP ${res.status}: ${errText.substring(0, 200)}`;
          // If 404, try next endpoint
          if (res.status !== 404) {
            break;
          }
        }
      } catch (err: any) {
        lastError = err?.message || 'Network error';
      }
    }

    if (!generationData) {
      throw new Error(`OpenAI Video generation request failed: ${lastError}`);
    }

    // 2. Resolve video URL (immediate URL, or polling task ID)
    let videoUrl = generationData?.data?.[0]?.url || generationData?.url || generationData?.video_url;

    if (!videoUrl && generationData?.id) {
      // Polling task
      const taskId = generationData.id;
      const pollEndpoint = `${baseUrl}/video/generations/${taskId}`;
      const maxAttempts = 30; // 30 * 3s = 90s max poll
      for (let attempt = 0; attempt < maxAttempts; attempt++) {
        await new Promise((resolve) => setTimeout(resolve, 3000));
        const statusRes = await fetch(pollEndpoint, {
          headers: {
            'Authorization': `Bearer ${apiKey}`,
          },
        });
        if (statusRes.ok) {
          const statusData: any = await statusRes.json();
          if (statusData.status === 'completed' || statusData.status === 'succeeded') {
            videoUrl = statusData?.data?.[0]?.url || statusData?.url || statusData?.video_url;
            break;
          } else if (statusData.status === 'failed') {
            throw new Error(`OpenAI video generation task failed: ${statusData.error || 'Unknown error'}`);
          }
        }
      }
    }

    if (!videoUrl) {
      throw new Error('OpenAI Video API did not return a valid video URL.');
    }

    // 3. Download generated MP4 to outputPath
    const dlRes = await fetch(videoUrl, { signal: AbortSignal.timeout(60000) });
    if (!dlRes.ok) {
      throw new Error(`Failed to download OpenAI video clip: HTTP ${dlRes.status}`);
    }

    const arrayBuf = await dlRes.arrayBuffer();
    const dir = path.dirname(params.outputPath);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    await fs.promises.writeFile(params.outputPath, Buffer.from(arrayBuf));

    console.log(`[OpenAIVideoProvider] Successfully generated and saved video clip to ${params.outputPath}`);

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
  }
}

export const openaiVideoProvider = new OpenAIVideoProvider();
