/**
 * Global Visual Style System for AUTORA SaaS
 * Provides project-wide visual style configuration ensuring visual cohesion,
 * lighting consistency, color grading harmony, and 9:16 vertical composition across all scenes.
 */

export interface GlobalVisualStyleDna {
  renderStyle: string;
  lighting: string;
  colorPalette: string;
  cameraSpecs: string;
  motionStyle: string;
  negativePrompt: string;
}

export interface GlobalVisualStyle {
  id: string;
  name: string;
  description: string;
  dna: GlobalVisualStyleDna;
  promptSuffix: string;
}

export const VISUAL_STYLE_PRESETS: Record<string, GlobalVisualStyle> = {
  'cinematic-documentary': {
    id: 'cinematic-documentary',
    name: 'Cinematic Documentary',
    description: 'Realistic, high contrast, natural colors, consistent atmospheric lighting, 35mm depth',
    dna: {
      renderStyle: 'cinematic, realistic, documentary-style, authentic human and environmental textures, 8k realism',
      lighting: 'consistent directional key lighting, natural ambient fill, subtle volumetric shadows, natural contrast',
      colorPalette: 'natural colors, balanced warm and cool tones, high dynamic range, consistent Kodak color grade',
      cameraSpecs: '35mm anamorphic lens, shallow depth of field, centered 9:16 vertical mobile composition, crisp focus',
      motionStyle: 'smooth fluid linear motion, steady dolly push-in or subtle horizontal tracking, no erratic jitter',
      negativePrompt: 'cartoon, 3d render, anime, over-saturated, cartoonish, distorted anatomy, warped faces, visual artifacts, text, watermark, blurry, 16:9 letterbox',
    },
    promptSuffix: 'cinematic, realistic, documentary-style, high contrast, natural colors, consistent lighting, 35mm lens, 9:16 vertical',
  },
  'hyper-realistic-studio': {
    id: 'hyper-realistic-studio',
    name: 'Hyper-Realistic Studio',
    description: 'Ultra-crisp 8k photorealistic studio aesthetics, razor sharp textures, clean commercial lighting',
    dna: {
      renderStyle: 'hyper-realistic photorealistic studio render, microscopic detail, true-to-life physical materials',
      lighting: 'three-point softbox studio lighting, diffused rim highlights, neutral calibrated white balance',
      colorPalette: 'vibrant accurate colors, pure deep blacks, high fidelity neutral skin tones',
      cameraSpecs: '50mm prime studio lens, sharp center, vertical 9:16 framing, minimal optical distortion',
      motionStyle: 'precise mechanical camera glides, slow deliberate pans, cinematic micro-movements',
      negativePrompt: 'grainy, low quality, oversaturated, unnatural glow, artifacts, deformed objects, blurry',
    },
    promptSuffix: 'hyper-realistic, 8k resolution, photorealistic studio lighting, crisp textures, natural skin tones, 9:16',
  },
  'moody-dark-cinematic': {
    id: 'moody-dark-cinematic',
    name: 'Moody Dark Cinematic',
    description: 'Dramatic chiaroscuro lighting, deep shadows, brooding atmospheric tension, cinematic depth',
    dna: {
      renderStyle: 'moody neo-cinematic realism, film noir influences, deep atmospheric texture',
      lighting: 'dramatic low-key lighting, harsh directional rim light, deep shadows, subtle atmospheric haze',
      colorPalette: 'desaturated muted tones, cold blue and warm amber accent contrast, deep blacks',
      cameraSpecs: 'anamorphic widescreen format adapted to 9:16 vertical, pronounced depth separation',
      motionStyle: 'slow ominous forward push-ins, steady cinematic drifts, smooth rotational framing',
      negativePrompt: 'bright pastel colors, flat lighting, sunny day, cartoonish, low contrast, washed out',
    },
    promptSuffix: 'moody cinematic, dramatic rim lighting, deep shadows, desaturated tones, 35mm anamorphic depth, 9:16',
  },
  'clean-modern-commercial': {
    id: 'clean-modern-commercial',
    name: 'Clean Modern Commercial',
    description: 'Bright airy modern aesthetic, vibrant natural colors, aspirational minimalist style',
    dna: {
      renderStyle: 'clean premium commercial aesthetic, architectural minimalism, pristine visual clarity',
      lighting: 'bright diffused natural daylight, soft airy ambient bounce, high key clarity',
      colorPalette: 'fresh natural colors, clean whites, vibrant punchy accent tones, balanced contrast',
      cameraSpecs: 'wide angle prime lens, edge-to-edge sharpness, vertical 9:16 commercial safe-zone',
      motionStyle: 'dynamic fluid camera sweeps, seamless upward tilts, rapid clean transitions',
      negativePrompt: 'dark gloom, grainy, muted, vintage yellow tint, noisy, dirty, low quality',
    },
    promptSuffix: 'clean modern commercial, bright airy natural light, vibrant accurate colors, minimalist composition, 9:16',
  },
  'vintage-film-archive': {
    id: 'vintage-film-archive',
    name: 'Vintage Archival 35mm',
    description: 'Authentic 35mm film grain, nostalgic Kodak Portra palette, tactile organic realism',
    dna: {
      renderStyle: 'authentic 35mm celluloid film stock, subtle organic halation, natural tactile film grain',
      lighting: 'natural unmanipulated sunlight, golden hour warmth, soft natural falloff',
      colorPalette: 'Kodak Portra warm skin tones, faded greens and rich blues, nostalgic analogue warmth',
      cameraSpecs: 'vintage 35mm spherical prime lens, gentle vignette, vertical mobile composition',
      motionStyle: 'organic handheld stability, gentle breathing motion, natural human camera operation',
      negativePrompt: 'digital sterile look, plastic textures, artificial glow, 3d render, CGI, over-sharpened',
    },
    promptSuffix: '35mm film stock, organic grain, warm nostalgic tones, natural daylight, documentary realism, 9:16',
  },
};

/**
 * Resolves a visual style string or preset ID into a normalized GlobalVisualStyle
 */
export function resolveGlobalVisualStyle(styleNameOrId?: string): GlobalVisualStyle {
  if (!styleNameOrId) {
    return VISUAL_STYLE_PRESETS['cinematic-documentary'];
  }

  const normalized = styleNameOrId.trim().toLowerCase().replace(/[\s_]+/g, '-');

  // Exact ID match
  if (VISUAL_STYLE_PRESETS[normalized]) {
    return VISUAL_STYLE_PRESETS[normalized];
  }

  // Name or partial match
  for (const preset of Object.values(VISUAL_STYLE_PRESETS)) {
    if (
      preset.name.toLowerCase().includes(normalized) ||
      normalized.includes(preset.id) ||
      styleNameOrId.toLowerCase().includes(preset.name.toLowerCase())
    ) {
      return preset;
    }
  }

  // Custom visual style specified by user: construct a customized GlobalVisualStyle
  return {
    id: 'custom-style',
    name: styleNameOrId,
    description: `Custom visual style: ${styleNameOrId}`,
    dna: {
      renderStyle: `${styleNameOrId}, cinematic, realistic, documentary-style, high visual fidelity`,
      lighting: 'consistent directional lighting with natural contrast and balanced ambient fill',
      colorPalette: 'natural colors with high contrast and cohesive color grading',
      cameraSpecs: '35mm anamorphic lens, centered 9:16 vertical composition, sharp subject isolation',
      motionStyle: 'smooth fluid camera movement with no jitter or unnatural warping',
      negativePrompt: 'cartoon, 3d render, anime, distorted anatomy, warped faces, visual artifacts, text, watermark, blurry, 16:9 letterbox',
    },
    promptSuffix: `${styleNameOrId}, cinematic, realistic, documentary-style, high contrast, natural colors, consistent lighting, 9:16 vertical`,
  };
}

/**
 * Injects project-wide Global Visual Style DNA into a scene visual prompt.
 * Ensures consistent rendering, lighting, color grading, and 9:16 vertical framing.
 */
export function applyGlobalStyleToPrompt(
  basePrompt: string,
  style: GlobalVisualStyle,
  context?: {
    isHook?: boolean;
    niche?: string;
    environment?: string;
    cameraMovement?: string;
  }
): string {
  const parts: string[] = [];

  // 1. Hook enhancement for scene 1 opening seconds
  if (context?.isHook) {
    parts.push('High-impact cinematic visual hook, immediate visual engagement, intense dynamic composition');
  }

  // 2. Base scene prompt
  parts.push(basePrompt.trim());

  // 3. Environmental and camera context if present
  if (context?.environment && !basePrompt.toLowerCase().includes(context.environment.toLowerCase())) {
    parts.push(`environment: ${context.environment}`);
  }
  if (context?.cameraMovement && !basePrompt.toLowerCase().includes(context.cameraMovement.toLowerCase())) {
    parts.push(`camera: ${context.cameraMovement}`);
  }

  // 4. Global Style DNA injection (lighting, color palette, render style)
  parts.push(`lighting: ${style.dna.lighting}`);
  parts.push(`color grade: ${style.dna.colorPalette}`);
  parts.push(`visual style: ${style.dna.renderStyle}`);
  parts.push(style.dna.cameraSpecs);

  return parts.filter(Boolean).join(', ');
}
