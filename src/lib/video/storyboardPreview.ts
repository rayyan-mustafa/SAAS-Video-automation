/**
 * Storyboard Style Preview Generator (WP8)
 *
 * Generates low-cost, fast composition & mood preview images for scenes in the storyboard.
 * Clearly stamped: "Style Preview (Composition & Mood)".
 *
 * Uses Fal Flux Schnell when available, with clean fallback to local aesthetic preview cards.
 */

import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import util from 'util';
import { storage } from '../storage';
import { getFfmpegPath } from '../providers/videoProvider';
import { getApiKey } from '../db';

const execFileAsync = util.promisify(execFile);

export interface GenerateStoryboardPreviewParams {
  projectId: string;
  sceneIndex: number;
  visualPrompt: string;
  visualTier: string;
  niche?: string;
  topic?: string;
}

export async function generateStoryboardPreview(params: GenerateStoryboardPreviewParams): Promise<{
  storageKey: string;
  url: string;
  isAiGenerated: boolean;
}> {
  const { projectId, sceneIndex, visualPrompt, visualTier, niche = 'Tech', topic = '' } = params;
  const storageKey = `previews/${projectId}/scene_${sceneIndex}.jpg`;
  const ffmpegPath = getFfmpegPath();

  const tempDir = path.join(process.cwd(), 'data', 'temp_tests', 'previews');
  await fs.promises.mkdir(tempDir, { recursive: true });
  const localOutPath = path.join(tempDir, `${projectId}_s${sceneIndex}_preview.jpg`);

  const falKey = getApiKey('fal') || process.env.FAL_KEY;

  if (falKey) {
    try {
      const res = await fetch('https://fal.run/fal-ai/flux/schnell', {
        method: 'POST',
        signal: AbortSignal.timeout(15000),
        headers: {
          Authorization: `Key ${falKey}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          prompt: `${visualPrompt}, style preview, composition and mood, vertical 9:16`,
          image_size: 'portrait_16_9',
          num_inference_steps: 4,
          num_images: 1,
          enable_safety_checker: true,
        }),
      });

      if (res.ok) {
        const data: any = await res.json();
        const imgUrl = data.images?.[0]?.url;
        if (imgUrl) {
          const imgRes = await fetch(imgUrl);
          const buf = Buffer.from(await imgRes.arrayBuffer());
          await storage.putObject(storageKey, buf, 'image/jpeg');
          return {
            storageKey,
            url: storage.getUrl(storageKey),
            isAiGenerated: true,
          };
        }
      }
    } catch (err: any) {
      console.warn(`[StoryboardPreview] Fal Flux Schnell preview bypassed (${err.message}). Using local style card.`);
    }
  }

  // Fallback: Generate aesthetic dark-mode 1080x1920 style preview card via FFmpeg lavfi
  const cleanPrompt = visualPrompt
    .replace(/'/g, '')
    .replace(/:/g, ' ')
    .replace(/\\/g, ' ')
    .substring(0, 60);

  const cleanTopic = (topic || niche)
    .replace(/'/g, '')
    .substring(0, 30);

  const filtergraph = [
    `color=c=#0d1117:s=1080x1920:d=1,format=yuv420p`,
    `drawbox=x=80:y=240:w=920:h=1440:color=#1f293d@0.8:t=fill`,
    `drawbox=x=80:y=240:w=920:h=1440:color=#38bdf8@0.5:t=4`,
    `drawbox=x=120:y=280:w=500:h=60:color=#0284c7@0.9:t=fill`,
    `drawtext=text='STYLE PREVIEW (COMPOSITION & MOOD)':fontcolor=#ffffff:fontsize=24:x=140:y=298`,
    `drawtext=text='Scene ${sceneIndex} [${visualTier.toUpperCase()}]':fontcolor=#94a3b8:fontsize=36:x=120:y=400`,
    `drawtext=text='${cleanTopic}':fontcolor=#f8fafc:fontsize=48:x=120:y=460`,
    `drawbox=x=120:y=540:w=840:h=4:color=#38bdf8@0.4:t=fill`,
    `drawtext=text='${cleanPrompt}...':fontcolor=#cbd5e1:fontsize=32:x=120:y=600`,
  ].join(',');

  await execFileAsync(ffmpegPath, [
    '-y',
    '-f', 'lavfi',
    '-i', filtergraph,
    '-vframes', '1',
    '-q:v', '2',
    localOutPath,
  ]);

  const buf = await fs.promises.readFile(localOutPath);
  await storage.putObject(storageKey, buf, 'image/jpeg');

  try {
    await fs.promises.unlink(localOutPath);
  } catch {}

  return {
    storageKey,
    url: storage.getUrl(storageKey),
    isAiGenerated: false,
  };
}
