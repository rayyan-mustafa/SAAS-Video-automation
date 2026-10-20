import { execFile } from 'child_process';
import util from 'util';
import path from 'path';
import fs from 'fs';
import { getFfmpegPath } from './videoProvider';
import { getApiKey } from '../db';

const execFileAsync = util.promisify(execFile);

export interface StockVideoMatch {
  url: string;
  width: number;
  height: number;
  duration: number;
}

export class StockVideoEngine {
  private sanitize(str: string): string {
    return str.replace(/[:\\'%]/g, ' ').replace(/\s+/g, ' ').trim();
  }

  // Extract clean keywords for video search from visual prompt
  public extractSearchKeywords(prompt: string, niche: string, topic?: string): string[] {
    const metaWordsRegex = /\b(scene|clip|shot|high|impact|definition|cinematic|lighting|context|modern|ultra|resolution|8k|4k|photo|photography|visual|style|contrast|focus|view|background|foreground|immediate|opening|wide|sub|angles|angle|establishing|detailed|dynamic|centering|push|pull|glide|representation|overview|breakdown|part|look|closely|leads|directly|realistic|atmospheric|ambient|aesthetic|depth|matching|consistent|smooth|motion|transition|transitions|subject|element|elements|reveals|understanding|foundation|illustrating|depicting|showing|focusing|dramatic|slow|steady|tracking|anamorphic|lens|volumetric|haze|rim|illumination|key|fill|color|palette|grade|grade|camera|movement|studio|space)\b/gi;

    const clean = prompt
      .replace(metaWordsRegex, ' ')
      .replace(/[^a-zA-Z0-9\s]/g, ' ')
      .replace(/\s+/g, ' ')
      .trim();

    const words = clean.toLowerCase().split(' ').filter((w) => w.length > 3);
    const candidates: string[] = [];

    // If topic is provided, prioritize key subject nouns from the topic
    if (topic) {
      const cleanTopic = topic.replace(/[^a-zA-Z0-9\s]/g, ' ').toLowerCase();
      const topicWords = cleanTopic.split(/\s+/).filter(w => w.length > 3 && !metaWordsRegex.test(w));
      if (topicWords.length >= 2) {
        candidates.push(`${topicWords[0]} ${topicWords[1]}`);
      }
      for (const tw of topicWords.slice(0, 2)) {
        if (!candidates.includes(tw)) candidates.push(tw);
      }
    }

    // 1. Two-word keyword phrase from cleaned prompt
    if (words.length >= 2) {
      const phrase = `${words[0]} ${words[1]}`;
      if (!candidates.includes(phrase)) candidates.push(phrase);
    }

    // 2. Single core keywords
    for (const w of words.slice(0, 3)) {
      if (!candidates.includes(w)) candidates.push(w);
    }

    // 3. Niche fallback keyword
    const nicheClean = niche.toLowerCase().split(' ')[0];
    if (nicheClean && nicheClean.length > 3 && !candidates.includes(nicheClean)) {
      candidates.push(nicheClean);
    }

    return candidates;
  }

  private coverrAvailable: boolean = true;
  private coverrLastCheck: number = 0;

  // Search Coverr.co open 1080p stock video catalog with index offset for distinct clips
  async searchCoverrVideo(query: string, clipOffset: number = 0): Promise<string | null> {
    if (!this.coverrAvailable && Date.now() - this.coverrLastCheck < 60000) {
      return null;
    }

    try {
      const url = `https://coverr.co/api/videos?query=${encodeURIComponent(query)}&page=1`;
      const res = await fetch(url, {
        signal: AbortSignal.timeout(2000),
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
          'Accept': 'application/json',
        },
      });

      if (res.ok) {
        const data: any = await res.json();
        if (data.hits && data.hits.length > 0) {
          const hit = data.hits[clipOffset % data.hits.length] || data.hits[0];
          if (hit.base_filename) {
            const filename = hit.base_filename.toLowerCase();
            const qLower = query.toLowerCase();

            // Prevent irrelevant sports/running/yoga clips
            const isIrrelevantSport = (filename.includes('yoga') || filename.includes('stretching') || filename.includes('runner') || filename.includes('running')) &&
              !qLower.includes('yoga') && !qLower.includes('stretch') && !qLower.includes('run') && !qLower.includes('sport') && !qLower.includes('workout');

            // CRITICAL: Prevent irrelevant ocean/wave/beach/nature clips when user topic is tech, business, money, etc.
            const isNatureWaterClip = /wave|waves|ocean|beach|sea|coast|surf|shore|underwater|sand|dune|island|coral|tide/i.test(filename);
            const queryRequestsWater = /ocean|sea|beach|wave|water|surf|coast|marine|aquatic|tide|coastal|swimming/i.test(qLower);

            if (isNatureWaterClip && !queryRequestsWater) {
              console.warn(`[StockVideo] Rejecting irrelevant ocean/water clip (${filename}) for query "${query}".`);
              return null;
            }

            if (!isIrrelevantSport) {
              this.coverrAvailable = true;
              return `https://cdn.coverr.co/videos/${hit.base_filename}/1080p.mp4`;
            }
          }
        }
      }
    } catch (err: any) {
      this.coverrAvailable = false;
      this.coverrLastCheck = Date.now();
      console.warn(`[StockVideo] Coverr search unavailable (${err.message}). Bypassing for 60s.`);
    }
    return null;
  }

  // Search Pexels Video API with offset and orientation
  async searchPexelsVideo(query: string, clipOffset: number = 0, apiKey?: string, orientation: 'portrait' | 'landscape' = 'portrait'): Promise<string | null> {
    const token = apiKey || getApiKey('pexels_api_key') || process.env.PEXELS_API_KEY;
    if (!token) return null;

    try {
      const url = `https://api.pexels.com/videos/search?query=${encodeURIComponent(query)}&per_page=10&orientation=${orientation}&size=medium`;
      const res = await fetch(url, {
        headers: {
          Authorization: token,
          'User-Agent': 'Mozilla/5.0 AUTORA/1.0',
        },
      });

      if (res.ok) {
        const data: any = await res.json();
        if (data.videos && data.videos.length > 0) {
          const vid = data.videos[clipOffset % data.videos.length] || data.videos[0];
          const file = vid.video_files?.find((f: any) => f.quality === 'hd') || vid.video_files?.[0];
          if (file?.link) {
            return file.link;
          }
        }
      }
    } catch (err: any) {
      console.warn(`[StockVideo] Pexels search failed (${err.message})`);
    }
    return null;
  }

  // Search Pixabay Video API
  async searchPixabayVideo(query: string, clipOffset: number = 0, apiKey?: string): Promise<string | null> {
    const key = apiKey || getApiKey('pixabay_api_key') || process.env.PIXABAY_API_KEY;
    if (!key) return null;

    try {
      const url = `https://pixabay.com/api/videos/?key=${key}&q=${encodeURIComponent(query)}&per_page=10`;
      const res = await fetch(url);
      if (res.ok) {
        const data: any = await res.json();
        if (data.hits && data.hits.length > 0) {
          const hit = data.hits[clipOffset % data.hits.length] || data.hits[0];
          const vidUrl = hit.videos?.large?.url || hit.videos?.medium?.url || hit.videos?.small?.url;
          if (vidUrl) {
            return vidUrl;
          }
        }
      }
    } catch (err: any) {
      console.warn(`[StockVideo] Pixabay search failed (${err.message})`);
    }
    return null;
  }

  // Find real stock video footage with distinct offset (Coverr HD -> Pexels HD -> Pixabay HD)
  async findStockVideo(queries: string[] | string, clipOffset: number = 0, aspectRatio: '9:16' | '16:9' = '9:16'): Promise<string | null> {
    const queryList = Array.isArray(queries) ? queries : [queries];

    for (const q of queryList) {
      if (!q || q.length < 2) continue;

      // 1. Try Pexels HD Video first (supports native portrait orientation)
      const pexelsOrientation = aspectRatio === '9:16' ? 'portrait' : 'landscape';
      const pexelsUrl = await this.searchPexelsVideo(q, clipOffset, undefined, pexelsOrientation);
      if (pexelsUrl) return pexelsUrl;

      // 2. Try Coverr HD Catalog (100% Free, high quality live action)
      const coverrUrl = await this.searchCoverrVideo(q, clipOffset);
      if (coverrUrl) return coverrUrl;

      // 3. Try Pixabay HD Video
      const pixabayUrl = await this.searchPixabayVideo(q, clipOffset);
      if (pixabayUrl) return pixabayUrl;
    }

    return null;
  }

  // Download stock video and render into trimmed/scaled scene (30fps CFR + strip audio)
  async renderStockVideoScene(params: {
    videoUrl: string;
    durationSec: number;
    outputPath: string;
    sceneIndex: number;
    headline: string;
    niche: string;
    accent: string;
    aspectRatio?: '9:16' | '16:9';
  }): Promise<void> {
    const { videoUrl, durationSec, outputPath, sceneIndex, aspectRatio = '9:16' } = params;
    const ffmpegPath = getFfmpegPath();
    const tempDir = path.dirname(outputPath);
    const rand = Math.random().toString(36).substring(2, 7);
    const tempStockMp4 = path.join(tempDir, `stock_dl_${sceneIndex}_${rand}.mp4`);

    const width = aspectRatio === '9:16' ? 1080 : 1920;
    const height = aspectRatio === '9:16' ? 1920 : 1080;

    try {
      // 1. Download the real video clip (with timeout)
      const res = await fetch(videoUrl, { signal: AbortSignal.timeout(6000) });
      if (!res.ok) throw new Error(`Stock video download HTTP ${res.status}`);
      const arrayBuf = await res.arrayBuffer();
      await fs.promises.writeFile(tempStockMp4, Buffer.from(arrayBuf));

      // 2. Process with FFmpeg (scale, crop to target aspect ratio, force 30fps CFR, strip audio)
      const filterGraph = [
        `scale=${width}:${height}:force_original_aspect_ratio=increase`,
        `crop=${width}:${height}`,
        `setsar=1`,
      ].join(',');

      try {
        await execFileAsync(ffmpegPath, [
          '-y',
          '-stream_loop',
          '-1',
          '-i',
          tempStockMp4,
          '-an',
          '-vf',
          filterGraph,
          '-r',
          '30',
          '-c:v',
          'libx264',
          '-pix_fmt',
          'yuv420p',
          '-preset',
          'ultrafast',
          '-t',
          String(durationSec),
          outputPath,
        ]);
      } catch (ffErr: any) {
        console.warn(`[stockVideoEngine] FFmpeg process failed, falling back to direct copy:`, ffErr?.message || ffErr);
        if (fs.existsSync(tempStockMp4)) {
          await fs.promises.copyFile(tempStockMp4, outputPath);
        }
      }
    } finally {
      if (fs.existsSync(tempStockMp4)) {
        await fs.promises.unlink(tempStockMp4).catch(() => {});
      }
    }
  }
}

export const stockVideoEngine = new StockVideoEngine();
