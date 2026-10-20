-- AutoVideo SaaS PostgreSQL Production Schema

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  salt TEXT NOT NULL,
  name TEXT NOT NULL,
  avatar_url TEXT,
  email_verified INTEGER NOT NULL DEFAULT 0,
  role TEXT NOT NULL DEFAULT 'CUSTOMER',
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  onboarding_completed INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_sessions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  session_token TEXT NOT NULL UNIQUE,
  ip_address TEXT,
  user_agent TEXT,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_active_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  avatar_url TEXT,
  email_verified INTEGER NOT NULL DEFAULT 0,
  role TEXT NOT NULL DEFAULT 'CUSTOMER',
  status TEXT NOT NULL DEFAULT 'ACTIVE',
  onboarding_completed INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS customer_sessions (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  ip_address TEXT,
  user_agent TEXT,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  last_active_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  revoked_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS email_verifications (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS password_resets (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES customers(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
  used_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS workspaces (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  plan TEXT NOT NULL DEFAULT 'FREE',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS workspace_members (
  workspace_id TEXT NOT NULL REFERENCES workspaces(id) ON DELETE CASCADE,
  customer_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'OWNER',
  joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (workspace_id, customer_id)
);

CREATE TABLE IF NOT EXISTS channels (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  niche TEXT NOT NULL,
  language TEXT NOT NULL DEFAULT 'en',
  voice TEXT NOT NULL DEFAULT 'en-US-ChristopherNeural',
  voice_speed TEXT NOT NULL DEFAULT '1.0x',
  target_duration_minutes INTEGER NOT NULL DEFAULT 5,
  visual_style TEXT NOT NULL DEFAULT 'Cinematic High-Contrast',
  subtitle_style TEXT NOT NULL DEFAULT 'Modern Clean White',
  intro_style TEXT NOT NULL DEFAULT 'High-Impact Dramatic Question',
  outro_cta TEXT NOT NULL DEFAULT 'Subscribe to the channel and leave your thoughts below',
  publishing_platform TEXT NOT NULL DEFAULT 'YouTube',
  content_rules TEXT NOT NULL DEFAULT 'Engaging, clear, professional tone',
  publishing_days TEXT NOT NULL DEFAULT '["Monday","Wednesday","Friday"]',
  publishing_time TEXT NOT NULL DEFAULT '14:00',
  timezone TEXT NOT NULL DEFAULT 'UTC',
  default_visibility TEXT NOT NULL DEFAULT 'PRIVATE',
  auto_publish INTEGER NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS content_projects (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  channel_id TEXT NOT NULL REFERENCES channels(id) ON DELETE CASCADE,
  topic TEXT NOT NULL,
  target_length_minutes INTEGER NOT NULL DEFAULT 8,
  preset TEXT NOT NULL DEFAULT 'STANDARD',
  language TEXT NOT NULL DEFAULT 'en',
  platform TEXT NOT NULL DEFAULT 'YouTube',
  status TEXT NOT NULL DEFAULT 'PENDING',
  current_stage TEXT NOT NULL DEFAULT 'SCRIPT',
  error_message TEXT,
  scheduled_at TIMESTAMP WITH TIME ZONE,
  published_at TIMESTAMP WITH TIME ZONE,
  publishing_status TEXT NOT NULL DEFAULT 'UNPUBLISHED',
  visibility TEXT NOT NULL DEFAULT 'PRIVATE',
  publish_started_at TIMESTAMP WITH TIME ZONE,
  publish_completed_at TIMESTAMP WITH TIME ZONE,
  publish_provider TEXT,
  publish_video_id TEXT,
  publish_url TEXT,
  publish_error TEXT,
  metadata_json TEXT,
  telemetry_json TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS video_scenes (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES content_projects(id) ON DELETE CASCADE,
  scene_index INTEGER NOT NULL,
  narration TEXT NOT NULL,
  visual_prompt TEXT NOT NULL,
  visual_subject TEXT,
  environment TEXT,
  camera_movement TEXT,
  lighting TEXT,
  color_style TEXT,
  continuity_notes TEXT,
  estimated_duration_sec DOUBLE PRECISION NOT NULL,
  subtitle_text TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS generated_assets (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES content_projects(id) ON DELETE CASCADE,
  scene_id TEXT,
  asset_type TEXT NOT NULL,
  storage_key TEXT NOT NULL,
  url TEXT NOT NULL,
  duration_sec DOUBLE PRECISION,
  metadata_json TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS video_jobs (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL REFERENCES content_projects(id) ON DELETE CASCADE,
  stage TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'PENDING',
  error_message TEXT,
  started_at TIMESTAMP WITH TIME ZONE,
  completed_at TIMESTAMP WITH TIME ZONE
);

CREATE TABLE IF NOT EXISTS video_outputs (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL UNIQUE REFERENCES content_projects(id) ON DELETE CASCADE,
  storage_key TEXT NOT NULL,
  url TEXT NOT NULL,
  duration_sec DOUBLE PRECISION NOT NULL,
  resolution TEXT NOT NULL DEFAULT '1920x1080',
  filesize_bytes BIGINT NOT NULL DEFAULT 0,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS user_voices (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  voice_id TEXT NOT NULL,
  sample_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS oauth_connections (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  account_email TEXT,
  channel_id TEXT,
  channel_title TEXT,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expiry TIMESTAMP WITH TIME ZONE,
  scope TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_user_platform UNIQUE(user_id, platform)
);

CREATE TABLE IF NOT EXISTS api_credentials (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  provider TEXT NOT NULL,
  api_key TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT unique_user_provider UNIQUE(user_id, provider)
);

CREATE TABLE IF NOT EXISTS user_credits (
  user_id TEXT PRIMARY KEY,
  balance INTEGER NOT NULL DEFAULT 500,
  tier TEXT NOT NULL DEFAULT 'STARTER',
  subscription_status TEXT NOT NULL DEFAULT 'ACTIVE',
  monthly_allowance INTEGER NOT NULL DEFAULT 500,
  current_period_start TIMESTAMP WITH TIME ZONE,
  current_period_end TIMESTAMP WITH TIME ZONE,
  stripe_customer_id TEXT,
  stripe_subscription_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS credit_transactions (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  amount INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  type TEXT NOT NULL,
  description TEXT,
  project_id TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS billing_plans (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  price_monthly INTEGER NOT NULL,
  price_annual INTEGER NOT NULL,
  monthly_credits INTEGER NOT NULL,
  features_json TEXT NOT NULL,
  stripe_price_id_monthly TEXT,
  stripe_price_id_annual TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS automation_templates (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  description TEXT NOT NULL,
  niche TEXT NOT NULL,
  target_duration_minutes INTEGER NOT NULL DEFAULT 5,
  visual_style TEXT NOT NULL DEFAULT 'Cinematic High-Contrast',
  subtitle_style TEXT NOT NULL DEFAULT 'Modern Clean White',
  intro_style TEXT NOT NULL DEFAULT 'High-Impact Dramatic Question',
  outro_cta TEXT NOT NULL,
  content_rules TEXT NOT NULL,
  tags_json TEXT NOT NULL DEFAULT '[]',
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Idempotency table for Stripe Webhook events
CREATE TABLE IF NOT EXISTS processed_webhook_events (
  event_id TEXT PRIMARY KEY,
  event_type TEXT NOT NULL,
  processed_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP
);

-- Essential Performance & Foreign Key Indexes
CREATE INDEX IF NOT EXISTS idx_pg_channels_user ON channels(user_id);
CREATE INDEX IF NOT EXISTS idx_pg_projects_user ON content_projects(user_id);
CREATE INDEX IF NOT EXISTS idx_pg_projects_channel ON content_projects(channel_id);
CREATE INDEX IF NOT EXISTS idx_pg_scenes_project ON video_scenes(project_id, scene_index);
CREATE INDEX IF NOT EXISTS idx_pg_assets_project ON generated_assets(project_id);
CREATE INDEX IF NOT EXISTS idx_pg_jobs_project ON video_jobs(project_id, stage);
CREATE INDEX IF NOT EXISTS idx_pg_user_voices_user ON user_voices(user_id);
CREATE INDEX IF NOT EXISTS idx_pg_credit_tx_user ON credit_transactions(user_id, created_at DESC);
