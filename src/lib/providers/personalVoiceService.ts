import path from 'path';
import fs from 'fs';
import { execFile } from 'child_process';
import util from 'util';
import { getFfmpegPath } from './videoProvider';
import { storage } from '../storage';
import { getApiKey } from '../db';

const execFileAsync = util.promisify(execFile);

export interface VoiceValidationResult {
  isValid: boolean;
  durationSec: number;
  isSilent: boolean;
  mimeType: string;
  errorMessage?: string;
}

export interface ClonedVoiceResult {
  voiceId: string;
  voiceType: 'personal' | 'standard';
  voiceLabel: string;
  provider: 'elevenlabs' | 'edge_tts_fallback';
}

export class PersonalVoiceService {
  /**
   * Validates user audio sample (duration, silence, format)
   */
  async validateAudioSample(filePath: string): Promise<VoiceValidationResult> {
    const ffmpegPath = getFfmpegPath();
    if (!fs.existsSync(filePath)) {
      return { isValid: false, durationSec: 0, isSilent: true, mimeType: '', errorMessage: 'Audio file not found' };
    }

    let stderr = '';
    try {
      // Run ffprobe / ffmpeg with silencedetect to measure duration and verify audio is not completely silent
      const res = await execFileAsync(ffmpegPath, [
        '-i', filePath,
        '-af', 'silencedetect=noise=-30dB:d=0.5',
        '-f', 'null',
        '-'
      ]);
      stderr = res.stderr || '';
    } catch (err: any) {
      stderr = err.stderr || '';
    }

    // 1. Duration extraction
    let durationSec = 0;
    const durationMatch = stderr.match(/Duration:\s*(\d+):(\d+):(\d+\.?\d*)/);
    if (durationMatch) {
      const hours = parseFloat(durationMatch[1]);
      const mins = parseFloat(durationMatch[2]);
      const secs = parseFloat(durationMatch[3]);
      durationSec = hours * 3600 + mins * 60 + secs;
    }

    if (durationSec < 2.5) {
      return {
        isValid: false,
        durationSec,
        isSilent: false,
        mimeType: 'audio',
        errorMessage: 'Voice sample is too short. Please record or upload at least 3 seconds of clear speech.',
      };
    }

    if (durationSec > 180) {
      return {
        isValid: false,
        durationSec,
        isSilent: false,
        mimeType: 'audio',
        errorMessage: 'Voice sample is too long. Please provide a sample under 3 minutes.',
      };
    }

    // 2. Silence detection
    // If silence duration covers nearly the whole file, mark as silent
    const silenceMatches = Array.from(stderr.matchAll(/silence_duration:\s*([\d.]+)/g));
    let totalSilence = 0;
    for (const m of silenceMatches) {
      totalSilence += parseFloat(m[1]);
    }

    const isSilent = durationSec > 0 && totalSilence >= durationSec * 0.92;
    if (isSilent) {
      return {
        isValid: false,
        durationSec,
        isSilent: true,
        mimeType: 'audio',
        errorMessage: 'Audio is silent or too quiet. Please speak clearly into your microphone.',
      };
    }

    return {
      isValid: true,
      durationSec,
      isSilent: false,
      mimeType: 'audio/mpeg',
    };
  }

  /**
   * Attempts to clone voice via ElevenLabs API if key configured.
   * Otherwise returns a curated Standard AI Voice fallback with clear labeling.
   */
  async setupPersonalVoice(params: {
    userId: string;
    sampleFilePath: string;
    voiceName?: string;
  }): Promise<ClonedVoiceResult> {
    const { userId, sampleFilePath, voiceName = 'My Personal Voice' } = params;
    const elevenKey = getApiKey('elevenlabs') || process.env.ELEVENLABS_API_KEY;

    if (elevenKey && fs.existsSync(sampleFilePath)) {
      try {
        const formData = new FormData();
        formData.append('name', `${voiceName} (${userId.substring(0, 8)})`);
        formData.append('description', `Personal AI voice for user ${userId}`);

        const fileBuffer = await fs.promises.readFile(sampleFilePath);
        const blob = new Blob([fileBuffer], { type: 'audio/mpeg' });
        formData.append('files', blob, 'sample.mp3');

        const res = await fetch('https://api.elevenlabs.io/v1/voices/add', {
          method: 'POST',
          headers: {
            'xi-api-key': elevenKey,
          },
          body: formData,
        });

        if (res.ok) {
          const data = await res.json();
          if (data && data.voice_id) {
            return {
              voiceId: data.voice_id,
              voiceType: 'personal',
              voiceLabel: 'Personal Voice (Cloned)',
              provider: 'elevenlabs',
            };
          }
        }
      } catch (err: any) {
        console.warn('[PersonalVoiceService] ElevenLabs voice cloning failed, falling back to standard voice:', err.message);
      }
    }

    // Standard AI Voice fallback (clear labeling, zero fake cloning claims)
    return {
      voiceId: 'en-US-AndrewMultilingualNeural',
      voiceType: 'standard',
      voiceLabel: 'Standard AI Voice (Andrew Studio)',
      provider: 'edge_tts_fallback',
    };
  }
}

export const personalVoiceService = new PersonalVoiceService();
