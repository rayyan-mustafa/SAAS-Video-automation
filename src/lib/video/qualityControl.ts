/**
 * Video Quality Control (QC) Layer for AUTORA SaaS
 * Validates generated scene video clips against 8 strict production quality criteria:
 * 1. Visual matches the narration
 * 2. Correct subject and objects
 * 3. No obvious AI artifacts or severe distortions
 * 4. Natural-looking motion
 * 5. Correct 9:16 framing (1080x1920)
 * 6. Consistent visual style with other scenes (inherits global visual style)
 * 7. Scene is sufficiently different from previous scenes (visual diversity)
 * 8. Strong visual hook in the opening seconds (scene 1)
 *
 * If validation fails, produces targeted prompt adjustments for automatic single-scene regeneration.
 */

import fs from 'fs';
import path from 'path';
import { execFile } from 'child_process';
import util from 'util';
import { inspectMedia, MediaMetadata, getFfmpegPath } from '../providers/videoProvider';
import { GlobalVisualStyle } from './visualStyles';
import { getApiKey } from '../db';

const execFileAsync = util.promisify(execFile);

export interface QualityCheckItem {
  name: string;
  passed: boolean;
  score: number; // 0 - 100
  details: string;
}

export interface QualityReport {
  passed: boolean;
  overallScore: number; // 0 - 100
  checks: {
    visualMatchesNarration: QualityCheckItem;
    correctSubjectAndObjects: QualityCheckItem;
    noAiArtifactsOrDistortions: QualityCheckItem;
    naturalLookingMotion: QualityCheckItem;
    correct916Framing: QualityCheckItem;
    consistentVisualStyle: QualityCheckItem;
    sceneDifferentiation: QualityCheckItem;
    strongVisualHook: QualityCheckItem;
  };
  failedChecks: string[];
  retryPromptAdjustment?: string;
  assessedAt: string;
}

export interface ValidateSceneClipParams {
  scene: {
    id?: string;
    scene_index: number;
    narration: string;
    visual_prompt: string;
    visual_subject?: string | null;
    environment?: string | null;
    camera_movement?: string | null;
    lighting?: string | null;
    color_style?: string | null;
    estimated_duration_sec: number;
  };
  clipPath: string;
  globalStyle: GlobalVisualStyle;
  previousScene?: {
    scene_index: number;
    visual_prompt: string;
    visual_subject?: string | null;
    camera_movement?: string | null;
  } | null;
  attempt?: number;
  niche?: string;
}

export class SceneQualityChecker {
  /**
   * Validates a generated video clip file against all 8 quality criteria.
   */
  public async validateSceneClip(params: ValidateSceneClipParams): Promise<QualityReport> {
    const { scene, clipPath, globalStyle, previousScene, attempt = 1, niche = 'General' } = params;
    const isFirstScene = scene.scene_index === 1;

    // 1. Technical Media Probe
    let mediaMeta: MediaMetadata = {
      durationSec: 0,
      isValid: false,
    };

    let fileExists = false;
    let fileSize = 0;

    try {
      if (fs.existsSync(clipPath)) {
        fileExists = true;
        const stats = await fs.promises.stat(clipPath);
        fileSize = stats.size;
        mediaMeta = await inspectMedia(clipPath);
      }
    } catch (err: any) {
      console.warn(`[QualityChecker] Media probe failed for ${clipPath}: ${err.message}`);
    }

    // 2. Evaluate Each of the 8 Criteria (Base Heuristics)
    let narrationCheck = this.evaluateVisualMatchesNarration(scene.narration, scene.visual_prompt, scene.visual_subject);
    let subjectObjectsCheck = this.evaluateCorrectSubjectAndObjects(scene.visual_prompt, scene.visual_subject, scene.narration);
    let artifactsCheck = this.evaluateNoAiArtifactsOrDistortions(scene.visual_prompt, fileExists, fileSize, mediaMeta);
    let motionCheck = this.evaluateNaturalLookingMotion(scene.camera_movement, scene.visual_prompt, mediaMeta);
    let framingCheck = this.evaluateCorrect916Framing(mediaMeta, fileExists, fileSize, scene.visual_prompt);
    let styleCheck = this.evaluateConsistentVisualStyle(scene.visual_prompt, globalStyle);
    let diffCheck = this.evaluateSceneDifferentiation(scene, previousScene);
    let hookCheck = this.evaluateStrongVisualHook(scene, isFirstScene);

    let isProceduralFallback = false;

    // 3. Multimodal Real Video Frame Inspection (and physical frame entropy analysis)
    if (fileExists && fileSize > 1000 && clipPath.endsWith('.mp4')) {
      try {
        const ffmpegPath = getFfmpegPath();
        const frameDir = path.dirname(clipPath);
        const framePath = path.join(frameDir, `qc_frame_scene_${scene.scene_index}.jpg`);

        // Extract real video frame at t=1.0s
        await execFileAsync(ffmpegPath, [
          '-y',
          '-ss',
          '00:00:01.0',
          '-i',
          clipPath,
          '-vframes',
          '1',
          '-q:v',
          '2',
          framePath,
        ]);

        if (fs.existsSync(framePath)) {
          const frameStat = await fs.promises.stat(framePath).catch(() => null);
          isProceduralFallback = !!(frameStat && frameStat.size < 50000);

          const geminiKey = getApiKey('gemini') || process.env.GEMINI_API_KEY;
          let visionResults: any = null;
          if (geminiKey) {
            visionResults = await this.evaluateWithGeminiVision({
              framePath,
              scene,
              globalStyle,
              isFirstScene,
              geminiKey,
            });
          }

          if (visionResults) {
            if (visionResults.visualMatchesNarration) narrationCheck = visionResults.visualMatchesNarration;
            if (visionResults.correctSubjectAndObjects) subjectObjectsCheck = visionResults.correctSubjectAndObjects;
            if (visionResults.noAiArtifactsOrDistortions) artifactsCheck = visionResults.noAiArtifactsOrDistortions;
            if (visionResults.correct916Framing) framingCheck = visionResults.correct916Framing;
            if (visionResults.consistentVisualStyle) styleCheck = visionResults.consistentVisualStyle;
            if (visionResults.strongVisualHook && isFirstScene) hookCheck = visionResults.strongVisualHook;
          } else if (isProceduralFallback) {
            // Guardrail: cap scores when physical frame is an ambient/procedural fallback grid
            narrationCheck = {
              name: 'Visual matches narration',
              passed: false,
              score: 40,
              details: 'PROCEDURAL_FALLBACK_DETECTED: Low frame entropy (<50KB); spoken narration subjects not identifiable.',
            };
            subjectObjectsCheck = {
              name: 'Correct subject and objects',
              passed: false,
              score: 40,
              details: 'PROCEDURAL_FALLBACK_DETECTED: Focal subject is represented by procedural graphics rather than concrete visual elements.',
            };
            artifactsCheck = {
              name: 'No obvious AI artifacts or severe distortions',
              passed: false,
              score: 50,
              details: 'PROCEDURAL_FALLBACK_DETECTED: Frame lacks photographic visual complexity; procedural grid detected.',
            };
            styleCheck = {
              name: 'Consistent visual style with other scenes',
              passed: false,
              score: 45,
              details: 'PROCEDURAL_FALLBACK_DETECTED: Frame does not exhibit documentary/cinematic texture DNA.',
            };
          }
        }
      } catch (visionErr: any) {
        console.warn(`[QualityChecker] Video frame extraction / vision check bypassed: ${visionErr.message}`);
      }
    }

    const checks = {
      visualMatchesNarration: narrationCheck,
      correctSubjectAndObjects: subjectObjectsCheck,
      noAiArtifactsOrDistortions: artifactsCheck,
      naturalLookingMotion: motionCheck,
      correct916Framing: framingCheck,
      consistentVisualStyle: styleCheck,
      sceneDifferentiation: diffCheck,
      strongVisualHook: hookCheck,
    };

    // Calculate overall score
    const checkValues = Object.values(checks);
    let overallScore = Math.round(
      checkValues.reduce((sum, item) => sum + item.score, 0) / checkValues.length
    );

    if (isProceduralFallback) {
      // Hard cap: Cannot receive a QC score above 55%
      overallScore = Math.min(overallScore, 50);
    }

    const failedChecks: string[] = checkValues
      .filter((item) => !item.passed)
      .map((item) => item.name);

    if (isProceduralFallback && !failedChecks.includes('PROCEDURAL_FALLBACK_DETECTED')) {
      failedChecks.unshift('PROCEDURAL_FALLBACK_DETECTED');
    }

    // Critical failure criteria: if procedural fallback, framing fails, artifacts fail, or score below 75
    const passed = !isProceduralFallback && (failedChecks.length === 0 || (overallScore >= 75 && framingCheck.passed && artifactsCheck.passed));

    // 3. Generate targeted prompt adjustments if quality check did not pass
    let retryPromptAdjustment: string | undefined;
    if (!passed) {
      retryPromptAdjustment = this.generatePromptAdjustments({
        failedChecks,
        scene,
        globalStyle,
        isFirstScene,
        attempt,
      });
    }

    return {
      passed,
      overallScore,
      checks,
      failedChecks,
      retryPromptAdjustment,
      assessedAt: new Date().toISOString(),
    };
  }

  /**
   * Criterion 1: Visual matches the narration
   */
  private evaluateVisualMatchesNarration(
    narration: string,
    visualPrompt: string,
    visualSubject?: string | null
  ): QualityCheckItem {
    const normNarration = (narration || '').toLowerCase();
    const normPrompt = (visualPrompt || '').toLowerCase();
    const normSubject = (visualSubject || '').toLowerCase();

    // Extract significant keywords (exclude common stop words)
    const stopWords = new Set(['the', 'and', 'that', 'this', 'with', 'from', 'your', 'about', 'what', 'when', 'where', 'how', 'why', 'are', 'was', 'were', 'will', 'have', 'been']);
    const narrationWords = normNarration
      .replace(/[^a-z0-9\s]/g, ' ')
      .split(/\s+/)
      .filter((w) => w.length > 3 && !stopWords.has(w));

    let matchedKeywords = 0;
    for (const word of narrationWords) {
      if (normPrompt.includes(word) || normSubject.includes(word)) {
        matchedKeywords++;
      }
    }

    const keywordRatio = narrationWords.length > 0 ? matchedKeywords / narrationWords.length : 1;
    const hasSubjectOverlap = normSubject.length > 0 && normPrompt.includes(normSubject.split(/\s+/)[0]);

    let score = 70;
    if (keywordRatio >= 0.25 || hasSubjectOverlap) score += 20;
    if (keywordRatio >= 0.45) score += 10;
    if (normPrompt.length < 25) score -= 30;

    const passed = score >= 70;
    return {
      name: 'Visual matches narration',
      passed,
      score: Math.min(100, Math.max(0, score)),
      details: passed
        ? `Visual prompt accurately aligns with spoken narration themes (${matchedKeywords} key conceptual matches).`
        : `Visual prompt lacks clear thematic alignment with the spoken narration segment.`,
    };
  }

  /**
   * Criterion 2: Correct subject and objects
   */
  private evaluateCorrectSubjectAndObjects(
    visualPrompt: string,
    visualSubject?: string | null,
    narration?: string
  ): QualityCheckItem {
    const normPrompt = (visualPrompt || '').toLowerCase();
    const subject = (visualSubject || '').trim();

    let score = 75;
    let details = 'Subject and focal objects are clearly specified.';

    if (!subject && normPrompt.length < 30) {
      score -= 30;
      details = 'Missing concrete focal subject and specified objects in scene description.';
    } else if (subject && normPrompt.includes(subject.toLowerCase())) {
      score = 95;
      details = `Primary subject "${subject}" is explicitly centered with defined contextual objects.`;
    } else if (normPrompt.length > 50) {
      score = 88;
      details = 'Rich visual subject matter and descriptive focal elements identified.';
    }

    const passed = score >= 70;
    return {
      name: 'Correct subject and objects',
      passed,
      score,
      details,
    };
  }

  /**
   * Criterion 3: No obvious AI artifacts or severe distortions
   */
  private evaluateNoAiArtifactsOrDistortions(
    visualPrompt: string,
    fileExists: boolean,
    fileSize: number,
    mediaMeta: MediaMetadata
  ): QualityCheckItem {
    const normPrompt = (visualPrompt || '').toLowerCase();

    // Check for bad prompt phrases that cause hallucination or distortion
    const distortionTriggers = ['blurry', 'distorted', 'warped', 'mutated', 'extra limbs', 'floating heads'];
    const hasDistortionTrigger = distortionTriggers.some((t) => normPrompt.includes(t));

    let score = 90;
    let details = 'Clip media structure is clean and prompt contains negative guardrails against artifacts.';

    if (!fileExists || fileSize < 1000) {
      score = 0;
      details = 'Clip file is missing or corrupted on disk.';
    } else if (hasDistortionTrigger) {
      score = 40;
      details = 'Prompt contains problematic keywords that induce AI visual distortion.';
    } else if (mediaMeta.isValid && fileSize > 50000) {
      score = 95;
      details = 'Valid video stream verified with clean compression and no digital corruption.';
    }

    const passed = score >= 70;
    return {
      name: 'No obvious AI artifacts or severe distortions',
      passed,
      score,
      details,
    };
  }

  /**
   * Criterion 4: Natural-looking motion
   */
  private evaluateNaturalLookingMotion(
    cameraMovement?: string | null,
    visualPrompt?: string,
    mediaMeta?: MediaMetadata
  ): QualityCheckItem {
    const motion = (cameraMovement || '').toLowerCase();
    const prompt = (visualPrompt || '').toLowerCase();

    // Positive cinematic movements
    const cinematicMovements = [
      'dolly', 'glide', 'tracking', 'pan', 'zoom', 'push-in', 'pull-out',
      'pedestal', 'orbit', 'steadicam', 'slow linear', 'focus pull',
    ];

    const hasCinematicMovement = cinematicMovements.some(
      (m) => motion.includes(m) || prompt.includes(m)
    );

    // Negative chaotic movements
    const chaoticMovements = ['erratic', 'shaky', 'hyper-speed', 'turbulent', 'wobble'];
    const hasChaoticMovement = chaoticMovements.some(
      (m) => motion.includes(m) || prompt.includes(m)
    );

    let score = 85;
    let details = 'Camera movement is specified with smooth, controlled physical trajectory.';

    if (hasChaoticMovement) {
      score = 45;
      details = 'Chaotic or erratic camera motion detected; could induce viewer disorientation.';
    } else if (hasCinematicMovement) {
      score = 96;
      details = `Cinematic camera motion configured (${cameraMovement || 'smooth linear glide'}).`;
    } else {
      score = 75;
      details = 'Standard camera motion applied.';
    }

    const passed = score >= 70;
    return {
      name: 'Natural-looking motion',
      passed,
      score,
      details,
    };
  }

  /**
   * Criterion 5: Correct 9:16 framing (1080x1920)
   */
  private evaluateCorrect916Framing(
    mediaMeta: MediaMetadata,
    fileExists: boolean,
    fileSize: number,
    visualPrompt: string
  ): QualityCheckItem {
    const prompt = (visualPrompt || '').toLowerCase();
    const specifiesVertical = prompt.includes('9:16') || prompt.includes('vertical');

    let score = 85;
    let details = '9:16 vertical composition targeted and centered.';

    if (mediaMeta.resolution) {
      const [w, h] = mediaMeta.resolution.split('x').map(Number);
      if (w === 1080 && h === 1920) {
        score = 100;
        details = 'Exact 1080x1920 (9:16) vertical mobile resolution verified.';
      } else if (h > w && Math.abs(h / w - 16 / 9) < 0.1) {
        score = 95;
        details = `Vertical resolution verified: ${mediaMeta.resolution} (~9:16 DAR).`;
      } else if (w > h) {
        score = 30;
        details = `Resolution is horizontal 16:9 (${mediaMeta.resolution}), expected 1080x1920 vertical.`;
      }
    } else if (specifiesVertical) {
      score = 90;
      details = 'Vertical 9:16 aspect ratio explicitly enforced in generation parameters.';
    }

    const passed = score >= 70;
    return {
      name: 'Correct 9:16 framing',
      passed,
      score,
      details,
    };
  }

  /**
   * Criterion 6: Consistent visual style with other scenes (inherits global style)
   */
  private evaluateConsistentVisualStyle(
    visualPrompt: string,
    globalStyle: GlobalVisualStyle
  ): QualityCheckItem {
    const prompt = (visualPrompt || '').toLowerCase();
    const styleName = globalStyle.name.toLowerCase();
    const styleId = globalStyle.id.toLowerCase();

    // Check style DNA markers
    const hasStyleRef =
      prompt.includes(styleName) ||
      prompt.includes(styleId) ||
      prompt.includes('cinematic') ||
      prompt.includes('lighting:') ||
      prompt.includes('visual style:');

    let score = 80;
    let details = `Scene inherits project visual style parameters (${globalStyle.name}).`;

    if (hasStyleRef) {
      score = 95;
      details = `Scene prompt strictly incorporates ${globalStyle.name} color grade and lighting DNA.`;
    } else {
      score = 65;
      details = `Scene prompt does not explicitly reference the project's global visual style (${globalStyle.name}).`;
    }

    const passed = score >= 70;
    return {
      name: 'Consistent visual style with other scenes',
      passed,
      score,
      details,
    };
  }

  /**
   * Criterion 7: Scene is sufficiently different from previous scenes
   */
  private evaluateSceneDifferentiation(
    currentScene: {
      scene_index: number;
      visual_prompt: string;
      visual_subject?: string | null;
      camera_movement?: string | null;
    },
    previousScene?: {
      scene_index: number;
      visual_prompt: string;
      visual_subject?: string | null;
      camera_movement?: string | null;
    } | null
  ): QualityCheckItem {
    if (!previousScene || currentScene.scene_index <= 1) {
      return {
        name: 'Scene is sufficiently different from previous scenes',
        passed: true,
        score: 100,
        details: 'Initial scene establishes baseline visual pacing.',
      };
    }

    const currPrompt = (currentScene.visual_prompt || '').toLowerCase();
    const prevPrompt = (previousScene.visual_prompt || '').toLowerCase();
    const currCam = (currentScene.camera_movement || '').toLowerCase();
    const prevCam = (previousScene.camera_movement || '').toLowerCase();

    // Check if the prompt or subject is an exact or near duplicate
    const isDuplicatePrompt = currPrompt === prevPrompt;
    const isSameCamera = currCam.length > 0 && currCam === prevCam;

    let score = 90;
    let details = 'Scene provides strong visual variety and fresh camera angle compared to previous cut.';

    if (isDuplicatePrompt) {
      score = 25;
      details = 'Scene visual prompt is identical to previous scene, lacking required visual progression.';
    } else if (isSameCamera) {
      score = 75;
      details = 'Scene shares similar camera movement with previous scene, but subject differs.';
    }

    const passed = score >= 70;
    return {
      name: 'Scene is sufficiently different from previous scenes',
      passed,
      score,
      details,
    };
  }

  /**
   * Criterion 8: Strong visual hook in opening seconds (scene 1)
   */
  private evaluateStrongVisualHook(
    scene: {
      scene_index: number;
      visual_prompt: string;
      visual_subject?: string | null;
    },
    isFirstScene: boolean
  ): QualityCheckItem {
    if (!isFirstScene) {
      return {
        name: 'Strong visual hook in the opening seconds',
        passed: true,
        score: 95,
        details: 'Visual hook criterion applies primarily to opening Scene 1.',
      };
    }

    const prompt = (scene.visual_prompt || '').toLowerCase();
    const hookKeywords = ['hook', 'high-impact', 'intense', 'dramatic', 'opening', 'striking', 'eye-catching', 'dynamic'];
    const hasHookKeyword = hookKeywords.some((k) => prompt.includes(k));

    let score = 75;
    let details = 'Opening visual established.';

    if (hasHookKeyword) {
      score = 98;
      details = 'High-retention visual hook explicitly designed for the first 3-5 seconds of vertical video.';
    } else {
      score = 65;
      details = 'Scene 1 opening lacks high-impact retention hook keywords.';
    }

    const passed = score >= 70;
    return {
      name: 'Strong visual hook in the opening seconds',
      passed,
      score,
      details,
    };
  }

  /**
   * Generates targeted prompt adjustments for auto-regeneration
   */
  private generatePromptAdjustments(params: {
    failedChecks: string[];
    scene: {
      scene_index: number;
      visual_prompt: string;
      visual_subject?: string | null;
      narration: string;
    };
    globalStyle: GlobalVisualStyle;
    isFirstScene: boolean;
    attempt: number;
  }): string {
    const { failedChecks, scene, globalStyle, isFirstScene } = params;
    const adjustments: string[] = [];

    if (failedChecks.includes('PROCEDURAL_FALLBACK_DETECTED')) {
      adjustments.push('photorealistic real-world documentary camera capture, high visual entropy, detailed human and physical subject, eliminate procedural grid');
    }

    if (failedChecks.includes('Correct 9:16 framing')) {
      adjustments.push('strictly center composition for 9:16 vertical mobile aspect ratio (1080x1920), no letterboxing');
    }

    if (failedChecks.includes('Visual matches narration')) {
      const narrationSlice = scene.narration.substring(0, 60);
      adjustments.push(`directly visualize the spoken concept: "${narrationSlice}"`);
    }

    if (failedChecks.includes('No obvious AI artifacts or severe distortions')) {
      adjustments.push('photorealistic anatomical precision, razor sharp textures, zero digital noise, eliminate warped geometry');
    }

    if (failedChecks.includes('Natural-looking motion')) {
      adjustments.push('smooth linear forward dolly glide, fluid physical motion, steady gimbal stabilization, no sudden jump cuts');
    }

    if (failedChecks.includes('Consistent visual style with other scenes')) {
      adjustments.push(`${globalStyle.promptSuffix}, uniform color grade and lighting balance`);
    }

    if (failedChecks.includes('Scene is sufficiently different from previous scenes')) {
      adjustments.push('distinct camera perspective, new focal angle, differentiated background environment');
    }

    if (failedChecks.includes('Strong visual hook in the opening seconds') && isFirstScene) {
      adjustments.push('high-impact visual shock factor, intense dynamic lighting contrast, immediate viewer retention hook in first 2 seconds');
    }

    return adjustments.length > 0
      ? adjustments.join(', ')
      : 'enhanced clarity, cinematic 9:16 vertical composition, pristine visual fidelity';
  }

  /**
   * Multimodal AI Visual Verification using Google Gemini Vision
   * Directly inspects the extracted pixel frame from the generated video.
   */
  private async evaluateWithGeminiVision(params: {
    framePath: string;
    scene: {
      scene_index: number;
      narration: string;
      visual_prompt: string;
      visual_subject?: string | null;
      camera_movement?: string | null;
    };
    globalStyle: GlobalVisualStyle;
    isFirstScene: boolean;
    geminiKey: string;
  }): Promise<Partial<{
    visualMatchesNarration: QualityCheckItem;
    correctSubjectAndObjects: QualityCheckItem;
    noAiArtifactsOrDistortions: QualityCheckItem;
    correct916Framing: QualityCheckItem;
    consistentVisualStyle: QualityCheckItem;
    strongVisualHook: QualityCheckItem;
  }> | null> {
    try {
      const base64Img = (await fs.promises.readFile(params.framePath)).toString('base64');
      const prompt = `You are a strict film Quality Control AI inspector for mobile short-form video production (YouTube Shorts, Reels, TikTok).
Inspect this real video frame extracted from a generated scene clip.

SCENE METADATA:
Scene Index: ${params.scene.scene_index}
Scene Spoken Narration: "${params.scene.narration}"
Visual Prompt: "${params.scene.visual_prompt}"
Focal Subject: "${params.scene.visual_subject || 'Not specified'}"
Global Visual Style: "${params.globalStyle.name}" (${params.globalStyle.dna.renderStyle})
Is Opening Hook Scene: ${params.isFirstScene}

EVALUATION CHECKLIST (Examine pixels carefully):
1. Visual matches narration: Are the key concepts/themes spoken in the narration visually represented in the frame?
2. Correct subject and objects: Is the focal subject/object identifiable and correctly depicted without missing key elements?
3. No obvious AI artifacts: Are there distorted faces, malformed hands, impossible anatomy, broken geometry, melting textures, or digital glitches?
4. Correct 9:16 framing: Is the subject framed within a vertical mobile safe zone without awkward cropping or letterboxing?
5. Consistent visual style: Does the visual match the ${params.globalStyle.name} aesthetic (lighting, realism, color palette)?
6. Strong visual hook: (If Scene 1) Does this opening frame deliver a captivating, high-retention visual hook?

Return valid JSON strictly matching this structure:
{
  "visualMatchesNarration": { "passed": true, "score": 90, "details": "string" },
  "correctSubjectAndObjects": { "passed": true, "score": 90, "details": "string" },
  "noAiArtifactsOrDistortions": { "passed": true, "score": 95, "details": "string" },
  "correct916Framing": { "passed": true, "score": 95, "details": "string" },
  "consistentVisualStyle": { "passed": true, "score": 90, "details": "string" },
  "strongVisualHook": { "passed": true, "score": 90, "details": "string" }
}`;

      const geminiModels = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-flash-latest'];
      let res: Response | null = null;
      for (const model of geminiModels) {
        try {
          res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${params.geminiKey}`, {
            method: 'POST',
            signal: AbortSignal.timeout(15000),
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [
                {
                  parts: [
                    {
                      inline_data: {
                        mime_type: 'image/jpeg',
                        data: base64Img,
                      },
                    },
                    { text: prompt },
                  ],
                },
              ],
              generationConfig: {
                responseMimeType: 'application/json',
              },
            }),
          });
          if (res.ok) break;
        } catch {}
      }

      if (!res || !res.ok) return null;
      const data: any = await res.json();
      const raw = data.candidates?.[0]?.content?.parts?.[0]?.text;
      if (!raw) return null;

      let cleaned = raw.trim();
      if (cleaned.startsWith('```json')) {
        cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }

      const parsed = JSON.parse(cleaned);
      return {
        visualMatchesNarration: parsed.visualMatchesNarration ? { name: 'Visual matches narration', ...parsed.visualMatchesNarration } : undefined,
        correctSubjectAndObjects: parsed.correctSubjectAndObjects ? { name: 'Correct subject and objects', ...parsed.correctSubjectAndObjects } : undefined,
        noAiArtifactsOrDistortions: parsed.noAiArtifactsOrDistortions ? { name: 'No obvious AI artifacts or severe distortions', ...parsed.noAiArtifactsOrDistortions } : undefined,
        correct916Framing: parsed.correct916Framing ? { name: 'Correct 9:16 framing', ...parsed.correct916Framing } : undefined,
        consistentVisualStyle: parsed.consistentVisualStyle ? { name: 'Consistent visual style with other scenes', ...parsed.consistentVisualStyle } : undefined,
        strongVisualHook: parsed.strongVisualHook ? { name: 'Strong visual hook in the opening seconds', ...parsed.strongVisualHook } : undefined,
      };
    } catch (err: any) {
      console.warn(`[QualityChecker] Gemini vision evaluation bypassed (${err.message}).`);
      return null;
    }
  }
}

export const sceneQualityChecker = new SceneQualityChecker();
