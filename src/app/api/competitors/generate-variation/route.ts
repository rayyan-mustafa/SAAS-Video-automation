import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { getDb, getApiKey } from '@/lib/db';
import { v4 as uuidv4 } from 'uuid';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser(req);
    if (!user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const body = await req.json().catch(() => ({}));
    const { competitorTitle, competitorViews, viralScore, userNiche = 'Tech & Business', addToCalendar, selectedAngle, channelId } = body;

    if (!competitorTitle) {
      return NextResponse.json({ error: 'competitorTitle is required' }, { status: 400 });
    }

    // 1. If user selected an angle to directly add to calendar/projects
    if (addToCalendar && selectedAngle) {
      const db = getDb();
      let targetChannelId = channelId;
      if (!targetChannelId) {
        const userChan = db.prepare('SELECT id FROM channels WHERE user_id = ? LIMIT 1').get(user.id) as any;
        targetChannelId = userChan?.id || 'default_channel';
      }

      const now = new Date();
      // Schedule for tomorrow or next open slot
      const scheduleDate = new Date(now.getTime() + 86400000).toISOString();

      const projectId = uuidv4();
      const nowIso = now.toISOString();

      db.prepare(`
        INSERT INTO content_projects (
          id, user_id, channel_id, topic, target_length_minutes, preset,
          language, platform, visibility, status, current_stage, publishing_status,
          auto_publish, scheduled_at, created_at, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `).run(
        projectId, user.id, targetChannelId, selectedAngle, 3, 'STANDARD',
        'en', 'YouTube', 'PUBLIC', 'DRAFT', 'SCRIPT', 'SCHEDULED',
        0, scheduleDate, nowIso, nowIso
      );

      return NextResponse.json({
        success: true,
        message: 'Successfully added viral variation to your content calendar!',
        projectId,
        scheduledAt: scheduleDate,
      });
    }

    // 2. Generate 5 Original Angles via Gemini / OpenRouter
    const apiKey = getApiKey('gemini_api_key') || getApiKey('google_api_key') || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    
    let generatedAngles: string[] = [];

    const promptText = `
You are an elite YouTube content strategist specializing in viral hook engineering.
A competitor published a high-performing viral video:
Competitor Viral Title: "${competitorTitle}"
View Count: ${competitorViews ? `${competitorViews.toLocaleString()} views` : 'High Views'} (Viral Multiplier: ${viralScore || '2.0'}x channel average)

Target Creator Niche: "${userNiche}"

TASK:
Analyze why the competitor's title went viral (identify the psychological hook, pattern interrupt, or curiosity loop).
Then generate EXACTLY 5 original, high-converting video titles tailored specifically to "${userNiche}".
RULES:
1. Do NOT copy the competitor's exact title or make a lazy rewrite.
2. Adapt the underlying psychological mechanism to the user's niche.
3. Keep titles concise (under 60 characters ideally, maximum 75 characters).
4. Make them punchy and click-worthy for YouTube 2026.

OUTPUT FORMAT: Return strictly a valid JSON array of 5 title strings, with no markdown formatting or commentary.
Example: ["Title 1", "Title 2", "Title 3", "Title 4", "Title 5"]
`;

    if (apiKey) {
      try {
        const res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.0-flash:generateContent?key=${apiKey}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: promptText }] }],
            generationConfig: {
              temperature: 0.7,
              responseMimeType: 'application/json',
            },
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const raw = data.candidates?.[0]?.content?.parts?.[0]?.text;
          if (raw) {
            const parsed = JSON.parse(raw);
            if (Array.isArray(parsed) && parsed.length > 0) {
              generatedAngles = parsed.map((t) => String(t).trim());
            }
          }
        }
      } catch (aiErr: any) {
        console.warn('[Competitor AI Variation Warning]:', aiErr.message);
      }
    }

    // Fallback template variations if AI is offline
    if (generatedAngles.length === 0) {
      const sanitized = competitorTitle.replace(/How|Why|The|What/gi, '').trim();
      generatedAngles = [
        `The Hidden Truth About ${userNiche} Nobody Talks About`,
        `How The Top 1% Master ${userNiche} in 2026`,
        `The Fatal Mistake Ruining Your ${userNiche} Strategy`,
        `Why Everything You Know About ${userNiche} Is Wrong`,
        `The Step-by-Step Blueprint to Dominate ${userNiche}`,
      ];
    }

    return NextResponse.json({
      success: true,
      competitorTitle,
      userNiche,
      angles: generatedAngles.slice(0, 5),
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Failed to generate variations' }, { status: 500 });
  }
}
