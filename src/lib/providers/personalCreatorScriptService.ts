import { getApiKey } from '../db';
import { isCloudflareConfigured, runCloudflareJson } from './cloudflareAiClient';

export interface NarrativeFramework {
  id: string;
  name: string;
  description: string;
  hookFormula: string;
  structure: string[];
}

export const NARRATIVE_FRAMEWORKS: NarrativeFramework[] = [
  {
    id: 'provocative_question',
    name: 'The Provocative Question Hook',
    description: 'Pattern interrupt -> Case study -> Payoff',
    hookFormula: 'Ask an unsettling or high-stakes counter-intuitive question that halts scrolling immediately.',
    structure: [
      'Pattern Interrupt (High-Stakes Question)',
      'The Shocking Context & Hidden Variable',
      'The Core Mechanism / Breaking Down the Mystery',
      'Case Study Proof & Real-World Validation',
      'The Unfair Advantage (Actionable Synthesis)',
      'High-Conversion Call to Action',
    ],
  },
  {
    id: 'counter_intuitive_mistake',
    name: 'The Counter-Intuitive Mistake',
    description: 'Identify mistake -> Breakdown why -> Correct system',
    hookFormula: 'Expose the common best-practice that is secretly ruining people’s progress in this niche.',
    structure: [
      'Exposing the Fatal Common Mistake',
      'Why Human Intuition Fails on This Problem',
      'The Unseen Data / Paradigm Shift',
      'The Step-by-Step Correct System',
      'What Happens Once You Make the Switch',
      'Actionable Challenge & Call to Action',
    ],
  },
  {
    id: 'historical_case_study',
    name: 'The Behind-the-Scenes Case Study',
    description: 'Opening conflict -> Behind the scenes -> Climax',
    hookFormula: 'Reveal how an elite individual or organization quietly accomplished the impossible.',
    structure: [
      'The High-Stakes Crisis or Ambition',
      'The Overlooked Leverage Point Behind Closed Doors',
      'The Critical Turning Point Decision',
      'The Exponential Payoff & Proof',
      'The Universal Law You Can Apply Today',
      'Community Discussion & Call to Action',
    ],
  },
  {
    id: 'tactical_playbook',
    name: 'The 3-Step Tactical System',
    description: 'Fast overview -> 3 rules -> Immediate CTA',
    hookFormula: 'Promise a concrete, zero-fluff blueprint for a specific breakthrough in minimal time.',
    structure: [
      'The Fast Promise & Frictionless Overview',
      'Rule 1: The Non-Negotiable Foundation',
      'Rule 2: The Acceleration Catalyst',
      'Rule 3: The Asymmetric Multiplier',
      'Common Traps to Avoid When Executing',
      'Next Steps & Call to Action',
    ],
  },
  {
    id: 'curiosity_loophole',
    name: 'The Mystery Box & Loophole',
    description: 'Incomplete open loop -> Clues -> Resolution',
    hookFormula: 'Create an urgent knowledge gap around a secret mechanism nobody is talking about.',
    structure: [
      'The Unexplained Anomaly (Open Loop)',
      'Clue 1: The Surface Explanation That Does Not Add Up',
      'Clue 2: The Breadcrumbs Leading to the Source',
      'The Loophole Revealed: How the System Actually Works',
      'The Strategic Implication for the Viewer',
      'Closing Summary & Call to Action',
    ],
  },
];

export const FACEBOOK_NARRATIVE_FRAMEWORKS: NarrativeFramework[] = [
  {
    id: 'facebook_viral_empathy',
    name: 'The Facebook Viral Empathy & Share Hook',
    description: 'Relatable pattern interrupt -> Emotional tension -> High-value revelation -> Viral share & comment prompt',
    hookFormula: 'Open with an emotionally charged, relatable human paradox designed to stop silent feed scrolling and provoke strong comment discussions.',
    structure: [
      'Silent-Autoplay Visual Hook & Empathy Shock (0-10s)',
      'The Frustration / The Unspoken Reality People Face (10-30s)',
      'The Hidden Variable / The Breakthrough Perspective (30-60s)',
      'Real-World Evidence & Tangible Demonstration (60-100s)',
      'The Immediate Lesson You Can Use Today (100-140s)',
      'Viral Share Callout: "Tag someone who needs this & share your perspective" (140-180s)',
    ],
  },
  {
    id: 'facebook_in_stream_monetization',
    name: 'The Facebook In-Stream 3-Minute Story Arc',
    description: 'High-stakes dilemma -> Escalating intrigue at min 1.5 -> Climax & resolution -> Community discussion',
    hookFormula: 'Hook with an urgent mystery or counter-intuitive case study calibrated for Facebook 3+ min in-stream mid-roll monetization.',
    structure: [
      'High-Stakes Moral or Practical Conflict (0-15s)',
      'Uncovering the Layers / The Initial Misconception (30-60s)',
      'The Critical Mid-Roll Turning Point (90-120s)',
      'The Unstoppable Climax & Solution (120-160s)',
      'Community Discussion Question for Maximum Algorithmic Reach (160-180s)',
    ],
  },
];

export const ALL_NARRATIVE_FRAMEWORKS: NarrativeFramework[] = [
  ...NARRATIVE_FRAMEWORKS,
  ...FACEBOOK_NARRATIVE_FRAMEWORKS,
];

export interface ScriptGenerationParams {
  topic: string;
  audience?: string;
  tone?: 'Professional' | 'Casual' | 'Educational' | 'Storytelling' | 'Energetic' | 'Documentary';
  lengthMinutes?: number;
  language?: string;
  style?: 'PODCAST' | 'VLOG' | 'EDUCATIONAL' | 'NEWS' | 'STORYTELLING';
  narrativeFrameworkId?: string;
}

export interface GeneratedPersonalScene {
  sceneNumber: number;
  sceneType: 'hook' | 'intro' | 'main' | 'example' | 'conclusion' | 'cta';
  heading: string;
  narration: string;
  visualPrompt: string;
  sceneTopic: string;
  durationSec: number;
}

export interface GeneratedPersonalScript {
  title: string;
  topic: string;
  totalDurationSec: number;
  wordCount: number;
  estimatedDurationFormatted: string;
  scenes: GeneratedPersonalScene[];
  narrativeFramework?: NarrativeFramework;
}

export class PersonalCreatorScriptService {
  /**
   * Get all registered narrative originality frameworks
   */
  getNarrativeFrameworks(): NarrativeFramework[] {
    return NARRATIVE_FRAMEWORKS;
  }

  /**
   * Select a narrative framework via ID, seed hash, or round-robin rotation
   */
  selectNarrativeFramework(seed?: string | number): NarrativeFramework {
    if (!seed) {
      const randIdx = Math.floor(Math.random() * NARRATIVE_FRAMEWORKS.length);
      return NARRATIVE_FRAMEWORKS[randIdx];
    }
    if (typeof seed === 'string') {
      const direct = ALL_NARRATIVE_FRAMEWORKS.find((f) => f.id === seed);
      if (direct) return direct;
      let hash = 0;
      for (let i = 0; i < seed.length; i++) {
        hash = (hash << 5) - hash + seed.charCodeAt(i);
        hash |= 0;
      }
      const idx = Math.abs(hash) % NARRATIVE_FRAMEWORKS.length;
      return NARRATIVE_FRAMEWORKS[idx];
    }
    const idx = Math.abs(Math.floor(seed)) % NARRATIVE_FRAMEWORKS.length;
    return NARRATIVE_FRAMEWORKS[idx];
  }
  /**
   * Analyze custom pasted script: word count, char count, estimated duration, scene division
   */
  analyzeCustomScript(scriptText: string, topic = 'My Custom Video'): GeneratedPersonalScript {
    const clean = scriptText.trim();
    const words = clean.split(/\s+/).filter(Boolean);
    const wordCount = words.length;

    // Average speaking rate: 145 words per minute (2.4 words per second)
    const totalDurationSec = Math.max(10, Math.round(wordCount / 2.4));
    const mins = Math.floor(totalDurationSec / 60);
    const secs = totalDurationSec % 60;
    const estimatedDurationFormatted = `${mins}:${secs.toString().padStart(2, '0')}`;

    // Divide paragraphs into logical scenes
    const paragraphs = clean.split(/\n\s*\n/).filter((p) => p.trim().length > 0);
    const scenes: GeneratedPersonalScene[] = [];

    if (paragraphs.length <= 1) {
      // Split into sentences if only one giant block
      const sentences = clean.match(/[^.!?]+[.!?]+/g) || [clean];
      const chunkSize = Math.max(1, Math.ceil(sentences.length / 5));
      for (let i = 0; i < sentences.length; i += chunkSize) {
        const slice = sentences.slice(i, i + chunkSize).join(' ').trim();
        const sceneNum = scenes.length + 1;
        const dur = Math.max(4, Math.round(slice.split(/\s+/).length / 2.4));
        scenes.push({
          sceneNumber: sceneNum,
          sceneType: sceneNum === 1 ? 'hook' : sceneNum === 5 ? 'cta' : 'main',
          heading: `Scene ${sceneNum}`,
          narration: slice,
          visualPrompt: this.generateSmartVisualPrompt(slice, topic),
          sceneTopic: topic,
          durationSec: dur,
        });
      }
    } else {
      paragraphs.forEach((p, idx) => {
        const sceneNum = idx + 1;
        const dur = Math.max(4, Math.round(p.split(/\s+/).length / 2.4));
        scenes.push({
          sceneNumber: sceneNum,
          sceneType: idx === 0 ? 'hook' : idx === paragraphs.length - 1 ? 'cta' : 'main',
          heading: `Scene ${sceneNum}`,
          narration: p.trim(),
          visualPrompt: this.generateSmartVisualPrompt(p, topic),
          sceneTopic: topic,
          durationSec: dur,
        });
      });
    }

    return {
      title: topic,
      topic,
      totalDurationSec,
      wordCount,
      estimatedDurationFormatted,
      scenes,
    };
  }

  /**
   * Generate structured script from topic using OpenRouter DeepSeek or Gemini
   */
  async generateScriptFromTopic(params: ScriptGenerationParams): Promise<GeneratedPersonalScript> {
    const {
      topic,
      audience = 'General audience',
      tone = 'Engaging and authoritative',
      lengthMinutes = 3,
      language = 'English',
      style = 'PODCAST',
      narrativeFrameworkId,
    } = params;

    const framework = this.selectNarrativeFramework(narrativeFrameworkId || topic);

    const openRouterKey = getApiKey('openrouter') || process.env.OPENROUTER_API_KEY;
    const geminiKey = getApiKey('gemini') || process.env.GEMINI_API_KEY;

    const systemPrompt = `You are a world-class YouTube producer and scriptwriter for presenter-led videos.
Format your output as a STRICT JSON object with this exact schema:
{
  "title": "Compelling YouTube Video Title",
  "scenes": [
    {
      "sceneNumber": 1,
      "sceneType": "hook",
      "heading": "Visual Hook & Attention Grabber",
      "narration": "Spoken presenter script for scene 1",
      "visualPrompt": "Detailed visual description for camera framing and cinematic B-roll",
      "sceneTopic": "Specific subject shown",
      "durationSec": 8
    }
  ]
}
Requirements:
1. Divide the video into 4 to 8 impactful scenes strictly following this Narrative Framework:
   - Framework Name: ${framework.name}
   - Structural Flow: ${framework.description}
   - Hook Formula: ${framework.hookFormula}
   - Scene Progression: ${framework.structure.map((s, idx) => `Scene ${idx + 1}: ${s}`).join(' -> ')}
2. The narration MUST match the requested language: ${language}.
3. The tone must be: ${tone}.
4. Target length: ~${lengthMinutes} minute(s).
5. The visual prompts must be highly specific, professional, cinematic, and relevant to the scene topic. NEVER suggest yoga or food or unrelated nature for tech/business/finance topics.
6. Return ONLY the raw JSON. Zero markdown code fences, zero commentary.`;

    const userPrompt = `Topic: "${topic}"
Audience: ${audience}
Style: ${style} (Presenter-led ${style.toLowerCase()})
Framework: ${framework.name} (${framework.description})
Length: ~${lengthMinutes} minutes`;

    // 0. Try Cloudflare Workers AI
    if (isCloudflareConfigured()) {
      try {
        const cfResult = await runCloudflareJson<any>(
          '@cf/meta/llama-3.3-70b-instruct-fp8-fast',
          {
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
            response_format: { type: 'json_object' },
            temperature: 0.7,
            max_tokens: 4000,
          },
          { timeoutMs: 60_000 }
        );

        const cfText = cfResult?.response || cfResult?.choices?.[0]?.message?.content || cfResult;
        if (cfText) {
          const parsed = typeof cfText === 'object' ? cfText : this.parseCleanJson(cfText);
          if (parsed && parsed.scenes && parsed.scenes.length > 0) {
            const res = this.finalizeScriptData(parsed, topic);
            res.narrativeFramework = framework;
            return res;
          }
        }
      } catch (err: any) {
        console.warn('[PersonalCreatorScriptService] Cloudflare Workers AI call failed, trying fallback:', err.message);
      }
    }

    // 1. Try OpenRouter DeepSeek
    if (openRouterKey) {
      try {
        const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${openRouterKey}`,
            'Content-Type': 'application/json',
            'HTTP-Referer': 'https://autora.live',
            'X-Title': 'AUTORA Personal AI Creator',
          },
          body: JSON.stringify({
            model: 'deepseek/deepseek-chat',
            messages: [
              { role: 'system', content: systemPrompt },
              { role: 'user', content: userPrompt },
            ],
            temperature: 0.7,
            max_tokens: 3500,
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const content = data.choices?.[0]?.message?.content;
          if (content) {
            const parsed = this.parseCleanJson(content);
            if (parsed && parsed.scenes && parsed.scenes.length > 0) {
              const res = this.finalizeScriptData(parsed, topic);
              res.narrativeFramework = framework;
              return res;
            }
          }
        }
      } catch (err: any) {
        console.warn('[PersonalCreatorScriptService] OpenRouter call failed, trying fallback:', err.message);
      }
    }

    // 2. Try Gemini
    if (geminiKey) {
      const geminiModels = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-flash-latest'];
      for (const model of geminiModels) {
        try {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${geminiKey}`;
          const res = await fetch(url, {
            method: 'POST',
            signal: AbortSignal.timeout(15000),
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              contents: [{ parts: [{ text: `${systemPrompt}\n\n${userPrompt}` }] }],
            }),
          });

          if (res.ok) {
            const data = await res.json();
            const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
            if (text) {
              const parsed = this.parseCleanJson(text);
              if (parsed && parsed.scenes && parsed.scenes.length > 0) {
                const res = this.finalizeScriptData(parsed, topic);
                res.narrativeFramework = framework;
                return res;
              }
            }
          }
        } catch (err: any) {
          console.warn(`[PersonalCreatorScriptService] Gemini (${model}) call failed:`, err.message);
        }
      }
    }

    // 3. High-Quality Algorithmic Presenter Fallback using selected framework
    return this.generateAlgorithmicScript(topic, style, lengthMinutes, framework);
  }

  /**
   * Helper to clean JSON string from LLMs
   */
  private parseCleanJson(raw: string): any {
    try {
      const clean = raw.replace(/```json\s*/gi, '').replace(/```\s*$/gi, '').trim();
      return JSON.parse(clean);
    } catch {
      const match = raw.match(/\{[\s\S]*\}/);
      if (match) {
        try { return JSON.parse(match[0]); } catch {}
      }
      return null;
    }
  }

  /**
   * Generates smart visual prompt that guarantees thematic relevance
   */
  generateSmartVisualPrompt(narration: string, topic: string): string {
    const lower = `${topic} ${narration}`.toLowerCase();

    if (lower.includes('code') || lower.includes('software') || lower.includes('developer') || lower.includes('algorithm')) {
      return `Presenter in modern tech studio, cutting to high-tech digital workspace with glowing code and abstract network graphs, cinematic 4k lighting`;
    }
    if (lower.includes('money') || lower.includes('finance') || lower.includes('credit') || lower.includes('wealth') || lower.includes('stock')) {
      return `Presenter addressing camera, transitioning to sleek financial charts, luxury office high-rise overlooking skyscraper skyline, crisp studio depth of field`;
    }
    if (lower.includes('ai') || lower.includes('robot') || lower.includes('future') || lower.includes('intelligence')) {
      return `Presenter with focused expression, cinematic B-roll of glowing neural network pulses and futuristic holographic interfaces, sharp film grading`;
    }
    if (lower.includes('history') || lower.includes('ancient') || lower.includes('roman') || lower.includes('empire')) {
      return `Presenter speaking, dramatic transition to historic marble architecture, warm golden hour sunbeams casting long shadows across stone pillars`;
    }
    if (lower.includes('social media') || lower.includes('phone') || lower.includes('scroll') || lower.includes('algorithm')) {
      return `Presenter talking head, B-roll of person scrolling smartphone in dimly lit room with blue neon screen glow reflecting on face`;
    }

    return `Presenter in elegant minimalist studio, cutting to dynamic cinematic B-roll illustrating ${topic}, crisp focus, 4k cinematic aesthetic`;
  }

  private finalizeScriptData(data: any, topic: string): GeneratedPersonalScript {
    const scenes: GeneratedPersonalScene[] = (data.scenes || []).map((s: any, idx: number) => ({
      sceneNumber: s.sceneNumber || (idx + 1),
      sceneType: s.sceneType || (idx === 0 ? 'hook' : idx === (data.scenes.length - 1) ? 'cta' : 'main'),
      heading: s.heading || `Scene ${idx + 1}`,
      narration: s.narration || '',
      visualPrompt: s.visualPrompt || this.generateSmartVisualPrompt(s.narration || '', topic),
      sceneTopic: s.sceneTopic || topic,
      durationSec: s.durationSec || 6,
    }));

    const totalDurationSec = scenes.reduce((acc, s) => acc + s.durationSec, 0);
    const wordCount = scenes.reduce((acc, s) => acc + s.narration.split(/\s+/).length, 0);
    const mins = Math.floor(totalDurationSec / 60);
    const secs = totalDurationSec % 60;

    return {
      title: data.title || topic,
      topic,
      totalDurationSec,
      wordCount,
      estimatedDurationFormatted: `${mins}:${secs.toString().padStart(2, '0')}`,
      scenes,
    };
  }

  private generateAlgorithmicScript(
    topic: string,
    style: string,
    lengthMinutes: number,
    framework?: NarrativeFramework
  ): GeneratedPersonalScript {
    const activeFramework = framework || this.selectNarrativeFramework(topic);

    let scenes: GeneratedPersonalScene[];

    if (activeFramework.id === 'counter_intuitive_mistake') {
      scenes = [
        {
          sceneNumber: 1,
          sceneType: 'hook',
          heading: 'The Fatal Misconception',
          narration: `Ninety-nine percent of people approaching ${topic} make one fatal assumption that ruins their progress before they even start.`,
          visualPrompt: `Presenter leaning forward with serious, intense gaze in cinematic modern studio, moody rim lighting`,
          sceneTopic: topic,
          durationSec: 6,
        },
        {
          sceneNumber: 2,
          sceneType: 'intro',
          heading: 'Why Intuition Fails',
          narration: `Conventional wisdom tells you to do what everyone else does. But when you inspect the real mechanics of ${topic}, intuition leads you straight into a trap.`,
          visualPrompt: `Presenter gesturing at camera, cutting to sleek split-screen contrast graph showing intuition vs real-world data`,
          sceneTopic: topic,
          durationSec: 8,
        },
        {
          sceneNumber: 3,
          sceneType: 'main',
          heading: 'The Paradigm Shift',
          narration: `Here is the shift that changes everything: the moment you reverse this pattern, the bottlenecks dissolve automatically.`,
          visualPrompt: `Dynamic visual diagram illustrating reversed leverage flow, high-contrast 4K cinematic depth of field`,
          sceneTopic: topic,
          durationSec: 9,
        },
        {
          sceneNumber: 4,
          sceneType: 'example',
          heading: 'The Tested Protocol',
          narration: `Instead of fighting the current, execute this tested protocol: identify the constraint, eliminate the noise, and double down on the single highest-leverage variable.`,
          visualPrompt: `Presenter walking in architectural high-rise studio, crisp directional sunlight casting dynamic shadows`,
          sceneTopic: topic,
          durationSec: 8,
        },
        {
          sceneNumber: 5,
          sceneType: 'conclusion',
          heading: 'The Exponential Advantage',
          narration: `Once you master this framework, you operate with an asymmetric advantage that feels almost unfair to everyone else still making the rookie mistake.`,
          visualPrompt: `Presenter medium close-up, warm backlighting, confident smile and authoritative presence`,
          sceneTopic: topic,
          durationSec: 7,
        },
        {
          sceneNumber: 6,
          sceneType: 'cta',
          heading: 'Next Action Step',
          narration: `Subscribe to the channel right now so you do not miss our next breakdown, and let me know in the comments: have you been making this mistake?`,
          visualPrompt: `Presenter smiling, sleek modern animated subscribe graphic overlay and YouTube bell notification`,
          sceneTopic: topic,
          durationSec: 6,
        },
      ];
    } else if (activeFramework.id === 'historical_case_study') {
      scenes = [
        {
          sceneNumber: 1,
          sceneType: 'hook',
          heading: 'The High-Stakes Crisis',
          narration: `When everything was on the line, everyone thought ${topic} was impossible—until one crucial move changed the entire industry.`,
          visualPrompt: `Dramatic slow push-in on presenter in dimly lit studio, high-contrast cinematic lighting and documentary tone`,
          sceneTopic: topic,
          durationSec: 7,
        },
        {
          sceneNumber: 2,
          sceneType: 'intro',
          heading: 'Behind Closed Doors',
          narration: `Behind the scenes, the surface story was completely fabricated. What was actually taking place was a calculated maneuver around ${topic}.`,
          visualPrompt: `Atmospheric transition to archival style documentary visuals, blueprint diagrams, and confidential case records`,
          sceneTopic: topic,
          durationSec: 8,
        },
        {
          sceneNumber: 3,
          sceneType: 'main',
          heading: 'The Critical Turning Point',
          narration: `Here was the turning point: while competitors focused on vanity metrics, they uncovered an overlooked lever that multiplied results tenfold.`,
          visualPrompt: `Presenter pointing with conviction, cutting to dynamic data visualizations and timeline milestones`,
          sceneTopic: topic,
          durationSec: 9,
        },
        {
          sceneNumber: 4,
          sceneType: 'example',
          heading: 'The Proof of Results',
          narration: `The result was undeniable. In less time than anyone predicted, the entire landscape shifted permanently in their favor.`,
          visualPrompt: `Cinematic aerial skyline and bustling enterprise headquarters, sharp golden hour illumination`,
          sceneTopic: topic,
          durationSec: 8,
        },
        {
          sceneNumber: 5,
          sceneType: 'conclusion',
          heading: 'The Universal Lesson',
          narration: `The lesson applies directly to you today: when you understand how ${topic} really functions, you stop guessing and start dictating the outcome.`,
          visualPrompt: `Presenter close-up with warm studio rim light, direct eye contact with camera and calm authority`,
          sceneTopic: topic,
          durationSec: 7,
        },
        {
          sceneNumber: 6,
          sceneType: 'cta',
          heading: 'Join the Community',
          narration: `Hit subscribe, share this with someone who needs to hear it, and tell me below what case study you want us to dissect next.`,
          visualPrompt: `Animated metallic subscribe icon and social sharing badges over modern studio background`,
          sceneTopic: topic,
          durationSec: 6,
        },
      ];
    } else if (activeFramework.id === 'tactical_playbook') {
      scenes = [
        {
          sceneNumber: 1,
          sceneType: 'hook',
          heading: 'The 3-Step Promise',
          narration: `If you want to master ${topic} in record time without wasting months on trial and error, here is the exact 3-step playbook.`,
          visualPrompt: `Presenter delivering fast-paced, high-energy hook directly to lens in vibrant studio setup with neon accents`,
          sceneTopic: topic,
          durationSec: 6,
        },
        {
          sceneNumber: 2,
          sceneType: 'intro',
          heading: 'Rule 1: The Foundation',
          narration: `Rule number one is the foundation: you cannot optimize what you do not measure. Strip away all unnecessary distractions and establish baseline clarity.`,
          visualPrompt: `Clean minimalist infographic showing step 1 checklist, sleek motion typography sliding into view`,
          sceneTopic: topic,
          durationSec: 8,
        },
        {
          sceneNumber: 3,
          sceneType: 'main',
          heading: 'Rule 2: The Catalyst',
          narration: `Rule number two is the catalyst: apply focused execution to ${topic} for twenty-one straight days without second-guessing the process.`,
          visualPrompt: `Presenter holding countdown visual card, cutting to cinematic productivity workspace and stopwatch graphic`,
          sceneTopic: topic,
          durationSec: 9,
        },
        {
          sceneNumber: 4,
          sceneType: 'example',
          heading: 'Rule 3: The Multiplier',
          narration: `Rule number three is the multiplier: automate the recurring mechanics so your focus stays on high-leverage strategic moves.`,
          visualPrompt: `Futuristic digital dashboard illustrating seamless workflow automation and compounding growth curves`,
          sceneTopic: topic,
          durationSec: 8,
        },
        {
          sceneNumber: 5,
          sceneType: 'conclusion',
          heading: 'The Implementation Challenge',
          narration: `Follow these three rules consistently, and within thirty days, your proficiency in ${topic} will surpass ninety percent of your peers.`,
          visualPrompt: `Presenter smiling confidently, leaning against modern studio desk with warm ambient fill light`,
          sceneTopic: topic,
          durationSec: 7,
        },
        {
          sceneNumber: 6,
          sceneType: 'cta',
          heading: 'Action Challenge CTA',
          narration: `Which of these three rules will you implement today? Drop your answer in the comments, hit subscribe, and let us get to work.`,
          visualPrompt: `Sleek animated YouTube CTA with interactive comment box graphic and subscribe animation`,
          sceneTopic: topic,
          durationSec: 6,
        },
      ];
    } else if (activeFramework.id === 'curiosity_loophole') {
      scenes = [
        {
          sceneNumber: 1,
          sceneType: 'hook',
          heading: 'The Unexplained Anomaly',
          narration: `There is a massive loophole hiding in plain sight inside ${topic}, and virtually nobody in mainstream media is talking about it.`,
          visualPrompt: `Intriguing mystery-style framing, dark studio with solitary spotlight focusing on presenter holding confidential folder`,
          sceneTopic: topic,
          durationSec: 7,
        },
        {
          sceneNumber: 2,
          sceneType: 'intro',
          heading: 'Clue 1: The Discrepancy',
          narration: `When you inspect the official numbers, something does not add up. The standard explanation for ${topic} leaves huge questions unanswered.`,
          visualPrompt: `High-tech floating holographic numbers, charts revealing statistical anomaly with red warning glow`,
          sceneTopic: topic,
          durationSec: 8,
        },
        {
          sceneNumber: 3,
          sceneType: 'main',
          heading: 'Clue 2: The Breadcrumbs',
          narration: `Follow the incentives, and the entire puzzle begins to lock into place: who actually benefits when the truth stays buried?`,
          visualPrompt: `Presenter analyzing interconnected evidence board with connecting red digital thread, cinematic documentary grade`,
          sceneTopic: topic,
          durationSec: 9,
        },
        {
          sceneNumber: 4,
          sceneType: 'example',
          heading: 'The Loophole Exposed',
          narration: `Here is the mechanism: by exploiting this specific nuance, insiders have quietly been securing massive results while the public looks elsewhere.`,
          visualPrompt: `Cinematic reveal shot of modern tech server room and executive boardroom with crisp contrast lighting`,
          sceneTopic: topic,
          durationSec: 8,
        },
        {
          sceneNumber: 5,
          sceneType: 'conclusion',
          heading: 'The Big Implication',
          narration: `Now that you know how the system operates, you can use this exact insight to navigate ${topic} on your own terms.`,
          visualPrompt: `Presenter close-up with sharp intensity, warm lighting breaking through darkness into full studio clarity`,
          sceneTopic: topic,
          durationSec: 7,
        },
        {
          sceneNumber: 6,
          sceneType: 'cta',
          heading: 'Final Discussion Call',
          narration: `Subscribe to stay ahead of the curve, turn on notifications, and tell me: did you already suspect this loophole existed?`,
          visualPrompt: `Animated sleek YouTube bell alert, subscribe button pulse, and modern closing studio outro graphic`,
          sceneTopic: topic,
          durationSec: 6,
        },
      ];
    } else {
      // Default: Provocative Question Hook
      scenes = [
        {
          sceneNumber: 1,
          sceneType: 'hook',
          heading: 'Opening Question Interrupt',
          narration: `Have you ever wondered what is really happening beneath the surface of ${topic}? Today, we are breaking down the uncomfortable truth.`,
          visualPrompt: `Presenter leaning toward camera with an intrigued, confident expression in modern studio, dramatic lighting`,
          sceneTopic: topic,
          durationSec: 6,
        },
        {
          sceneNumber: 2,
          sceneType: 'intro',
          heading: 'The Hidden Context',
          narration: `Most people only see the obvious side of ${topic}. But when you look closer, the underlying mechanics tell a completely different story.`,
          visualPrompt: `Presenter speaking at medium framing, subtle camera drift, transitioning to cinematic relevant B-roll of ${topic}`,
          sceneTopic: topic,
          durationSec: 8,
        },
        {
          sceneNumber: 3,
          sceneType: 'main',
          heading: 'The Core Mechanism',
          narration: `Here is the critical insight: how systems and patterns interact to create massive exponential shifts over time.`,
          visualPrompt: `High-definition conceptual B-roll illustrating dynamic data points and interconnected structures, studio depth of field`,
          sceneTopic: topic,
          durationSec: 10,
        },
        {
          sceneNumber: 4,
          sceneType: 'example',
          heading: 'Real-World Validation',
          narration: `Look at what happens in practice. When you apply this principle, the results speak directly and powerfully for themselves.`,
          visualPrompt: `Presenter gesturing confidently, split-screen displaying realistic case study visual and modern infographics`,
          sceneTopic: topic,
          durationSec: 8,
        },
        {
          sceneNumber: 5,
          sceneType: 'conclusion',
          heading: 'The Unfair Advantage',
          narration: `The takeaway is straightforward: mastering ${topic} changes your entire perspective and gives you an undeniable competitive edge.`,
          visualPrompt: `Presenter close-up shot with warm studio backlighting, high contrast and authoritative cinematic presence`,
          sceneTopic: topic,
          durationSec: 7,
        },
        {
          sceneNumber: 6,
          sceneType: 'cta',
          heading: 'Call to Action',
          narration: `If this gave you a new perspective, hit subscribe, drop your thoughts in the comments, and I will see you in the next breakdown.`,
          visualPrompt: `Presenter smiling, animated sleek subscribe button overlay and YouTube notification bell graphic`,
          sceneTopic: topic,
          durationSec: 6,
        },
      ];
    }

    const totalDurationSec = scenes.reduce((acc, s) => acc + s.durationSec, 0);
    const wordCount = scenes.reduce((acc, s) => acc + s.narration.split(/\s+/).length, 0);
    const mins = Math.floor(totalDurationSec / 60);
    const secs = totalDurationSec % 60;

    return {
      title: `${topic} — ${activeFramework.name}`,
      topic,
      totalDurationSec,
      wordCount,
      estimatedDurationFormatted: `${mins}:${secs.toString().padStart(2, '0')}`,
      scenes,
      narrativeFramework: activeFramework,
    };
  }

  /**
   * Platform-Specific Hook Adaptation Engine
   * Dynamically transforms a video topic and hook across YouTube, TikTok, Instagram, and Facebook
   */
  adaptHookForPlatform(topic: string, platform: 'YouTube' | 'TikTok' | 'Instagram' | 'Facebook', durationMinutes: number = 3): {
    platform: string;
    hookNarration: string;
    visualCaptionOverlay: string;
    pacingWordsPerMinute: number;
    recommendedFrameworkId: string;
    callToAction: string;
    monetizationTip: string;
  } {
    if (platform === 'Facebook') {
      return {
        platform: 'Facebook',
        hookNarration: `If you have ever felt overwhelmed by ${topic}, you need to stop scrolling and see this. Most people don't find out the real truth until it is already costing them time and money.`,
        visualCaptionOverlay: `⚠️ THE UNCOMFORTABLE TRUTH ABOUT ${topic.toUpperCase()} (WATCH THIS BEFORE DOING ANYTHING ELSE)`,
        pacingWordsPerMinute: 145, // Slightly conversational, empathetic cadence for mature demographic
        recommendedFrameworkId: durationMinutes >= 3 ? 'facebook_in_stream_monetization' : 'facebook_viral_empathy',
        callToAction: `Have you dealt with this yourself? Drop your perspective in the comments below, and share this with someone who needs to hear it today.`,
        monetizationTip: durationMinutes >= 3
          ? 'Facebook 3+ minute videos unlock lucrative In-Stream mid-roll ads ($1.00-$3.00+ CPM) and algorithmic comment thread amplification.'
          : 'Facebook Reels (9:16) triggers high algorithmic shares across mobile feeds and Reels Performance Bonuses.',
      };
    }

    if (platform === 'TikTok') {
      return {
        platform: 'TikTok',
        hookNarration: `Wait, stop scrolling! Did you seriously not know that ${topic} is completely backwards from what everyone is telling you? Look at this.`,
        visualCaptionOverlay: `POV: You just discovered the secret about ${topic} 👀`,
        pacingWordsPerMinute: 170, // Fast, punchy, high-energy delivery
        recommendedFrameworkId: 'curiosity_loophole',
        callToAction: `Hit the plus icon for part two and comment which tool you want me to test next!`,
        monetizationTip: durationMinutes >= 1
          ? 'TikTok Creator Rewards requires >60s! 2-3+ minutes generates $0.50-$1.20+ RPM.'
          : 'Sub-60s videos earn $0 on Creator Rewards; use 1-3m for maximum monetization.',
      };
    }

    if (platform === 'Instagram') {
      return {
        platform: 'Instagram',
        hookNarration: `Save this breakdown before the algorithm hides it. Here is the exact blueprint to master ${topic} that most experts charge thousands to reveal.`,
        visualCaptionOverlay: `📌 SAVE THIS: The Definitive Blueprint for ${topic}`,
        pacingWordsPerMinute: 155, // Clean, authoritative, aesthetic pacing
        recommendedFrameworkId: 'tactical_playbook',
        callToAction: `Bookmark this Reel to review later, and comment "BLUEPRINT" to receive the full step-by-step breakdown.`,
        monetizationTip: 'Instagram prioritizes Saves and DMs over passive views; structure content as a reference guide.',
      };
    }

    // Default: YouTube
    return {
      platform: 'YouTube',
      hookNarration: `Have you ever wondered what is really happening beneath the surface of ${topic}? Today, we are breaking down the uncomfortable truth.`,
      visualCaptionOverlay: `${topic.toUpperCase()}: The Complete Breakdown`,
      pacingWordsPerMinute: 150,
      recommendedFrameworkId: 'provocative_question',
      callToAction: `If this breakdown gave you a new perspective, subscribe to the channel and turn on notifications for our next documentary.`,
      monetizationTip: 'YouTube rewards long watch-time session duration; 8+ minutes unlocks custom mid-roll ad placement.',
    };
  }
}

export const personalCreatorScriptService = new PersonalCreatorScriptService();
