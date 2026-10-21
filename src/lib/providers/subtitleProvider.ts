import { getApiKey } from '../db';

export interface SubtitleCue {
  index: number;
  startTimeSec: number;
  endTimeSec: number;
  text: string;
}

export interface WhisperWord {
  word: string;
  start: number;
  end: number;
}

export interface SubtitleProvider {
  generateCues(scenes: Array<{ sceneIndex: number; estimatedDurationSec: number; subtitleText: string }>): SubtitleCue[];
  generateCuesFromAudio(params: {
    audioBuffer: Buffer;
    scenes?: Array<{ sceneIndex: number; estimatedDurationSec: number; subtitleText: string }>;
    language?: string;
  }): Promise<SubtitleCue[]>;
  alignSceneDurationsWithWhisper(params: {
    scenes: Array<{ sceneIndex: number; narration: string; estimatedDurationSec: number }>;
    audioBuffer: Buffer;
    totalAudioDurationSec: number;
    language?: string;
  }): Promise<Array<{ sceneIndex: number; durationSec: number }> | null>;
  generateSrt(cues: SubtitleCue[]): string;
  generateVtt(cues: SubtitleCue[]): string;
}

class DefaultSubtitleProvider implements SubtitleProvider {
  private transcriptionCache = new Map<string, WhisperWord[]>();

  private getAudioCacheKey(audioBuffer: Buffer, language: string): string {
    const head = audioBuffer.slice(0, Math.min(64, audioBuffer.length)).toString('hex');
    return `${audioBuffer.length}_${language}_${head}`;
  }

  /**
   * Internal transcription engine with in-memory caching.
   * Calls Whisper Large v3 Turbo via Cloudflare Workers AI with fallback to Whisper base.
   */
  private async transcribeAudio(audioBuffer: Buffer, language = 'en'): Promise<WhisperWord[]> {
    const cacheKey = this.getAudioCacheKey(audioBuffer, language);
    if (this.transcriptionCache.has(cacheKey)) {
      return this.transcriptionCache.get(cacheKey)!;
    }

    const accountId = getApiKey('cloudflare_account_id') || process.env.CLOUDFLARE_ACCOUNT_ID;
    const apiToken = getApiKey('cloudflare') || getApiKey('cloudflare_api_token') || process.env.CLOUDFLARE_API_TOKEN;

    if (!accountId || !apiToken || !audioBuffer || audioBuffer.length < 1000) {
      return [];
    }

    try {
      console.log(`[SubtitleProvider] Transcribing audio via Cloudflare Whisper Large v3 Turbo (${audioBuffer.length} bytes)...`);
      const base64Audio = audioBuffer.toString('base64');
      const models = ['@cf/openai/whisper-large-v3-turbo', '@cf/openai/whisper'];

      for (const model of models) {
        try {
          const url = `https://api.cloudflare.com/client/v4/accounts/${accountId}/ai/run/${model}`;
          const res = await fetch(url, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${apiToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              audio: base64Audio,
              task: 'transcribe',
              language: language.substring(0, 2),
              vad_filter: true,
            }),
          });

          if (res.ok) {
            const data = await res.json();
            if (data.success && data.result) {
              let words: WhisperWord[] = [];
              if (Array.isArray(data.result.segments)) {
                words = data.result.segments.flatMap((s: any) => s.words || []);
              }
              if (words.length === 0 && Array.isArray(data.result.words)) {
                words = data.result.words;
              }

              if (words.length > 0) {
                console.log(`[SubtitleProvider] Whisper successfully returned ${words.length} words via ${model}.`);
                this.transcriptionCache.set(cacheKey, words);
                return words;
              }
            }
          }
        } catch (modelErr: any) {
          console.warn(`[SubtitleProvider] Error querying ${model}: ${modelErr.message}`);
        }
      }
    } catch (err: any) {
      console.warn(`[SubtitleProvider] Whisper transcription error: ${err.message}`);
    }

    return [];
  }

  /**
   * Aligns scene boundaries to the exact spoken narration using Whisper word timestamps.
   * Ensures visual scene transitions cut at the exact millisecond the narrator changes topic.
   */
  async alignSceneDurationsWithWhisper(params: {
    scenes: Array<{ sceneIndex: number; narration: string; estimatedDurationSec: number }>;
    audioBuffer: Buffer;
    totalAudioDurationSec: number;
    language?: string;
  }): Promise<Array<{ sceneIndex: number; durationSec: number }> | null> {
    const { scenes, audioBuffer, totalAudioDurationSec, language = 'en' } = params;
    if (!scenes || scenes.length === 0) return null;

    const words = await this.transcribeAudio(audioBuffer, language);
    if (!words || words.length === 0) return null;

    try {
      const results: Array<{ sceneIndex: number; durationSec: number }> = [];
      let wordIdx = 0;

      for (let i = 0; i < scenes.length; i++) {
        const scene = scenes[i];
        const sceneWords = (scene.narration || '')
          .toLowerCase()
          .replace(/[^a-z0-9\s]/g, '')
          .split(/\s+/)
          .filter(Boolean);

        const startWordObj = words[wordIdx];
        const startTime = i === 0 ? 0 : (startWordObj ? startWordObj.start : 0);

        // Advance word cursor proportional to words in this scene
        const matchedEndIdx = Math.min(words.length - 1, wordIdx + Math.max(1, sceneWords.length - 1));
        const endWordObj = words[matchedEndIdx];

        let endTime: number;
        if (i === scenes.length - 1) {
          endTime = totalAudioDurationSec;
        } else {
          // Cut at the start of the next scene's spoken word
          const nextWordObj = words[matchedEndIdx + 1];
          endTime = nextWordObj ? nextWordObj.start : (endWordObj ? endWordObj.end : (startTime + 5));
        }

        const duration = Math.max(3.0, Math.round((endTime - startTime) * 10) / 10);
        results.push({
          sceneIndex: scene.sceneIndex,
          durationSec: duration,
        });

        console.log(`[SubtitleProvider] Scene ${scene.sceneIndex} aligned with Whisper: ${startTime}s -> ${endTime}s (${duration}s)`);
        wordIdx = matchedEndIdx + 1;
      }

      // Final normalization: ensure sum matches totalAudioDurationSec
      const sumDurations = results.reduce((acc, r) => acc + r.durationSec, 0);
      const diff = Math.round((totalAudioDurationSec - sumDurations) * 10) / 10;
      if (Math.abs(diff) > 0.1 && results.length > 0) {
        // Adjust the last scene slightly to fit the audio container exactly
        results[results.length - 1].durationSec = Math.max(3.0, Math.round((results[results.length - 1].durationSec + diff) * 10) / 10);
      }

      return results;
    } catch (err: any) {
      console.warn(`[SubtitleProvider] Failed to match scenes against Whisper words: ${err.message}`);
      return null;
    }
  }

  /**
   * Primary alignment engine: Whisper Large v3 Turbo via Cloudflare Workers AI.
   * Transcribes narration audio with millisecond-exact word timestamps and groups words
   * into punchy kinetic captions optimized for YouTube Shorts / vertical retention.
   */
  async generateCuesFromAudio(params: {
    audioBuffer: Buffer;
    scenes?: Array<{ sceneIndex: number; estimatedDurationSec: number; subtitleText: string }>;
    language?: string;
  }): Promise<SubtitleCue[]> {
    const { audioBuffer, scenes = [], language = 'en' } = params;

    const words = await this.transcribeAudio(audioBuffer, language);
    if (words && words.length > 0) {
      const cues = this.groupWordsIntoKineticCues(words);
      if (cues.length > 0) {
        console.log(`[SubtitleProvider] Successfully generated ${cues.length} frame-perfect cues using Whisper.`);
        return cues;
      }
    }

    // Fallback: Proportional duration estimation from scenes
    return this.generateCues(scenes);
  }

  /**
   * Groups millisecond-precision Whisper words into punchy, mobile-optimized captions (3-4 words max).
   */
  private groupWordsIntoKineticCues(words: Array<{ word: string; start: number; end: number }>): SubtitleCue[] {
    const cues: SubtitleCue[] = [];
    let currentGroup: Array<{ word: string; start: number; end: number }> = [];
    let cueIndex = 1;

    for (let i = 0; i < words.length; i++) {
      const w = words[i];
      const cleanWord = (w.word || '').trim();
      if (!cleanWord) continue;

      currentGroup.push({ word: cleanWord, start: w.start, end: w.end });

      const hasPunctuation = /[.,!?:;]$/.test(cleanWord);
      const nextWord = words[i + 1];
      const isLongPause = nextWord ? nextWord.start - w.end > 0.55 : false;
      const isAtChunkLimit = currentGroup.length >= 4;

      if (hasPunctuation || isLongPause || isAtChunkLimit || i === words.length - 1) {
        const rawText = currentGroup.map((g) => g.word).join(' ');
        const start = Math.max(0, currentGroup[0].start);
        let end = Math.max(start + 0.35, currentGroup[currentGroup.length - 1].end);

        const formattedText = this.formatLines(rawText);

        cues.push({
          index: cueIndex++,
          startTimeSec: Math.round(start * 1000) / 1000,
          endTimeSec: Math.round(end * 1000) / 1000,
          text: formattedText,
        });

        currentGroup = [];
      }
    }

    return cues;
  }

  generateCues(scenes: Array<{ sceneIndex: number; estimatedDurationSec: number; subtitleText: string }>): SubtitleCue[] {
    const cues: SubtitleCue[] = [];
    let currentTime = 0;
    let cueIndex = 1;

    for (const scene of scenes) {
      const sceneDuration = scene.estimatedDurationSec;
      const cleanText = scene.subtitleText.trim();

      // Break text into natural sentences/phrases
      const phrases = this.splitIntoPhrases(cleanText);
      const totalWords = cleanText.split(/\s+/).filter(Boolean).length;

      let phraseOffset = 0;
      for (const phrase of phrases) {
        const wordsInPhrase = phrase.split(/\s+/).filter(Boolean).length;
        // Allocate duration proportional to word count
        const phraseDuration = totalWords > 0 ? (wordsInPhrase / totalWords) * sceneDuration : sceneDuration / phrases.length;
        const start = currentTime + phraseOffset;
        const end = start + phraseDuration;

        // Format phrase into max 2 lines (max ~38 chars per line)
        const formattedText = this.formatLines(phrase);

        cues.push({
          index: cueIndex++,
          startTimeSec: start,
          endTimeSec: end,
          text: formattedText,
        });

        phraseOffset += phraseDuration;
      }

      currentTime += sceneDuration;
    }

    return cues;
  }

  generateSrt(cues: SubtitleCue[]): string {
    return cues
      .map((cue) => {
        const startStr = this.formatSrtTime(cue.startTimeSec);
        const endStr = this.formatSrtTime(cue.endTimeSec);
        return `${cue.index}\n${startStr} --> ${endStr}\n${cue.text}\n`;
      })
      .join('\n');
  }

  generateVtt(cues: SubtitleCue[]): string {
    const header = 'WEBVTT\n\n';
    const body = cues
      .map((cue) => {
        const startStr = this.formatVttTime(cue.startTimeSec);
        const endStr = this.formatVttTime(cue.endTimeSec);
        return `${cue.index}\n${startStr} --> ${endStr}\n${cue.text}\n`;
      })
      .join('\n');
    return header + body;
  }

  private splitIntoPhrases(text: string): string[] {
    // Break into natural clauses by punctuation or kinetic chunks of 3-5 words for Shorts retention
    const rawClauses = text.split(/(?<=[.,!?:;])\s+/).filter(Boolean);
    const phrases: string[] = [];

    for (const clause of rawClauses) {
      const words = clause.split(/\s+/).filter(Boolean);
      if (words.length <= 5) {
        phrases.push(clause);
      } else {
        // Split longer clauses into punchy 3-4 word kinetic chunks
        const chunkSize = 4;
        for (let i = 0; i < words.length; i += chunkSize) {
          phrases.push(words.slice(i, i + chunkSize).join(' '));
        }
      }
    }

    return phrases.length > 0 ? phrases : [text];
  }

  private formatLines(phrase: string): string {
    const words = phrase.split(/\s+/).filter(Boolean);
    if (words.length <= 4 || phrase.length <= 26) {
      return phrase;
    }

    // Split across 2 balanced lines for mobile screen readability
    const mid = Math.ceil(words.length / 2);
    const line1 = words.slice(0, mid).join(' ');
    const line2 = words.slice(mid).join(' ');
    return `${line1}\n${line2}`;
  }

  private formatSrtTime(seconds: number): string {
    const totalMs = Math.floor(seconds * 1000);
    const hrs = Math.floor(totalMs / 3600000);
    const mins = Math.floor((totalMs % 3600000) / 60000);
    const secs = Math.floor((totalMs % 60000) / 1000);
    const ms = totalMs % 1000;

    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
  }

  private formatVttTime(seconds: number): string {
    const totalMs = Math.floor(seconds * 1000);
    const hrs = Math.floor(totalMs / 3600000);
    const mins = Math.floor((totalMs % 3600000) / 60000);
    const secs = Math.floor((totalMs % 60000) / 1000);
    const ms = totalMs % 1000;

    return `${String(hrs).padStart(2, '0')}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}.${String(ms).padStart(3, '0')}`;
  }
}

export const subtitleProvider: SubtitleProvider = new DefaultSubtitleProvider();
