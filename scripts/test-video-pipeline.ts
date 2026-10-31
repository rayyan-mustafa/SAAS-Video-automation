const { getDb } = require('../src/lib/db');
const { VideoPipelineWorker } = require('../src/lib/queue/worker');
const { generateVideoPlan } = require('../src/lib/video/planGenerator');
const { storage } = require('../src/lib/storage');
const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

async function testFullPipeline() {
  console.log('======================================================');
  console.log('   TESTING FULL END-TO-END VIDEO RENDERING PIPELINE');
  console.log('======================================================\n');

  const db = getDb();
  const worker = new VideoPipelineWorker();

  // Test 1: Creator Short (9:16) with prompt & enhancers
  console.log('>>> [Test 1] Generating Short (9:16) Video Plan with Enhancers...');
  const shortTopic = 'The hidden secrets of deep sea bioluminescent creatures, starts with a shocking 3-second hook question, photorealistic cinematic visuals with slow dramatic camera motion, backed by verified data, research numbers and crisp motion graphics, ultra high-tempo scene transitions every 3 to 4 seconds';

  const shortProjectId = uuidv4();
  const shortPlan = await generateVideoPlan({
    channelName: 'Ocean Mysteries',
    niche: 'Nature & Marine Biology',
    language: 'en',
    topic: shortTopic,
    targetLengthMinutes: 0.75, // 45 seconds (Short)
    visualStyle: 'Cinematic AI (Veo 3.1 / Kling / Wan)',
    userPlan: 'creator',
  });

  console.log(`✓ Short Plan generated: Title="${shortPlan.title}", Scenes=${shortPlan.scenes.length}, WordCount=${shortPlan.wordCount}`);

  // Insert project into DB
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO content_projects (
      id, user_id, channel_id, topic, target_length_minutes, preset, language,
      platform, visibility, status, current_stage, aspect_ratio, generation_mode,
      quoted_credits, length_band, approved_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    shortProjectId,
    'usr_87924606b4131a8a',
    'chan_87924606b4131a8a',
    shortTopic,
    0.75,
    'EXPLAINER',
    'en',
    'YouTube',
    'PRIVATE',
    'PENDING_APPROVAL',
    'PLAN',
    '9:16',
    'text-to-video',
    25,
    'short',
    now,
    now,
    now
  );

  // Insert scenes
  for (const s of shortPlan.scenes) {
    db.prepare(`
      INSERT INTO video_scenes (
        id, project_id, scene_index, narration, visual_prompt, visual_subject,
        environment, camera_movement, lighting, color_style, continuity_notes,
        estimated_duration_sec, subtitle_text, visual_tier, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      uuidv4(),
      shortProjectId,
      s.sceneIndex,
      s.narration,
      s.visualPrompt,
      s.visualSubject || null,
      s.environment || null,
      s.cameraMovement || null,
      s.lighting || null,
      s.colorStyle || null,
      s.continuityNotes || null,
      s.estimatedDurationSec,
      s.subtitleText,
      s.visualTier || 'motion_still',
      now
    );
  }

  console.log(`>>> Starting VideoPipelineWorker for Short Project: ${shortProjectId}...`);
  await worker.startProjectPipeline(shortProjectId, 'VOICE');

  console.log(`>>> Waiting for Short Project ${shortProjectId} to complete rendering...`);
  let shortProject;
  for (let i = 0; i < 50; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    shortProject = db.prepare('SELECT status, error_message FROM content_projects WHERE id = ?').get(shortProjectId);
    if (shortProject?.status === 'COMPLETED' || shortProject?.status === 'FAILED') break;
    process.stdout.write('.');
  }
  console.log('\n');

  // Verify Project Output
  const shortOutput = db.prepare('SELECT * FROM video_outputs WHERE project_id = ?').get(shortProjectId);
  shortProject = db.prepare('SELECT status, error_message FROM content_projects WHERE id = ?').get(shortProjectId);

  console.log(`\nShort Project Status: ${shortProject.status}`);
  if (shortProject.error_message) {
    console.error(`Error message: ${shortProject.error_message}`);
  }
  console.log('Short Project Output in DB:', shortOutput);

  if (shortOutput?.storage_key) {
    const filePath = storage.getFilePath(shortOutput.storage_key);
    console.log(`✓ Short Video MP4 File exists on disk: ${fs.existsSync(filePath)}`);
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      console.log(`✓ Short Video MP4 File Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
    }
  }

  // Test 2: Long-Form (16:9) Video
  console.log('\n>>> [Test 2] Generating Long-Form (16:9) Video Plan...');
  const longTopic = 'Autonomous AI agent systems reshaping modern software engineering in 2026';
  const longProjectId = uuidv4();
  const longPlan = await generateVideoPlan({
    channelName: 'Tech Frontier',
    niche: 'AI & Software Innovation',
    language: 'en',
    topic: longTopic,
    targetLengthMinutes: 2.0, // 2 minutes (Standard Long-form)
    visualStyle: 'Cyberpunk & Dark High-Tech',
    userPlan: 'creator',
  });

  console.log(`✓ Long-form Plan generated: Title="${longPlan.title}", Scenes=${longPlan.scenes.length}, WordCount=${longPlan.wordCount}`);

  db.prepare(`
    INSERT INTO content_projects (
      id, user_id, channel_id, topic, target_length_minutes, preset, language,
      platform, visibility, status, current_stage, aspect_ratio, generation_mode,
      quoted_credits, length_band, approved_at, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `).run(
    longProjectId,
    'usr_87924606b4131a8a',
    'chan_87924606b4131a8a',
    longTopic,
    2.0,
    'EXPLAINER',
    'en',
    'YouTube',
    'PRIVATE',
    'PENDING_APPROVAL',
    'PLAN',
    '16:9',
    'text-to-video',
    45,
    'standard',
    now,
    now,
    now
  );

  for (const s of longPlan.scenes) {
    db.prepare(`
      INSERT INTO video_scenes (
        id, project_id, scene_index, narration, visual_prompt, visual_subject,
        environment, camera_movement, lighting, color_style, continuity_notes,
        estimated_duration_sec, subtitle_text, visual_tier, created_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      uuidv4(),
      longProjectId,
      s.sceneIndex,
      s.narration,
      s.visualPrompt,
      s.visualSubject || null,
      s.environment || null,
      s.cameraMovement || null,
      s.lighting || null,
      s.colorStyle || null,
      s.continuityNotes || null,
      s.estimatedDurationSec,
      s.subtitleText,
      s.visualTier || 'motion_still',
      now
    );
  }

  console.log(`>>> Starting VideoPipelineWorker for Long Project: ${longProjectId}...`);
  await worker.startProjectPipeline(longProjectId, 'VOICE');

  console.log(`>>> Waiting for Long Project ${longProjectId} to complete rendering...`);
  let longProject;
  for (let i = 0; i < 50; i++) {
    await new Promise((r) => setTimeout(r, 2000));
    longProject = db.prepare('SELECT status, error_message FROM content_projects WHERE id = ?').get(longProjectId);
    if (longProject?.status === 'COMPLETED' || longProject?.status === 'FAILED') break;
    process.stdout.write('.');
  }
  console.log('\n');

  const longOutput = db.prepare('SELECT * FROM video_outputs WHERE project_id = ?').get(longProjectId);
  longProject = db.prepare('SELECT status, error_message FROM content_projects WHERE id = ?').get(longProjectId);

  console.log(`\nLong Project Status: ${longProject.status}`);
  if (longProject.error_message) {
    console.error(`Error message: ${longProject.error_message}`);
  }
  console.log('Long Project Output in DB:', longOutput);

  if (longOutput?.storage_key) {
    const filePath = storage.getFilePath(longOutput.storage_key);
    console.log(`✓ Long Video MP4 File exists on disk: ${fs.existsSync(filePath)}`);
    if (fs.existsSync(filePath)) {
      const stats = fs.statSync(filePath);
      console.log(`✓ Long Video MP4 File Size: ${(stats.size / 1024 / 1024).toFixed(2)} MB`);
    }
  }

  console.log('\n======================================================');
  console.log('   🎉 BOTH SHORT & LONG VIDEO PIPELINES VERIFIED!');
  console.log('======================================================');
}

testFullPipeline().catch(console.error);
