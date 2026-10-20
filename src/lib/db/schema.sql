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
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS content_projects (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  channel_id TEXT NOT NULL,
  topic TEXT NOT NULL,
  target_length_minutes INTEGER NOT NULL DEFAULT 8,
  preset TEXT NOT NULL DEFAULT 'STANDARD', -- SHORT, STANDARD, LONG, CUSTOM
  language TEXT NOT NULL DEFAULT 'en',
  platform TEXT NOT NULL DEFAULT 'YouTube',
  visibility TEXT NOT NULL DEFAULT 'PRIVATE', -- PRIVATE, UNLISTED, PUBLIC
  status TEXT NOT NULL DEFAULT 'PENDING', -- PENDING, PROCESSING, COMPLETED, FAILED
  current_stage TEXT NOT NULL DEFAULT 'SCRIPT', -- SCRIPT, VOICE, SCENES, VIDEO, SUBTITLES, FINAL_VIDEO, THUMBNAIL
  error_message TEXT,
  scheduled_at TEXT,
  published_at TEXT,
  publishing_status TEXT NOT NULL DEFAULT 'DRAFT', -- DRAFT, READY, SCHEDULED, UPLOADING, PUBLISHED, FAILED, NOT_CONNECTED
  publish_provider TEXT,
  publish_video_id TEXT,
  publish_url TEXT,
  publish_started_at TEXT,
  publish_completed_at TEXT,
  publish_error TEXT,
  auto_publish INTEGER NOT NULL DEFAULT 0,
  metadata_json TEXT,
  telemetry_json TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (channel_id) REFERENCES channels(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS video_scenes (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  scene_index INTEGER NOT NULL,
  narration TEXT NOT NULL,
  visual_prompt TEXT NOT NULL,
  visual_subject TEXT,
  environment TEXT,
  camera_movement TEXT,
  lighting TEXT,
  color_style TEXT,
  continuity_notes TEXT,
  estimated_duration_sec REAL NOT NULL,
  subtitle_text TEXT NOT NULL,
  created_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES content_projects(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS generated_assets (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  scene_id TEXT,
  asset_type TEXT NOT NULL, -- 'script', 'clip', 'audio', 'subtitles', 'final_video', 'thumbnail'
  storage_key TEXT NOT NULL,
  url TEXT NOT NULL,
  duration_sec REAL,
  metadata_json TEXT,
  created_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES content_projects(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS video_jobs (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL,
  stage TEXT NOT NULL, -- 'SCRIPT', 'VOICE', 'SCENES', 'VIDEO', 'SUBTITLES', 'FINAL_VIDEO', 'THUMBNAIL'
  status TEXT NOT NULL DEFAULT 'PENDING', -- 'PENDING', 'PROCESSING', 'COMPLETED', 'FAILED'
  error_message TEXT,
  started_at TEXT,
  completed_at TEXT,
  FOREIGN KEY (project_id) REFERENCES content_projects(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS video_outputs (
  id TEXT PRIMARY KEY,
  project_id TEXT NOT NULL UNIQUE,
  storage_key TEXT NOT NULL,
  url TEXT NOT NULL,
  duration_sec REAL NOT NULL,
  resolution TEXT NOT NULL DEFAULT '1920x1080',
  filesize_bytes INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  FOREIGN KEY (project_id) REFERENCES content_projects(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS oauth_connections (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  platform TEXT NOT NULL, -- 'YOUTUBE', 'TIKTOK', 'INSTAGRAM', 'FACEBOOK'
  account_email TEXT,
  channel_id TEXT,
  channel_title TEXT,
  access_token TEXT NOT NULL,
  refresh_token TEXT,
  token_expiry TEXT,
  scope TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(user_id, platform)
);

CREATE TABLE IF NOT EXISTS api_credentials (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  provider TEXT NOT NULL, -- 'gemini', 'openai', 'runway', 'replicate', 'fal'
  api_key TEXT NOT NULL,
  is_active INTEGER NOT NULL DEFAULT 1,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(user_id, provider)
);

CREATE INDEX IF NOT EXISTS idx_channels_user ON channels(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_user ON content_projects(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_channel ON content_projects(channel_id);
CREATE INDEX IF NOT EXISTS idx_scenes_project ON video_scenes(project_id, scene_index);
CREATE INDEX IF NOT EXISTS idx_assets_project ON generated_assets(project_id);
CREATE INDEX IF NOT EXISTS idx_jobs_project ON video_jobs(project_id, stage);
CREATE INDEX IF NOT EXISTS idx_oauth_user_platform ON oauth_connections(user_id, platform);
CREATE INDEX IF NOT EXISTS idx_api_credentials_user ON api_credentials(user_id, provider);

-- ============================================================
-- CUSTOMER AUTH TABLES (multi-tenant SaaS)
-- ============================================================

CREATE TABLE IF NOT EXISTS customers (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT NOT NULL,
  password_hash TEXT NOT NULL,
  avatar_url TEXT,
  email_verified INTEGER NOT NULL DEFAULT 0,
  deleted_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE(email)
);
CREATE INDEX IF NOT EXISTS idx_customers_email ON customers(email);

CREATE TABLE IF NOT EXISTS customer_sessions (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  ip TEXT,
  user_agent TEXT,
  created_at TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  revoked_at TEXT,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_sessions_customer ON customer_sessions(customer_id);
CREATE INDEX IF NOT EXISTS idx_sessions_token ON customer_sessions(token_hash);

CREATE TABLE IF NOT EXISTS email_verifications (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS password_resets (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  token_hash TEXT NOT NULL UNIQUE,
  expires_at TEXT NOT NULL,
  used_at TEXT,
  FOREIGN KEY (customer_id) REFERENCES customers(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS workspaces (
  id TEXT PRIMARY KEY,
  customer_id TEXT NOT NULL,
  name TEXT NOT NULL,
  slug TEXT NOT NULL UNIQUE,
  plan TEXT NOT NULL DEFAULT 'FREE',
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE INDEX IF NOT EXISTS idx_workspaces_customer ON workspaces(customer_id);

CREATE TABLE IF NOT EXISTS workspace_members (
  workspace_id TEXT NOT NULL,
  customer_id TEXT NOT NULL,
  role TEXT NOT NULL DEFAULT 'OWNER',
  joined_at TEXT NOT NULL,
  PRIMARY KEY (workspace_id, customer_id),
  FOREIGN KEY (workspace_id) REFERENCES workspaces(id) ON DELETE CASCADE,
  FOREIGN KEY (customer_id) REFERENCES users(id) ON DELETE CASCADE
);
CREATE TABLE IF NOT EXISTS user_voices (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  name TEXT NOT NULL,
  voice_id TEXT NOT NULL,
  sample_url TEXT,
  created_at TEXT NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_user_voices_user ON user_voices(user_id);
