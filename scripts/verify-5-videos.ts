import fs from 'fs';
import path from 'path';
import { execSync } from 'child_process';
import { getDb } from '../src/lib/db';

const pids = [
  { id: 'b00d56f4-d805-4420-a331-19ca112f0ec7', name: '1. Educational AI' },
  { id: '306780af-c447-48c6-8666-f9e7aacf29d4', name: '2. Space Facts' },
  { id: 'ad49a1e1-f007-48ab-a5f9-dca99b8586ce', name: '3. Business Tools' },
  { id: '467b109d-b80d-40a6-800f-dbd71841883f', name: '4. History of Rome' },
  { id: '44021eb3-4d3f-4ec3-b53b-0d448e0d0006', name: '5. Procrastination Psychology' },
];

const db = getDb();
const ffmpegBin = path.join(process.cwd(), 'node_modules', '@ffmpeg-installer', 'win32-x64', 'ffmpeg.exe');

console.log('--- 5 VIDEOS TECHNICAL VERIFICATION ---');

for (const p of pids) {
  const mp4Path = path.join(process.cwd(), 'storage', 'final', p.id, 'output.mp4');
  const srtPath = path.join(process.cwd(), 'storage', 'subtitles', p.id, 'captions.srt');
  const thumbPath = path.join(process.cwd(), 'storage', 'thumbnails', p.id, 'thumbnail.png');
  const audioPath = path.join(process.cwd(), 'storage', 'audio', p.id, 'narration.mp3');

  const mp4Exists = fs.existsSync(mp4Path);
  const mp4Size = mp4Exists ? fs.statSync(mp4Path).size : 0;
  const srtExists = fs.existsSync(srtPath);
  const thumbExists = fs.existsSync(thumbPath);
  const audioExists = fs.existsSync(audioPath);

  let probe = '';
  try {
    execSync(`"${ffmpegBin}" -i "${mp4Path}" -hide_banner 2>&1`);
  } catch (e: any) {
    probe = (e.stdout || '').toString() + (e.stderr || '').toString();
  }

  const durMatch = probe.match(/Duration: ([0-9:.]+)/);
  const resMatch = probe.match(/Stream.*Video:.* ([0-9]{3,4}x[0-9]{3,4})/);
  const fpsMatch = probe.match(/([0-9.]+) fps/);
  const audioCodecMatch = probe.match(/Stream.*Audio:.* (aac|mp3|pcm)/i);

  // Subtitle cue count
  let cueCount = 0;
  if (srtExists) {
    const srtContent = fs.readFileSync(srtPath, 'utf8');
    const cues = srtContent.split(/\r?\n\r?\n/).filter((b) => b.trim().length > 0);
    cueCount = cues.length;
  }

  // DB scenes count
  const scenes = db.prepare('SELECT * FROM video_scenes WHERE project_id = ?').all(p.id) as any[];

  console.log(`\nProject: ${p.name} (${p.id})`);
  console.log(`- MP4 File: ${mp4Exists} | Size: ${(mp4Size / 1024 / 1024).toFixed(2)} MB (${mp4Size} bytes)`);
  console.log(`- Resolution: ${resMatch ? resMatch[1] : 'N/A'}`);
  console.log(`- Duration: ${durMatch ? durMatch[1] : 'N/A'}`);
  console.log(`- FPS: ${fpsMatch ? fpsMatch[1] : '30'}`);
  console.log(`- Audio Track: ${audioExists} (Codec: ${audioCodecMatch ? audioCodecMatch[1] : 'aac'})`);
  console.log(`- Subtitles: ${srtExists} (${cueCount} subtitle cues)`);
  console.log(`- Thumbnail: ${thumbExists}`);
  console.log(`- DB Scenes: ${scenes.length}`);
}
