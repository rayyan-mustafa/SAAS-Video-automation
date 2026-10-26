import { NextRequest, NextResponse } from 'next/server';
import { checkRateLimit } from '@/lib/auth';
import { isCloudflareConfigured, runCloudflareJson } from '@/lib/providers/cloudflareAiClient';

// 5 Proven YouTube & TikTok Hook Frameworks
const FRAMEWORKS = [
  {
    id: 'provocative_question',
    name: 'The Provocative Question',
    generate: (topic: string) => [
      `Have you ever wondered what is really happening beneath the surface of ${topic}?`,
      `Why is almost everyone completely wrong about ${topic}?`,
      `What if the single biggest thing you believe about ${topic} was a lie?`,
    ],
  },
  {
    id: 'counter_intuitive',
    name: 'The Counter-Intuitive Mistake',
    generate: (topic: string) => [
      `Ninety-nine percent of creators approaching ${topic} make one fatal mistake before they even start.`,
      `Stop doing ${topic} the traditional way. Here is why the old methods are killing your results.`,
      `The fastest way to fail at ${topic} is following mainstream advice. Do this instead.`,
    ],
  },
  {
    id: 'mystery_box',
    name: 'The Mystery Box & Loophole',
    generate: (topic: string) => [
      `There is a massive loophole hiding in plain sight inside ${topic}, and virtually nobody is talking about it.`,
      `In 1994, a forgotten experiment revealed something disturbing about ${topic}.`,
      `This one unwritten rule about ${topic} changed everything I thought I knew.`,
    ],
  },
  {
    id: 'tactical_system',
    name: 'The 3-Step Tactical System',
    generate: (topic: string) => [
      `Here is the exact 3-step blueprint to master ${topic} without spending 40 hours a week.`,
      `If I had to start over with ${topic} from zero today, here are the only three things I would do.`,
      `Three dead-simple techniques that will give you an unfair advantage in ${topic}.`,
    ],
  },
  {
    id: 'case_study',
    name: 'Behind-the-Scenes Case Study',
    generate: (topic: string) => [
      `How an unknown creator generated over 1.2 million views on ${topic} in under 14 days.`,
      `The confidential case study behind how top channels dominate ${topic} on complete autopilot.`,
      `We analyzed 500 viral videos about ${topic}. Here is the secret pattern they all share.`,
    ],
  },
];

export async function POST(req: NextRequest) {
  try {
    const ip = req.headers.get('x-forwarded-for') || '127.0.0.1';
    // Limit to 20 requests per minute per IP to prevent abuse
    if (!checkRateLimit(`hook_gen_${ip}`, 20, 60000)) {
      return NextResponse.json({ error: 'Too many requests. Please wait a moment.' }, { status: 429 });
    }

    const body = await req.json().catch(() => ({}));
    const topic = (body.topic || '').trim();
    const frameworkId = body.frameworkId || 'all';

    if (!topic || topic.length < 3) {
      return NextResponse.json({ error: 'Please enter a valid topic (at least 3 characters).' }, { status: 400 });
    }

    let hooks: Array<{ hook: string; framework: string; score: number; retentionEst: string }> = [];

    if (isCloudflareConfigured()) {
      try {
        const cfResult = await runCloudflareJson<any>(
          '@cf/deepseek-ai/deepseek-r1-distill-qwen-32b',
          {
            messages: [
              {
                role: 'system',
                content: 'You are an elite viral YouTube & TikTok hook retention engineer. Return a JSON object with schema: {"hooks": [{"hook": string, "framework": string, "score": number, "retentionEst": string}]}. Return 5 diverse, high-impact hooks.',
              },
              {
                role: 'user',
                content: `Generate 5 viral hooks for the topic: "${topic}".`,
              },
            ],
            response_format: { type: 'json_object' },
            temperature: 0.7,
          },
          { timeoutMs: 15_000 }
        );

        let data = cfResult?.response || cfResult;
        if (typeof data === 'string') {
          const clean = data.replace(/^```json\s*/i, '').replace(/\s*```$/i, '').trim();
          data = JSON.parse(clean);
        }
        if (Array.isArray(data?.hooks) && data.hooks.length > 0) {
          hooks = data.hooks.slice(0, 5).map((h: any, i: number) => ({
            hook: String(h.hook || ''),
            framework: String(h.framework || FRAMEWORKS[i % FRAMEWORKS.length].name),
            score: typeof h.score === 'number' ? h.score : 90 + i * 2,
            retentionEst: String(h.retentionEst || `${80 + i * 3}% retention`),
          }));
        }
      } catch (cfErr: any) {
        console.warn('[GenerateHook] Cloudflare Workers AI fallback to algorithmic generation:', cfErr.message);
      }
    }

    if (hooks.length === 0) {
      if (frameworkId === 'all') {
        // Pick one from each framework
        FRAMEWORKS.forEach((fw, idx) => {
        const generated = fw.generate(topic);
        const selected = generated[Math.floor(Math.random() * generated.length)];
        hooks.push({
          hook: selected,
          framework: fw.name,
          score: 88 + (idx * 2) + Math.floor(Math.random() * 5),
          retentionEst: `${78 + Math.floor(Math.random() * 15)}% retention`,
        });
      });
    } else {
      const fw = FRAMEWORKS.find((f) => f.id === frameworkId) || FRAMEWORKS[0];
      const generated = fw.generate(topic);
      hooks = generated.map((h, i) => ({
        hook: h,
        framework: fw.name,
        score: 91 + i * 2,
        retentionEst: `${82 + i * 4}% retention`,
      }));
    }
    }

    return NextResponse.json({
      success: true,
      topic,
      hooks,
      ctaText: 'Turn this hook into a complete 1080p video with AutoRA',
      signupUrl: `/signup?topic=${encodeURIComponent(topic)}`,
    });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || 'Internal error' }, { status: 500 });
  }
}
