import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { getDb, ContentProject, Channel, VideoScene, GeneratedAsset, VideoJob, ProjectTelemetry, ProjectMetadata } from '../db';
import { aiProvider, ScriptStructure, GeneratedScene } from '../providers/aiProvider';
import { videoProvider } from '../providers/videoProvider';
import { voiceProvider } from '../providers/voiceProvider';
import { subtitleProvider } from '../providers/subtitleProvider';
import { ffmpegCompositor } from '../providers/ffmpegCompositor';
import { thumbnailProvider } from '../providers/thumbnailProvider';
import { storage } from '../storage';
import { sceneQualityChecker, QualityReport } from '../video/qualityControl';
import { resolveGlobalVisualStyle } from '../video/visualStyles';
import { AspectRatio } from '../providers/video-provider.types';
import { EngineError } from '../video/engineErrors';
import { issuePriceDeltaRefund, calculatePriceDeltaRefund } from '../billing/refundEngine';
import { generateVideoPlan } from '../video/planGenerator';
import { resolveLengthBand, isWithinBandLimit } from '../video/lengthBands';
import { generateStoryboardPreview } from '../video/storyboardPreview';
import { calculateWorstCaseQuote, reconcilePriceLockRefund } from '../billing/priceLockEngine';

export type PipelineStage = 'PLAN' | 'VOICE' | 'SCENES' | 'VIDEO' | 'SUBTITLES' | 'FINAL_VIDEO' | 'THUMBNAIL';

export const PIPELINE_STAGES: PipelineStage[] = [
  'PLAN',
  'VOICE',
  'SCENES',
  'VIDEO',
  'SUBTITLES',
  'FINAL_VIDEO',
  'THUMBNAIL',
];

export class VideoPipelineWorker {
  private activeJobs = new Set<string>();
  private waitingQueue: Array<{ projectId: string; fromStage?: PipelineStage }> = [];
  private maxConcurrency = 2;

  public startProjectPipeline(projectId: string, fromStage?: PipelineStage): void {
    if (this.activeJobs.has(projectId)) {
      console.log(`Pipeline for project ${projectId} is already running.`);
      return;
    }

    if (this.waitingQueue.some((item) => item.projectId === projectId)) {
      console.log(`Project ${projectId} is already in the waiting queue.`);
      return;
    }

    if (this.activeJobs.size >= this.maxConcurrency) {
      console.log(`[VideoPipeline] Concurrency limit reached (${this.activeJobs.size}/${this.maxConcurrency}). Queuing project ${projectId}...`);
      this.waitingQueue.push({ projectId, fromStage });
      return;
    }

    this.executePipelineJob(projectId, fromStage);
  }

  private executePipelineJob(projectId: string, fromStage?: PipelineStage): void {
    this.activeJobs.add(projectId);
    setTimeout(async () => {
      try {
        console.log(`[VideoPipeline] Starting execution for project ${projectId} (Active: ${this.activeJobs.size}/${this.maxConcurrency})`);
        await this.processPipeline(projectId, fromStage);
      } catch (err) {
        console.error(`Pipeline fatal error for project ${projectId}:`, err);
      } finally {
        this.activeJobs.delete(projectId);
        this.processNextInQueue();
      }
    }, 50);
  }

  private processNextInQueue(): void {
    if (this.activeJobs.size < this.maxConcurrency && this.waitingQueue.length > 0) {
      const next = this.waitingQueue.shift();
      if (next) {
        this.executePipelineJob(next.projectId, next.fromStage);
      }
    }
  }

  public async processPipeline(projectId: string, fromStage?: PipelineStage, singleStageOnly: boolean = false): Promise<void> {
    const db = getDb();

    const project = db
      .prepare('SELECT * FROM content_projects WHERE id = ?')
      .get(projectId) as ContentProject | undefined;

    if (!project) {
      console.error(`Project ${projectId} not found`);
      return;
    }

    let channel = db
      .prepare('SELECT * FROM channels WHERE id = ?')
      .get(project.channel_id) as Channel | undefined;

    if (!channel) {
      const nowIso = new Date().toISOString();
      db.prepare(`
        INSERT OR IGNORE INTO channels (id, user_id, name, niche, language, voice, target_duration_minutes, visual_style, subtitle_style, intro_style, outro_cta, publishing_platform, content_rules, created_at, updated_at)
        VALUES (?, ?, 'Creator Studio', 'AI & Tech', 'en', 'en-US-ChristopherNeural', 3, 'Cinematic High-Contrast', 'Modern Clean White', 'High-Impact Hook', 'Subscribe for more breakdowns', 'YouTube', 'Professional studio pacing', ?, ?)
      `).run(project.channel_id, project.user_id, nowIso, nowIso);
      channel = db.prepare('SELECT * FROM channels WHERE id = ?').get(project.channel_id) as Channel | undefined;
    }

    if (!channel) {
      console.error(`Channel ${project.channel_id} not found`);
      return;
    }

    // Initialize all stage jobs if not present
    for (const stage of PIPELINE_STAGES) {
      const existingJob = db
        .prepare('SELECT * FROM video_jobs WHERE project_id = ? AND stage = ?')
        .get(projectId, stage);

      if (!existingJob) {
        db.prepare(
          'INSERT INTO video_jobs (id, project_id, stage, status) VALUES (?, ?, ?, ?)'
        ).run(uuidv4(), projectId, stage, 'PENDING');
      }
    }

    // Determine starting index (redirect legacy SCRIPT to PLAN)
    let startIndex = 0;
    if (fromStage) {
      const normalizedStage = (fromStage as string) === 'SCRIPT' ? 'PLAN' : fromStage;
      const stageIdx = PIPELINE_STAGES.indexOf(normalizedStage as PipelineStage);
      if (stageIdx >= 0) {
        startIndex = stageIdx;
      }
    }

    // Mark project processing
    const now = new Date().toISOString();
    db.prepare(
      'UPDATE content_projects SET status = ?, current_stage = ?, error_message = NULL, updated_at = ? WHERE id = ?'
    ).run('PROCESSING', PIPELINE_STAGES[startIndex], now, projectId);

    const pipelineStartTime = Date.now();
    const endIndex = singleStageOnly ? Math.min(startIndex + 1, PIPELINE_STAGES.length) : PIPELINE_STAGES.length;

    for (let i = startIndex; i < endIndex; i++) {
      const stage = PIPELINE_STAGES[i];
      const stageStartTime = new Date().toISOString();

      // Mark stage PROCESSING
      db.prepare(
        'UPDATE video_jobs SET status = ?, started_at = ?, error_message = NULL WHERE project_id = ? AND stage = ?'
      ).run('PROCESSING', stageStartTime, projectId, stage);

      db.prepare(
        'UPDATE content_projects SET current_stage = ?, updated_at = ? WHERE id = ?'
      ).run(stage, stageStartTime, projectId);

      try {
        await this.executeStage(stage, project, channel);

        // Mark stage COMPLETED
        const stageEndTime = new Date().toISOString();
        db.prepare(
          'UPDATE video_jobs SET status = ?, completed_at = ? WHERE project_id = ? AND stage = ?'
        ).run('COMPLETED', stageEndTime, projectId, stage);

        // WP8 Fail-Closed Gate: Pause at PLAN until user reviews & approves storyboard
        if (stage === 'PLAN') {
          const freshProject = db.prepare('SELECT approved_at FROM content_projects WHERE id = ?').get(projectId) as any;
          if (!freshProject?.approved_at) {
            db.prepare(
              'UPDATE content_projects SET status = ?, current_stage = ?, updated_at = ? WHERE id = ?'
            ).run('PENDING_APPROVAL', 'PLAN', stageEndTime, projectId);
            console.log(`[VideoPipeline] ⏸️ Plan generated and locked for project ${projectId}. Awaiting user storyboard approval.`);
            return;
          }
        }
      } catch (err: any) {
        const errorMsg = err?.message || 'Stage execution failed';
        console.error(`Error at stage ${stage} for project ${projectId}:`, err);

        const failTime = new Date().toISOString();
        db.prepare(
          'UPDATE video_jobs SET status = ?, error_message = ?, completed_at = ? WHERE project_id = ? AND stage = ?'
        ).run('FAILED', errorMsg, failTime, projectId, stage);

        db.prepare(
          'UPDATE content_projects SET status = ?, current_stage = ?, error_message = ?, updated_at = ? WHERE id = ?'
        ).run('FAILED', stage, errorMsg, failTime, projectId);

        // ZERO-WASTE CREDIT AUTO-REFUND:
        // Automatically refund any credits deducted for this project
        try {
          const deduction = db.prepare(`
            SELECT ABS(amount) as amount FROM credit_transactions 
            WHERE project_id = ? AND amount < 0
            ORDER BY created_at DESC LIMIT 1
          `).get(projectId) as { amount: number } | undefined;

          const refundAmount = deduction ? deduction.amount : 25;

          const alreadyRefunded = db.prepare(`
            SELECT id FROM credit_transactions 
            WHERE project_id = ? AND type = 'REFUND'
          `).get(projectId);

          if (!alreadyRefunded) {
            const { grantUserCredits } = await import('../db');
            grantUserCredits(
              project.user_id,
              refundAmount,
              'REFUND',
              `Zero-Waste Auto-Refund: Video generation failed at stage [${stage}]: ${errorMsg.substring(0, 80)}`,
              projectId
            );
            console.log(`[VideoPipeline] 💸 Auto-refunded ${refundAmount} credits to user ${project.user_id} for failed project ${projectId}`);
          }
        } catch (refundErr: any) {
          console.error('[VideoPipeline] Auto-refund error:', refundErr.message);
        }

        return; // Halt pipeline on failure
      }
    }

    // If only executing a single intermediate stage, update next stage and return early
    if (singleStageOnly && endIndex < PIPELINE_STAGES.length) {
      const nextStage = PIPELINE_STAGES[endIndex];
      db.prepare(
        'UPDATE content_projects SET status = ?, current_stage = ?, updated_at = ? WHERE id = ?'
      ).run('PROCESSING', nextStage, new Date().toISOString(), projectId);
      return;
    }

    // Collect telemetry upon completion
    const pipelineEndTime = Date.now();
    const totalDurationSec = (pipelineEndTime - pipelineStartTime) / 1000;

    const scenesCount = (db.prepare('SELECT COUNT(*) as count FROM video_scenes WHERE project_id = ?').get(projectId) as any)?.count || 0;
    const clipsCount = (db.prepare("SELECT COUNT(*) as count FROM generated_assets WHERE project_id = ? AND asset_type = 'clip'").get(projectId) as any)?.count || 0;
    const finalOutput = db.prepare('SELECT * FROM video_outputs WHERE project_id = ?').get(projectId) as any;
    const audioAsset = db.prepare("SELECT * FROM generated_assets WHERE project_id = ? AND asset_type = 'audio'").get(projectId) as any;

    const telemetry: ProjectTelemetry = {
      generationStartTime: new Date(pipelineStartTime).toISOString(),
      generationEndTime: new Date(pipelineEndTime).toISOString(),
      totalGenerationDurationSec: Math.round(totalDurationSec * 10) / 10,
      sceneCount: scenesCount,
      clipCount: clipsCount,
      audioDurationSec: audioAsset?.duration_sec || 0,
      finalVideoDurationSec: finalOutput?.duration_sec || 0,
      filesizeBytes: finalOutput?.filesize_bytes || 0,
      providerUsed: videoProvider.getProviderName(),
      generationStatus: 'COMPLETED',
      cost: 'UNAVAILABLE',
    };

    // Determine publishing status & auto-publishing
    let nextPublishStatus = project.publishing_status || 'READY';
    let nextScheduledAt = project.scheduled_at;

    if (project.auto_publish === 1 || channel.auto_publish === 1) {
      nextPublishStatus = 'SCHEDULED';
      if (!nextScheduledAt) {
        // Compute next release slot from channel schedule
        const { publishingScheduler } = await import('../scheduler');
        nextScheduledAt = publishingScheduler.calculateNextReleaseSlot(channel);
      }
    } else if (nextScheduledAt && new Date(nextScheduledAt).getTime() > Date.now()) {
      nextPublishStatus = 'SCHEDULED';
    } else if (nextPublishStatus === 'DRAFT' || nextPublishStatus === 'NOT_CONNECTED') {
      nextPublishStatus = 'READY';
    }

    // Mark project COMPLETED and store telemetry & publishing status
    const completionTime = new Date().toISOString();
    db.prepare(
      `UPDATE content_projects SET 
        status = ?, 
        publishing_status = ?, 
        scheduled_at = ?, 
        telemetry_json = ?, 
        updated_at = ? 
       WHERE id = ?`
    ).run('COMPLETED', nextPublishStatus, nextScheduledAt, JSON.stringify(telemetry), completionTime, projectId);

  }

  private async executeStage(stage: PipelineStage, project: ContentProject, channel: Channel): Promise<void> {
    const db = getDb();
    const now = new Date().toISOString();

    switch (stage) {
      case 'PLAN':
      case ('SCRIPT' as any): {
        const planResult = await generateVideoPlan({
          topic: project.topic,
          niche: channel.niche,
          channelName: channel.name,
          targetLengthMinutes: project.target_length_minutes,
          language: project.language || channel.language,
          visualStyle: channel.visual_style,
        });

        const planKey = `plans/${project.id}/plan.json`;
        const res = await storage.putObject(planKey, JSON.stringify(planResult, null, 2), 'application/json');

        // Store script.json for backward compatibility
        const scriptKey = `scripts/${project.id}/script.json`;
        await storage.putObject(scriptKey, JSON.stringify({
          title: planResult.title,
          hook: planResult.scenes[0]?.narration || '',
          introduction: planResult.scenes[1]?.narration || '',
          sections: planResult.scenes.slice(2, -2).map((s, idx) => ({
            title: `Section ${idx + 1}`,
            subsections: [{ subtitle: s.subtitleText || '', narration: s.narration }]
          })),
          conclusion: planResult.scenes[planResult.scenes.length - 2]?.narration || '',
          callToAction: planResult.scenes[planResult.scenes.length - 1]?.narration || '',
        }, null, 2), 'application/json');

        db.prepare("DELETE FROM generated_assets WHERE project_id = ? AND asset_type IN ('script', 'plan')").run(project.id);
        db.prepare(
          `INSERT INTO generated_assets (id, project_id, asset_type, storage_key, url, metadata_json, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        ).run(
          uuidv4(),
          project.id,
          'script',
          res.key,
          res.url,
          JSON.stringify({ fullNarration: planResult.fullNarration, title: planResult.title, framework: planResult.framework }),
          now
        );

        // Populate video_scenes table directly from PLAN
        db.prepare('DELETE FROM video_scenes WHERE project_id = ?').run(project.id);
        const insertSceneStmt = db.prepare(
          `INSERT INTO video_scenes (
            id, project_id, scene_index, narration, visual_prompt, 
            visual_subject, environment, camera_movement, lighting, color_style, continuity_notes, 
            estimated_duration_sec, subtitle_text, visual_tier, created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        );

        for (const scene of planResult.scenes) {
          insertSceneStmt.run(
            uuidv4(),
            project.id,
            scene.sceneIndex,
            scene.narration,
            scene.visualPrompt,
            scene.visualSubject || null,
            scene.environment || null,
            scene.cameraMovement || null,
            scene.lighting || null,
            scene.colorStyle || null,
            scene.continuityNotes || null,
            scene.estimatedDurationSec,
            scene.subtitleText,
            (scene as any).visualTier || 'motion_still',
            now
          );
        }

        // Generate storyboard style previews for each scene
        for (const scene of planResult.scenes) {
          try {
            const preview = await generateStoryboardPreview({
              projectId: project.id,
              sceneIndex: scene.sceneIndex,
              visualPrompt: scene.visualPrompt,
              visualTier: (scene as any).visualTier || 'motion_still',
              niche: channel.niche,
              topic: project.topic,
            });
            db.prepare('UPDATE video_scenes SET storyboard_preview_url = ? WHERE project_id = ? AND scene_index = ?')
              .run(preview.url, project.id, scene.sceneIndex);
          } catch (err: any) {
            console.warn(`[VideoPipeline] Preview generation skipped for scene ${scene.sceneIndex}:`, err.message);
          }
        }

        // Calculate and stamp worst-case quote upfront
        const lengthBandConfig = resolveLengthBand(project.target_length_minutes || 1);
        const quote = calculateWorstCaseQuote({
          targetLengthMinutes: project.target_length_minutes || 1,
          scenes: planResult.scenes.map((s) => ({
            sceneIndex: s.sceneIndex,
            visualTier: (s as any).visualTier || 'motion_still',
            durationSec: s.estimatedDurationSec,
          })),
        });

        db.prepare(`UPDATE content_projects SET quoted_credits = ?, length_band = ? WHERE id = ?`)
          .run(quote.totalQuotedCredits, lengthBandConfig.band, project.id);
        break;
      }

      case 'VOICE': {
        let scenes = db
          .prepare('SELECT * FROM video_scenes WHERE project_id = ? ORDER BY scene_index ASC')
          .all(project.id) as VideoScene[];

        if (scenes.length === 0) {
          await this.executeStage('PLAN', project, channel);
          scenes = db
            .prepare('SELECT * FROM video_scenes WHERE project_id = ? ORDER BY scene_index ASC')
            .all(project.id) as VideoScene[];
        }

        if (scenes.length === 0) {
          throw new EngineError('NO_VALID_AUDIO', `No scenes found for voice synthesis in project ${project.id}`);
        }

        const audioDir = path.dirname(storage.getFilePath(`audio/${project.id}/placeholder.txt`));
        if (!fs.existsSync(audioDir)) fs.mkdirSync(audioDir, { recursive: true });

        const segmentPaths: string[] = [];
        let totalMeasuredSec = 0;

        for (const scene of scenes) {
          const voiceRes = await voiceProvider.generateVoiceover({
            text: scene.narration,
            voiceName: channel.voice,
            voiceSpeed: channel.voice_speed,
            language: project.language || channel.language,
            projectId: project.id,
          });

          if (!voiceRes.audioBuffer || voiceRes.audioBuffer.length < 500) {
            throw new EngineError('NO_VALID_AUDIO', `Scene ${scene.scene_index} voice generation returned empty buffer`);
          }

          const sceneAudioKey = `audio/${project.id}/scene_${scene.scene_index}.${voiceRes.format}`;
          await storage.putObject(sceneAudioKey, voiceRes.audioBuffer, `audio/${voiceRes.format}`);
          const segmentPath = storage.getFilePath(sceneAudioKey);
          segmentPaths.push(segmentPath);

          // Update video_scenes with exact measured duration from audio
          const sceneDuration = voiceRes.durationSec > 0 ? voiceRes.durationSec : 4;
          totalMeasuredSec += sceneDuration;

          db.prepare(
            `UPDATE video_scenes 
             SET audio_storage_key = ?, audio_duration_sec = ?, estimated_duration_sec = ?
             WHERE id = ?`
          ).run(sceneAudioKey, sceneDuration, sceneDuration, scene.id);
        }

        // Assemble master narration track
        const masterKey = `audio/${project.id}/narration.mp3`;
        const masterPath = storage.getFilePath(masterKey);
        const { durationSec: masterDuration } = await ffmpegCompositor.concatAudioFiles({
          audioPaths: segmentPaths,
          outputPath: masterPath,
        });

        const finalAudioDuration = masterDuration > 0 ? masterDuration : totalMeasuredSec;

        // Band-overflow guard check
        const targetDuration = project.target_length_minutes || 1;
        if (!isWithinBandLimit(targetDuration, finalAudioDuration)) {
          const bandConfig = resolveLengthBand(targetDuration);
          throw new EngineError(
            'BAND_OVERFLOW',
            `Master audio duration (${finalAudioDuration.toFixed(1)}s) exceeds max limit for band [${bandConfig.label}] (${bandConfig.maxDurationSec}s + 0.5s tolerance). Auto-refund triggered.`
          );
        }

        db.prepare("DELETE FROM generated_assets WHERE project_id = ? AND asset_type = 'audio'").run(project.id);
        db.prepare(
          `INSERT INTO generated_assets (id, project_id, asset_type, storage_key, url, duration_sec, metadata_json, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(
          uuidv4(),
          project.id,
          'audio',
          masterKey,
          storage.getUrl(masterKey),
          finalAudioDuration,
          JSON.stringify({ voice: channel.voice, voiceSpeed: channel.voice_speed, segmentCount: segmentPaths.length }),
          now
        );

        // WP8 True Price Lock Delta Reconciliation:
        // Automatically refund difference if actual cost < quoted worst-case ceiling!
        try {
          const refundRes = reconcilePriceLockRefund({
            projectId: project.id,
            userId: project.user_id,
            targetLengthMinutes: project.target_length_minutes || 1,
          });
          if (refundRes.deltaRefundCredits > 0) {
            console.log(`[VideoPipeline] 💸 Auto-refunded ${refundRes.deltaRefundCredits} credits (quoted ${refundRes.quotedCredits} vs actual ${refundRes.actualCredits})`);
          }
        } catch (reconcileErr: any) {
          console.error('[VideoPipeline] Price lock reconciliation error:', reconcileErr.message);
        }
        break;
      }

      case 'SCENES': {
        let scenes = db
          .prepare('SELECT * FROM video_scenes WHERE project_id = ? ORDER BY scene_index ASC')
          .all(project.id) as VideoScene[];

        if (scenes.length === 0) {
          await this.executeStage('PLAN', project, channel);
          scenes = db
            .prepare('SELECT * FROM video_scenes WHERE project_id = ? ORDER BY scene_index ASC')
            .all(project.id) as VideoScene[];
        }

        // Ensure each scene duration matches true audio duration if voice stage has run
        const audioAsset = db
          .prepare("SELECT * FROM generated_assets WHERE project_id = ? AND asset_type = 'audio' ORDER BY created_at DESC LIMIT 1")
          .get(project.id) as GeneratedAsset | undefined;

        if (audioAsset && audioAsset.duration_sec && audioAsset.duration_sec > 0) {
          const totalEstimated = scenes.reduce((sum, s) => sum + (s.audio_duration_sec || s.estimated_duration_sec || 4), 0);
          if (totalEstimated > 0 && Math.abs(totalEstimated - audioAsset.duration_sec) > 1.0) {
            const ratio = audioAsset.duration_sec / totalEstimated;
            for (const s of scenes) {
              const adjusted = Math.max(2, Math.round((s.estimated_duration_sec || 4) * ratio * 10) / 10);
              db.prepare('UPDATE video_scenes SET estimated_duration_sec = ? WHERE id = ?').run(adjusted, s.id);
            }
          }
        }
        break;
      }

      case 'VIDEO': {
        let scenes = db
          .prepare('SELECT * FROM video_scenes WHERE project_id = ? ORDER BY scene_index ASC')
          .all(project.id) as VideoScene[];

        if (scenes.length === 0) {
          await this.executeStage('SCENES', project, channel);
          scenes = db.prepare('SELECT * FROM video_scenes WHERE project_id = ? ORDER BY scene_index ASC').all(project.id) as VideoScene[];
        }

        if (scenes.length === 0) {
          throw new Error('No scenes found for video clip generation');
        }

        // Remove old clip assets on retry
        db.prepare("DELETE FROM generated_assets WHERE project_id = ? AND asset_type = 'clip'").run(project.id);

        const globalStyle = resolveGlobalVisualStyle(channel.visual_style);
        const MAX_QC_ATTEMPTS = 2;
        let previousScene: VideoScene | null = null;

        let projectAspectRatio: AspectRatio = '9:16';
        try {
          if ((project as any).aspect_ratio) {
            projectAspectRatio = (project as any).aspect_ratio as AspectRatio;
          } else if (project.metadata_json) {
            const meta = JSON.parse(project.metadata_json);
            if (meta.aspectRatio) projectAspectRatio = meta.aspectRatio;
            else if (project.target_length_minutes >= 2) projectAspectRatio = '16:9';
          } else if (project.target_length_minutes >= 2) {
            projectAspectRatio = '16:9';
          }
        } catch {}

        for (const scene of scenes) {
          let attempt = 1;
          let currentPrompt = scene.visual_prompt;
          let bestClips: Array<{ clipIndex: number; storageKey: string; url: string; durationSec: number }> = [];
          let latestQcReport: QualityReport | null = null;

          // Hook-Only Retry Policy (WP4):
          // Scene 1 (Hook Beat): up to 1 retry with prompt refinement (maxAttempts = 2)
          // Scenes > 1 (Body Beats): 0 retries (maxAttempts = 1). Immediate downgrade to motion_still on QC failure.
          const isHookScene = scene.scene_index === 1;
          const maxSceneAttempts = isHookScene ? 2 : 1;

          try {
            while (attempt <= maxSceneAttempts) {
              console.log(`[VideoPipeline] Generating clip for Scene ${scene.scene_index} (Attempt ${attempt}/${maxSceneAttempts}, AspectRatio: ${projectAspectRatio})...`);

              const clips = await videoProvider.generateVideoClipsForScene({
                projectId: project.id,
                sceneId: scene.id,
                sceneIndex: scene.scene_index,
                visualPrompt: currentPrompt,
                durationSec: scene.estimated_duration_sec,
                niche: channel.niche,
                topic: project.topic,
                visualStyle: channel.visual_style,
                environment: scene.environment || undefined,
                cameraMovement: scene.camera_movement || undefined,
                lighting: scene.lighting || undefined,
                colorStyle: scene.color_style || undefined,
                continuityNotes: scene.continuity_notes || undefined,
                aspectRatio: projectAspectRatio,
                visualTier: (scene as any).visual_tier || 'motion_still',
              } as any);

              if (clips && clips.length > 0) {
                bestClips = clips;
              }

              // Quality Control Validation on the primary clip
              const primaryClip = bestClips[0];
              const clipPath = primaryClip ? storage.getFilePath(primaryClip.storageKey) : '';
              latestQcReport = await sceneQualityChecker.validateSceneClip({
                scene: {
                  ...scene,
                  visual_prompt: currentPrompt,
                },
                clipPath,
                globalStyle,
                previousScene,
                attempt,
                niche: channel.niche,
              });

              if (latestQcReport.passed) {
                console.log(`[QualityControl] ✅ Scene ${scene.scene_index} PASSED Quality Control (Score: ${latestQcReport.overallScore}%).`);
                break;
              }

              console.warn(
                `[QualityControl] ⚠️ Scene ${scene.scene_index} failed QC (${latestQcReport.failedChecks.join(', ')}). Attempt ${attempt} score: ${latestQcReport.overallScore}%.`
              );

              if (attempt < maxSceneAttempts && latestQcReport.retryPromptAdjustment) {
                console.log(`[QualityControl] ⚡ Hook Scene 1 auto-regenerating with prompt refinement: ${latestQcReport.retryPromptAdjustment}`);
                currentPrompt = `${scene.visual_prompt}, ${latestQcReport.retryPromptAdjustment}`;
                attempt++;
              } else {
                // Hook retry exhausted or non-hook scene (0 retries):
                // Enforce Hook-Only Retry Policy: Immediately downgrade to motion_still without costly re-rolls!
                const currentTier = (scene as any).visual_tier || 'ai_clip';
                if (currentTier !== 'motion_still' && currentTier !== 'graphic') {
                  console.warn(`[QualityControl] 🔻 Enforcing Hook-Only Retry Policy: Scene ${scene.scene_index} downgraded to motion_still after QC failure.`);
                  const fallbackClips = await videoProvider.generateVideoClipsForScene({
                    projectId: project.id,
                    sceneId: scene.id,
                    sceneIndex: scene.scene_index,
                    visualPrompt: currentPrompt,
                    durationSec: scene.estimated_duration_sec,
                    niche: channel.niche,
                    topic: project.topic,
                    visualStyle: channel.visual_style,
                    aspectRatio: projectAspectRatio,
                    visualTier: 'motion_still',
                  } as any);

                  if (fallbackClips && fallbackClips.length > 0) {
                    bestClips = fallbackClips;
                  }
                }
                break;
              }
            }
          } catch (sceneErr: any) {
            console.error(`[VideoPipeline] Scene ${scene.scene_index} generation error:`, sceneErr?.message || sceneErr);
            if (bestClips.length === 0) {
              throw new EngineError('NO_VALID_CLIPS', `Scene ${scene.scene_index} generation failed: ${sceneErr?.message || sceneErr}`);
            }
          }

          if (bestClips.length === 0) {
            throw new EngineError('NO_VALID_CLIPS', `Scene ${scene.scene_index} produced 0 valid clips`);
          }

          // Price-delta refund check if scene was downgraded
          const plannedTier = (scene as any).planned_tier || (scene as any).visual_tier;
          const deliveredTier = (bestClips[0] as any)?.tier || (bestClips[0] as any)?.visualTier;
          if (plannedTier && deliveredTier && plannedTier !== deliveredTier) {
            const refundDelta = calculatePriceDeltaRefund(plannedTier, deliveredTier);
            if (refundDelta > 0) {
              issuePriceDeltaRefund({
                userId: project.user_id,
                projectId: project.id,
                sceneIndex: scene.scene_index,
                plannedTier,
                deliveredTier,
                refundCredits: refundDelta,
              });
            }
          }

          // Persist QC report to video_scenes table
          if (latestQcReport) {
            try {
              db.prepare('UPDATE video_scenes SET quality_report_json = ?, visual_prompt = ? WHERE id = ?').run(
                JSON.stringify(latestQcReport),
                currentPrompt,
                scene.id
              );
            } catch (err: any) {
              console.warn(`[QualityControl] Failed to update video_scenes quality_report_json: ${err.message}`);
            }
          }

          // Persist ALL approved clip assets for the scene so the entire timeline duration is covered
          for (const clip of bestClips) {
            db.prepare(
              `INSERT INTO generated_assets (id, project_id, scene_id, asset_type, storage_key, url, duration_sec, metadata_json, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`
            ).run(
              uuidv4(),
              project.id,
              scene.id,
              'clip',
              clip.storageKey,
              clip.url,
              clip.durationSec,
              JSON.stringify({
                clipIndex: clip.clipIndex,
                sceneIndex: scene.scene_index,
                aspectRatio: projectAspectRatio,
                qualityScore: latestQcReport?.overallScore || 85,
                qcPassed: latestQcReport?.passed ?? true,
                failedChecks: latestQcReport?.failedChecks || [],
                qualityReport: latestQcReport,
              }),
              now
            );
          }

          // Advance previousScene reference for next iteration's differentiation check
          previousScene = {
            ...scene,
            visual_prompt: currentPrompt,
          };
        }

        const totalClips = db.prepare("SELECT COUNT(*) as count FROM generated_assets WHERE project_id = ? AND asset_type = 'clip'").get(project.id) as { count: number } | undefined;
        if (!totalClips || totalClips.count === 0) {
          throw new EngineError('NO_VALID_CLIPS', `No valid video clips generated for project ${project.id}`);
        }
        break;
      }

      case 'SUBTITLES': {
        let scenes = db
          .prepare('SELECT * FROM video_scenes WHERE project_id = ? ORDER BY scene_index ASC')
          .all(project.id) as VideoScene[];

        if (scenes.length === 0) {
          await this.executeStage('PLAN', project, channel);
          scenes = db.prepare('SELECT * FROM video_scenes WHERE project_id = ? ORDER BY scene_index ASC').all(project.id) as VideoScene[];
        }

        let projectAspectRatio: AspectRatio = '9:16';
        try {
          if ((project as any).aspect_ratio) {
            projectAspectRatio = (project as any).aspect_ratio as AspectRatio;
          } else if (project.metadata_json) {
            const meta = JSON.parse(project.metadata_json);
            if (meta.aspectRatio) projectAspectRatio = meta.aspectRatio;
            else if (project.target_length_minutes >= 2) projectAspectRatio = '16:9';
          } else if (project.target_length_minutes >= 2) {
            projectAspectRatio = '16:9';
          }
        } catch {}

        const cues = subtitleProvider.generateCues(
          scenes.map((s) => ({
            sceneIndex: s.scene_index,
            estimatedDurationSec: s.audio_duration_sec || s.estimated_duration_sec || 4,
            subtitleText: s.subtitle_text || s.narration,
          }))
        );

        const srtContent = subtitleProvider.generateSrt(cues);
        const vttContent = subtitleProvider.generateVtt(cues);
        const assContent = subtitleProvider.generateAss(
          cues,
          channel.subtitle_style,
          projectAspectRatio === '16:9' ? '16:9' : '9:16'
        );

        const srtKey = `subtitles/${project.id}/captions.srt`;
        const vttKey = `subtitles/${project.id}/captions.vtt`;
        const assKey = `subtitles/${project.id}/captions.ass`;

        const srtAsset = await storage.putObject(srtKey, srtContent, 'text/plain');
        await storage.putObject(vttKey, vttContent, 'text/vtt');
        await storage.putObject(assKey, assContent, 'text/x-ssa');

        db.prepare("DELETE FROM generated_assets WHERE project_id = ? AND asset_type = 'subtitles'").run(project.id);

        db.prepare(
          `INSERT INTO generated_assets (id, project_id, asset_type, storage_key, url, metadata_json, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        ).run(
          uuidv4(),
          project.id,
          'subtitles',
          srtAsset.key,
          srtAsset.url,
          JSON.stringify({ cueCount: cues.length, vttKey, assKey, style: channel.subtitle_style }),
          now
        );
        break;
      }

      case 'FINAL_VIDEO': {
        let clipAssets = db
          .prepare("SELECT * FROM generated_assets WHERE project_id = ? AND asset_type = 'clip' ORDER BY created_at ASC")
          .all(project.id) as GeneratedAsset[];

        if (clipAssets.length === 0) {
          throw new EngineError('NO_VALID_CLIPS', `No valid video clips found for project ${project.id} assembly`);
        }

        let audioAsset = db
          .prepare("SELECT * FROM generated_assets WHERE project_id = ? AND asset_type = 'audio' ORDER BY created_at DESC LIMIT 1")
          .get(project.id) as GeneratedAsset | undefined;

        if (!audioAsset) {
          const audioKey = `audio/${project.id}/narration.mp3`;
          const audioPath = storage.getFilePath(audioKey);
          const dir = path.dirname(audioPath);
          if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
          try {
            const voiceRes = await voiceProvider.generateVoiceover({
              text: project.topic || 'Autora Video Production',
              projectId: project.id,
            });
            if (!voiceRes.audioBuffer || voiceRes.audioBuffer.length < 1000) {
              throw new EngineError('NO_VALID_AUDIO', `Voice generation produced invalid audio buffer for project ${project.id}`);
            }
            await fs.promises.writeFile(audioPath, voiceRes.audioBuffer);
            db.prepare(
              `INSERT INTO generated_assets (id, project_id, asset_type, storage_key, url, duration_sec, metadata_json, created_at)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
            ).run(uuidv4(), project.id, 'audio', audioKey, storage.getUrl(audioKey), voiceRes.durationSec, '{}', now);
            audioAsset = db.prepare("SELECT * FROM generated_assets WHERE project_id = ? AND asset_type = 'audio' ORDER BY created_at DESC LIMIT 1").get(project.id) as GeneratedAsset;
          } catch (voiceErr: any) {
            throw new EngineError('NO_VALID_AUDIO', `No valid audio narration found for project ${project.id}: ${voiceErr?.message || voiceErr}`);
          }
        }

        const subAsset = db
          .prepare("SELECT * FROM generated_assets WHERE project_id = ? AND asset_type = 'subtitles' ORDER BY created_at DESC LIMIT 1")
          .get(project.id) as GeneratedAsset | undefined;

        const clipPaths = clipAssets.map((c) => storage.getFilePath(c.storage_key));
        let audioPath = storage.getFilePath(audioAsset.storage_key);
        let subPath: string | undefined = undefined;
        if (subAsset) {
          try {
            const meta = subAsset.metadata_json ? JSON.parse(subAsset.metadata_json) : {};
            if (meta.assKey) {
              const testAss = storage.getFilePath(meta.assKey);
              if (fs.existsSync(testAss)) {
                subPath = testAss;
              }
            }
          } catch {}
          if (!subPath && subAsset.storage_key) {
            const defaultSub = storage.getFilePath(subAsset.storage_key);
            if (fs.existsSync(defaultSub)) {
              subPath = defaultSub;
            }
          }
        }

        // Guaranteed audio verification on disk
        let audioValid = false;
        try {
          if (fs.existsSync(audioPath)) {
            const st = await fs.promises.stat(audioPath);
            if (st.size > 1000) audioValid = true;
          }
        } catch {}

        if (!audioValid) {
          const remoteAudio = await storage.getObject(audioAsset.storage_key);
          if (remoteAudio && remoteAudio.length > 1000) {
            const dir = path.dirname(audioPath);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            await fs.promises.writeFile(audioPath, remoteAudio);
            audioValid = true;
          }
        }

        if (!audioValid) {
          console.warn(`[Worker] Project ${project.id} audio track missing or silent. Auto-healing voiceover...`);
          let scriptAsset = db
            .prepare("SELECT * FROM generated_assets WHERE project_id = ? AND asset_type = 'script' ORDER BY created_at DESC LIMIT 1")
            .get(project.id) as GeneratedAsset | undefined;
          let narrationText = project.topic || 'AutoRA High Quality Video Production';
          if (scriptAsset) {
            const sData = await storage.getObject(scriptAsset.storage_key);
            if (sData) {
              try {
                const sObj: ScriptStructure = JSON.parse(sData.toString('utf8'));
                const parts: string[] = [sObj.hook, sObj.introduction];
                for (const sec of sObj.sections) {
                  for (const sub of sec.subsections) parts.push(sub.narration);
                }
                parts.push(sObj.conclusion, sObj.callToAction);
                narrationText = parts.filter(Boolean).join('\n\n');
              } catch {}
            }
          }
          try {
            const vRes = await voiceProvider.generateVoiceover({
              text: narrationText,
              voiceName: channel.voice,
              voiceSpeed: channel.voice_speed,
              language: project.language || channel.language,
              projectId: project.id,
            });
            if (!vRes.audioBuffer || vRes.audioBuffer.length < 1000) {
              throw new EngineError('NO_VALID_AUDIO', `Auto-healed voiceover generated empty audio for project ${project.id}`);
            }
            const dir = path.dirname(audioPath);
            if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
            await fs.promises.writeFile(audioPath, vRes.audioBuffer);
            await storage.putObject(audioAsset.storage_key, vRes.audioBuffer, `audio/${vRes.format}`);
            db.prepare("UPDATE generated_assets SET duration_sec = ? WHERE id = ?").run(vRes.durationSec, audioAsset.id);
            audioAsset.duration_sec = vRes.durationSec;
          } catch (healErr: any) {
            throw new EngineError('NO_VALID_AUDIO', `Failed to heal audio track for project ${project.id}: ${healErr?.message || healErr}`);
          }
        }

        const totalClipDuration = clipAssets.reduce((sum, c) => sum + (c.duration_sec || 0), 0);
        const effectiveDurationSec: number = (audioAsset && typeof audioAsset.duration_sec === 'number' && audioAsset.duration_sec > 0)
          ? audioAsset.duration_sec
          : (totalClipDuration > 0 ? totalClipDuration : project.target_length_minutes * 60);

        let finalAspectRatio: AspectRatio = '9:16';
        try {
          if ((project as any).aspect_ratio) {
            finalAspectRatio = (project as any).aspect_ratio as AspectRatio;
          } else if (project.metadata_json) {
            const meta = JSON.parse(project.metadata_json);
            if (meta.aspectRatio) finalAspectRatio = meta.aspectRatio;
            else if (project.target_length_minutes >= 2) finalAspectRatio = '16:9';
          } else if (project.target_length_minutes >= 2) {
            finalAspectRatio = '16:9';
          }
        } catch {}

        const composition = await ffmpegCompositor.composeVideo({
          projectId: project.id,
          clipFilePaths: clipPaths,
          audioFilePath: audioPath,
          subtitleFilePath: subPath,
          totalDurationSec: effectiveDurationSec,
          aspectRatio: finalAspectRatio === '16:9' ? '16:9' : '9:16',
        });

        // Store video output record
        db.prepare('DELETE FROM video_outputs WHERE project_id = ?').run(project.id);
        db.prepare(
          `INSERT INTO video_outputs (id, project_id, storage_key, url, duration_sec, resolution, filesize_bytes, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(
          uuidv4(),
          project.id,
          composition.storageKey,
          composition.url,
          composition.durationSec,
          composition.resolution,
          composition.filesizeBytes,
          now
        );

        db.prepare("DELETE FROM generated_assets WHERE project_id = ? AND asset_type = 'final_video'").run(project.id);
        db.prepare(
          `INSERT INTO generated_assets (id, project_id, asset_type, storage_key, url, duration_sec, metadata_json, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
        ).run(
          uuidv4(),
          project.id,
          'final_video',
          composition.storageKey,
          composition.url,
          composition.durationSec,
          JSON.stringify({ resolution: composition.resolution, filesizeBytes: composition.filesizeBytes }),
          now
        );

        // Generate metadata
        try {
          const scriptAsset = db
            .prepare("SELECT * FROM generated_assets WHERE project_id = ? AND asset_type = 'script' ORDER BY created_at DESC LIMIT 1")
            .get(project.id) as GeneratedAsset | undefined;
          const scenes = db
            .prepare('SELECT * FROM video_scenes WHERE project_id = ? ORDER BY scene_index ASC')
            .all(project.id) as VideoScene[];

          let script: ScriptStructure | null = null;
          if (scriptAsset) {
            const scriptData = await storage.getObject(scriptAsset.storage_key);
            if (scriptData) {
              script = JSON.parse(scriptData.toString('utf8'));
            }
          }
          if (!script) {
            script = {
              title: project.topic,
              hook: project.topic,
              introduction: project.topic,
              sections: [],
              conclusion: project.topic,
              callToAction: 'Subscribe for more'
            };
          }

          const metadata = aiProvider.generateMetadata({
            script,
            scenes: scenes.map((s) => ({
              sceneIndex: s.scene_index,
              sectionName: s.visual_subject || `Scene ${s.scene_index}`,
              narration: s.narration,
              visualPrompt: s.visual_prompt,
              estimatedDurationSec: s.estimated_duration_sec,
              subtitleText: s.subtitle_text,
            })),
            channelName: channel.name,
            niche: channel.niche,
            topic: project.topic,
          });

          db.prepare('UPDATE content_projects SET metadata_json = ? WHERE id = ?').run(
            JSON.stringify(metadata),
            project.id
          );
        } catch (mErr: any) {
          console.warn('[Worker] Metadata generation warning:', mErr.message);
        }
        break;
      }

      case 'THUMBNAIL': {
        const thumbRes = await thumbnailProvider.generateThumbnail({
          projectId: project.id,
          channelName: channel.name,
          niche: channel.niche,
          title: project.topic,
          visualStyle: channel.visual_style,
        });

        db.prepare("DELETE FROM generated_assets WHERE project_id = ? AND asset_type = 'thumbnail'").run(project.id);
        db.prepare(
          `INSERT INTO generated_assets (id, project_id, asset_type, storage_key, url, metadata_json, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?)`
        ).run(
          uuidv4(),
          project.id,
          'thumbnail',
          thumbRes.storageKey,
          thumbRes.url,
          JSON.stringify({ width: thumbRes.width, height: thumbRes.height, filesizeBytes: thumbRes.filesizeBytes }),
          now
        );
        break;
      }
    }
  }
}

export const videoWorker = new VideoPipelineWorker();
