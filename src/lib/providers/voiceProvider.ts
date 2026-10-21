import path from 'path';
import fs from 'fs';
import { execFile } from 'child_process';
import util from 'util';
import { storage, getTempDir } from '../storage';
import { inspectMedia, getFfmpegPath } from './videoProvider';
import { getApiKey } from '../db';
import { EngineError } from '../video/engineErrors';

const execFileAsync = util.promisify(execFile);

export interface VoiceProvider {
  generateVoiceover(params: {
    text: string;
    voiceName?: string;
    voiceSpeed?: string;
    language?: string;
    projectId?: string;
  }): Promise<{ audioBuffer: Buffer; durationSec: number; format: string }>;
}

class MultiEngineVoiceProvider implements VoiceProvider {
  private async sleep(ms: number) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // Curated ElevenLabs Studio Voices
  private static readonly ELEVENLABS_VOICE_MAP: Record<string, string> = {
    'rachel': '21m00Tcm4TlvDq8ikWAM',   // Rachel (Calm, Professional Studio)
    'adam': 'pNInz6obpgDQGcFmaJgB',     // Adam (Deep, Authoritative)
    'antoni': 'ErXwobaYiN019PkySvjV',   // Antoni (Energetic, Documentary)
    'bella': 'EXAVITQu4vr4xnSDxMaL',    // Bella (Warm, Engaging)
    'josh': 'TxGEqnHWrfWFTfGW9XjX',     // Josh (Dynamic, Narration)
    'arnold': 'VR6AewLTigWG4xSOukaG',   // Arnold (Crisp, Narrative)
    'domi': 'AZnzlk1XvdvUeBnXmlld',     // Domi (Confident, Strong)
    'sam': 'yoZ06aMxZJJ28mfd3POQ',      // Sam (Natural, Conversational)
  };

  // Mapped Microsoft Edge Neural Voices
  private static readonly EDGE_VOICE_MAP: Record<string, string> = {
    'rachel': 'en-US-JennyNeural',
    'adam': 'en-US-GuyNeural',
    'antoni': 'en-US-ChristopherNeural',
    'bella': 'en-US-AriaNeural',
    'josh': 'en-US-EricNeural',
    'arnold': 'en-US-DavisNeural',
    'domi': 'en-US-MichelleNeural',
    'sam': 'en-US-BrianNeural',
    'christopher': 'en-US-ChristopherNeural',
    'jenny': 'en-US-JennyNeural',
    'guy': 'en-US-GuyNeural',
    'aria': 'en-US-AriaNeural',
    'studio voice 1': 'en-US-JennyNeural',
    'studio voice 2': 'en-US-GuyNeural',
    'studio voice 3': 'en-US-ChristopherNeural',
    'studio voice 4': 'en-US-AriaNeural',
    'studio voice 5': 'en-US-ChristopherNeural',
    // Language-specific defaults
    'en': 'en-US-ChristopherNeural',
    'es': 'es-ES-AlvaroNeural',
    'fr': 'fr-FR-HenriNeural',
    'de': 'de-DE-ConradNeural',
    'hi': 'hi-IN-MadhurNeural',
    'ur': 'ur-PK-AsadNeural',
    'ar': 'ar-SA-HamedNeural',
    'pt': 'pt-BR-AntonioNeural',
    'it': 'it-IT-DiegoNeural',
  };

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
    // Direct Custom Cloned Voice ID (typically 15-35 alphanumeric chars)
    if (/^[a-zA-Z0-9_-]{15,35}$/.test(clean)) {
      return clean;
    }
    return '21m00Tcm4TlvDq8ikWAM'; // Default Rachel
  }

  private resolveEdgeVoice(voiceName?: string, language?: string): string {
    if (voiceName) {
      const clean = voiceName.trim();
      // If voice name already matches Edge neural format (e.g., en-US-ChristopherNeural)
      if (/^[a-z]{2,3}-[A-Z]{2,3}-.+Neural$/i.test(clean)) {
        return clean;
      }
      let key = clean.toLowerCase();
      if (key.startsWith('elevenlabs:')) {
        key = key.replace('elevenlabs:', '').trim();
      }
      if (MultiEngineVoiceProvider.EDGE_VOICE_MAP[key]) {
        return MultiEngineVoiceProvider.EDGE_VOICE_MAP[key];
      }
    }

    if (language) {
      const langKey = language.trim().toLowerCase().substring(0, 2);
      if (MultiEngineVoiceProvider.EDGE_VOICE_MAP[langKey]) {
        return MultiEngineVoiceProvider.EDGE_VOICE_MAP[langKey];
      }
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
          model_id: 'eleven_multilingual_v2',
          voice_settings: {
            stability: 0.5,
            similarity_boost: 0.75,
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
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&apos;');
  }

  // Engine 0.5: Azure Cognitive Speech API (Licensed Commercial Enterprise Voice Tier)
  public async synthesizeWithAzureSpeech(text: string, voiceName?: string, language?: string): Promise<Buffer> {
    const apiKey = getApiKey('azure') || getApiKey('azure_speech') || process.env.AZURE_SPEECH_KEY || process.env.AZURE_SPEECH_API_KEY;
    if (!apiKey) throw new Error('Azure Speech API key not configured');

    const region = process.env.AZURE_SPEECH_REGION || 'eastus';
    const targetVoice = this.resolveEdgeVoice(voiceName, language);
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
          'User-Agent': 'AUTORA-SaaS-Engine',
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

  // Engine 1: Microsoft Edge Neural TTS Engine (Free High-Quality Neural Voices)
  private async synthesizeWithMsEdgeTTS(text: string, voiceName?: string, language?: string): Promise<Buffer> {
    const { MsEdgeTTS, OUTPUT_FORMAT } = await import('msedge-tts');
    const targetVoice = this.resolveEdgeVoice(voiceName, language);

    // Split text into paragraphs/sentences under 550 characters to prevent WebSocket timeouts
    const paragraphs = text.split(/\n\n+/).filter(Boolean);
    const chunks: string[] = [];
    let currentChunk = '';

    for (const p of paragraphs) {
      if (p.length <= 550) {
        if ((currentChunk + ' ' + p).length > 550 && currentChunk.trim()) {
          chunks.push(currentChunk.trim());
          currentChunk = p;
        } else {
          currentChunk += (currentChunk ? ' ' : '') + p;
        }
      } else {
        // Break large single paragraph into sentences
        const sentences = p.match(/[^.!?]+[.!?]+|\S+/g) || [p];
        for (const s of sentences) {
          if ((currentChunk + ' ' + s).length > 550 && currentChunk.trim()) {
            chunks.push(currentChunk.trim());
            currentChunk = s;
          } else {
            currentChunk += (currentChunk ? ' ' : '') + s;
          }
        }
      }
    }
    if (currentChunk.trim()) chunks.push(currentChunk.trim());

    if (chunks.length === 0) {
      throw new Error('No valid text chunks to synthesize with Edge TTS');
    }

    const chunkBuffers: Buffer[] = [];

    for (let i = 0; i < chunks.length; i++) {
      const chunkText = chunks[i];
      let tts = new MsEdgeTTS();
      try {
        try {
          await tts.setMetadata(targetVoice, OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3, {});
        } catch {
          // If custom voice metadata fails, fall back to bulletproof default
          await tts.setMetadata('en-US-ChristopherNeural', OUTPUT_FORMAT.AUDIO_24KHZ_96KBITRATE_MONO_MP3, {});
        }

        const buf = await new Promise<Buffer>((resolve, reject) => {
          const timeout = setTimeout(() => {
            try { tts.close(); } catch {}
            reject(new Error(`Edge TTS chunk ${i} timed out`));
          }, 25000);

          try {
            const { audioStream } = tts.toStream(chunkText);
            const parts: Buffer[] = [];
            audioStream.on('data', (d: Buffer) => parts.push(d));
            audioStream.on('end', () => {
              clearTimeout(timeout);
              try { tts.close(); } catch {}
              resolve(Buffer.concat(parts));
            });
            audioStream.on('error', (err) => {
              clearTimeout(timeout);
              try { tts.close(); } catch {}
              reject(err);
            });
          } catch (streamErr) {
            clearTimeout(timeout);
            try { tts.close(); } catch {}
            reject(streamErr);
          }
        });

        if (buf && buf.length > 200) {
          chunkBuffers.push(buf);
        }
      } catch (err: any) {
        console.warn(`[VoiceProvider] Edge TTS chunk ${i} failed: ${err.message}. Retrying with universal fallback...`);
        // Retry single chunk via Google TTS
        try {
          const gBuf = await this.synthesizeWithGoogleTTS(chunkText, language || 'en');
          if (gBuf && gBuf.length > 200) {
            chunkBuffers.push(gBuf);
          }
        } catch {}
      }
    }

    if (chunkBuffers.length === 0) {
      throw new Error('Edge TTS did not produce any valid audio buffers');
    }

    return Buffer.concat(chunkBuffers);
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
  }): Promise<{ audioBuffer: Buffer; durationSec: number; format: string }> {
    const cleanText = params.text.trim();
    if (!cleanText) {
      throw new Error('Voiceover narration text is empty.');
    }

    const wordCount = cleanText.split(/\s+/).filter(Boolean).length;
    const estimatedDuration = Math.max(3, Math.round((wordCount / 2.3) * 10) / 10);
    const tempId = params.projectId || 'temp_' + Date.now();
    const tempDir = getTempDir(tempId);

    let finalBuffer: Buffer | null = null;
    let selectedEngine = 'none';

    // 0. Try ElevenLabs if configured
    try {
      finalBuffer = await this.synthesizeWithElevenLabs(cleanText, params.voiceName);
      if (finalBuffer && finalBuffer.length > 500) {
        selectedEngine = 'ElevenLabs';
        console.log(`[VoiceProvider] Synthesized voiceover via ElevenLabs (${finalBuffer.length} bytes, voice: ${params.voiceName || 'default'})`);
      }
    } catch (err: any) {
      if (getApiKey('elevenlabs') || process.env.ELEVENLABS_API_KEY) {
        console.warn(`[VoiceProvider] ElevenLabs synthesis failed (${err.message}). Falling back to Azure Speech...`);
      }
    }

    // 1. Try Azure Cognitive Speech API (Licensed Commercial Enterprise Voice Tier)
    if (!finalBuffer || finalBuffer.length < 500) {
      try {
        finalBuffer = await this.synthesizeWithAzureSpeech(cleanText, params.voiceName, params.language);
        if (finalBuffer && finalBuffer.length > 500) {
          selectedEngine = 'Azure Cognitive Speech';
          console.log(`[VoiceProvider] Synthesized voiceover via Azure Cognitive Speech (${finalBuffer.length} bytes, voice: ${this.resolveEdgeVoice(params.voiceName, params.language)})`);
        }
      } catch (err: any) {
        if (getApiKey('azure') || getApiKey('azure_speech') || process.env.AZURE_SPEECH_KEY || process.env.AZURE_SPEECH_API_KEY) {
          console.warn(`[VoiceProvider] Azure Speech synthesis failed (${err.message}). Falling back to Edge TTS sandbox...`);
        }
      }
    }

    // 2. Try Microsoft Edge Neural TTS (Free Sandbox dev mode only)
    if (!finalBuffer || finalBuffer.length < 500) {
      if (process.env.NODE_ENV === 'production' && process.env.ALLOW_DEV_TTS !== '1') {
        throw new EngineError('STAGE_EXECUTION_FAILED', 'Licensed Azure Cognitive Speech API credentials required in production mode');
      }
      try {
        finalBuffer = await this.synthesizeWithMsEdgeTTS(cleanText, params.voiceName, params.language);
        if (finalBuffer && finalBuffer.length > 500) {
          selectedEngine = 'Microsoft Edge Neural Sandbox';
          console.log(`[VoiceProvider] Synthesized voiceover via Microsoft Edge Neural Sandbox (${finalBuffer.length} bytes, mapped voice: ${this.resolveEdgeVoice(params.voiceName, params.language)})`);
        }
      } catch (err: any) {
        console.warn(`[VoiceProvider] Microsoft Edge TTS failed (${err.message}). Trying Google Neural Stream...`);
      }
    }

    // 2. Try Google Speech Neural Stream (Universal fallback)
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

    // 3. Fallback to Windows SAPI Synthesizer (Windows only)
    if (!finalBuffer || finalBuffer.length < 500) {
      try {
        finalBuffer = await this.synthesizeWithWindowsSAPI(cleanText, params.voiceSpeed);
        if (finalBuffer && finalBuffer.length > 500) {
          selectedEngine = 'Windows SAPI';
        }
      } catch {}
    }

    // 4. Fail closed: Throw typed EngineError if all voice engines fail
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
