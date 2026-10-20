import { ProjectMetadata, getApiKey } from '../db';
import { resolveGlobalVisualStyle, applyGlobalStyleToPrompt } from '../video/visualStyles';

export interface ProductionBible {
  topic: string;
  niche: string;
  visualStyle: string;
  protagonistOrAnchor: string;
  primarySetting: string;
  lightingAndMood: string;
  colorGrade: string;
  continuityNotes: string;
}

export interface ScriptStructure {
  title: string;
  productionBible?: ProductionBible;
  hook: string;
  hookVisualPrompt?: string;
  hookVisualSubject?: string;
  introduction: string;
  introVisualPrompt?: string;
  introVisualSubject?: string;
  sections: Array<{
    heading: string;
    subsections: Array<{
      subheading: string;
      narration: string;
      visualPrompt: string;
      visualSubject?: string;
      environment?: string;
      cameraMovement?: string;
      lighting?: string;
      colorStyle?: string;
      continuityNotes?: string;
      durationSec: number;
    }>;
  }>;
  conclusion: string;
  conclusionVisualPrompt?: string;
  conclusionVisualSubject?: string;
  callToAction: string;
  ctaVisualPrompt?: string;
  ctaVisualSubject?: string;
}

export interface GeneratedScene {
  sceneIndex: number;
  sectionName: string;
  narration: string;
  visualPrompt: string;
  visualSubject?: string;
  environment?: string;
  cameraMovement?: string;
  lighting?: string;
  colorStyle?: string;
  continuityNotes?: string;
  estimatedDurationSec: number;
  subtitleText: string;
}

export interface AiProvider {
  generateScript(params: {
    channelName: string;
    niche: string;
    language: string;
    topic: string;
    targetLengthMinutes: number;
    visualStyle?: string;
    introStyle?: string;
    outroCta?: string;
    contentRules?: string;
  }): Promise<{ script: ScriptStructure; fullNarration: string }>;

  generateScenes(params: {
    script: ScriptStructure;
    niche: string;
    language: string;
    targetLengthMinutes: number;
    visualStyle?: string;
  }): Promise<GeneratedScene[]>;

  generateMetadata(params: {
    script: ScriptStructure;
    scenes: GeneratedScene[];
    channelName: string;
    niche: string;
    topic: string;
  }): ProjectMetadata;
}

export function resolveProductionBible(topic: string, niche: string, visualStyle: string = 'Cinematic High-Contrast'): ProductionBible {
  const cleanTopic = topic.trim();
  const normalized = ` ${cleanTopic.toLowerCase().replace(/[^a-z0-9]/g, ' ')} `;
  const hasAnyWord = (words: string[]) => words.some((w) => normalized.includes(` ${w} `));

  let protagonistOrAnchor = 'A focused, articulate documentary presenter and subject domain specialist';
  let primarySetting = `A modern architectural documentary studio with atmospheric ambient depth matching ${niche}`;
  let lightingAndMood = 'Volumetric atmospheric directional rim lighting, deep shadows, shallow depth of field';
  let colorGrade = 'Cinematic 35mm film grade with balanced natural contrast';

  if (hasAnyWord(['ai', 'artificial intelligence', 'tech', 'technology', 'robot', 'robotics', 'neural', 'software', 'coding', 'computing', 'developer', 'algorithm', 'engineer', 'prompt', 'model'])) {
    protagonistOrAnchor = 'A focused software engineer in a dark minimalist hoodie working at an advanced multi-monitor workstation with glowing neural network diagrams and Python code';
    primarySetting = 'Cutting-edge technology research laboratory and modern developer workstation with dual 4K displays and ambient cyan LED lighting';
    lightingAndMood = 'Dramatic cool cyan key light with warm amber rim light, high contrast, shallow depth of field';
    colorGrade = 'Deep slate blacks, vibrant cyber cyan, warm amber accents';
  } else if (hasAnyWord(['wealth', 'money', 'finance', 'invest', 'investing', 'investment', 'stocks', 'broke', 'rich', 'cashflow', 'dollars', 'trading', 'crypto', 'bitcoin', 'business', 'ecommerce', 'sales'])) {
    protagonistOrAnchor = 'An ambitious modern strategist and investor reviewing quantitative analytics charts and financial dashboards';
    primarySetting = 'Panoramic architectural glass executive high-rise suite overlooking a bustling urban financial skyline at dusk';
    lightingAndMood = 'Golden hour directional sunlight through floor-to-ceiling glass, architectural shadows, soft ambient fill';
    colorGrade = 'Rich obsidian navy, warm champagne gold, deep forest green accents';
  } else if (hasAnyWord(['stoic', 'stoicism', 'mindset', 'marcus', 'seneca', 'epictetus', 'philosophy', 'discipline', 'habits', 'mental', 'overthinking', 'focus', 'psychology'])) {
    protagonistOrAnchor = 'A disciplined, contemplative individual reflecting with calm composure, unwavering focus, and resolute posture';
    primarySetting = 'Serene minimalist stone sanctuary and classical architectural colonnade with natural stone textures and open sky';
    lightingAndMood = 'Atmospheric chiaroscuro low-key illumination, soft dawn light rays, deep contemplative shadows';
    colorGrade = 'Earthy granite slate, warm terracotta, desaturated olive, muted bronze';
  } else if (hasAnyWord(['space', 'galaxy', 'universe', 'astronomy', 'astrophysics', 'black hole', 'blackhole', 'nasa', 'cosmos', 'cosmic', 'planet', 'physics', 'telescope'])) {
    protagonistOrAnchor = 'Breathtaking celestial deep-space phenomena, interstellar nebulae, and high-altitude astronomical research arrays';
    primarySetting = 'Expansive cosmic deep-space vacuum with swirling stellar dust clouds, adjacent to a futuristic orbital observatory';
    lightingAndMood = 'Bioluminescent stellar core glow, intense stellar contrasts against the pitch-black cosmic void';
    colorGrade = 'Deep space obsidian, electric stellar sapphire, cosmic violet, radiant gold';
  } else if (hasAnyWord(['health', 'healthy', 'wellness', 'longevity', 'vitality', 'cardio', 'fitness', 'exercise', 'aging', 'diet', 'nutrition', 'food', 'foods', 'eat'])) {
    protagonistOrAnchor = 'A healthy high-performance athlete and wellness researcher optimizing human vitality and cellular nutrition';
    primarySetting = 'State-of-the-art sports science performance laboratory and modern organic culinary research studio';
    lightingAndMood = 'Bright crisp natural daylight, soft airy bounce, vibrant fresh highlights';
    colorGrade = 'Vibrant emerald green, fresh citrus orange, pure clinical white, warm natural wood';
  } else if (hasAnyWord(['car', 'cars', 'supercar', 'supercars', 'bmw', 'ferrari', 'lamborghini', 'porsche', 'tesla', 'driving', 'automotive', 'racing', 'engine', 'vehicle', 'speed'])) {
    protagonistOrAnchor = 'A sculpted aerodynamic concept supercar with aerodynamic carbon fiber bodywork and glowing LED matrix headlights';
    primarySetting = 'Modern aerodynamic wind-tunnel testing facility and scenic sunlit mountain highway curves at golden hour';
    lightingAndMood = 'Reflective metallic specular highlights, twilight horizon glow, sleek wet asphalt reflections';
    colorGrade = 'Glossy obsidian carbon, racing crimson, cobalt blue, warm exhaust amber';
  } else if (hasAnyWord(['ocean', 'sea', 'marine', 'water', 'deepsea', 'nature', 'wildlife', 'animals', 'animal', 'forest', 'plants', 'trees'])) {
    protagonistOrAnchor = 'Majestic marine wildlife and pristine natural wilderness environments captured in authentic documentary realism';
    primarySetting = 'Expansive untamed coastal shoreline, bioluminescent oceanic depths, and lush emerald ancient forest';
    lightingAndMood = 'Organic golden hour sunlight filtering through canopies, misty coastal atmospheric haze';
    colorGrade = 'Deep abyssal indigo, lush moss green, golden sunlight, pristine ocean aquamarine';
  } else if (hasAnyWord(['history', 'ancient', 'mystery', 'pyramid', 'civilization', 'war', 'empire', 'roman', 'medieval'])) {
    protagonistOrAnchor = 'Historical exploration scholar examining ancient architectural relics, hand-drawn cartography, and stone inscriptions';
    primarySetting = 'Grand historical archival chamber with aged parchment, stone monuments, and towering vaulted ceilings';
    lightingAndMood = 'Dramatic shaft of sunlight penetrating ancient stone corridors, warm flickering torchlight';
    colorGrade = 'Aged parchment amber, weathered sandstone, deep shadow umber, antique gold';
  }

  return {
    topic: cleanTopic,
    niche,
    visualStyle,
    protagonistOrAnchor,
    primarySetting,
    lightingAndMood,
    colorGrade,
    continuityNotes: `Consistent character identity (${protagonistOrAnchor}) and persistent environment (${primarySetting}) across all scenes`,
  };
}

export function stageSceneVisual(params: {
  narration: string;
  sceneIndex: number;
  sectionName: string;
  bible: ProductionBible;
  globalStyle: any;
  customCamera?: string;
}): {
  prompt: string;
  subject: string;
  environment: string;
  cameraMovement: string;
  continuityNotes: string;
} {
  const { narration, sceneIndex, sectionName, bible, customCamera } = params;
  const cleanNarration = (narration || '').replace(/\s+/g, ' ').trim();
  const lower = cleanNarration.toLowerCase();

  // Determine narrative emotional tone for visual staging
  const isConflict = /fail|struggle|problem|mistake|overwhelm|frustrat|error|quit|risk|danger|crash|trap|crisis|collapse/i.test(lower);
  const isBreakthrough = /breakthrough|solution|secret|win|master|unlock|succeed|growth|advantage|future|power|results|triumph/i.test(lower);
  const isAnalysis = /data|analyze|system|framework|code|algorithm|metric|process|mechanic|logic|science|research|test/i.test(lower);

  let cameraMovement = customCamera || 'Slow linear forward push-in with centered focus';
  if (!customCamera) {
    if (sceneIndex === 1) {
      cameraMovement = 'Dramatic slow forward push-in focusing tightly on subject tension';
    } else if (sceneIndex === 2) {
      cameraMovement = 'Smooth wide-angle horizontal tracking shot establishing the environment';
    } else if (isConflict) {
      cameraMovement = 'Intense medium close-up with shallow focus and subtle camera tension';
    } else if (isBreakthrough) {
      cameraMovement = 'Dynamic upward tilt and smooth forward glide with expanding perspective';
    } else if (isAnalysis) {
      cameraMovement = 'Steady cinematic tracking dolly glide revealing intricate technical details';
    } else {
      cameraMovement = 'Cinematic forward dolly with smooth depth separation';
    }
  }

  // Extract a concise narrative sentence for the prompt
  const firstSentence = cleanNarration.split(/[.!?]/)[0]?.trim() || cleanNarration.slice(0, 80);

  // Formulate a concrete physical action
  let visualAction = '';
  if (sceneIndex === 1) {
    visualAction = `facing the high-stakes reality: "${firstSentence}", experiencing intense dramatic focus`;
  } else if (isConflict) {
    visualAction = `confronting critical obstacles and complex challenges regarding "${firstSentence}", tension visible in expression and surroundings`;
  } else if (isBreakthrough) {
    visualAction = `demonstrating the winning breakthrough: "${firstSentence}", triumphant confident posture and visible mastery`;
  } else if (isAnalysis) {
    visualAction = `deeply engaged in strategic execution and detailed technical analysis: "${firstSentence}", interactive tools and data displayed`;
  } else {
    visualAction = `actively working through: "${firstSentence}", seamless professional mastery`;
  }

  const prompt = `${bible.protagonistOrAnchor} ${visualAction}, set inside ${bible.primarySetting}. ${cameraMovement}. ${bible.lightingAndMood}. ${bible.colorGrade}. 35mm anamorphic lens, shallow depth of field, 8k resolution, photorealistic film still, vertical 9:16 composition.`;

  const subject = `${bible.protagonistOrAnchor.split(' ').slice(0, 6).join(' ')} - ${sectionName}`;
  const continuityNotes = `Scene ${sceneIndex} maintains character identity (${bible.protagonistOrAnchor.slice(0, 35)}...) and persistent environment (${bible.primarySetting.slice(0, 35)}...)`;

  return {
    prompt,
    subject,
    environment: bible.primarySetting,
    cameraMovement,
    continuityNotes,
  };
}

class DefaultAiProvider implements AiProvider {
  async generateScript(params: {
    channelName: string;
    niche: string;
    language: string;
    topic: string;
    targetLengthMinutes: number;
    visualStyle?: string;
    introStyle?: string;
    outroCta?: string;
    contentRules?: string;
  }): Promise<{ script: ScriptStructure; fullNarration: string }> {
    const { channelName, niche, topic, targetLengthMinutes, introStyle, outroCta, visualStyle } = params;

    let script: ScriptStructure | null = null;

    // 1. Try OpenRouter if configured in DB or ENV
    const openRouterKey = getApiKey('openrouter') || process.env.OPENROUTER_API_KEY;
    if (openRouterKey) {
      try {
        const res = await this.generateScriptWithOpenRouter(params, openRouterKey);
        script = res.script;
      } catch (err: any) {
        console.warn(`[AiProvider] OpenRouter generation failed (${err.message}). Trying fallback...`);
      }
    }

    // 2. Try Google Gemini if configured in DB or ENV
    if (!script) {
      const geminiKey = getApiKey('gemini') || process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
      if (geminiKey) {
        try {
          const res = await this.generateScriptWithGemini(params, geminiKey);
          script = res.script;
        } catch (err: any) {
          console.warn(`[AiProvider] Gemini generation failed (${err.message}). Trying fallback...`);
        }
      }
    }

    // 3. Try OpenAI if configured in DB or ENV
    if (!script) {
      const openAiKey = getApiKey('openai') || process.env.OPENAI_API_KEY;
      if (openAiKey) {
        try {
          const res = await this.generateScriptWithOpenAI(params, openAiKey);
          script = res.script;
        } catch (err: any) {
          console.warn(`[AiProvider] OpenAI generation failed (${err.message}). Trying fallback...`);
        }
      }
    }

    // 4. Built-in Calibrated Multi-Niche Offline Script Engine
    if (!script) {
      script = this.buildCalibratedScript(channelName, niche, topic, targetLengthMinutes, introStyle, outroCta, visualStyle);
    }

    // Validate & Enrich word count if needed
    const targetWordCount = Math.round(targetLengthMinutes * 138);
    this.enrichScriptToTargetWordCount(script, topic, niche, targetWordCount, visualStyle || 'Cinematic High-Contrast');

    const narrationParts: string[] = [script.hook, script.introduction];
    for (const section of script.sections) {
      for (const sub of section.subsections) {
        narrationParts.push(sub.narration);
      }
    }
    narrationParts.push(script.conclusion);
    narrationParts.push(script.callToAction);

    const fullNarration = narrationParts.join('\n\n');
    return { script, fullNarration };
  }

  async generateScenes(params: {
    script: ScriptStructure;
    niche: string;
    language: string;
    targetLengthMinutes: number;
    visualStyle?: string;
  }): Promise<GeneratedScene[]> {
    const { script, niche, visualStyle = 'Cinematic High-Contrast' } = params;
    const globalStyle = resolveGlobalVisualStyle(visualStyle);
    const bible = script.productionBible || resolveProductionBible(script.title, niche, visualStyle);
    const scenes: GeneratedScene[] = [];
    let sceneIndex = 1;

    // Scene 1: Hook (High-stakes dramatic visual staging directly illustrating the hook narration)
    const hookWords = script.hook.split(/\s+/).filter(Boolean).length;
    const hookDuration = Math.max(6, Math.round(hookWords / 2.3));
    const hookStaging = stageSceneVisual({
      narration: script.hook,
      sceneIndex,
      sectionName: 'Hook',
      bible,
      globalStyle,
    });
    const hookPrompt = script.hookVisualPrompt && !script.hookVisualPrompt.startsWith('High-impact')
      ? script.hookVisualPrompt
      : hookStaging.prompt;

    scenes.push({
      sceneIndex: sceneIndex++,
      sectionName: 'Hook',
      narration: script.hook,
      visualPrompt: hookPrompt,
      visualSubject: script.hookVisualSubject || hookStaging.subject,
      environment: hookStaging.environment,
      cameraMovement: hookStaging.cameraMovement,
      lighting: bible.lightingAndMood,
      colorStyle: bible.colorGrade,
      continuityNotes: `Establishes core visual anchor (${bible.protagonistOrAnchor.slice(0, 45)}...) and primary setting (${bible.primarySetting.slice(0, 45)}...)`,
      estimatedDurationSec: hookDuration,
      subtitleText: script.hook,
    });

    // Scene 2: Introduction (Smooth transition establishing the narrative arc in the primary setting)
    const introWords = script.introduction.split(/\s+/).filter(Boolean).length;
    const introDuration = Math.max(10, Math.round(introWords / 2.3));
    const introStaging = stageSceneVisual({
      narration: script.introduction,
      sceneIndex,
      sectionName: 'Introduction',
      bible,
      globalStyle,
      customCamera: 'Smooth wide-angle horizontal tracking shot revealing the environment',
    });
    const introPrompt = script.introVisualPrompt && !script.introVisualPrompt.startsWith('Wide cinematic')
      ? script.introVisualPrompt
      : introStaging.prompt;

    scenes.push({
      sceneIndex: sceneIndex++,
      sectionName: 'Introduction',
      narration: script.introduction,
      visualPrompt: introPrompt,
      visualSubject: script.introVisualSubject || introStaging.subject,
      environment: introStaging.environment,
      cameraMovement: introStaging.cameraMovement,
      lighting: bible.lightingAndMood,
      colorStyle: bible.colorGrade,
      continuityNotes: `Maintains character and environment continuity from Scene 1 while broadening perspective`,
      estimatedDurationSec: introDuration,
      subtitleText: script.introduction,
    });

    // Section Scenes: Story progression with explicit visual-narration synchronization and persistent anchors
    for (let sIdx = 0; sIdx < script.sections.length; sIdx++) {
      const section = script.sections[sIdx];
      for (let subIdx = 0; subIdx < section.subsections.length; subIdx++) {
        const sub = section.subsections[subIdx];
        const words = sub.narration.split(/\s+/).filter(Boolean).length;
        const duration = sub.durationSec || Math.max(8, Math.round(words / 2.3));

        const subStaging = stageSceneVisual({
          narration: sub.narration,
          sceneIndex,
          sectionName: `${section.heading} - ${sub.subheading}`,
          bible,
          globalStyle,
          customCamera: sub.cameraMovement,
        });

        const hasValidCustomPrompt = sub.visualPrompt &&
          !sub.visualPrompt.startsWith('Detailed visual') &&
          !sub.visualPrompt.startsWith('Cinematic photorealistic 8k visualization of Part') &&
          sub.visualPrompt.length > 30;

        const visualPrompt = hasValidCustomPrompt ? sub.visualPrompt : subStaging.prompt;
        const visualSubject = sub.visualSubject && !sub.visualSubject.startsWith('High-impact')
          ? sub.visualSubject
          : subStaging.subject;

        scenes.push({
          sceneIndex: sceneIndex++,
          sectionName: `${section.heading} - ${sub.subheading}`,
          narration: sub.narration,
          visualPrompt,
          visualSubject,
          environment: sub.environment || subStaging.environment,
          cameraMovement: sub.cameraMovement || subStaging.cameraMovement,
          lighting: sub.lighting || bible.lightingAndMood,
          colorStyle: sub.colorStyle || bible.colorGrade,
          continuityNotes: sub.continuityNotes || subStaging.continuityNotes,
          estimatedDurationSec: duration,
          subtitleText: sub.narration,
        });
      }
    }

    // Conclusion Scene (Inspiring resolution shot featuring the visual anchor in the primary setting)
    const conclWords = script.conclusion.split(/\s+/).filter(Boolean).length;
    const conclDuration = Math.max(10, Math.round(conclWords / 2.3));
    const conclStaging = stageSceneVisual({
      narration: script.conclusion,
      sceneIndex,
      sectionName: 'Conclusion',
      bible,
      globalStyle,
      customCamera: 'Expansive wide-angle pull-out revealing full environment mastery',
    });
    const conclPrompt = script.conclusionVisualPrompt && !script.conclusionVisualPrompt.startsWith('Inspiring wide')
      ? script.conclusionVisualPrompt
      : conclStaging.prompt;

    scenes.push({
      sceneIndex: sceneIndex++,
      sectionName: 'Conclusion',
      narration: script.conclusion,
      visualPrompt: conclPrompt,
      visualSubject: script.conclusionVisualSubject || conclStaging.subject,
      environment: conclStaging.environment,
      cameraMovement: conclStaging.cameraMovement,
      lighting: bible.lightingAndMood,
      colorStyle: bible.colorGrade,
      continuityNotes: `Culmination of narrative arc, celebrating mastery in primary setting`,
      estimatedDurationSec: conclDuration,
      subtitleText: script.conclusion,
    });

    // Call To Action Scene (Clean authoritative outro in the established setting)
    const ctaWords = script.callToAction.split(/\s+/).filter(Boolean).length;
    const ctaDuration = Math.max(6, Math.round(ctaWords / 2.3));
    const ctaStaging = stageSceneVisual({
      narration: script.callToAction,
      sceneIndex,
      sectionName: 'Call To Action',
      bible,
      globalStyle,
      customCamera: 'Centered linear forward glide with clean graphic framing',
    });
    const ctaPrompt = script.ctaVisualPrompt && !script.ctaVisualPrompt.startsWith('Sleek branded')
      ? script.ctaVisualPrompt
      : ctaStaging.prompt;

    scenes.push({
      sceneIndex: sceneIndex++,
      sectionName: 'Call To Action',
      narration: script.callToAction,
      visualPrompt: ctaPrompt,
      visualSubject: script.ctaVisualSubject || `Branded Channel Outro - ${params.script.title}`,
      environment: ctaStaging.environment,
      cameraMovement: ctaStaging.cameraMovement,
      lighting: bible.lightingAndMood,
      colorStyle: bible.colorGrade,
      continuityNotes: `Transitions smoothly from cinematic conclusion into clean branded closing frame`,
      estimatedDurationSec: ctaDuration,
      subtitleText: script.callToAction,
    });

    return scenes;
  }

  generateMetadata(params: {
    script: ScriptStructure;
    scenes: GeneratedScene[];
    channelName: string;
    niche: string;
    topic: string;
  }): ProjectMetadata {
    const { script, scenes, channelName, niche, topic } = params;

    let currentSec = 0;
    const chapters: string[] = [];
    for (const scene of scenes) {
      const mins = Math.floor(currentSec / 60);
      const secs = Math.floor(currentSec % 60);
      const timeStr = `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
      chapters.push(`${timeStr} - ${scene.sectionName}`);
      currentSec += scene.estimatedDurationSec;
    }

    const description = [
      `In this comprehensive breakdown from ${channelName}, we dive deep into ${topic}. Discover the actionable insights, proven methodologies, and scientific principles you can apply immediately.\n`,
      `📌 CHAPTERS:\n${chapters.join('\n')}\n`,
      `💡 KEY TAKEAWAYS:\n• Comprehensive analysis of ${topic}\n• Practical execution framework for ${niche}\n• Long-term sustainable compounding principles\n`,
      `🔔 SUBSCRIBE to ${channelName} for weekly in-depth breakdowns on ${niche} & high-performance strategies.\n`,
      `#${niche.replace(/\s+/g, '')} #${topic.split(' ').slice(0, 3).join('').replace(/[^a-zA-Z0-9]/g, '')} #Education #Masterclass`,
    ].join('\n');

    const cleanTopic = topic.replace(/[^a-zA-Z0-9 ]/g, '');
    const tags = [
      niche,
      channelName,
      cleanTopic,
      ...cleanTopic.split(' ').filter((w) => w.length > 3),
      `${niche} breakdown`,
      `${niche} guide`,
      'educational video',
      'mastery',
      'how to',
      'practical guide',
      'in depth analysis',
    ];

    const hashtags = [
      `#${niche.replace(/\s+/g, '')}`,
      `#${cleanTopic.split(' ').slice(0, 2).join('')}`,
      '#Guide',
      '#Mastery',
      '#Insights',
    ];

    const suggestedFilename = `${channelName.toLowerCase().replace(/\s+/g, '_')}_${cleanTopic.toLowerCase().replace(/\s+/g, '_')}.mp4`;

    return {
      youtubeTitle: `${topic} | Complete ${niche} Masterclass`,
      description,
      tags: Array.from(new Set(tags)),
      hashtags,
      shortDescription: `A comprehensive masterclass on ${topic} by ${channelName}.`,
      suggestedFilename,
    };
  }

  private buildCalibratedScript(
    channelName: string,
    niche: string,
    topic: string,
    targetLengthMinutes: number,
    introStyle?: string,
    outroCta?: string,
    visualStyle: string = 'Cinematic High-Contrast'
  ): ScriptStructure {
    const ctaText = outroCta || `If you found this breakdown valuable, subscribe to ${channelName}, like the video, and join the conversation in the comments below.`;
    const cleanTopic = topic.trim();
    const normalized = ` ${cleanTopic.toLowerCase().replace(/[^a-z0-9]/g, ' ')} `;
    const hasAnyWord = (words: string[]) => words.some((w) => normalized.includes(` ${w} `));

    // Determine domain flavor to generate rich contextual narration
    let domainFocus = 'practical frameworks, core mechanics, and actionable insights';
    let defaultEnv = 'Modern documentary studio with cinematic lighting';

    if (hasAnyWord(['space', 'galaxy', 'universe', 'astronomy', 'astrophysics', 'black hole', 'blackhole', 'nasa', 'cosmos', 'cosmic', 'planet', 'physics', 'telescope'])) {
      domainFocus = 'cosmic astrophysics, gravitational anomalies, and deep-space observation';
      defaultEnv = 'High-tech astronomical observatory with panoramic celestial visuals';
    } else if (hasAnyWord(['crypto', 'cryptocurrency', 'bitcoin', 'btc', 'ethereum', 'eth', 'blockchain', 'web3'])) {
      domainFocus = 'decentralized consensus algorithms, cryptographic proof, and digital asset economics';
      defaultEnv = 'Cryptographic analytics terminal with real-time on-chain visualizations';
    } else if (hasAnyWord(['wealth', 'money', 'finance', 'invest', 'investing', 'investment', 'stocks', 'broke', 'rich', 'cashflow', 'dollars', 'trading'])) {
      domainFocus = 'asymmetric risk management, compounding capital systems, and financial autonomy';
      defaultEnv = 'High-rise executive finance suite with floor-to-ceiling architectural glass';
    } else if (hasAnyWord(['stoic', 'stoicism', 'mindset', 'marcus', 'seneca', 'epictetus', 'philosophy', 'discipline', 'habits', 'mental', 'overthinking'])) {
      domainFocus = 'the dichotomy of control, psychological resilience, and unwavering mental clarity';
      defaultEnv = 'Serene minimalist sanctuary with classical architecture and warm natural lighting';
    } else if (hasAnyWord(['food', 'foods', 'diet', 'nutrition', 'eat', 'eating', 'meal', 'superfood', 'superfoods'])) {
      domainFocus = 'cellular nutrient density, anti-inflammatory compounds, and metabolic vitality';
      defaultEnv = 'Bright modern culinary research studio with organic whole foods';
    } else if (hasAnyWord(['health', 'healthy', 'wellness', 'longevity', 'vitality', 'cardio', 'fitness', 'exercise', 'aging'])) {
      domainFocus = 'cellular longevity protocols, metabolic resilience, and systemic vitality';
      defaultEnv = 'State-of-the-art sports science and longevity clinical suite';
    } else if (hasAnyWord(['car', 'cars', 'supercar', 'supercars', 'bmw', 'ferrari', 'lamborghini', 'porsche', 'tesla', 'driving', 'automotive', 'racing', 'engine', 'vehicle', 'vehicles', 'speed'])) {
      domainFocus = 'aerodynamic powertrain engineering, precision vehicle dynamics, and track-tested automotive performance';
      defaultEnv = 'High-tech automotive aerodynamic design studio and sunlit mountain highway';
    } else if (hasAnyWord(['ocean', 'sea', 'marine', 'water', 'deepsea', 'nature', 'wildlife', 'animals', 'animal', 'forest', 'plants', 'gardening', 'trees'])) {
      domainFocus = 'marine biodiversity, abyssal ecosystem dynamics, and environmental conservation';
      defaultEnv = 'Expansive coastal shoreline and bioluminescent oceanic depths';
    } else if (hasAnyWord(['music', 'song', 'guitar', 'piano', 'sound', 'audio', 'beat', 'beats', 'track', 'art', 'dance', 'culture'])) {
      domainFocus = 'acoustic resonance, harmonic composition, and creative expression';
      defaultEnv = 'Modern acoustic mastering studio with warm ambient backlighting';
    } else if (hasAnyWord(['architecture', 'building', 'buildings', 'skyscraper', 'house', 'houses', 'realestate', 'construction', 'city', 'urban'])) {
      domainFocus = 'structural engineering aesthetics, spatial geometry, and sustainable architectural design';
      defaultEnv = 'Architectural design pavilion overlooking a scenic modern skyline';
    } else if (hasAnyWord(['plane', 'airplane', 'aviation', 'flight', 'mystery', 'mysteries', 'history', 'ancient', 'pyramid', 'bermuda'])) {
      domainFocus = 'historical investigations, navigational anomalies, and aviation breakthroughs';
      defaultEnv = 'Expansive aerial flight cockpit and historical exploration chamber';
    } else if (hasAnyWord(['ai', 'artificial intelligence', 'tech', 'technology', 'robot', 'robotics', 'neural', 'software', 'coding', 'computing'])) {
      domainFocus = 'frontier neural architectures, autonomous computing, and next-generation innovation';
      defaultEnv = 'Cutting-edge technology research laboratory with holographic interfaces';
    }

    const isShorts = targetLengthMinutes < 2;
    const targetWordCount = Math.round(targetLengthMinutes * 138);

    // Dynamic chapter count based on duration
    const numSections = isShorts
      ? Math.max(2, Math.min(4, Math.round(targetLengthMinutes * 4)))
      : Math.min(12, Math.max(5, Math.round(targetLengthMinutes * 1.1)));

    const sectionDuration = Math.max(15, Math.round((targetLengthMinutes * 60 - 40) / numSections));

    // Dynamic topic-driven pillar generation matching user's requested topic and niche
    const generateTopicPillars = (topicStr: string, nicheStr: string, domainStr: string) => [
      {
        title: `The Fundamentals & Core Mechanics of ${topicStr}`,
        sub1: `Understanding the Foundation of ${topicStr}`,
        desc1: `When analyzing ${topicStr}, we must first examine the core principles that govern its foundation. In the context of ${nicheStr}, understanding these baseline mechanics is essential for grasping the wider implications and long-term trajectory.`,
        sub2: `Key Drivers & Critical Dynamics`,
        desc2: `As these foundational elements interact, they generate powerful secondary effects. Industry leaders and experts in ${nicheStr} consistently point to these critical dynamics as the primary forces shaping outcomes today.`,
        subject: `High-impact cinematic conceptual visualization illustrating the core foundation of ${topicStr}`,
      },
      {
        title: `Catalysts & Rapid Transformations in ${topicStr}`,
        sub1: `The Shift in Traditional Paradigms`,
        desc1: `Recent breakthroughs and shifting landscapes have accelerated the pace of change surrounding ${topicStr}. What used to take years to develop is now evolving in real time, challenging traditional assumptions across ${nicheStr}.`,
        sub2: `Emerging Trends & Breakthrough Systems`,
        desc2: `These rapid transformations create new opportunities while dismantling obsolete methodologies. Adapting to this new reality requires a deep understanding of ${domainStr}.`,
        subject: `Cinematic wide shot showing dynamic motion and technological evolution in ${topicStr}`,
      },
      {
        title: `Strategic Frameworks & Execution Methodologies`,
        sub1: `The Blueprint for Implementation`,
        desc1: `To harness the full potential of ${topicStr}, structured frameworks are required. By breaking down complex variables into actionable phases, professionals in ${nicheStr} can maximize performance and eliminate unnecessary risk.`,
        sub2: `Optimization & Risk Mitigation`,
        desc2: `Every major shift brings unique challenges. Identifying potential friction points early enables strategic resilience and long-term sustainability in ${nicheStr}.`,
        subject: `Clean architectural perspective showing structured strategy and precision engineering for ${topicStr}`,
      },
      {
        title: `Data Insights & Macro Perspectives`,
        sub1: `Quantitative Evidence & Pattern Recognition`,
        desc1: `Empirical data surrounding ${topicStr} reveals clear patterns. Analyzing historical data points alongside modern benchmarks provides an undeniable perspective on where ${nicheStr} is heading.`,
        sub2: `Comparative Analysis & Industry Standards`,
        desc2: `When compared to historical precedents, the current trajectory of ${topicStr} highlights unprecedented shifts in behavioral and economic models.`,
        subject: `High-tech analytical terminal display visualizing data curves and insights for ${topicStr}`,
      },
      {
        title: `Real-World Case Studies & Field Applications`,
        sub1: `Practical Execution in Modern Environments`,
        desc1: `Theory only tells half the story. Examining real-world applications of ${topicStr} demonstrates how top performers navigate obstacles and capitalize on emerging advantages.`,
        sub2: `Measurable Outcomes & Key Takeaways`,
        desc2: `The results speak for themselves. Those who proactively integrate these principles achieve compound advantages across every facet of ${nicheStr}.`,
        subject: `Dynamic medium-angle shot of real-world implementation and high performance in ${topicStr}`,
      },
      {
        title: `The Future Horizon: Long-Term Outlook for ${topicStr}`,
        sub1: `Next-Generation Evolution & Horizon Scanning`,
        desc1: `Looking ahead, the evolution of ${topicStr} promises to redefine the boundaries of ${nicheStr}. Early adopters who position themselves along these emerging frontiers will lead the next decade.`,
        sub2: `Final Synthesis & Actionable Directive`,
        desc2: `Mastering ${topicStr} is not just an advantage—it is a necessity. By taking decisive action today, you unlock new levels of growth, efficiency, and long-term success.`,
        subject: `Breathtaking inspiring cinematic sunrise perspective symbolizing the bright future of ${topicStr}`,
      },
    ];

    const bible = resolveProductionBible(cleanTopic, niche, visualStyle);
    const pillars = generateTopicPillars(cleanTopic, niche, domainFocus);

    const sections = [];
    for (let i = 0; i < numSections; i++) {
      const p = pillars[i % pillars.length];
      const partNum = i + 1;

      // In shorts mode, provide concise punchy narration; in long-form, provide full multi-sentence paragraphs
      const narrationA = isShorts
        ? `Look closely at ${p.title}. When analyzing ${cleanTopic}, ${p.desc1.slice(0, 110)}.`
        : `${p.desc1}`;

      const narrationB = isShorts
        ? `This leads directly to ${p.sub2}. ${p.desc2.slice(0, 100)}.`
        : `${p.desc2}`;

      const sub1Duration = Math.max(8, Math.round((sectionDuration / 2) * 10) / 10);
      const sub2Duration = Math.max(8, Math.round((sectionDuration / 2) * 10) / 10);

      const prompt1 = `${bible.protagonistOrAnchor} deeply engaged in ${p.sub1}: analyzing the core foundation of ${cleanTopic}, inside ${bible.primarySetting}. Slow steady cinematic push-in with shallow depth of field. ${bible.lightingAndMood}. ${bible.colorGrade}. 35mm anamorphic lens, 8k resolution, photorealistic film still, vertical 9:16.`;
      const prompt2 = `${bible.protagonistOrAnchor} executing ${p.sub2}: demonstrating critical mechanics of ${cleanTopic}, inside ${bible.primarySetting}. Smooth horizontal parallax tracking glide. ${bible.lightingAndMood}. ${bible.colorGrade}. 35mm anamorphic lens, 8k resolution, photorealistic film still, vertical 9:16.`;

      sections.push({
        heading: `Part ${partNum}: ${p.title}`,
        subsections: [
          {
            subheading: p.sub1,
            narration: narrationA,
            visualPrompt: prompt1,
            visualSubject: `${cleanTopic} - ${p.sub1}`,
            environment: bible.primarySetting,
            cameraMovement: 'Slow steady cinematic push-in with shallow depth of field',
            lighting: bible.lightingAndMood,
            colorStyle: bible.colorGrade,
            continuityNotes: `Establishes dramatic visual continuity for Part ${partNum} featuring ${bible.protagonistOrAnchor.slice(0, 35)}...`,
            durationSec: sub1Duration,
          },
          {
            subheading: p.sub2,
            narration: narrationB,
            visualPrompt: prompt2,
            visualSubject: `${cleanTopic} - ${p.sub2}`,
            environment: bible.primarySetting,
            cameraMovement: 'Smooth horizontal parallax tracking glide',
            lighting: bible.lightingAndMood,
            colorStyle: bible.colorGrade,
            continuityNotes: `Direct continuous transition from ${p.sub1} inside ${bible.primarySetting.slice(0, 35)}...`,
            durationSec: sub2Duration,
          },
        ],
      });
    }

    const hookText = isShorts
      ? `What is the real secret behind ${cleanTopic}? In the next 60 seconds, everything you thought you knew changes.`
      : `What is the true power behind ${cleanTopic}? Across ${niche}, this breakthrough is reshaping how we understand ${domainFocus}. Here is the complete breakdown.`;

    const introText = isShorts
      ? `Welcome to ${channelName}. Most people misunderstand ${cleanTopic}, but the actual mechanisms are far more fascinating.`
      : `Welcome back to ${channelName}. Today, we are conducting an in-depth analysis of ${cleanTopic}. What you are about to discover will give you a strategic advantage in ${niche}.`;

    const conclusionText = isShorts
      ? `Understanding ${cleanTopic} is the key to mastering ${niche}. Apply these principles today.`
      : `The analysis of ${cleanTopic} proves how rapidly ${niche} is evolving. By understanding these core mechanisms, you stay ahead of the curve and position yourself for long-term success.`;

    const hookPrompt = `${bible.protagonistOrAnchor} confronting the pivotal reality of ${cleanTopic}, intense focused expression, set inside ${bible.primarySetting}. Dramatic slow forward push-in. ${bible.lightingAndMood}. ${bible.colorGrade}. 35mm anamorphic lens, 8k resolution, photorealistic, vertical 9:16.`;
    const introPrompt = `${bible.protagonistOrAnchor} introducing the masterclass framework on ${cleanTopic}, inside ${bible.primarySetting}. Wide-angle horizontal tracking glide. ${bible.lightingAndMood}. ${bible.colorGrade}. 35mm anamorphic lens, 8k resolution, vertical 9:16.`;
    const conclPrompt = `${bible.protagonistOrAnchor} achieving mastery in ${cleanTopic}, confident resolute posture, inside ${bible.primarySetting}. Expansive wide-angle pull-out. Warm triumphant golden rim lighting. 35mm anamorphic lens, 8k resolution, vertical 9:16.`;
    const ctaPrompt = `${bible.protagonistOrAnchor} looking toward camera with engaging invitation, inside ${bible.primarySetting}. Centered linear forward glide. Sleek broadcast framing. 35mm lens, vertical 9:16.`;

    return {
      title: cleanTopic,
      productionBible: bible,
      hook: hookText,
      hookVisualPrompt: hookPrompt,
      hookVisualSubject: `${cleanTopic} - Opening Hook`,
      introduction: introText,
      introVisualPrompt: introPrompt,
      introVisualSubject: `${cleanTopic} - Thematic Introduction`,
      sections,
      conclusion: conclusionText,
      conclusionVisualPrompt: conclPrompt,
      conclusionVisualSubject: `${cleanTopic} - Narrative Climax`,
      callToAction: ctaText,
      ctaVisualPrompt: ctaPrompt,
      ctaVisualSubject: `${cleanTopic} - Outro Call to Action`,
    };
  }

  // Count total spoken words across all script elements
  private countScriptWords(script: ScriptStructure): number {
    let count = (script.hook || '').split(/\s+/).filter(Boolean).length;
    count += (script.introduction || '').split(/\s+/).filter(Boolean).length;
    for (const sec of script.sections || []) {
      for (const sub of sec.subsections || []) {
        count += (sub.narration || '').split(/\s+/).filter(Boolean).length;
      }
    }
    count += (script.conclusion || '').split(/\s+/).filter(Boolean).length;
    count += (script.callToAction || '').split(/\s+/).filter(Boolean).length;
    return count;
  }

  // Script Length Validator & Auto-Enricher: ensures script reaches required word count
  private enrichScriptToTargetWordCount(
    script: ScriptStructure,
    topic: string,
    niche: string,
    targetWordCount: number,
    visualStyle: string
  ): void {
    let currentWords = this.countScriptWords(script);
    if (currentWords >= targetWordCount * 0.85) return;

    console.log(`[AiProvider] Script word count (${currentWords}) is below target (${targetWordCount}). Auto-enriching narrative depth...`);

    const cleanTopic = topic.trim();
    const additions = [
      `Delving deeper into this phenomenon reveals a critical dimension that scientific models frequently emphasize. When analyzing the cascading secondary effects of ${cleanTopic}, researchers note that the interactions between structural resistance and kinetic energy produce nonlinear feedback loops. This means that initial disruptions do not simply resolve—they compound over time, amplifying both thermal and gravitational stresses.`,
      `To fully understand the global implications of this scenario, we have to examine the historical and theoretical parallels documented across modern computational simulations. Every data point confirms that the threshold between systemic stability and sudden collapse is astonishingly narrow, requiring us to re-evaluate our fundamental assumptions about ${cleanTopic}.`,
      `Furthermore, empirical observations demonstrate that environmental adaptation under such extreme conditions follows very specific physical laws. As the primary forces reshape the landscape, secondary ecosystems and atmospheric layers begin to reorganize into unfamiliar patterns, proving that nature's capacity for recalibration is both terrifying and resilient.`,
      `The strategic takeaway from this analysis goes far beyond theoretical curiosity. By studying what happens when the core mechanisms of ${cleanTopic} are pushed to their absolute limits, scientists gain invaluable insights into how fragile our everyday reality truly is, and what it takes to preserve long-term systemic balance.`,
    ];

    let addIdx = 0;
    while (currentWords < targetWordCount * 0.88 && addIdx < additions.length * 3) {
      for (const sec of script.sections) {
        if (currentWords >= targetWordCount * 0.88) break;
        const textToAdd = additions[addIdx % additions.length];
        if (sec.subsections.length > 0) {
          const targetSub = sec.subsections[addIdx % sec.subsections.length];
          targetSub.narration += `\n\n${textToAdd}`;
          currentWords = this.countScriptWords(script);
        }
        addIdx++;
      }
    }

    console.log(`[AiProvider] Script enriched successfully to ${currentWords} words (Target: ${targetWordCount}).`);
  }

  private buildMasterPrompt(params: {
    channelName: string;
    niche: string;
    language: string;
    topic: string;
    targetLengthMinutes: number;
    visualStyle?: string;
    introStyle?: string;
    outroCta?: string;
    contentRules?: string;
  }): string {
    const targetWordCount = Math.round(params.targetLengthMinutes * 138);
    const isLongForm = params.targetLengthMinutes >= 2;
    const minSections = isLongForm ? Math.min(12, Math.max(6, Math.round(params.targetLengthMinutes))) : 3;

    const isHealthTopic = /health|wellness|longevity|disease|medical|medicine|diet|nutrition|supplement|aging|vitality|symptom|cancer|cardio|fitness|gut\b/i.test(
      `${params.topic} ${params.niche}`
    );

    const healthSafeguard = isHealthTopic
      ? `\nHEALTH CONTENT SAFEGUARD DIRECTIVE (STRICT REGULATORY & PLATFORM COMPLIANCE):
- The topic involves health, longevity, nutrition, or medical science.
- You MUST ensure all statements are strictly educational, informational, and grounded in reputable scientific consensus.
- NEVER provide individualized medical diagnosis, prescriptive treatment protocols, or claim miraculous cures for diseases.
- Frame advice around lifestyle, holistic habits, and balanced nutrition, with clear encouragement to consult licensed healthcare providers.`
      : '';

    const formatInstructions = isLongForm
      ? `TARGET DURATION: Exactly ${params.targetLengthMinutes} minutes.
Spoken narration across all sections MUST contain approximately ${targetWordCount} words total (calculated at standard documentary speech rate of 138 words per minute).
LONG-FORM STRUCTURE REQUIREMENTS (MANDATORY):
- Provide between ${minSections} and ${Math.min(14, minSections + 2)} distinct, deeply developed chapters/sections.
- Each chapter/section MUST contain 2 to 3 detailed subsections.
- Each subsection narration MUST be an in-depth, rich, spoken analysis containing between 80 and 130 words.
- NEVER produce a brief summary or skip sections. Each point must explore specific real-world mechanisms, physics, historical parallels, or psychological triggers.
- Ensure the cumulative narration across all sections reaches ~${targetWordCount} words.`
      : `TARGET DURATION: Shorts format (${Math.round(params.targetLengthMinutes * 60)} seconds).
Spoken narration MUST contain approximately ${targetWordCount} words total (~${targetWordCount} words, high tempo, instant visual hook, zero filler).`;

    return `You are a world-class documentary director and lead video writer for channel "${params.channelName}" (Niche: ${params.niche}, Language: ${params.language}, Visual Style: ${params.visualStyle || 'Cinematic'}).
Write a mesmerizing, high-retention video script for the exact topic: "${params.topic}".

${formatInstructions}
Adhere to channel tone: ${params.contentRules || 'Engaging, clear, professional delivery'}.
Intro Hook Style: ${params.introStyle || 'High-Impact Dramatic Question'}.
Outro CTA: ${params.outroCta || 'Subscribe and hit the bell'}.${healthSafeguard}

CRITICAL NARRATIVE CONTINUITY & SCENE COHESION RULES (MANDATORY FOR COMMERCIAL SAAS):
1. SEAMLESS STORYTELLING: The script MUST flow as a single continuous story without disjointed cuts.
   - Scene 1 (Hook): Grips the audience with high tension, mystery, or a provocative question directly about "${params.topic}".
   - Scene 2 (Intro): Bridges from the hook into the core thesis ("Here is the astonishing truth...").
   - Middle Scenes: Every subsection MUST begin with a natural narrative bridge connecting from the previous point (e.g., "To see this in action...", "Now look closer at...", "This breakthrough changes everything...").
   - Conclusion & CTA: Resolves the journey with inspiring perspective and a compelling subscriber call to action.
2. VISUAL CONTINUITY:
   - Every "visualPrompt" MUST explicitly depict the subject matter of "${params.topic}" (NEVER use generic office or laptop stock descriptions unless the topic is specifically about office work).
   - All visualPrompts MUST share the same aesthetic DNA: "${params.visualStyle || 'Cinematic High-Contrast'}, 35mm anamorphic, volumetric cinematic lighting, 8k resolution, photorealistic".
   - "continuityNotes" must specify camera and color continuity from the preceding shot.

You must return valid JSON strictly conforming to this schema:
{
  "title": "${params.topic}",
  "productionBible": {
    "topic": "${params.topic}",
    "niche": "${params.niche}",
    "visualStyle": "${params.visualStyle || 'Cinematic'}",
    "protagonistOrAnchor": "Detailed description of consistent visual subject or protagonist (e.g. 'Focused software engineer in a dark minimalist hoodie')",
    "primarySetting": "Detailed recurring primary location/setting (e.g. 'Modern AI engineering laboratory with dual 4K monitors and ambient cyan lighting')",
    "lightingAndMood": "Volumetric atmospheric rim lighting with shallow depth of field",
    "colorGrade": "Consistent 35mm film color palette",
    "continuityNotes": "Consistent character and location maintained across all scenes"
  },
  "hook": "High-impact opening hook (~30-50 words)",
  "hookVisualPrompt": "Concrete physical opening scene showing protagonistOrAnchor in primarySetting, 35mm film still, 8k photorealistic",
  "hookVisualSubject": "Main subject in motion",
  "introduction": "Compelling narrative bridge into the story (~40-60 words)",
  "introVisualPrompt": "Concrete physical establishing scene in primarySetting, 35mm film still, 8k photorealistic",
  "introVisualSubject": "Main subject in motion",
  "sections": [
    {
      "heading": "Act / Chapter Title",
      "subsections": [
        {
          "subheading": "Scene Specific Title",
          "narration": "Deep narrative spoken text with transitional bridge (~80-120 words)...",
          "visualPrompt": "Concrete physical scene directly illustrating THIS narration, keeping protagonistOrAnchor in primarySetting, 35mm film still, 8k photorealistic",
          "visualSubject": "Main subject in motion",
          "environment": "Consistent primarySetting",
          "cameraMovement": "Slow cinematic forward dolly / tracking glide",
          "lighting": "Atmospheric dramatic lighting matching the mood",
          "colorStyle": "${params.visualStyle || 'Cinematic'} color palette",
          "continuityNotes": "Matches character and location from preceding scene",
          "durationSec": 30
        }
      ]
    }
  ],
  "conclusion": "Resonant philosophical or practical summary (~40-60 words)",
  "conclusionVisualPrompt": "Concrete physical climax / resolution scene in primarySetting, 35mm film still, 8k photorealistic",
  "conclusionVisualSubject": "Main subject in motion",
  "callToAction": "Natural subscriber call to action for ${params.channelName} (~30-50 words)",
  "ctaVisualPrompt": "Clean cinematic outro scene in primarySetting",
  "ctaVisualSubject": "Main subject in motion"
}`;
  }

  private async generateScriptWithOpenRouter(
    params: {
      channelName: string;
      niche: string;
      language: string;
      topic: string;
      targetLengthMinutes: number;
      visualStyle?: string;
      introStyle?: string;
      outroCta?: string;
      contentRules?: string;
    },
    apiKey: string
  ): Promise<{ script: ScriptStructure; fullNarration: string }> {
    const prompt = this.buildMasterPrompt(params);
    let formattedKey = apiKey.trim();
    if (!formattedKey.startsWith('sk-or-v1-') && formattedKey.length === 64) {
      formattedKey = `sk-or-v1-${formattedKey}`;
    }
    const model = process.env.OPENROUTER_MODEL || 'deepseek/deepseek-chat';

    const res = await fetch('https://openrouter.ai/api/v1/chat/completions', {
      method: 'POST',
      signal: AbortSignal.timeout(120000),
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${formattedKey}`,
        'HTTP-Referer': 'https://youtube-automation-three-neon.vercel.app/',
        'X-Title': 'YouTube Automation SaaS',
      },
      body: JSON.stringify({
        model,
        messages: [
          { role: 'system', content: 'You are an award-winning documentary director and video scriptwriter. You strictly output valid JSON matching the requested schema without markdown wrapping.' },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
        max_tokens: 8000,
        temperature: 0.7,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`OpenRouter API error (${res.status}): ${errText.substring(0, 200)}`);
    }

    const data = await res.json();
    const rawContent = data?.choices?.[0]?.message?.content;
    if (!rawContent) {
      throw new Error('OpenRouter returned empty response');
    }

    let parsed: ScriptStructure;
    try {
      let cleaned = rawContent.trim();
      if (cleaned.startsWith('```json')) {
        cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
      } else if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
      }
      parsed = JSON.parse(cleaned);
    } catch (e: any) {
      throw new Error(`Failed to parse OpenRouter JSON output: ${e.message}`);
    }

    const narrationParts: string[] = [parsed.hook, parsed.introduction];
    for (const sec of parsed.sections) {
      for (const sub of sec.subsections) {
        narrationParts.push(sub.narration);
      }
    }
    narrationParts.push(parsed.conclusion);
    narrationParts.push(parsed.callToAction);

    const fullNarration = narrationParts.join('\n\n');
    return { script: parsed, fullNarration };
  }

  private async generateScriptWithGemini(
    params: {
      channelName: string;
      niche: string;
      language: string;
      topic: string;
      targetLengthMinutes: number;
      visualStyle?: string;
      introStyle?: string;
      outroCta?: string;
      contentRules?: string;
    },
    apiKey: string
  ): Promise<{ script: ScriptStructure; fullNarration: string }> {
    const prompt = this.buildMasterPrompt(params);

    const geminiModels = ['gemini-2.0-flash', 'gemini-1.5-flash', 'gemini-flash-latest'];
    let res: Response | null = null;
    let lastError = '';

    for (const model of geminiModels) {
      try {
        res = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`, {
          method: 'POST',
          signal: AbortSignal.timeout(15000),
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            contents: [
              {
                parts: [{ text: prompt }],
              },
            ],
            generationConfig: {
              responseMimeType: 'application/json',
              temperature: 0.7,
              maxOutputTokens: 8192,
            },
          }),
        });

        if (res.ok) break;
        lastError = await res.text();
      } catch (err: any) {
        lastError = err.message;
      }
    }

    if (!res || !res.ok) {
      throw new Error(`Gemini API error: ${lastError.substring(0, 200)}`);
    }

    const data = await res.json();
    const rawContent = data?.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!rawContent) {
      throw new Error('Gemini returned empty response');
    }

    let cleaned = rawContent.trim();
    if (cleaned.startsWith('```json')) {
      cleaned = cleaned.replace(/^```json\s*/, '').replace(/\s*```$/, '');
    } else if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```\s*/, '').replace(/\s*```$/, '');
    }

    const parsed: ScriptStructure = JSON.parse(cleaned);

    const narrationParts: string[] = [parsed.hook, parsed.introduction];
    for (const sec of parsed.sections) {
      for (const sub of sec.subsections) {
        narrationParts.push(sub.narration);
      }
    }
    narrationParts.push(parsed.conclusion);
    narrationParts.push(parsed.callToAction);

    const fullNarration = narrationParts.join('\n\n');
    return { script: parsed, fullNarration };
  }

  private async generateScriptWithOpenAI(
    params: {
      channelName: string;
      niche: string;
      language: string;
      topic: string;
      targetLengthMinutes: number;
      visualStyle?: string;
      introStyle?: string;
      outroCta?: string;
      contentRules?: string;
    },
    apiKey: string
  ): Promise<{ script: ScriptStructure; fullNarration: string }> {
    const prompt = this.buildMasterPrompt(params);

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'gpt-4o-mini',
        messages: [
          { role: 'system', content: 'You are an award-winning documentary director and video scriptwriter. You strictly output valid JSON.' },
          { role: 'user', content: prompt },
        ],
        response_format: { type: 'json_object' },
        temperature: 0.7,
      }),
    });

    if (!res.ok) {
      const errText = await res.text();
      throw new Error(`OpenAI API error (${res.status}): ${errText}`);
    }

    const data = await res.json();
    const rawContent = data?.choices?.[0]?.message?.content;
    if (!rawContent) {
      throw new Error('OpenAI returned empty response');
    }

    const parsed: ScriptStructure = JSON.parse(rawContent);

    const narrationParts: string[] = [parsed.hook, parsed.introduction];
    for (const sec of parsed.sections) {
      for (const sub of sec.subsections) {
        narrationParts.push(sub.narration);
      }
    }
    narrationParts.push(parsed.conclusion);
    narrationParts.push(parsed.callToAction);

    const fullNarration = narrationParts.join('\n\n');
    return { script: parsed, fullNarration };
  }
}

export const aiProvider: AiProvider = new DefaultAiProvider();
