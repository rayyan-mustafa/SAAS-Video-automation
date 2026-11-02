import { VisualTierName } from '@/lib/billing';

export type AgentSessionStatus =
  | 'active'
  | 'interview'
  | 'script_ready'
  | 'preview_ready'
  | 'rendering'
  | 'completed'
  | 'abandoned';

export interface AgentConfig {
  topic: string;
  format: 'short' | 'standard' | 'extended'; // short <60s, standard 60-120s, extended 120-180s
  aspectRatio: '9:16' | '16:9' | '1:1';
  durationSec: number;
  vibe: 'dramatic' | 'energetic' | 'educational' | 'suspenseful' | 'emotional';
  audience: 'gen_z' | 'professionals' | 'general' | 'students';
  voiceId: string;
  voiceTier: 'google_neural2' | 'elevenlabs';
  voiceAccent: 'en-US' | 'en-GB' | 'en-AU' | 'en-IN';
  visualTier: VisualTierName;
}

export interface AgentScriptScene {
  sceneIndex: number;
  heading: string;
  narration: string;
  visual_prompt: string;
  visual_tier: VisualTierName;
  estimated_duration_sec: number;
  subtitle_text: string;
  camera_movement: string;
}

export interface AgentScript {
  title: string;
  topic: string;
  aspectRatio: '9:16' | '16:9' | '1:1';
  targetDurationSec: number;
  totalEstimatedSec: number;
  vibe: string;
  audience: string;
  voiceId: string;
  voiceTier: 'google_neural2' | 'elevenlabs';
  visualTier: VisualTierName;
  scenes: AgentScriptScene[];
  wordCount: number;
  sceneCount: number;
}

export interface AgentSession {
  id: string;
  user_id: string;
  title: string | null;
  status: AgentSessionStatus;
  config_json: string | null;
  script_json: string | null;
  preview_project_id: string | null;
  final_project_id: string | null;
  created_at: string;
  updated_at: string;
}

export interface AgentMessage {
  id: string;
  session_id: string;
  role: 'user' | 'agent' | 'system';
  content: string;
  metadata_json: string | null;
  created_at: string;
}

export interface InterviewQuestionOption {
  label: string;
  value: string;
  description?: string;
  isDecideForMe?: boolean;
  badge?: string;
}

export interface InterviewQuestion {
  id: string;
  step: number;
  question: string;
  helperText?: string;
  field: keyof AgentConfig;
  options: InterviewQuestionOption[];
}

