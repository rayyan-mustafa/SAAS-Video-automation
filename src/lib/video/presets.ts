import { TrendingPreset, AspectRatio, CharacterReference } from '../providers/video-provider.types';

export interface PresetDefinition {
  id: TrendingPreset;
  label: string;
  tagline: string;
  category: 'Character' | 'Entertainment' | 'Cinematic' | 'Lifestyle' | 'Narrative';
  defaultAspectRatio: AspectRatio;
  defaultDurationSec: number;
  cameraMovement: string;
  lighting: string;
  colorGrade: string;
  negativePrompt: string;
  promptEnhancer: (rawPrompt: string, character?: CharacterReference) => string;
}

export const TRENDING_PRESETS: Record<TrendingPreset, PresetDefinition> = {
  REALISTIC_HUMAN: {
    id: 'REALISTIC_HUMAN',
    label: 'Realistic Presenter',
    tagline: 'High-fidelity human characters delivering engaging presentations',
    category: 'Character',
    defaultAspectRatio: '9:16',
    defaultDurationSec: 5,
    cameraMovement: 'Subtle handheld breathing motion, steady eyeline focus, gentle push-in',
    lighting: 'Three-point studio softbox lighting, warm rim light, natural catchlights in eyes',
    colorGrade: 'Neutral cinematic tone, true-to-life skin tones, subtle Kodak film warmth',
    negativePrompt: 'plastic skin, uncanny valley, morphing fingers, extra limbs, distorted face, static eyes, frozen expression, cartoon, anime',
    promptEnhancer: (rawPrompt, char) => {
      const charDesc = char?.description || 'A charismatic presenter with expressive eyes and natural micro-expressions';
      return `Realistic talking presenter video: ${charDesc}. ${rawPrompt}. Natural mouth articulation, lifelike blinks, subtle head tilt, breathing motion, high skin texture detail, 35mm portrait lens, photorealistic 8k video frame.`;
    },
  },

  TALKING_FOOD: {
    id: 'TALKING_FOOD',
    label: 'Talking Food & Veggies',
    tagline: 'Hilarious anthropomorphic food characters with lively expressive faces',
    category: 'Entertainment',
    defaultAspectRatio: '9:16',
    defaultDurationSec: 5,
    cameraMovement: 'Dynamic low-angle tracking shot, comedic zoom-in on facial reaction',
    lighting: 'Bright playful kitchen lighting, soft rim light, sparkling specular highlights',
    colorGrade: 'Vibrant saturated colors, warm appetizing tones, crisp edge contrast',
    negativePrompt: 'creepy horror face, realistic human skin on food, grotesque mouth, dull dark lighting, flat illustration, 2D vector',
    promptEnhancer: (rawPrompt) => {
      return `Animated 3D anthropomorphic talking food character: ${rawPrompt}. Pixar-style expressive cartoon eyes, comedic animated mouth delivering dialogue, lively body gestures, bounce and squash physics, hyper-detailed food texture (seeds, skin, moisture), bright modern kitchen environment, joyful viral comedy animation.`;
    },
  },

  VIRAL_COMEDY: {
    id: 'VIRAL_COMEDY',
    label: 'Viral Comedy & Memes',
    tagline: 'Fast-paced, humorous scenarios crafted for short-form retention',
    category: 'Entertainment',
    defaultAspectRatio: '9:16',
    defaultDurationSec: 5,
    cameraMovement: 'Snap zoom on punchline, handheld vlogger wobble, comedic rapid pan',
    lighting: 'Everyday natural lighting, crisp daylight, relatable home or office vibe',
    colorGrade: 'Punchy social media color grade, clean vibrant balance',
    negativePrompt: 'slow boring static shot, dark moody gloom, blurred action, washed out',
    promptEnhancer: (rawPrompt) => {
      return `Viral comedy short scene: ${rawPrompt}. Exaggerated hilarious facial expressions, relatable everyday comedy, fast-paced comedic timing, natural dynamic body language, relatable realistic setting, crisp social media video aesthetic.`;
    },
  },

  CINEMATIC_DOC: {
    id: 'CINEMATIC_DOC',
    label: 'Cinematic Documentary',
    tagline: 'BBC / Netflix-style atmospheric historical & scientific deep-dives',
    category: 'Cinematic',
    defaultAspectRatio: '16:9',
    defaultDurationSec: 6,
    cameraMovement: 'Slow majestic drone flyover, slow-motion linear slider glide, grand scale dolly',
    lighting: 'Golden hour volumetric sunrays, atmospheric haze, deep moody shadows',
    colorGrade: 'Bleach bypass cinematic film emulation, deep contrast, anamorphic blue flare',
    negativePrompt: 'cheap CGI, amateur phone video, harsh neon flash, distorted proportions, jittery camera',
    promptEnhancer: (rawPrompt) => {
      return `Epic cinematic documentary sequence: ${rawPrompt}. National Geographic / BBC Earth caliber, photorealistic physics, volumetric atmospheric dust motes, anamorphic widescreen 2.39:1 framing, rich texture depth, masterful archival cinematic grandeur.`;
    },
  },

  AI_ANIMALS: {
    id: 'AI_ANIMALS',
    label: 'AI Animal Stories',
    tagline: 'Emotional wildlife narratives and charming animal hero adventures',
    category: 'Narrative',
    defaultAspectRatio: '9:16',
    defaultDurationSec: 5,
    cameraMovement: 'Low ground-level tracking shot matching animal eye height, smooth glide',
    lighting: 'Dappled forest canopy light, soft rim lighting accentuating fur/feathers',
    colorGrade: 'Lush organic greens, rich earth tones, sparkling eye highlights',
    negativePrompt: 'taxidermy, stiff animatronic, distorted paws, unnatural anatomy, static fur',
    promptEnhancer: (rawPrompt) => {
      return `Photorealistic cinematic animal scene: ${rawPrompt}. Hyper-detailed fur and whisker dynamics reacting to wind, expressive emotional animal eyes, natural biological gait and head movements, immersive natural habitat, IMAX wildlife cinematography.`;
    },
  },

  REALISTIC_COOKING: {
    id: 'REALISTIC_COOKING',
    label: 'Satisfying Cooking ASMR',
    tagline: 'Mouth-watering culinary creations with sizzling motion and tactile detail',
    category: 'Lifestyle',
    defaultAspectRatio: '9:16',
    defaultDurationSec: 5,
    cameraMovement: 'Macro close-up slow motion glide (60fps feel), steady overhead plunge',
    lighting: 'Warm appetizing backlight, glowing hot skillet, steam wisps catching light',
    colorGrade: 'Warm golden culinary palette, rich caramel browns, crisp herb greens',
    negativePrompt: 'burnt unappetizing food, messy blurred lens, dirty kitchen, artificial plastic food',
    promptEnhancer: (rawPrompt) => {
      return `Macro culinary cooking motion: ${rawPrompt}. Realistic sizzling liquid dynamics, rising gentle steam, knife cutting crisply through fresh ingredients, glistening oil drizzle, tactile textures, gourmet kitchen aesthetic, satisfying food commercial cinematography.`;
    },
  },

  MOTIVATIONAL: {
    id: 'MOTIVATIONAL',
    label: 'Motivational Storytelling',
    tagline: 'Inspiring visual metaphors, athlete discipline, and triumph journeys',
    category: 'Narrative',
    defaultAspectRatio: '9:16',
    defaultDurationSec: 5,
    cameraMovement: 'Hero low-angle tilt-up, tracking runner forward dolly, majestic crane rise',
    lighting: 'Dawn sunrise backlight, dramatic silhouette against city skyline, lens flare',
    colorGrade: 'High-contrast steel blue and golden sunrise, gritty cinematic grain',
    negativePrompt: 'lazy static shot, depressed gloom, blurry faces, cartoonish effects',
    promptEnhancer: (rawPrompt) => {
      return `Powerful motivational cinematic scene: ${rawPrompt}. Intense focus and determination, sweat beads catching morning light, dynamic powerful human motion, grand inspiring backdrop, stirring Nike-commercial-style visual storytelling.`;
    },
  },

  FACELESS_EXPLAINER: {
    id: 'FACELESS_EXPLAINER',
    label: 'Faceless Explainer',
    tagline: 'Sleek motion graphics, futuristic holograms, and abstract visual metaphors',
    category: 'Cinematic',
    defaultAspectRatio: '16:9',
    defaultDurationSec: 6,
    cameraMovement: 'Smooth isometric camera orbital drift, clean digital push-in',
    lighting: 'Sleek neon edge lighting, glowing holographic data streams, obsidian dark backdrop',
    colorGrade: 'Cyberpunk dark mode: deep navy, cyan, magenta, clean monochromatic balance',
    negativePrompt: 'low-resolution pixel art, messy typography, cluttered background, amateur 2D clipart',
    promptEnhancer: (rawPrompt) => {
      return `Premium faceless explainer visual: ${rawPrompt}. 3D glowing glassmorphism objects, elegant particle dynamics, floating futuristic HUD elements, ultra-clean studio lighting, Apple keynotes meet Vox documentary visual aesthetics.`;
    },
  },

  PRODUCT_STORY: {
    id: 'PRODUCT_STORY',
    label: 'Product Showcase',
    tagline: 'Sleek commercial-grade product reveals and hero turntable motion',
    category: 'Lifestyle',
    defaultAspectRatio: '9:16',
    defaultDurationSec: 5,
    cameraMovement: 'Precision robotic camera orbit, vertical pedestal reveal, macro focus pull',
    lighting: 'High-end commercial softbox gradient, specular glass reflections, edge bounce',
    colorGrade: 'Minimalist luxury aesthetic, calibrated color accuracy, clean studio purity',
    negativePrompt: 'fingerprints, scratches, dusty product, distorted logo, shaky handheld camera',
    promptEnhancer: (rawPrompt) => {
      return `Luxury commercial product showcase: ${rawPrompt}. Seamless 360-degree floating rotation, studio reflection sweep, flawless metallic and matte material finishes, high-end Apple/Tesla commercial aesthetic, 8k commercial cinematography.`;
    },
  },

  HORROR_MYSTERY: {
    id: 'HORROR_MYSTERY',
    label: 'Horror & Mystery',
    tagline: 'Chilling suspense, atmospheric dread, and eerie cinematic shadows',
    category: 'Narrative',
    defaultAspectRatio: '9:16',
    defaultDurationSec: 5,
    cameraMovement: 'Creeping hallway push-in, trembling subjective POV, slow ominous pan',
    lighting: 'Flickering dim tungsten lamp, deep impenetrable shadows, cold moonlight through mist',
    colorGrade: 'Desaturated cold teal and sickly yellow, film grain, deep vignetted corners',
    negativePrompt: 'bright happy daylight, cheerful colors, goofy comedy, cheap jumpscare filter',
    promptEnhancer: (rawPrompt) => {
      return `Atmospheric cinematic horror suspense: ${rawPrompt}. Eerie subtle environmental motion (swaying shadows, drifting cold fog), psychological tension, A24 style atmospheric dread, hyper-detailed decayed textures, cinematic 35mm film grain.`;
    },
  },
};

/**
 * Builds an enhanced prompt incorporating preset styling and character continuity.
 */
export function buildEnhancedVideoPrompt(params: {
  rawPrompt: string;
  preset?: TrendingPreset;
  characterRef?: CharacterReference;
  aspectRatio?: AspectRatio;
  cameraMovement?: string;
  lighting?: string;
  colorStyle?: string;
  continuityNotes?: string;
}): { prompt: string; negativePrompt: string } {
  const {
    rawPrompt,
    preset = 'CINEMATIC_DOC',
    characterRef,
    aspectRatio = '9:16',
    cameraMovement,
    lighting,
    colorStyle,
    continuityNotes,
  } = params;

  const presetDef = TRENDING_PRESETS[preset] || TRENDING_PRESETS.CINEMATIC_DOC;
  const baseEnhanced = presetDef.promptEnhancer(rawPrompt, characterRef);

  const parts = [baseEnhanced];

  if (characterRef) {
    parts.push(`Character Anchor: Maintain identical visual appearance for "${characterRef.name}" (${characterRef.description}) across all frames.`);
  }

  if (cameraMovement) {
    parts.push(`Camera: ${cameraMovement}`);
  } else {
    parts.push(`Camera: ${presetDef.cameraMovement}`);
  }

  if (lighting) {
    parts.push(`Lighting: ${lighting}`);
  } else {
    parts.push(`Lighting: ${presetDef.lighting}`);
  }

  if (colorStyle) {
    parts.push(`Color: ${colorStyle}`);
  } else {
    parts.push(`Color: ${presetDef.colorGrade}`);
  }

  if (continuityNotes) {
    parts.push(`Continuity: ${continuityNotes}`);
  }

  const framing = aspectRatio === '9:16'
    ? 'Composition: Vertical 9:16 portrait video format, subject centered for mobile viewing'
    : 'Composition: Widescreen 16:9 landscape format, cinematic 4K YouTube composition';
  parts.push(framing);

  return {
    prompt: parts.filter(Boolean).join('. '),
    negativePrompt: presetDef.negativePrompt,
  };
}
