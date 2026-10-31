import path from 'path';
import fs from 'fs';
import { execFile } from 'child_process';
import util from 'util';
import { storage, getTempDir } from '../storage';
import { inspectMedia, getFfmpegPath } from './videoProvider';
import { getApiKey } from '../db';
import { EngineError } from '../video/engineErrors';
import { isCloudflareConfigured, runCloudflareBinary } from './cloudflareAiClient';

const execFileAsync = util.promisify(execFile);

import { TILLERCAST_VOICE_CATALOG, AUTORA_VOICE_CATALOG, VoicePreset } from '../video/voiceCatalog';
export { TILLERCAST_VOICE_CATALOG, AUTORA_VOICE_CATALOG };
export type { VoicePreset };

export interface VoiceProvider {
  generateVoiceover(params: {
    text: string;
    voiceName?: string;
    voiceSpeed?: string;
    language?: string;
    projectId?: string;
    userPlan?: string;
  }): Promise<{ audioBuffer: Buffer; durationSec: number; format: string }>;
}

class MultiEngineVoiceProvider implements VoiceProvider {
  private async sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Curated ElevenLabs Studio Voices
  private static readonly ELEVENLABS_VOICE_MAP: Record<string, string> = {
    'rachel': '21m00Tcm4TlvDq8ikWAM',
    'el-rachel-story': '21m00Tcm4TlvDq8ikWAM',
    'adam': 'pNInz6obpgDQGcFmaJgB',
    'el-adam-viral': 'pNInz6obpgDQGcFmaJgB',
    'brian': 'nPczCjzI2devNBz1zQrb',
    'el-brian-cinema': 'nPczCjzI2devNBz1zQrb',
    'chris': 'iP95p4xoKVk53GoZ742B',
    'el-chris-hormozi': 'iP95p4xoKVk53GoZ742B',
    'antoni': 'ErXwobaYiN019PkySvjV',
    'bella': 'EXAVITQu4vr4xnSDxMaL',
    'josh': 'TxGEqnHWrfWFTfGW9XjX',
    'arnold': 'VR6AewLTigWG4xSOukaG',
    'domi': 'AZnzlk1XvdvUeBnXmlld',
    'sam': 'yoZ06aMxZJJ28mfd3POQ',
  };
  // Mapped Cloudflare Deepgram Aura-2 Speakers
  private static readonly DEEPGRAM_SPEAKER_MAP: Record<string, string> = {
    'orion': 'orion',
    'cf-aura-orion': 'orion',
    'asteria': 'asteria',
    'cf-aura-asteria': 'asteria',
    'arcas': 'arcas',
    'cf-aura-arcas': 'arcas',
    'luna': 'luna',
    'cf-aura-luna': 'luna',
    'stella': 'stella',
    'cf-aura-stella': 'stella',
    'christopher': 'orion',
    'en-us-christopherneural': 'orion',
    'guy': 'arcas',
    'en-us-guyneural': 'arcas',
    'jenny': 'asteria',
    'en-us-jennyneural': 'asteria',
    'aria': 'asteria',
    'en-us-arianeural': 'asteria',
    'sonia': 'asteria',
    'en-gb-sonianeural': 'asteria',
    'ryan': 'arcas',
    'en-gb-ryanneural': 'arcas',
  };

  private resolveDeepgramSpeaker(voiceName?: string): string {
    if (!voiceName) return 'orion';
    const clean = voiceName.trim().toLowerCase();
    return MultiEngineVoiceProvider.DEEPGRAM_SPEAKER_MAP[clean] || 'orion';
  }


  private resolveElevenLabsVoiceId(voiceName?: string): string {
    if (!voiceName) return '21m00Tcm4TlvDq8ikWAM';
    const clean = voiceName.trim();
    if (clean.startsWith('elevenlabs:')) {
      const sub = clean.replace('elevenlabs:', '').trim();
      return MultiEngineVoiceProvider.ELEVENLABS_VOICE_MAP[sub.toLowerCase()] || sub;
    }
    const lower = clean.toLowerCase();
    if (MultiEngineVoiceProvider.ELEVENLABS_VOICE_MAP[lower]) {
      return MultiEngineVoiceProvider.ELEVENLABS_VOICE_MAP[lower];
    }
    // Check TILLERCAST_VOICE_CATALOG
    const catalogMatch = TILLERCAST_VOICE_CATALOG.find(
      (v) => v.id.toLowerCase() === lower || v.providerVoiceId.toLowerCase() === lower
    );
    if (catalogMatch && catalogMatch.provider === 'elevenlabs') {
      return catalogMatch.providerVoiceId;
    }
    // Direct Custom Cloned Voice ID (typically 15-35 alphanumeric chars)
    if (/^[a-zA-Z0-9_-]{15,35}$/.test(clean)) {
      return clean;
    }
    return '21m00Tcm4TlvDq8ikWAM'; // Default Rachel
  }

    private resolveAzureVoice(voiceName?: string, language?: string): string {
    const clean = (voiceName || '').toLowerCase().trim();
    if (clean.includes('asteria') || clean.includes('female') || clean.includes('rachel') || clean.includes('jenny')) {
      return 'en-US-JennyNeural';
    }
    if (clean.includes('arcas') || clean.includes('guy') || clean.includes('chris')) {
      return 'en-US-GuyNeural';
    }
    return 'en-US-ChristopherNeural';
  }

  // Engine 0: ElevenLabs AI Voice Synthesis (When key configured or voice requested)
  private async synthesizeWithElevenLabs(text: string, voiceName?: string): Promise<Buffer> {
    const apiKey = getApiKey('elevenlabs') || process.env.ELEVENLABS_API_KEY;
    if (!apiKey) throw new Error('ElevenLabs API key not configured');

    const voiceId = this.resolveElevenLabsVoiceId(voiceName);

    // Split text into manageable chunks if it exceeds 2000 characters for long-form reliability
    const chunks: string[] = [];
    if (text.length <= 2000) {
      chunks.push(text);
    } else {
      const paragraphs = text.split(/\n\n+/).filter(Boolean);
      let currentChunk = '';
      for (const p of paragraphs) {
        if ((currentChunk + '\n\n' + p).length > 2000 && currentChunk.trim()) {
          chunks.push(currentChunk.trim());
          currentChunk = p;
        } else {
          currentChunk += (currentChunk ? '\n\n' : '') + p;
        }
      }
      if (currentChunk.trim()) chunks.push(currentChunk.trim());
    }

    const audioBuffers: Buffer[] = [];
    for (const chunk of chunks) {
      const res = await fetch(`https://api.elevenlabs.io/v1/text-to-speech/${voiceId}`, {
        method: 'POST',
        signal: AbortSignal.timeout(45000),
        headers: {
          'xi-api-key': apiKey,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text: chunk,
          model_id: 'eleven_turbo_v2_5',
          voice_settings: {
            stability: 0.45,
            similarity_boost: 0.80,
            style: 0.35,
            use_speaker_boost: true,
          },
        }),
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw new Error(`ElevenLabs API HTTP ${res.status}: ${errText.substring(0, 120)}`);
      }

      const arrayBuf = await res.arrayBuffer();
      const buf = Buffer.from(arrayBuf);
      if (buf.length >= 500) {
        audioBuffers.push(buf);
      }
    }

    if (audioBuffers.length === 0) {
      throw new Error('ElevenLabs returned empty or invalid audio payload');
    }

    return Buffer.concat(audioBuffers);
  }

  // Helper to escape XML characters for Azure Cognitive Speech SSML
  private escapeXml(text: string): string {
    return text
      .replace(/&/g, '&amp;')
      .replace(/&lt;/g, '&lt;')
      .replace(/&gt;/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  // Engine 0.5: Azure Cognitive Speech API (Licensed Commercial Enterprise Voice Tier)
  public async synthesizeWithAzureSpeech(text: string, voiceName?: string, language?: string): Promise<Buffer> {
    const apiKey = getApiKey('azure') || getApiKey('azure_speech') || process.env.AZURE_SPEECH_KEY || process.env.AZURE_SPEECH_API_KEY;
    if (!apiKey) throw new Error('Azure Speech API key not configured');

    const region = process.env.AZURE_SPEECH_REGION || 'eastus';
    const targetVoice = this.resolveAzureVoice(voiceName, language);
    const langCode = targetVoice.split('-').slice(0, 2).join('-') || 'en-US';

    // Chunk text under 1500 characters for optimal Azure REST synthesis latency
    const paragraphs = text.split(/\n\n+/).filter(Boolean);
    const chunks: string[] = [];
    let currentChunk = '';
    for (const p of paragraphs) {
      if ((currentChunk + ' ' + p).length > 1200 && currentChunk.trim()) {
        chunks.push(currentChunk.trim());
        currentChunk = p;
      } else {
        currentChunk += (currentChunk ? ' ' : '') + p;
      }
    }
    if (currentChunk.trim()) chunks.push(currentChunk.trim());

    const audioBuffers: Buffer[] = [];
    for (const chunk of chunks) {
      const ssml = `<speak version='1.0' xml:lang='${langCode}'>` +
        `<voice xml:lang='${langCode}' name='${targetVoice}'>` +
        `${this.escapeXml(chunk)}` +
        `</voice></speak>`;

      const res = await fetch(`https://${region}.tts.speech.microsoft.com/cognitiveservices/v1`, {
        method: 'POST',
        signal: AbortSignal.timeout(30000),
        headers: {
          'Ocp-Apim-Subscription-Key': apiKey,
          'Content-Type': 'application/ssml+xml',
          'X-Microsoft-OutputFormat': 'audio-24khz-96kbitrate-mono-mp3',
          'User-Agent': 'Tillercast-SaaS-Engine',
        },
        body: ssml,
      });

      if (!res.ok) {
        const errText = await res.text().catch(() => '');
        throw new Error(`Azure Speech API HTTP ${res.status}: ${errText.substring(0, 100)}`);
      }

      const arrayBuf = await res.arrayBuffer();
      const buf = Buffer.from(arrayBuf);
      if (buf.length >= 200) {
        audioBuffers.push(buf);
      }
    }

    if (audioBuffers.length === 0) {
      throw new Error('Azure Speech API returned empty audio buffer');
    }

    return Buffer.concat(audioBuffers);
  }

  // Engine 2: Google Speech Neural Stream (Universal Fallback, 0 API Key, 100% Reliable Globally)
  private async synthesizeWithGoogleTTS(text: string, language: string = 'en'): Promise<Buffer> {
    const langCode = (language || 'en').substring(0, 2).toLowerCase();
    const words = text.split(/\s+/).filter(Boolean);
    const chunks: string[] = [];
    let cur = '';

    for (const w of words) {
      if ((cur + ' ' + w).length > 180 && cur) {
        chunks.push(cur.trim());
        cur = w;
      } else {
        cur += (cur ? ' ' : '') + w;
      }
    }
    if (cur.trim()) chunks.push(cur.trim());

    const bufs: Buffer[] = [];
    for (const c of chunks) {
      const url = `https://translate.google.com/translate_tts?ie=UTF-8&client=tw-ob&tl=${encodeURIComponent(langCode)}&q=${encodeURIComponent(c)}`;
      const res = await fetch(url, {
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': 'https://translate.google.com/',
        },
        signal: AbortSignal.timeout(12000),
      });

      if (!res.ok) {
        throw new Error(`Google TTS HTTP error ${res.status}`);
      }

      const arr = await res.arrayBuffer();
      const b = Buffer.from(arr);
      if (b.length > 100) {
        bufs.push(b);
      }
    }

    if (bufs.length === 0) {
      throw new Error('Google TTS produced no audio');
    }

    return Buffer.concat(bufs);
  }

  // Engine: Cloudflare Workers AI Voice (Deepgram Aura-2 & MeloTTS)
  public async synthesizeWithCloudflareTTS(text: string, voiceName?: string, language?: string): Promise<Buffer> {
    if (!isCloudflareConfigured()) {
      throw new Error('Cloudflare Workers AI credentials not configured');
    }

    const cleanVoice = (voiceName || '').trim().toLowerCase();
    const isMelo = cleanVoice.startsWith('cf-melotts-') || (language && language.toLowerCase().substring(0, 2) !== 'en');

    // Aura-2 speaker map: asteria, arcas, orion, luna, stella
    let auraSpeaker = this.resolveDeepgramSpeaker(voiceName);

    const meloLang = cleanVoice.replace(/^cf-melotts-/, '') || (language ? language.toLowerCase().substring(0, 2) : 'en');

    // Split text into paragraphs/chunks under 1200 chars for low-latency synthesis
    const paragraphs = text.split(/\n\n+/).filter(Boolean);
    const chunks: string[] = [];
    let currentChunk = '';
    for (const p of paragraphs) {
      if ((currentChunk + '\n\n' + p).length > 1200 && currentChunk.trim()) {
        chunks.push(currentChunk.trim());
        currentChunk = p;
      } else {
        currentChunk += (currentChunk ? '\n\n' : '') + p;
      }
    }
    if (currentChunk.trim()) chunks.push(currentChunk.trim());

    const audioBuffers: Buffer[] = [];
    const model = isMelo ? '@cf/myshell-ai/melotts' : '@cf/deepgram/aura-2-en';

    for (const chunk of chunks) {
      const payload: Record<string, unknown> = isMelo
        ? { prompt: chunk, lang: meloLang }
        : { text: chunk, speaker: auraSpeaker };

      try {
        const audioBuf = await runCloudflareBinary(model, payload, { timeoutMs: 45_000 });
        if (audioBuf && audioBuf.length >= 200) {
          audioBuffers.push(audioBuf);
        }
      } catch (err: any) {
        // Fallback to Aura-1 if Aura-2 errors or vice-versa
        if (!isMelo && model === '@cf/deepgram/aura-2-en') {
          try {
            const fallbackBuf = await runCloudflareBinary('@cf/deepgram/aura-1', payload, { timeoutMs: 45_000 });
            if (fallbackBuf && fallbackBuf.length >= 200) {
              audioBuffers.push(fallbackBuf);
              continue;
            }
          } catch {}
        }
        throw err;
      }
    }

    if (audioBuffers.length === 0) {
      throw new Error(`Cloudflare Workers AI TTS (${model}) returned empty audio`);
    }

    return Buffer.concat(audioBuffers);
  }

  // Engine 3: Windows Native Speech Synthesizer (Offline fallback on Windows)
  private async synthesizeWithWindowsSAPI(text: string, voiceSpeed?: string): Promise<Buffer> {
    if (process.platform !== 'win32') {
      throw new Error('Windows SAPI only supported on Windows OS');
    }
    const tempDir = getTempDir();
    const rand = Math.random().toString(36).substring(2, 7);
    const tempScript = path.join(tempDir, `sapi_script_${Date.now()}_${rand}.ps1`);
    const tempTextFile = path.join(tempDir, `sapi_text_${Date.now()}_${rand}.txt`);
    const tempWav = path.join(tempDir, `sapi_${Date.now()}_${rand}.wav`);
    const tempMp3 = path.join(tempDir, `sapi_${Date.now()}_${rand}.mp3`);
    const ffmpegPath = getFfmpegPath();

    await fs.promises.writeFile(tempTextFile, text, 'utf8');

    let rateNum = 0;
    if (voiceSpeed) {
      const match = voiceSpeed.match(/([\d.]+)/);
      if (match) {
        const val = parseFloat(match[1]);
        if (val > 1.0) rateNum = Math.min(5, Math.round((val - 1.0) * 8));
        else if (val < 1.0) rateNum = Math.max(-5, Math.round((val - 1.0) * 8));
      }
    }

    const psContent = `
param([string]$textFile, [string]$wavFile, [int]$rate)
Add-Type -AssemblyName System.Speech
$synth = New-Object System.Speech.Synthesis.SpeechSynthesizer
$synth.Rate = $rate
$synth.SetOutputToWaveFile($wavFile)
$content = [System.IO.File]::ReadAllText($textFile, [System.Text.Encoding]::UTF8)
$synth.Speak($content)
$synth.Dispose()
`;

    await fs.promises.writeFile(tempScript, psContent, 'utf8');

    try {
      await execFileAsync('powershell', [
        '-NoProfile',
        '-ExecutionPolicy',
        'Bypass',
        '-File',
        tempScript,
        tempTextFile,
        tempWav,
        String(rateNum),
      ], { timeout: 300000 });

      if (!fs.existsSync(tempWav)) {
        throw new Error('Windows SAPI synthesis did not produce output WAV.');
      }

      await execFileAsync(ffmpegPath, ['-y', '-i', tempWav, '-c:a', 'libmp3lame', '-b:a', '192k', tempMp3], { timeout: 120000 });
      const mp3Buf = await fs.promises.readFile(tempMp3);
      return mp3Buf;
    } finally {
      if (fs.existsSync(tempScript)) await fs.promises.unlink(tempScript).catch(() => {});
      if (fs.existsSync(tempTextFile)) await fs.promises.unlink(tempTextFile).catch(() => {});
      if (fs.existsSync(tempWav)) await fs.promises.unlink(tempWav).catch(() => {});
      if (fs.existsSync(tempMp3)) await fs.promises.unlink(tempMp3).catch(() => {});
    }
  }

  private async generateSilentAudioBuffer(durationSec: number): Promise<Buffer> {
    const ffmpegPath = getFfmpegPath();
    const tempDir = getTempDir();
    const tempOut = path.join(tempDir, `silent_buf_${Date.now()}_${Math.random().toString(36).substring(2, 7)}.mp3`);
    try {
      await execFileAsync(ffmpegPath, [
        '-y',
        '-f', 'lavfi',
        '-i', 'anullsrc=r=44100:cl=stereo',
        '-t', String(Math.max(1, durationSec)),
        '-c:a', 'libmp3lame',
        '-b:a', '128k',
        tempOut,
      ]);
      if (fs.existsSync(tempOut)) {
        return await fs.promises.readFile(tempOut);
      }
    } catch (err: any) {
      console.warn('[VoiceProvider] FFmpeg silent fallback audio error:', err.message);
    } finally {
      if (fs.existsSync(tempOut)) {
        await fs.promises.unlink(tempOut).catch(() => {});
      }
    }
    return Buffer.alloc(2048, 0);
  }

  async generateVoiceover(params: {
    text: string;
    voiceName?: string;
    voiceSpeed?: string;
    language?: string;
    projectId?: string;
    userPlan?: string;
  }): Promise<{ audioBuffer: Buffer; durationSec: number; format: string }> {
    const cleanText = params.text.trim();
    if (!cleanText) {
      throw new Error('Voiceover narration text is empty.');
    }

    const wordCount = cleanText.split(/\s+/).filter(Boolean).length;
    const estimatedDuration = Math.max(3, Math.round((wordCount / 2.3) * 10) / 10);
    const tempId = params.projectId || 'temp_' + Date.now();
    const tempDir = getTempDir(tempId);

    const userPlan = (params.userPlan || '').toLowerCase();
    const isExplicitlyFree = userPlan === 'free' || userPlan === 'demo';

    // Strict 2-Tier Voice Policy: Free tier requests for Pro ElevenLabs voices auto-downgrade to Cloudflare Aura-2
    let effectiveVoice = params.voiceName || 'cf-aura-orion';
    if (isExplicitlyFree) {
      const requested = (params.voiceName || '').toLowerCase();
      const isPaidRequested =
        requested.startsWith('el-') ||
        requested.startsWith('elevenlabs:') ||
        TILLERCAST_VOICE_CATALOG.some(
          (v) => v.tier === 'paid' && (v.id.toLowerCase() === requested || v.providerVoiceId === requested)
        );

      if (isPaidRequested) {
        console.warn(`[VoiceProvider] Free tier user requested Pro ElevenLabs voice "${params.voiceName}". Routing to Cloudflare Deepgram Aura-2 (Orion) at $0.0010 COGS.`);
        effectiveVoice = 'cf-aura-orion';
      }
    }

    let finalBuffer: Buffer | null = null;
    let selectedEngine = 'none';

    // Tier Route A: Free / Demo Users -> 100% Cloudflare Workers AI TTS (Deepgram Aura-2) Primary
    if (isExplicitlyFree && isCloudflareConfigured()) {
      try {
        finalBuffer = await this.synthesizeWithCloudflareTTS(cleanText, effectiveVoice, params.language);
        if (finalBuffer && finalBuffer.length > 500) {
          selectedEngine = 'Cloudflare Workers AI TTS (Aura-2)';
          console.log(`[VoiceProvider] Synthesized Free Demo voiceover via Cloudflare Workers AI (${finalBuffer.length} bytes, voice: ${effectiveVoice})`);
        }
      } catch (err: any) {
        console.warn(`[VoiceProvider] Cloudflare Workers AI TTS failed for free user (${err.message}). Trying fallback...`);
      }
    }

    // Tier Route B: Paid Users -> 100% ElevenLabs Turbo v2.5 Primary
    // Free tier must NEVER call ElevenLabs under any circumstances
    if (!isExplicitlyFree) {
      const elevenKey = getApiKey('elevenlabs') || process.env.ELEVENLABS_API_KEY;
      if (elevenKey && elevenKey.trim().length > 10 && !elevenKey.includes('placeholder')) {
        try {
          finalBuffer = await this.synthesizeWithElevenLabs(cleanText, effectiveVoice);
          if (finalBuffer && finalBuffer.length > 500) {
            selectedEngine = 'ElevenLabs Turbo v2.5';
            console.log(`[VoiceProvider] Synthesized Pro voiceover via ElevenLabs (${finalBuffer.length} bytes, voice: ${effectiveVoice})`);
          }
        } catch (err: any) {
          console.warn(`[VoiceProvider] ElevenLabs synthesis failed (${err.message}). Falling back to Cloudflare Workers AI TTS...`);
        }
      }
    }

    // Fallback: Cloudflare Workers AI TTS (if ElevenLabs failed or not configured)
    if ((!finalBuffer || finalBuffer.length < 500) && isCloudflareConfigured()) {
      try {
        finalBuffer = await this.synthesizeWithCloudflareTTS(cleanText, effectiveVoice, params.language);
        if (finalBuffer && finalBuffer.length > 500) {
          selectedEngine = 'Cloudflare Workers AI TTS';
          console.log(`[VoiceProvider] Synthesized fallback voiceover via Cloudflare Workers AI TTS (${finalBuffer.length} bytes, voice: ${effectiveVoice})`);
        }
      } catch (err: any) {
        console.warn(`[VoiceProvider] Cloudflare Workers AI TTS fallback failed (${err.message}). Falling back to Azure Speech...`);
      }
    }

    // Fallback: Azure Cognitive Speech API
    if (!finalBuffer || finalBuffer.length < 500) {
      try {
        finalBuffer = await this.synthesizeWithAzureSpeech(cleanText, effectiveVoice, params.language);
        if (finalBuffer && finalBuffer.length > 500) {
          selectedEngine = 'Azure Cognitive Speech';
          console.log(`[VoiceProvider] Synthesized voiceover via Azure Cognitive Speech (${finalBuffer.length} bytes, voice: ${this.resolveAzureVoice(effectiveVoice, params.language)})`);
        }
      } catch (err: any) {
        if (getApiKey('azure') || getApiKey('azure_speech') || process.env.AZURE_SPEECH_KEY || process.env.AZURE_SPEECH_API_KEY) {
          console.warn(`[VoiceProvider] Azure Speech synthesis failed (${err.message}). Falling back to Google Neural Stream...`);
        }
      }
    }

    // Fallback: Google Speech Neural Stream
    if (!finalBuffer || finalBuffer.length < 500) {
      try {
        finalBuffer = await this.synthesizeWithGoogleTTS(cleanText, params.language || 'en');
        if (finalBuffer && finalBuffer.length > 500) {
          selectedEngine = 'Google Neural Stream';
          console.log(`[VoiceProvider] Synthesized voiceover via Google Neural Stream (${finalBuffer.length} bytes, lang: ${params.language || 'en'})`);
        }
      } catch (err: any) {
        console.warn(`[VoiceProvider] Google Speech stream failed (${err.message}). Trying OS fallbacks...`);
      }
    }

    // Fallback: Windows SAPI Synthesizer (Windows only)
    if (!finalBuffer || finalBuffer.length < 500) {
      try {
        finalBuffer = await this.synthesizeWithWindowsSAPI(cleanText, params.voiceSpeed);
        if (finalBuffer && finalBuffer.length > 500) {
          selectedEngine = 'Windows SAPI';
        }
      } catch {}
    }

    // Fail closed: Throw typed EngineError if all voice engines fail
    if (!finalBuffer || finalBuffer.length < 500) {
      throw new EngineError('NO_VALID_AUDIO', 'All voice synthesis engines failed to produce valid audio.');
    }

    // Probe real duration with FFmpeg
    const probePath = path.join(tempDir, `probe_audio_${Date.now()}.mp3`);
    let realDuration = estimatedDuration;

    try {
      await fs.promises.writeFile(probePath, finalBuffer);
      const info = await inspectMedia(probePath);
      if (info.durationSec && info.durationSec > 0) {
        realDuration = info.durationSec;
      }
    } catch {
      // keep estimated
    } finally {
      if (fs.existsSync(probePath)) {
        await fs.promises.unlink(probePath).catch(() => {});
      }
    }

    console.log(`[VoiceProvider] Final voiceover ready: ${finalBuffer.length} bytes, duration: ${realDuration}s, engine: ${selectedEngine}`);

    return {
      audioBuffer: finalBuffer,
      durationSec: realDuration,
      format: 'mp3',
    };
  }
}

export const voiceProvider: VoiceProvider = new MultiEngineVoiceProvider();
