import path from 'path';
import fs from 'fs';
import { execFile } from 'child_process';
import util from 'util';
import {
  getDb,
  getPersonalCreatorProfile,
  upsertPersonalCreatorProfile,
  createPersonalCreatorProject,
  getPersonalCreatorProject,
  listPersonalCreatorProjects,
  createPersonalCreatorAsset,
  getPersonalCreatorAsset,
  deletePersonalCreatorProject,
} from '../src/lib/db';
import { createSession } from '../src/lib/auth';
import { personalCreatorScriptService } from '../src/lib/providers/personalCreatorScriptService';
import { personalVoiceService } from '../src/lib/providers/personalVoiceService';
import { avatarProvider } from '../src/lib/providers/avatarProvider';
import { personalCreatorPipeline } from '../src/lib/video/personalCreatorPipeline';
import { getFfmpegPath, inspectMedia } from '../src/lib/providers/videoProvider';

const execFileAsync = util.promisify(execFile);

// ANSI Colors
const GREEN = '\x1b[32m';
const RED = '\x1b[31m';
const CYAN = '\x1b[36m';
const YELLOW = '\x1b[33m';
const RESET = '\x1b[0m';

let passedTests = 0;
let totalTests = 0;

function assert(condition: boolean, testName: string, details?: string) {
  totalTests++;
  if (condition) {
    passedTests++;
    console.log(`${GREEN}  ✅ PASS:${RESET} ${testName} ${details ? `(${details})` : ''}`);
  } else {
    console.error(`${RED}  ❌ FAIL:${RESET} ${testName} ${details ? `(${details})` : ''}`);
  }
}

async function runSuite() {
  console.log(`\n${CYAN}======================================================${RESET}`);
  console.log(`${CYAN}   PERSONAL AI CREATOR — PRODUCTION TEST SUITE        ${RESET}`);
  console.log(`${CYAN}======================================================\n${RESET}`);

  const db = getDb();
  const ffmpegPath = getFfmpegPath();
  const testDir = path.join(process.cwd(), 'temp', 'test-personal-ai');
  if (!fs.existsSync(testDir)) fs.mkdirSync(testDir, { recursive: true });

  // ─────────────────────────────────────────────────────────────
  // 1. TENANT SETUP (USER A & USER B)
  // ─────────────────────────────────────────────────────────────
  console.log(`${YELLOW}1. Multi-Tenant User Setup${RESET}`);
  const userAId = 'usr_alice_test_' + Date.now();
  const userBId = 'usr_bob_test_' + Date.now();

  db.prepare(`
    INSERT INTO users (id, email, password_hash, salt, name, role, status, email_verified, created_at, updated_at)
    VALUES (?, ?, 'hash', 'salt', 'Alice Creator', 'CUSTOMER', 'ACTIVE', 1, datetime('now'), datetime('now'))
  `).run(userAId, `alice_${Date.now()}@autovideo.ai`);

  db.prepare(`
    INSERT INTO users (id, email, password_hash, salt, name, role, status, email_verified, created_at, updated_at)
    VALUES (?, ?, 'hash', 'salt', 'Bob Stranger', 'CUSTOMER', 'ACTIVE', 1, datetime('now'), datetime('now'))
  `).run(userBId, `bob_${Date.now()}@autovideo.ai`);

  const sessionA = createSession(userAId);
  const sessionB = createSession(userBId);

  assert(!!sessionA.sessionToken && !!sessionB.sessionToken, 'Created distinct user sessions for Alice and Bob');

  // ─────────────────────────────────────────────────────────────
  // 2. PHOTO UPLOAD & CONSENT VALIDATION
  // ─────────────────────────────────────────────────────────────
  console.log(`\n${YELLOW}2. Photo Upload & Legal Consent Tracking${RESET}`);
  // Generate a mock portrait photo with FFmpeg
  const testPhotoPath = path.join(testDir, 'alice_portrait.jpg');
  await execFileAsync(ffmpegPath, [
    '-y',
    '-f', 'lavfi',
    '-i', 'color=c=0x2b2d42:s=512x512:d=1',
    '-vf', "drawtext=text='Alice Portrait':fontcolor=white:fontsize=32:x=(w-text_w)/2:y=(h-text_h)/2",
    '-vframes', '1',
    testPhotoPath,
  ]);

  assert(fs.existsSync(testPhotoPath), 'Generated valid test photo file on disk');

  // Asset creation for Alice
  const photoAsset = createPersonalCreatorAsset({
    userId: userAId,
    type: 'photo',
    storageKey: `personal-ai/${userAId}/photos/alice.jpg`,
    mimeType: 'image/jpeg',
    size: fs.statSync(testPhotoPath).size,
  });

  const consentTimestamp = new Date().toISOString();
  upsertPersonalCreatorProfile(userAId, {
    avatar_asset_id: photoAsset.id,
    consent_agreed_at: consentTimestamp,
  });

  const profileA = getPersonalCreatorProfile(userAId);
  assert(profileA?.avatar_asset_id === photoAsset.id, 'User profile linked to uploaded photo asset');
  assert(profileA?.consent_agreed_at === consentTimestamp, 'Legal consent timestamp stored in profile');

  // ─────────────────────────────────────────────────────────────
  // 3. VOICE SAMPLE VALIDATION & SILENCE DETECTION
  // ─────────────────────────────────────────────────────────────
  console.log(`\n${YELLOW}3. Voice Validation & Silence Check${RESET}`);
  // Generate a valid audio clip (5 seconds of tone)
  const validAudioPath = path.join(testDir, 'valid_voice.mp3');
  await execFileAsync(ffmpegPath, [
    '-y',
    '-f', 'lavfi',
    '-i', 'sine=frequency=440:duration=5',
    '-c:a', 'libmp3lame',
    validAudioPath,
  ]);

  const validCheck = await personalVoiceService.validateAudioSample(validAudioPath);
  assert(validCheck.isValid && !validCheck.isSilent, 'Valid audio sample passed duration and audio checks', `duration: ${validCheck.durationSec}s`);

  // Generate a too-short audio clip (1 second)
  const shortAudioPath = path.join(testDir, 'short_voice.mp3');
  await execFileAsync(ffmpegPath, [
    '-y',
    '-f', 'lavfi',
    '-i', 'sine=frequency=440:duration=1',
    '-c:a', 'libmp3lame',
    shortAudioPath,
  ]);
  const shortCheck = await personalVoiceService.validateAudioSample(shortAudioPath);
  assert(!shortCheck.isValid, 'Too-short voice sample (< 2.5s) correctly rejected');

  // Generate a silent audio clip (5 seconds of complete silence)
  const silentAudioPath = path.join(testDir, 'silent_voice.mp3');
  await execFileAsync(ffmpegPath, [
    '-y',
    '-f', 'lavfi',
    '-i', 'anullsrc=r=44100:cl=stereo',
    '-t', '5',
    '-c:a', 'libmp3lame',
    silentAudioPath,
  ]);
  const silentCheck = await personalVoiceService.validateAudioSample(silentAudioPath);
  assert(!silentCheck.isValid || silentCheck.isSilent, 'Empty/silent audio sample detected and rejected');

  // Setup voice profile
  const voiceSetup = await personalVoiceService.setupPersonalVoice({
    userId: userAId,
    sampleFilePath: validAudioPath,
  });
  assert(!!voiceSetup.voiceId && (voiceSetup.voiceType === 'personal' || voiceSetup.voiceType === 'standard'), 'Voice service resolved valid voice ID and honest label', voiceSetup.voiceLabel);

  // ─────────────────────────────────────────────────────────────
  // 4. SCRIPT GENERATION & SCENE DIVISION
  // ─────────────────────────────────────────────────────────────
  console.log(`\n${YELLOW}4. Script Generation & Custom Script Analysis${RESET}`);
  // Test A: Custom pasted script
  const sampleCustomScript = `Are you tired of spending hours editing videos manually? In 2026, autonomous AI video automation has completely rewritten the playbook for creators.\n\nThe real secret lies in combining prompt-driven visual generation with synchronized neural voiceovers. When your script feeds directly into high-definition B-roll, production time drops from four hours to three minutes.\n\nMastering this workflow gives solo creators the output of a full video production agency. Hit subscribe to stay ahead of the curve.`;
  const analyzed = personalCreatorScriptService.analyzeCustomScript(sampleCustomScript, 'AI Video Revolution');
  assert(analyzed.scenes.length >= 3, 'Custom script divided into structured scenes', `${analyzed.scenes.length} scenes, ${analyzed.wordCount} words`);
  assert(analyzed.totalDurationSec > 10, 'Calculated natural estimated speaking duration', analyzed.estimatedDurationFormatted);

  // Test B: Topic generation with OpenRouter DeepSeek / fallback
  const topicScript = await personalCreatorScriptService.generateScriptFromTopic({
    topic: 'How Space Exploration Drives Technology',
    audience: 'Tech enthusiasts',
    tone: 'Storytelling',
    lengthMinutes: 1,
    style: 'STORYTELLING',
  });
  assert(topicScript.scenes.length >= 4, 'AI Script generated structured scene breakdown', `${topicScript.scenes.length} scenes`);
  assert(topicScript.scenes[0].sceneType === 'hook', 'Scene 1 generated as hook');

  // ─────────────────────────────────────────────────────────────
  // 5. AVATAR & PRESENTER CLIP SYNTHESIS
  // ─────────────────────────────────────────────────────────────
  console.log(`\n${YELLOW}5. Avatar Provider & Standard Presenter Studio Mode${RESET}`);
  const presenterRes = await avatarProvider.generatePresenterClip({
    projectId: 'test_proj',
    sceneId: 'test_scene_1',
    photoPath: testPhotoPath,
    durationSec: 3,
    aspectRatio: '16:9',
    style: 'PODCAST',
    presenterPosition: 'center',
    presenterFraming: 'medium',
    cameraMotion: 'cinematic',
  });

  assert(fs.existsSync(presenterRes.videoPath), 'Presenter video clip rendered to disk', presenterRes.videoPath);
  assert(presenterRes.providerStatus === 'STANDARD_PRESENTER' || presenterRes.providerStatus === 'REAL', 'Honest status classification returned (no fake lip-sync)', presenterRes.statusLabel);

  const mediaMeta = await inspectMedia(presenterRes.videoPath);
  assert(mediaMeta.isValid && mediaMeta.durationSec >= 2.8, 'Presenter video duration and headers verified via FFmpeg', `${mediaMeta.durationSec.toFixed(1)}s`);

  // ─────────────────────────────────────────────────────────────
  // 6. FULL BACKGROUND VIDEO PIPELINE & MULTI-STYLE RENDERING
  // ─────────────────────────────────────────────────────────────
  console.log(`\n${YELLOW}6. Full Background Video Pipeline Execution${RESET}`);

  // Test Project A: 16:9 Landscape Podcast Style
  const projectA = createPersonalCreatorProject({
    userId: userAId,
    title: 'The Future of AI Podcast',
    topic: 'The Future of AI',
    style: 'PODCAST',
    aspect_ratio: '16:9',
    presenter_position: 'center',
    camera_motion: 'cinematic',
    captions_enabled: 1,
    music_enabled: 1,
    music_volume: 15,
  });

  // Attach avatar photo path
  (projectA as any).avatar_asset_id = photoAsset.id;

  // Run pipeline
  await personalCreatorPipeline.processProject(projectA.id, userAId);

  const completedProjA = getPersonalCreatorProject(projectA.id, userAId);
  assert(completedProjA?.status === 'COMPLETED', 'Project A completed background rendering pipeline', `progress: ${completedProjA?.progress}%`);
  assert(!!completedProjA?.final_video_path && fs.existsSync(completedProjA.final_video_path), 'Final MP4 output file exists on disk');

  if (completedProjA?.final_video_path) {
    const finalMeta = await inspectMedia(completedProjA.final_video_path);
    assert(finalMeta.resolution === '1920x1080', 'Final video resolution is 1920x1080 (16:9)', finalMeta.resolution);
    assert(finalMeta.videoCodec === 'h264', 'Final video encoded in H.264', finalMeta.videoCodec);
    assert(finalMeta.durationSec > 0, 'Final video duration verified', `${finalMeta.durationSec.toFixed(1)}s`);
  }

  // Test Project B: 9:16 Vertical Shorts Vlog Style
  const projectVertical = createPersonalCreatorProject({
    userId: userAId,
    title: 'Daily Tech Vlog Shorts',
    topic: 'Daily Tech Routine',
    style: 'VLOG',
    aspect_ratio: '9:16',
    presenter_position: 'center',
    camera_motion: 'push_in',
    captions_enabled: 1,
    music_enabled: 0,
  });

  await personalCreatorPipeline.processProject(projectVertical.id, userAId);
  const completedVertical = getPersonalCreatorProject(projectVertical.id, userAId);
  assert(completedVertical?.status === 'COMPLETED', 'Vertical 9:16 project completed rendering');
  if (completedVertical?.final_video_path) {
    const vertMeta = await inspectMedia(completedVertical.final_video_path);
    assert(vertMeta.resolution === '1080x1920', 'Vertical video resolution is 1080x1920 (9:16)', vertMeta.resolution);
  }

  // ─────────────────────────────────────────────────────────────
  // 7. MULTI-TENANT SECURITY & IDOR PREVENTIONS
  // ─────────────────────────────────────────────────────────────
  console.log(`\n${YELLOW}7. Multi-Tenant Security & Asset Isolation${RESET}`);

  // Test 7.1: User A can access own project
  const aliceAccess = getPersonalCreatorProject(projectA.id, userAId);
  assert(aliceAccess !== null, 'Owner (Alice) can access own project');

  // Test 7.2: User B CANNOT access User A's project (IDOR block)
  const bobAccess = getPersonalCreatorProject(projectA.id, userBId);
  assert(bobAccess === null, 'Non-owner (Bob) is BLOCKED from accessing Alice project (IDOR 403)');

  // Test 7.3: User B CANNOT access User A's uploaded photo asset
  const bobAssetAccess = getPersonalCreatorAsset(photoAsset.id, userBId);
  assert(bobAssetAccess === null, 'Non-owner (Bob) is BLOCKED from accessing Alice photo asset');

  // Test 7.4: User B CANNOT delete User A's project
  const deleteResult = deletePersonalCreatorProject(projectA.id, userBId);
  assert(!deleteResult, 'Non-owner (Bob) DELETE request rejected with 0 changes');

  // Test 7.5: Alice can list only her own projects
  const aliceProjects = listPersonalCreatorProjects(userAId);
  const bobProjects = listPersonalCreatorProjects(userBId);
  assert(aliceProjects.some((p) => p.id === projectA.id), 'Alice project list contains Project A');
  assert(!bobProjects.some((p) => p.id === projectA.id), 'Bob project list DOES NOT contain Alice Project A');

  // Cleanup test users & test projects
  deletePersonalCreatorProject(projectA.id, userAId);
  deletePersonalCreatorProject(projectVertical.id, userAId);
  db.prepare('DELETE FROM users WHERE id IN (?, ?)').run(userAId, userBId);

  // ─────────────────────────────────────────────────────────────
  // FINAL SCORECARD
  // ─────────────────────────────────────────────────────────────
  console.log(`\n${CYAN}======================================================${RESET}`);
  console.log(`${CYAN}   FINAL TEST SCORECARD: ${passedTests}/${totalTests} PASSED${RESET}`);
  console.log(`${CYAN}======================================================\n${RESET}`);

  if (passedTests === totalTests) {
    console.log(`${GREEN}🎉 ALL ${totalTests} TESTS PASSED! PERSONAL AI CREATOR IS VERIFIED.${RESET}\n`);
    process.exit(0);
  } else {
    console.error(`${RED}⚠️ ${totalTests - passedTests} TESTS FAILED.${RESET}\n`);
    process.exit(1);
  }
}

runSuite().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});
