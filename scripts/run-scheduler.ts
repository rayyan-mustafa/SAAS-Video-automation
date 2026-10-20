/**
 * Standalone Background Scheduler & Queue Worker Daemon
 *
 * Usage:
 *   npm run scheduler
 *   npm run worker
 *
 * Runs the AutoVideo automated publishing queue continuously with graceful shutdown.
 */

import fs from 'fs';
import path from 'path';
import { publishingScheduler } from '../src/lib/scheduler';

// Load .env manually
try {
  const envContent = fs.readFileSync(path.join(__dirname, '..', '.env'), 'utf-8');
  envContent.split('\n').forEach((line) => {
    const trimmed = line.trim();
    if (trimmed && !trimmed.startsWith('#') && trimmed.includes('=')) {
      const [k, ...v] = trimmed.split('=');
      if (k && !process.env[k.trim()]) {
        process.env[k.trim()] = v.join('=').trim();
      }
    }
  });
} catch {}

const intervalMs = parseInt(process.env.SCHEDULER_INTERVAL_MS || '30000', 10);

console.log('================================================================');
console.log('   AUTOVIDEO — AUTONOMOUS PUBLISHING WORKER DAEMON');
console.log(`   Poll Interval: ${intervalMs / 1000}s`);
console.log('================================================================\n');

let isShuttingDown = false;

async function runCycle() {
  if (isShuttingDown) return;
  try {
    const result = await publishingScheduler.checkAndPublishDueVideos();
    if (result.processedCount > 0) {
      console.log(`[Scheduler] Evaluated ${result.processedCount} due project(s): ${result.publishedCount} published, ${result.failedCount} failed.`);
      result.details.forEach((d) => {
        if (d.status === 'PUBLISHED') {
          console.log(`  ✓ Published: "${d.topic}" -> YouTube Video ID: ${d.videoId}`);
        } else {
          console.log(`  ✗ Failed: "${d.topic}" -> ${d.error}`);
        }
      });
    }
  } catch (err: any) {
    console.error('[Scheduler Error]:', err.message);
  }
}

// Start continuous polling
publishingScheduler.start(intervalMs);

// Graceful shutdown handlers
process.on('SIGINT', () => {
  console.log('\n[Scheduler] Received SIGINT. Shutting down worker gracefully...');
  isShuttingDown = true;
  publishingScheduler.stop();
  process.exit(0);
});

process.on('SIGTERM', () => {
  console.log('\n[Scheduler] Received SIGTERM. Shutting down worker gracefully...');
  isShuttingDown = true;
  publishingScheduler.stop();
  process.exit(0);
});
