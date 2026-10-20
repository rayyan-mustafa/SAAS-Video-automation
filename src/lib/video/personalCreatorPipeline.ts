import path from 'path';
import fs from 'fs';
import { execFile } from 'child_process';
import util from 'util';
import {
  getPersonalCreatorProject,
  getPersonalCreatorScenes,
  createPersonalCreatorScenes,
  updatePersonalCreatorProject,
  updatePersonalCreatorScene,
  getPersonalCreatorAsset,
  createPersonalCreatorAsset,
  PersonalCreatorProject,
} from '../db';
import { avatarProvider } from '../providers/avatarProvider';
import { voiceProvider } from '../providers/voiceProvider';
import { personalCreatorScriptService } from '../providers/personalCreatorScriptService';
import { storage, getTempDir } from '../storage';
import { getFfmpegPath } from '../providers/videoProvider';
import { getApiKey } from '../db';

const execFileAsync = util.promisify(execFile);

export class PersonalCreatorPipeline {
  /**
   * Main asynchronous entry point for processing a Personal Creator video project
   */
  async processProject(projectId: string, userId: string): Promise<void> {
    try {
      const project = getPersonalCreatorProject(projectId, userId);
      if (!project) {
        throw new Error(`Personal creator project not found: ${projectId}`);
      }

      // Update state to PROCESSING
      updatePersonalCreatorProject(projectId, userId, {
        status: 'PROCESSING',
        progress: 10,
        current_stage_label: 'Initializing pipeline...',
        error_message: null,
      });

      let scenes = getPersonalCreatorScenes(projectId);
      if (!scenes || scenes.length === 0) {
        const scriptText = project.script || `Welcome to ${project.topic || 'Personal AI Creator'}. In this video we break down key insights, practical principles, and next steps for you.`;
        const analyzed = personalCreatorScriptService.analyzeCustomScript(scriptText, project.topic || 'Personal Video');
        createPersonalCreatorScenes(
          projectId,
          analyzed.scenes.map((s, idx) => ({
            scene_number: s.sceneNumber || (idx + 1),
            narration: s.narration,
            visual_prompt: s.visualPrompt,
            scene_topic: s.sceneTopic,
            duration: s.durationSec || 5,
            status: 'PENDING',
          }))
        );
        scenes = getPersonalCreatorScenes(projectId);
      }

      const tempDir = getTempDir(projectId);
      if (!fs.existsSync(tempDir)) {
        fs.mkdirSync(tempDir, { recursive: true });
      }

      // ─────────────────────────────────────────────────────────────
      // STAGE 1: VOICE GENERATION (20%)
      // ─────────────────────────────────────────────────────────────
      updatePersonalCreatorProject(projectId, userId, {
        status: 'GENERATING_VOICE',
        progress: 20,
        current_stage_label: 'Generating voiceover narration...',
      });

      const audioClips: string[] = [];
      const voiceToUse = project.voice_type === 'personal'
        ? (project as any).custom_voice_id || 'rachel'
        : 'rachel';

      for (let i = 0; i < scenes.length; i++) {
        const scene = scenes[i];
        const audioFileName = `voice_scene_${scene.scene_number}_${Date.now()}.mp3`;
        const audioPath = path.join(tempDir, audioFileName);

        try {
          const voiceRes = await voiceProvider.generateVoiceover({
            text: scene.narration,
            voiceName: voiceToUse,
            language: project.language,
            projectId,
          });

          if (!voiceRes.audioBuffer || voiceRes.audioBuffer.length < 500) {
            await this.generateSilentAudio(audioPath, scene.duration || 5);
          } else {
            await fs.promises.writeFile(audioPath, voiceRes.audioBuffer);
          }
          audioClips.push(audioPath);

          // Update scene duration with actual audio duration if available
          if (voiceRes.durationSec > 0) {
            updatePersonalCreatorScene(scene.id, { duration: Math.max(3, voiceRes.durationSec) });
          }
        } catch (err: any) {
          console.warn(`[PersonalCreatorPipeline] Voice generation error scene ${scene.scene_number}, using fallback tone:`, err.message);
          // Generate silent audio fallback
          await this.generateSilentAudio(audioPath, scene.duration || 5);
          audioClips.push(audioPath);
        }
      }

      // ─────────────────────────────────────────────────────────────
      // STAGE 2: AVATAR / PRESENTER GENERATION (40%)
      // ─────────────────────────────────────────────────────────────
      updatePersonalCreatorProject(projectId, userId, {
        status: 'GENERATING_AVATAR',
        progress: 40,
        current_stage_label: 'Generating presenter camera visual...',
      });

      // Find user photo asset
      let photoPath: string | null = null;
      const avatarAssetId = (project as any).avatar_asset_id;
      if (avatarAssetId) {
        const asset = getPersonalCreatorAsset(avatarAssetId, userId);
        if (asset && asset.storage_key) {
          const p = storage.getFilePath(asset.storage_key);
          if (fs.existsSync(p)) photoPath = p;
        }
      }

      // Fallback: look in user's profile or temp storage
      if (!photoPath) {
        const userAssetDir = path.join(process.cwd(), 'storage', 'personal-ai', userId, 'photos');
        if (fs.existsSync(userAssetDir)) {
          const files = fs.readdirSync(userAssetDir);
          if (files.length > 0) {
            photoPath = path.join(userAssetDir, files[0]);
          }
        }
      }

      // If still no photo, generate a stylized studio avatar still
      if (!photoPath || !fs.existsSync(photoPath)) {
        photoPath = path.join(tempDir, 'generated_presenter.jpg');
        await this.generateDefaultStudioPresenter(photoPath, project.style);
      }

      const presenterClips: string[] = [];
      let overallAvatarStatus = 'standard_presenter';

      for (let i = 0; i < scenes.length; i++) {
        const scene = scenes[i];
        const audioPath = audioClips[i];
        const clipRes = await avatarProvider.generatePresenterClip({
          projectId,
          sceneId: scene.id,
          photoPath,
          audioPath,
          durationSec: scene.duration || 5,
          aspectRatio: project.aspect_ratio as any,
          style: project.style as any,
          presenterPosition: project.presenter_position as any,
          presenterFraming: project.presenter_framing as any,
          cameraMotion: project.camera_motion as any,
        });

        presenterClips.push(clipRes.videoPath);
        if (clipRes.providerStatus === 'REAL') {
          overallAvatarStatus = 'real';
        }

        updatePersonalCreatorScene(scene.id, {
          avatar_video: clipRes.storageKey,
        });
      }

      // ─────────────────────────────────────────────────────────────
      // STAGE 3: B-ROLL VISUALS INTELLIGENCE (60%)
      // ─────────────────────────────────────────────────────────────
      updatePersonalCreatorProject(projectId, userId, {
        status: 'GENERATING_BROLL',
        progress: 60,
        current_stage_label: 'Synthesizing relevant B-roll visuals...',
        avatar_status: overallAvatarStatus,
      });

      const finalSceneClips: string[] = [];
      for (let i = 0; i < scenes.length; i++) {
        const scene = scenes[i];
        const presenterClip = presenterClips[i];

        // For scenes 3 & 4 (main points / examples), if style is VLOG or STORYTELLING, synthesize relevant B-roll cutaway
        const shouldAddBrollCutaway = (scene.scene_number === 3 || scene.scene_number === 4) &&
          (project.style === 'VLOG' || project.style === 'STORYTELLING' || project.style === 'EDUCATIONAL');

        if (shouldAddBrollCutaway) {
          const brollFileName = `broll_scene_${scene.scene_number}.mp4`;
          const brollPath = path.join(tempDir, brollFileName);

          try {
            await this.generateThematicBroll({
              prompt: scene.visual_prompt,
              topic: scene.scene_topic || project.topic || 'Technology',
              outputPath: brollPath,
              durationSec: scene.duration || 5,
              aspectRatio: project.aspect_ratio as any,
            });

            finalSceneClips.push(brollPath);
            updatePersonalCreatorScene(scene.id, { broll_asset: brollPath });
            continue;
          } catch (err: any) {
            console.warn('[PersonalCreatorPipeline] B-roll synthesis fallback to presenter:', err.message);
          }
        }

        // Default to presenter clip
        finalSceneClips.push(presenterClip);
      }

      // ─────────────────────────────────────────────────────────────
      // STAGE 4: RENDERING & COMPOSITION (85%)
      // ─────────────────────────────────────────────────────────────
      updatePersonalCreatorProject(projectId, userId, {
        status: 'RENDERING',
        progress: 85,
        current_stage_label: 'Finalizing composition, captions & audio...',
      });

      // Target resolution
      let width = 1920;
      let height = 1080;
      if (project.aspect_ratio === '9:16') {
        width = 1080;
        height = 1920;
      } else if (project.aspect_ratio === '1:1') {
        width = 1080;
        height = 1080;
      }

      // Final video output path in user's isolated storage
      const finalStorageKey = `personal-ai/${userId}/final/${projectId}/output.mp4`;
      const finalOutputPath = storage.getFilePath(finalStorageKey);
      const finalOutputDir = path.dirname(finalOutputPath);
      if (!fs.existsSync(finalOutputDir)) {
        fs.mkdirSync(finalOutputDir, { recursive: true });
      }

      // Composite clips with FFmpeg
      await this.composePersonalVideo({
        tempDir,
        finalSceneClips,
        audioClips,
        finalOutputPath,
        width,
        height,
        captionsEnabled: Boolean(project.captions_enabled),
        musicEnabled: Boolean(project.music_enabled),
        musicVolume: project.music_volume || 20,
      });

      // Register final video asset in database
      const finalStat = await fs.promises.stat(finalOutputPath);
      createPersonalCreatorAsset({
        userId,
        type: 'final_video',
        storageKey: finalStorageKey,
        mimeType: 'video/mp4',
        size: finalStat.size,
        metadata: {
          aspectRatio: project.aspect_ratio,
          width,
          height,
          duration: scenes.reduce((a, s) => a + (s.duration || 5), 0),
        },
      });

      // Mark project COMPLETED (100%)
      const finalVideoUrl = storage.getUrl(finalStorageKey);
      updatePersonalCreatorProject(projectId, userId, {
        status: 'COMPLETED',
        progress: 100,
        current_stage_label: 'Completed',
        final_video_url: finalVideoUrl,
        final_video_path: finalOutputPath,
        duration: scenes.reduce((a, s) => a + (s.duration || 5), 0),
      });

    } catch (err: any) {
      console.error(`[PersonalCreatorPipeline] Project ${projectId} failed:`, err);
      updatePersonalCreatorProject(projectId, userId, {
        status: 'FAILED',
        error_message: err.message || 'Video generation failed.',
        current_stage_label: 'Failed',
      });
    }
  }

  /**
   * Final FFmpeg composition: concats clips, mixes audio, applies music ducking and styling
   */
  private async composePersonalVideo(options: {
    tempDir: string;
    finalSceneClips: string[];
    audioClips: string[];
    finalOutputPath: string;
    width: number;
    height: number;
    captionsEnabled: boolean;
    musicEnabled: boolean;
    musicVolume: number;
  }): Promise<void> {
    const ffmpegPath = getFfmpegPath();
    const {
      tempDir,
      finalSceneClips,
      audioClips,
      finalOutputPath,
      width,
      height,
    } = options;

    // 1. Concat video clips
    const concatListPath = path.join(tempDir, 'video_concat.txt');
    const concatContent = finalSceneClips
      .filter((p) => fs.existsSync(p))
      .map((p) => `file '${p.replace(/\\/g, '/')}'`)
      .join('\n');
    await fs.promises.writeFile(concatListPath, concatContent, 'utf8');

    // 2. Concat audio clips with strict file size and stream validation
    const validAudioClips: string[] = [];
    for (const p of audioClips) {
      if (fs.existsSync(p)) {
        const stat = await fs.promises.stat(p);
        if (stat.size >= 500) {
          validAudioClips.push(p);
        }
      }
    }

    const concatAudioOut = path.join(tempDir, 'merged_audio.mp3');
    let hasMergedAudio = false;

    if (validAudioClips.length > 0) {
      const audioConcatPath = path.join(tempDir, 'audio_concat.txt');
      const audioConcatContent = validAudioClips
        .map((p) => `file '${p.replace(/\\/g, '/')}'`)
        .join('\n');
      await fs.promises.writeFile(audioConcatPath, audioConcatContent, 'utf8');

      try {
        await execFileAsync(ffmpegPath, [
          '-y',
          '-f', 'concat',
          '-safe', '0',
          '-i', audioConcatPath,
          '-c:a', 'libmp3lame',
          '-b:a', '192k',
          '-ar', '44100',
          concatAudioOut,
        ]);
        if (fs.existsSync(concatAudioOut) && (await fs.promises.stat(concatAudioOut)).size >= 1000) {
          hasMergedAudio = true;
        }
      } catch (concatErr: any) {
        console.warn('[PersonalCreatorPipeline] Concat demuxer failed, trying filter_complex:', concatErr.message);
      }

      // Fallback 1: complex filter concat if demuxer had header differences
      if (!hasMergedAudio) {
        try {
          const filterInputs = validAudioClips.map((_, idx) => `[${idx}:a]`).join('');
          const filterArgs: string[] = ['-y'];
          validAudioClips.forEach((clip) => filterArgs.push('-i', clip));
          filterArgs.push(
            '-filter_complex', `${filterInputs}concat=n=${validAudioClips.length}:v=0:a=1[aout]`,
            '-map', '[aout]',
            '-c:a', 'libmp3lame',
            '-b:a', '192k',
            '-ar', '44100',
            concatAudioOut
          );
          await execFileAsync(ffmpegPath, filterArgs);
          if (fs.existsSync(concatAudioOut) && (await fs.promises.stat(concatAudioOut)).size >= 1000) {
            hasMergedAudio = true;
          }
        } catch (filterErr: any) {
          console.warn('[PersonalCreatorPipeline] Filter concat failed, generating silent track...', filterErr.message);
        }
      }
    }

    // Fallback 2: Generate valid silent audio track matching video duration
    if (!hasMergedAudio) {
      try {
        const estDuration = Math.max(5, finalSceneClips.length * 5);
        await this.generateSilentAudio(concatAudioOut, estDuration);
        if (fs.existsSync(concatAudioOut) && (await fs.promises.stat(concatAudioOut)).size >= 1000) {
          hasMergedAudio = true;
        }
      } catch (silenceErr: any) {
        console.warn('[PersonalCreatorPipeline] Silent audio generation failed:', silenceErr.message);
      }
    }

    // 3. Render final output
    const videoFilter = `scale=${width}:${height}:force_original_aspect_ratio=increase,crop=${width}:${height},format=yuv420p`;

    const args = [
      '-y',
      '-f', 'concat',
      '-safe', '0',
      '-i', concatListPath,
    ];

    if (hasMergedAudio) {
      args.push('-i', concatAudioOut);
    }

    args.push(
      '-vf', videoFilter,
      '-c:v', 'libx264',
      '-preset', 'veryfast',
      '-crf', '21',
      '-pix_fmt', 'yuv420p',
      '-r', '30'
    );

    if (hasMergedAudio) {
      args.push('-c:a', 'aac', '-b:a', '192k', '-shortest');
    }

    args.push(finalOutputPath);

    try {
      await execFileAsync(ffmpegPath, args);
    } catch (renderErr: any) {
      console.warn('[PersonalCreatorPipeline] Primary render with audio failed, falling back to video-only render:', renderErr.message);
      // Video-only fallback render ensures video composition never fatally crashes
      const videoOnlyArgs = [
        '-y',
        '-f', 'concat',
        '-safe', '0',
        '-i', concatListPath,
        '-vf', videoFilter,
        '-c:v', 'libx264',
        '-preset', 'veryfast',
        '-crf', '21',
        '-pix_fmt', 'yuv420p',
        '-r', '30',
        finalOutputPath,
      ];
      await execFileAsync(ffmpegPath, videoOnlyArgs);
    }
  }

  /**
   * Synthesize thematic B-roll using Cloudflare Flux or dynamic procedural generator
   */
  private async generateThematicBroll(options: {
    prompt: string;
    topic: string;
    outputPath: string;
    durationSec: number;
    aspectRatio: '16:9' | '9:16' | '1:1';
  }): Promise<void> {
    const ffmpegPath = getFfmpegPath();
    const { prompt, topic, outputPath, durationSec, aspectRatio } = options;

    let targetWidth = 1920;
    let targetHeight = 1080;
    if (aspectRatio === '9:16') {
      targetWidth = 1080;
      targetHeight = 1920;
    } else if (aspectRatio === '1:1') {
      targetWidth = 1080;
      targetHeight = 1080;
    }

    const tempStill = outputPath.replace('.mp4', '.jpg');

    // 1. Try Cloudflare Workers AI Flux
    let stillGenerated = false;
    const cfAccountId = getApiKey('cloudflare_account_id') || getApiKey('cloudflare_account') || process.env.CLOUDFLARE_ACCOUNT_ID;
    const cfToken = getApiKey('cloudflare_api_token') || getApiKey('cloudflare') || process.env.CLOUDFLARE_API_TOKEN;

    if (cfAccountId && cfToken) {
      try {
        const res = await fetch(
          `https://api.cloudflare.com/client/v4/accounts/${cfAccountId}/ai/run/@cf/black-forest-labs/flux-1-schnell`,
          {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${cfToken}`,
              'Content-Type': 'application/json',
            },
            body: JSON.stringify({
              prompt: `${prompt}, cinematic 4k B-roll for YouTube video, dramatic lighting, high depth of field`,
            }),
          }
        );

        if (res.ok) {
          const data = await res.json();
          if (data.result && data.result.image) {
            const buf = Buffer.from(data.result.image, 'base64');
            await fs.promises.writeFile(tempStill, buf);
            stillGenerated = true;
          }
        }
      } catch {
        stillGenerated = false;
      }
    }

    // 2. Procedural studio graphic fallback if Flux unavailable
    if (!stillGenerated) {
      const colorBg = topic.toLowerCase().includes('finance') ? '0x0d1b2a' : '0x141414';
      const genArgs = [
        '-y',
        '-f', 'lavfi',
        '-i', `color=c=${colorBg}:s=${targetWidth}x${targetHeight}:d=${durationSec}`,
        '-vf', `drawtext=text='${topic.replace(/[':\\]/g, '')}':fontcolor=white:fontsize=48:x=(w-text_w)/2:y=(h-text_h)/2`,
        '-c:v', 'libx264',
        '-t', durationSec.toString(),
        outputPath,
      ];
      await execFileAsync(ffmpegPath, genArgs);
      return;
    }

    // Animate the still with slow zoom
    const totalFrames = Math.max(30, Math.round(durationSec * 30));
    const filter = [
      `scale=${targetWidth * 2}:${targetHeight * 2}:force_original_aspect_ratio=increase,crop=${targetWidth * 2}:${targetHeight * 2}`,
      `zoompan=z='min(zoom+0.0008,1.15)':x='(iw-iw/zoom)/2':y='(ih-ih/zoom)/2':d=${totalFrames}:s=${targetWidth}x${targetHeight}:fps=30`,
      `eq=contrast=1.06:brightness=0.01:saturation=1.08,vignette=PI/5,format=yuv420p`
    ].join(',');

    await execFileAsync(ffmpegPath, [
      '-y',
      '-loop', '1',
      '-i', tempStill,
      '-t', durationSec.toFixed(2),
      '-vf', filter,
      '-c:v', 'libx264',
      '-preset', 'veryfast',
      '-pix_fmt', 'yuv420p',
      '-r', '30',
      outputPath,
    ]);
  }

  /**
   * Generates a sleek studio presenter still if user has not uploaded a photo
   */
  private async generateDefaultStudioPresenter(outputPath: string, style: string): Promise<void> {
    const ffmpegPath = getFfmpegPath();
    const studioColor = style === 'PODCAST' ? '0x1a1a24' : '0x111118';
    await execFileAsync(ffmpegPath, [
      '-y',
      '-f', 'lavfi',
      '-i', `color=c=${studioColor}:s=1920x1080:d=1`,
      '-vf', `drawtext=text='Studio Presenter':fontcolor=0x888888:fontsize=36:x=(w-text_w)/2:y=(h-text_h)/2`,
      '-vframes', '1',
      outputPath,
    ]);
  }

  /**
   * Generates silent audio track fallback
   */
  private async generateSilentAudio(outputPath: string, durationSec: number): Promise<void> {
    const ffmpegPath = getFfmpegPath();
    await execFileAsync(ffmpegPath, [
      '-y',
      '-f', 'lavfi',
      '-i', `anullsrc=r=44100:cl=stereo`,
      '-t', durationSec.toString(),
      '-c:a', 'libmp3lame',
      '-q:a', '2',
      outputPath,
    ]);
  }
}

export const personalCreatorPipeline = new PersonalCreatorPipeline();
