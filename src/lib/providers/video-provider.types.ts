export type AspectRatio = '9:16' | '16:9' | '1:1';

export type GenerationMode = 'text-to-video' | 'image-to-video';

export type TrendingPreset =
  | 'REALISTIC_HUMAN'       // Realistic talking humans and presenter videos
  | 'TALKING_FOOD'          // Funny talking food and anthropomorphic vegetables
  | 'VIRAL_COMEDY'          // Viral-style comedy and short storytelling
  | 'CINEMATIC_DOC'         // Cinematic documentary and educational videos
  | 'AI_ANIMALS'            // AI animal stories and wildlife narratives
  | 'REALISTIC_COOKING'     // Realistic cooking and satisfying ASMR food videos
  | 'MOTIVATIONAL'          // Motivational storytelling and inspiring visuals
  | 'FACELESS_EXPLAINER'    // Faceless YouTube explainers and infographic motion
  | 'PRODUCT_STORY'         // Product storytelling and promotional videos
  | 'HORROR_MYSTERY';       // Horror, mystery, and suspense fictional stories

export interface CharacterReference {
  characterId?: string | null;
  id?: string | null;
  name: string;
  description: string;       // Clothing, age, facial features, hair, ethnicity
  referenceImageUrl?: string | null;// Direct URL or local path to face/body keyframe
  gender?: string | null;
  voiceId?: string | null;
}

export interface ClipGenerationParams {
  prompt: string;
  sceneIndex: number;
  durationSec: number;
  aspectRatio: AspectRatio;
  visualStyle?: string;
  niche: string;
  outputPath: string;
  environment?: string;
  cameraMovement?: string;
  lighting?: string;
  colorStyle?: string;
  continuityNotes?: string;
  projectId?: string;
  sceneId?: string;
  // Upgraded real AI video features
  generationMode?: GenerationMode;
  referenceImageUrl?: string;
  characterRef?: CharacterReference;
  preset?: TrendingPreset;
  negativePrompt?: string;
  seed?: number;
  topic?: string;
}

export interface ClipGenerationResult {
  filePath: string;
  durationSec: number;
  providerId: string;
  hasNativeAudio?: boolean;
  metadata?: Record<string, any>;
}

export interface VideoGenerationProvider {
  readonly id: string;
  readonly name: string;
  isConfigured(): boolean;
  supportsImageToVideo(): boolean;
  supportsCharacterReference(): boolean;
  supportsNativeAudio(): boolean;
  generateClip(params: ClipGenerationParams): Promise<ClipGenerationResult>;
}
