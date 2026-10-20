import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { personalCreatorScriptService } from '@/lib/providers/personalCreatorScriptService';

export const dynamic = 'force-dynamic';

export async function GET() {
  const frameworks = personalCreatorScriptService.getNarrativeFrameworks();
  return NextResponse.json({ success: true, frameworks });
}

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Authentication required' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const {
      mode = 'generate', // 'generate' | 'custom'
      topic = 'The Future of AI',
      scriptText,
      audience,
      tone,
      lengthMinutes = 3,
      language = 'English',
      style = 'PODCAST',
      narrativeFrameworkId,
    } = body;

    let scriptResult;

    if (mode === 'custom' && scriptText) {
      // Analyze and divide custom script
      scriptResult = personalCreatorScriptService.analyzeCustomScript(scriptText, topic);
    } else {
      // Generate structured script from topic using AI
      scriptResult = await personalCreatorScriptService.generateScriptFromTopic({
        topic,
        audience,
        tone,
        lengthMinutes,
        language,
        style,
        narrativeFrameworkId,
      });
    }

    return NextResponse.json({ script: scriptResult });
  } catch (err: any) {
    console.error('[API /api/personal-ai/script] Error:', err);
    return NextResponse.json({ error: err.message || 'Failed to generate script' }, { status: 500 });
  }
}
