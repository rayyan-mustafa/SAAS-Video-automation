import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import {
  createPersonalCreatorProject,
  createPersonalCreatorScenes,
  listPersonalCreatorProjects,
  getPersonalCreatorProfile,
} from '@/lib/db';
import { personalCreatorPipeline } from '@/lib/video/personalCreatorPipeline';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const projects = listPersonalCreatorProjects(user.id);
    return NextResponse.json({ projects });
  } catch (err: any) {
    console.error('[API /api/personal-ai/projects GET] Error:', err);
    return NextResponse.json({ error: 'Failed to list projects' }, { status: 500 });
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const {
      title,
      topic,
      script,
      style = 'PODCAST',
      language = 'en',
      aspectRatio = '16:9',
      presenterPosition = 'center',
      presenterFraming = 'medium',
      cameraMotion = 'subtle',
      captionsEnabled = true,
      captionStyle = 'YouTube',
      musicEnabled = true,
      musicVolume = 20,
      scenes = [],
      avatarAssetId,
      voiceType = 'personal',
    } = body;

    if (!title && !topic) {
      return NextResponse.json({ error: 'Project title or topic is required' }, { status: 400 });
    }

    // Lookup user avatar asset if not explicitly passed
    let selectedAvatarAssetId = avatarAssetId;
    if (!selectedAvatarAssetId) {
      const profile = getPersonalCreatorProfile(user.id);
      selectedAvatarAssetId = profile?.avatar_asset_id || null;
    }

    // 1. Create project record
    const project = createPersonalCreatorProject({
      userId: user.id,
      title: title || topic || 'Personal AI Video',
      topic: topic || null,
      script: script || null,
      style,
      language,
      aspect_ratio: aspectRatio,
      presenter_position: presenterPosition,
      presenter_framing: presenterFraming,
      camera_motion: cameraMotion,
      captions_enabled: captionsEnabled ? 1 : 0,
      caption_style: captionStyle,
      music_enabled: musicEnabled ? 1 : 0,
      music_volume: Number(musicVolume) || 20,
      status: 'QUEUED',
      progress: 0,
      current_stage_label: 'Queued for generation',
      voice_type: voiceType,
    });

    // Attach avatar_asset_id temporarily to object for pipeline lookup
    (project as any).avatar_asset_id = selectedAvatarAssetId;

    // 2. Create scenes
    if (scenes && scenes.length > 0) {
      createPersonalCreatorScenes(
        project.id,
        scenes.map((s: any, idx: number) => ({
          scene_number: s.sceneNumber || (idx + 1),
          narration: s.narration || '',
          visual_prompt: s.visualPrompt || '',
          scene_topic: s.sceneTopic || topic || null,
          duration: s.durationSec || 5,
          status: 'PENDING',
        }))
      );
    }

    // 3. Dispatch background video processing asynchronously (never blocks response)
    setTimeout(() => {
      personalCreatorPipeline.processProject(project.id, user.id).catch((e) => {
        console.error(`[BackgroundPipeline Error] Project ${project.id}:`, e);
      });
    }, 100);

    return NextResponse.json({ project }, { status: 201 });
  } catch (err: any) {
    console.error('[API /api/personal-ai/projects POST] Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to create project' }, { status: 500 });
  }
}
