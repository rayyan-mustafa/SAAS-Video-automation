/**
 * QC v2 Golden Set (WP4)
 * 20 Curated Benchmark Test Cases:
 * - 10 High-Quality Production Clips (Verified Passes)
 * - 10 Flawed Clips with Anomaly Injections (Verified Fails)
 *
 * Used for technical classification audits to ensure >=90% accuracy.
 */

import { GlobalVisualStyle, VISUAL_STYLE_PRESETS } from './visualStyles';
import { ValidateSceneClipParams } from './qualityControl';

export interface GoldenSetTestCase {
  id: string;
  name: string;
  description: string;
  expectedPassed: boolean;
  expectedFailureReason?: string;
  params: {
    scene: ValidateSceneClipParams['scene'];
    globalStyle: GlobalVisualStyle;
    previousScene?: ValidateSceneClipParams['previousScene'];
  };
  // Generator specification for synthetic technical media probe testing
  mediaType:
    | 'valid_1080x1920'
    | 'valid_cinematic'
    | 'valid_stat_card'
    | 'valid_macro'
    | 'black_screen'
    | 'frozen_frames'
    | 'wrong_aspect_horizontal'
    | 'corrupt_file'
    | 'duration_drift'
    | 'procedural_fallback';
}

const defaultCinematic = VISUAL_STYLE_PRESETS['cinematic-documentary'];

export const QC_GOLDEN_SET: GoldenSetTestCase[] = [
  // ==========================================
  // 10 PASSING CASES (HIGH QUALITY PRODUCTION)
  // ==========================================
  {
    id: 'golden-pass-01-photoreal-macro',
    name: 'Photorealistic Tech Macro',
    description: 'High-detail silicon microchip close-up with smooth forward glide and matching narration.',
    expectedPassed: true,
    mediaType: 'valid_macro',
    params: {
      scene: {
        scene_index: 2,
        narration: 'Inside the silicon die, microscopic transistors switch billions of times per second.',
        visual_prompt: 'Cinematic macro close-up of a microchip processor die, glowing gold circuitry traces, volumetric lighting, photorealistic 8k, smooth linear push-in, 9:16 vertical',
        visual_subject: 'Silicon microchip die',
        camera_movement: 'smooth push-in',
        estimated_duration_sec: 4.0,
      },
      globalStyle: defaultCinematic,
    },
  },
  {
    id: 'golden-pass-02-cinematic-portrait',
    name: 'Cinematic Engineer Portrait',
    description: 'Expert researcher in laboratory setting, authentic depth of field, documentary color grade.',
    expectedPassed: true,
    mediaType: 'valid_cinematic',
    params: {
      scene: {
        scene_index: 3,
        narration: 'Lead materials scientists spent four years testing solid ceramic electrolytes in cleanroom conditions.',
        visual_prompt: 'Documentary portrait of lead materials scientist in cleanroom suit inspecting battery cell, soft key lighting, shallow depth of field, 35mm lens, 9:16 vertical',
        visual_subject: 'Materials scientist',
        camera_movement: 'slow linear pan',
        estimated_duration_sec: 4.5,
      },
      globalStyle: defaultCinematic,
    },
  },
  {
    id: 'golden-pass-03-city-hyperlapse',
    name: 'Dynamic City Hyperlapse',
    description: 'Tokyo night traffic streak with natural smooth forward motion.',
    expectedPassed: true,
    mediaType: 'valid_1080x1920',
    params: {
      scene: {
        scene_index: 4,
        narration: 'Across major metropolitan transit grids, power consumption peaks every evening at seven.',
        visual_prompt: 'High-altitude urban hyperlapse of futuristic metropolitan traffic grid at twilight, light streaks, crisp architectural geometry, steady gimbal flight, 9:16 vertical',
        visual_subject: 'Metropolitan traffic grid',
        camera_movement: 'steady gimbal flight',
        estimated_duration_sec: 3.5,
      },
      globalStyle: defaultCinematic,
    },
  },
  {
    id: 'golden-pass-04-motion-still-zoompan',
    name: 'Motion Still Ken Burns',
    description: 'High resolution still image animated with smooth zoompan.',
    expectedPassed: true,
    mediaType: 'valid_1080x1920',
    params: {
      scene: {
        scene_index: 2,
        narration: 'Historical patent diagrams reveal that early researchers attempted liquid metal electrodes as far back as 1968.',
        visual_prompt: 'Historical engineering schematic blueprint of electrochemical storage cell, detailed technical annotations, sepia ink on drafting vellum, slow zoom-in, 9:16 vertical',
        visual_subject: 'Engineering blueprint',
        camera_movement: 'slow zoom-in',
        estimated_duration_sec: 5.0,
      },
      globalStyle: defaultCinematic,
    },
  },
  {
    id: 'golden-pass-05-graphic-stat-card',
    name: 'Glassmorphic Stat Callout',
    description: 'Dark-mode stat card with animated metric badge and headline.',
    expectedPassed: true,
    mediaType: 'valid_stat_card',
    params: {
      scene: {
        scene_index: 2,
        narration: 'Energy density skyrocketed over 400 percent while manufacturing expenses dropped sharply.',
        visual_prompt: 'Modern glassmorphic motion graphic card displaying energy density surge of 400 percent, clean typography, glowing emerald accents, 9:16 vertical',
        visual_subject: 'Energy density stat card',
        camera_movement: 'subtle drift',
        estimated_duration_sec: 4.0,
      },
      globalStyle: defaultCinematic,
    },
  },
  {
    id: 'golden-pass-06-high-contrast-neon',
    name: 'High-Contrast Cyberpunk Tech',
    description: 'Electric cyan and magenta aesthetic, sharp edges, pristine vertical composition.',
    expectedPassed: true,
    mediaType: 'valid_1080x1920',
    params: {
      scene: {
        scene_index: 3,
        narration: 'Automated server arrays handle millions of neural network inference queries in parallel.',
        visual_prompt: 'Hyper-detailed quantum server room, glowing fiber optic conduits, moody atmospheric haze, cinematic cyberpunk lighting, linear forward dolly, 9:16 vertical',
        visual_subject: 'Quantum server room',
        camera_movement: 'forward dolly',
        estimated_duration_sec: 4.2,
      },
      globalStyle: defaultCinematic,
    },
  },
  {
    id: 'golden-pass-07-documentary-nature',
    name: 'Aerial Documentary Landscape',
    description: 'Glacial canyon aerial with smooth orbital camera and realistic lighting.',
    expectedPassed: true,
    mediaType: 'valid_1080x1920',
    params: {
      scene: {
        scene_index: 5,
        narration: 'Vast lithium salt flats in northern Chile stretch toward the volcanic horizon.',
        visual_prompt: 'Sweeping aerial documentary drone shot of turquoise salt brine evaporation ponds in the Atacama desert, pristine natural sunlight, 9:16 vertical',
        visual_subject: 'Salt evaporation ponds',
        camera_movement: 'sweeping drone orbit',
        estimated_duration_sec: 4.5,
      },
      globalStyle: defaultCinematic,
    },
  },
  {
    id: 'golden-pass-08-laboratory-demo',
    name: 'Battery Lab Demonstration',
    description: 'Mechanical press assembling pouch cells in argon glovebox.',
    expectedPassed: true,
    mediaType: 'valid_1080x1920',
    params: {
      scene: {
        scene_index: 3,
        narration: 'Inside sealed argon gloveboxes, robotic arms stack ceramic layers with sub-millimeter precision.',
        visual_prompt: 'Robotic assembly mechanism placing thin ceramic separator film onto lithium foil anode inside argon glovebox, pristine sterile laboratory, 9:16 vertical',
        visual_subject: 'Robotic assembly mechanism',
        camera_movement: 'smooth pedestal down',
        estimated_duration_sec: 5.0,
      },
      globalStyle: defaultCinematic,
    },
  },
  {
    id: 'golden-pass-09-bold-retention-hook',
    name: 'Scene 1 High-Retention Visual Hook',
    description: 'Dramatic opening frame with intense contrast and retention hook keywords.',
    expectedPassed: true,
    mediaType: 'valid_1080x1920',
    params: {
      scene: {
        scene_index: 1,
        narration: 'Everything you have been told about electric car batteries is completely obsolete.',
        visual_prompt: 'Dramatic high-impact hook shot: glowing battery cell dramatically snapping open to reveal solid ceramic core, intense sparks, cinematic volumetric smoke, eye-catching opening, 9:16 vertical',
        visual_subject: 'Glowing battery cell',
        camera_movement: 'rapid push-in',
        estimated_duration_sec: 3.5,
      },
      globalStyle: defaultCinematic,
    },
  },
  {
    id: 'golden-pass-10-dark-mode-showcase',
    name: 'Minimalist Tech Showcase',
    description: 'Sleek anodized aluminum device revolving against dark gradient backdrop.',
    expectedPassed: true,
    mediaType: 'valid_1080x1920',
    params: {
      scene: {
        scene_index: 2,
        narration: 'The entire power management module fits into the palm of your hand.',
        visual_prompt: 'Anodized matte black power inverter module revolving slowly against deep dark graphite studio backdrop, rim lighting, razor sharp industrial design, 9:16 vertical',
        visual_subject: 'Power inverter module',
        camera_movement: 'slow orbit',
        estimated_duration_sec: 4.8,
      },
      globalStyle: defaultCinematic,
    },
  },

  // ==========================================
  // 10 FAILING CASES (ANOMALIES & DEFECTS)
  // ==========================================
  {
    id: 'golden-fail-01-corrupt-file',
    name: 'Corrupt / 0-Byte File',
    description: 'Clip file missing or 0 bytes on disk.',
    expectedPassed: false,
    expectedFailureReason: 'Clip file is missing or corrupted on disk.',
    mediaType: 'corrupt_file',
    params: {
      scene: {
        scene_index: 2,
        narration: 'The system failed during video rendering.',
        visual_prompt: 'Robotic arm assembling battery pack, 9:16 vertical',
        visual_subject: 'Robotic arm',
        estimated_duration_sec: 4.0,
      },
      globalStyle: defaultCinematic,
    },
  },
  {
    id: 'golden-fail-02-black-screen',
    name: 'Black Screen Anomaly',
    description: 'Clip renders solid black for >=0.5s (blackdetect filter trigger).',
    expectedPassed: false,
    expectedFailureReason: 'FAILED_BLACK_DETECT',
    mediaType: 'black_screen',
    params: {
      scene: {
        scene_index: 2,
        narration: 'A complete power outage plunges the entire laboratory into darkness.',
        visual_prompt: 'Laboratory plunged into darkness, pitch black room, 9:16 vertical',
        visual_subject: 'Laboratory',
        estimated_duration_sec: 4.0,
      },
      globalStyle: defaultCinematic,
    },
  },
  {
    id: 'golden-fail-03-frozen-frames',
    name: 'Frozen Static Video Anomaly',
    description: 'Video frame is completely static with 0 motion for >=1.0s (freezedetect trigger).',
    expectedPassed: false,
    expectedFailureReason: 'FAILED_FREEZE_DETECT',
    mediaType: 'frozen_frames',
    params: {
      scene: {
        scene_index: 3,
        narration: 'Engineers monitor the pressure sensors as the reading remains perfectly steady.',
        visual_prompt: 'Close-up of digital pressure gauge displaying constant reading, 9:16 vertical',
        visual_subject: 'Pressure gauge',
        estimated_duration_sec: 4.0,
      },
      globalStyle: defaultCinematic,
    },
  },
  {
    id: 'golden-fail-04-wrong-aspect-ratio',
    name: 'Wrong Aspect Ratio (Horizontal 16:9)',
    description: 'Clip produced in horizontal 1920x1080 instead of vertical 1080x1920.',
    expectedPassed: false,
    expectedFailureReason: 'Correct 9:16 framing',
    mediaType: 'wrong_aspect_horizontal',
    params: {
      scene: {
        scene_index: 2,
        narration: 'The panoramic view spans across the wide factory floor.',
        visual_prompt: 'Panoramic wide landscape shot of battery factory, horizontal 16:9',
        visual_subject: 'Battery factory',
        estimated_duration_sec: 4.0,
      },
      globalStyle: defaultCinematic,
    },
  },
  {
    id: 'golden-fail-05-duration-drift',
    name: 'Duration Mismatch Drift (>0.2s)',
    description: 'Rendered video duration is 6.5s when narration expected 3.5s.',
    expectedPassed: false,
    expectedFailureReason: 'DURATION_MISMATCH',
    mediaType: 'duration_drift',
    params: {
      scene: {
        scene_index: 2,
        narration: 'Rapid pulse test.',
        visual_prompt: 'Electrical pulse test on battery cell, 9:16 vertical',
        visual_subject: 'Pulse test',
        estimated_duration_sec: 2.0, // Expected 2.0s, media will be 6.5s
      },
      globalStyle: defaultCinematic,
    },
  },
  {
    id: 'golden-fail-06-procedural-fallback',
    name: 'Low-Entropy Procedural Grid',
    description: 'Fallback procedural grid texture with low visual entropy (<50KB frames).',
    expectedPassed: false,
    expectedFailureReason: 'PROCEDURAL_FALLBACK_DETECTED',
    mediaType: 'procedural_fallback',
    params: {
      scene: {
        scene_index: 2,
        narration: 'Complex nano-structures align along the crystal boundary.',
        visual_prompt: 'Nano-structures crystal boundary, 9:16 vertical',
        visual_subject: 'Nano-structures',
        estimated_duration_sec: 3.0,
      },
      globalStyle: defaultCinematic,
    },
  },
  {
    id: 'golden-fail-07-ai-distortion',
    name: 'Severe AI Distortion Keywords',
    description: 'Prompt contains distortion hallucination triggers.',
    expectedPassed: false,
    expectedFailureReason: 'No obvious AI artifacts or severe distortions',
    mediaType: 'valid_1080x1920',
    params: {
      scene: {
        scene_index: 2,
        narration: 'The experimental design created unusual visual artifacts.',
        visual_prompt: 'Distorted mutant robotic hand, warped blurry extra limbs, floating heads in liquid, glitched artifacts, 9:16 vertical',
        visual_subject: 'Distorted mutant hand',
        estimated_duration_sec: 3.0,
      },
      globalStyle: defaultCinematic,
    },
  },
  {
    id: 'golden-fail-08-off-topic-narration',
    name: 'Off-Topic Narration Mismatch',
    description: 'Narration talks about quantum physics, visual describes baking chocolate cake.',
    expectedPassed: false,
    expectedFailureReason: 'Visual matches narration',
    mediaType: 'valid_1080x1920',
    params: {
      scene: {
        scene_index: 2,
        narration: 'Quantum superposition allows subatomic particles to exist in multiple probabilistic wave states simultaneously.',
        visual_prompt: 'Delicious moist chocolate birthday cake with rainbow sprinkles and pink frosting on a kitchen counter, 9:16 vertical',
        visual_subject: 'Chocolate cake',
        estimated_duration_sec: 4.0,
      },
      globalStyle: defaultCinematic,
    },
  },
  {
    id: 'golden-fail-09-weak-scene1-hook',
    name: 'Weak Scene 1 Opening (No Hook)',
    description: 'Scene 1 opening lacks retention elements, hook keywords, or visual impact.',
    expectedPassed: false,
    expectedFailureReason: 'Strong visual hook in the opening seconds',
    mediaType: 'valid_1080x1920',
    params: {
      scene: {
        scene_index: 1, // Hook scene
        narration: 'Today we will look at some general notes on basic battery chemistry.',
        visual_prompt: 'Plain static wall in an empty office, neutral grey drywall, 9:16 vertical',
        visual_subject: 'Drywall',
        estimated_duration_sec: 4.0,
      },
      globalStyle: defaultCinematic,
    },
  },
  {
    id: 'golden-fail-10-duplicate-prompt',
    name: 'Duplicate Scene Prompt',
    description: 'Scene 2 visual prompt is identical to Scene 1 prompt (zero visual diversity).',
    expectedPassed: false,
    expectedFailureReason: 'Scene is sufficiently different from previous scenes',
    mediaType: 'valid_1080x1920',
    params: {
      scene: {
        scene_index: 2,
        narration: 'Next we continue looking at the same assembly process.',
        visual_prompt: 'Robotic assembly mechanism placing thin ceramic separator film, 9:16 vertical',
        visual_subject: 'Robotic assembly',
        camera_movement: 'smooth pedestal down',
        estimated_duration_sec: 4.0,
      },
      previousScene: {
        scene_index: 1,
        visual_prompt: 'Robotic assembly mechanism placing thin ceramic separator film, 9:16 vertical',
        visual_subject: 'Robotic assembly',
        camera_movement: 'smooth pedestal down',
      },
      globalStyle: defaultCinematic,
    },
  },
];
