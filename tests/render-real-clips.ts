import { execFile } from 'child_process';
import path from 'path';
import fs from 'fs';
import util from 'util';
import { getFfmpegPath, inspectMedia } from '../src/lib/providers/videoProvider';

const execFileAsync = util.promisify(execFile);

async function renderRealClips() {
  const ffmpeg = getFfmpegPath();
  const brainDir = 'C:/Users/Nabeel Abbas/.gemini/antigravity/brain/67a470fa-6862-40be-b8ba-5bb7f3a65b56';
  const outDir = path.resolve(process.cwd(), 'storage/real_demo_clips');
  if (!fs.existsSync(outDir)) fs.mkdirSync(outDir, { recursive: true });

  const scenes = [
    { name: 'scene_1_hook', img: 'scene_1_dopamine_hook_1789853552203.jpg', dur: 6.5, zoom: "min(zoom+0.0008,1.12)" },
    { name: 'scene_2_context', img: 'scene_2_dopamine_overload_1789853619025.jpg', dur: 8.0, zoom: "min(zoom+0.0006,1.10)" },
    { name: 'scene_3_mechanism', img: 'scene_3_synaptic_mechanism_1789853778467.jpg', dur: 8.0, zoom: "min(zoom+0.0009,1.15)" },
  ];

  for (const s of scenes) {
    const inImg = path.join(brainDir, s.img);
    const outClip = path.join(outDir, `${s.name}.mp4`);
    console.log(`Rendering ${s.name} from ${inImg} to ${outClip}...`);

    const filterGraph = [
      'scale=1080:1920:force_original_aspect_ratio=increase',
      'crop=1080:1920',
      'setsar=1',
      `zoompan=z='${s.zoom}':d=120:s=1080x1920:fps=30`
    ].join(',');

    await execFileAsync(ffmpeg, [
      '-y',
      '-loop', '1',
      '-i', inImg,
      '-an',
      '-vf', filterGraph,
      '-r', '30',
      '-c:v', 'libx264',
      '-pix_fmt', 'yuv420p',
      '-preset', 'fast',
      '-t', String(s.dur),
      outClip
    ]);

    const stat = fs.statSync(outClip);
    const meta = await inspectMedia(outClip);
    console.log(`✓ Rendered ${s.name}.mp4: ${stat.size} bytes, resolution: ${meta.resolution}, duration: ${meta.durationSec}s`);
  }
}

renderRealClips()
  .then(() => console.log('All real clips rendered successfully!'))
  .catch((err) => console.error('Error rendering clips:', err));
