export type AspectRatio = '9:16' | '16:9' | '1:1';

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
}

export interface ClipGenerationResult {
  filePath: string;
  durationSec: number;
  providerId: string;
  metadata?: Record<string, any>;
}

export interface VideoGenerationProvider {
  readonly id: string;
  readonly name: string;
  isConfigured(): boolean;
  generateClip(params: ClipGenerationParams): Promise<ClipGenerationResult>;
}
