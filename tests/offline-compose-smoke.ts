import assert from 'assert';
import fs from 'fs';
import path from 'path';
import util from 'util';
import { execFile } from 'child_process';
import { getFfmpegPath, inspectMedia } from '../src/lib/providers/videoProvider';
import { ffmpegCompositor } from '../src/lib/providers/ffmpegCompositor';

const execFileAsync = util.promisify(execFile);

/**
 * Offline smoke test for the FFmpeg compositor (no network / API keys required).
 * Synthesizes motion clips + tone audio + SRT, composes a 9:16 video, verifies output,
 * and proves failures are honest (no sample/clip substitution).
 */
async function main() {
  const ff = getFfmpegPath();
  const id = `smoke_${Date.now()}`;
  const dir = path.resolve(process.cwd(), 'temp', id);
  fs.mkdirSync(dir, { recursive: true });

  const clips: string[] = [];
  for (let i = 1; i <= 2; i++) {
    const out = path.join(dir, `clip_${i}.mp4`);
    await execFileAsync(ff, [
      '-y', '-f', 'lavfi', '-i', `testsrc2=size=1080x1920:rate=30:duration=3`,
      '-vf', 'format=yuv420p', '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-an', out,
    ]);
    clips.push(out);
  }
  const audio = path.join(dir, 'voice.mp3');
  await execFileAsync(ff, ['-y', '-f', 'lavfi', '-i', 'sine=frequency=440:duration=6', '-c:a', 'libmp3lame', audio]);
  const srt = path.join(dir, 'subs.srt');
  fs.writeFileSync(srt, '1\n00:00:00,000 --> 00:00:03,000\nHello Tillercast\n\n2\n00:00:03,000 --> 00:00:06,000\nSecond caption\n');

  const result = await ffmpegCompositor.composeVideo({
    projectId: id,
    clipFilePaths: clips,
    audioFilePath: audio,
    subtitleFilePath: srt,
    totalDurationSec: 6,
    aspectRatio: '9:16',
    userPlan: 'creator',
  });
  const meta = await inspectMedia(result.filePath);
  console.log('Composed:', result.resolution, result.videoCodec, result.audioCodec, `${result.filesizeBytes}B`, `${meta.durationSec}s`);
  assert.strictEqual(result.resolution, '1080x1920');
  assert.ok(/h264|avc/i.test(meta.videoCodec || ''), 'H.264 video expected');
  assert.ok(/aac/i.test(meta.audioCodec || ''), 'AAC audio expected');
  assert.ok((meta.durationSec || 0) > 4, 'Duration must be real');

  // Honest failure: missing audio must throw, never ship a silent/placeholder video
  let threw = false;
  try {
    await ffmpegCompositor.composeVideo({
      projectId: `${id}_noaudio`, clipFilePaths: clips, audioFilePath: path.join(dir, 'missing.mp3'),
      totalDurationSec: 6, aspectRatio: '9:16', userPlan: 'creator',
    });
  } catch (e: any) { threw = e?.code === 'NO_VALID_AUDIO'; }
  assert.ok(threw, 'Missing audio must raise NO_VALID_AUDIO');

  // Honest failure: corrupt clips must throw, never copy a clip/sample as final
  const bad = path.join(dir, 'bad.mp4');
  fs.writeFileSync(bad, Buffer.alloc(20000, 1));
  let threw2 = false;
  try {
    await ffmpegCompositor.composeVideo({
      projectId: `${id}_badclip`, clipFilePaths: [bad], audioFilePath: audio,
      totalDurationSec: 6, aspectRatio: '9:16', userPlan: 'creator',
    });
  } catch { threw2 = true; }
  assert.ok(threw2, 'Corrupt clip must fail composition, not be copied as the final video');
  console.log('\nOFFLINE COMPOSE SMOKE TEST PASSED');
}
main().catch((e) => { console.error('FAILED', e); process.exit(1); });
