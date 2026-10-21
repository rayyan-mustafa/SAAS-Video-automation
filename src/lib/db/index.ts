import Database from 'better-sqlite3';
import path from 'path';
import fs from 'fs';
import { v4 as uuidv4 } from 'uuid';
import { decryptToken } from '../security/encryption';

export const DEFAULT_USER_ID = 'user_default';

let dbInstance: Database.Database | null = null;

export function getDb(): Database.Database {
  if (!dbInstance) {
    const isServerless = process.env.VERCEL === '1' || !!process.env.AWS_LAMBDA_FUNCTION_NAME;
    let dataDir = isServerless ? path.join('/tmp', 'data') : path.join(process.cwd(), 'data');

    // Ensure directory exists and is writable, fallback to /tmp/data if permission denied
    try {
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
      const testFile = path.join(dataDir, '.write-test-' + Date.now());
      fs.writeFileSync(testFile, '1');
      fs.unlinkSync(testFile);
    } catch (permErr: any) {
      console.warn(`[DB] Directory ${dataDir} is not writable: ${permErr.message}. Falling back to /tmp/data.`);
      dataDir = path.join('/tmp', 'data');
      if (!fs.existsSync(dataDir)) {
        fs.mkdirSync(dataDir, { recursive: true });
      }
    }

    let dbPath = path.join(dataDir, 'app.db');
    console.log(`[DB] Initializing database at ${dbPath}`);
    try {
      dbInstance = new Database(dbPath);
    } catch (err: any) {
      console.error(`[DB] Error opening database at ${dbPath}: ${err.message}. Trying /tmp/data fallback...`);
      try {
        dataDir = path.join('/tmp', 'data');
        if (!fs.existsSync(dataDir)) {
          fs.mkdirSync(dataDir, { recursive: true });
        }
        dbPath = path.join(dataDir, 'app.db');
        dbInstance = new Database(dbPath);
      } catch (fallbackErr: any) {
        console.error(`[DB] Fatal: could not open database in /tmp: ${fallbackErr.message}`);
        throw fallbackErr;
      }
    }
    try {
      dbInstance.pragma('journal_mode = DELETE');
      dbInstance.pragma('synchronous = NORMAL');
      dbInstance.pragma('foreign_keys = ON');
    } catch (pragmaErr: any) {
      console.warn('[DB] Pragma initialization warning:', pragmaErr.message);
    }

    // Run schema initialization
    const possibleSchemaPaths = [
      path.join(__dirname, 'schema.sql'),
      path.join(process.cwd(), 'src', 'lib', 'db', 'schema.sql'),
      path.join(process.cwd(), 'schema.sql'),
    ];
    let schemaSql = '';
    for (const p of possibleSchemaPaths) {
      if (fs.existsSync(p)) {
        try {
          schemaSql = fs.readFileSync(p, 'utf8');
          break;
        } catch {}
      }
    }
    if (!schemaSql) {
      schemaSql = `
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
          created_at TEXT NOT NULL,
          updated_at TEXT NOT NULL
        );
        CREATE TABLE IF NOT EXISTS content_projects (
          id TEXT PRIMARY KEY,
          user_id TEXT NOT NULL,
          channel_id TEXT NOT NULL,
          topic TEXT NOT NULL,
          target_length_minutes INTEGER NOT NULL DEFAULT 8,
          preset TEXT NOT NULL DEFAULT 'STANDARD',
          language TEXT NOT NULL DEFAULT 'en',
          platform TEXT NOT NULL DEFAULT 'YouTube',
          status TEXT NOT NULL DEFAULT 'PENDING',
          current_stage TEXT NOT NULL DEFAULT 'SCRIPT',
          error_message TEXT,
          scheduled_at TEXT,
          published_at TEXT,
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
          asset_type TEXT NOT NULL,
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
          stage TEXT NOT NULL,
          status TEXT NOT NULL DEFAULT 'PENDING',
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
        CREATE INDEX IF NOT EXISTS idx_channels_user ON channels(user_id);
        CREATE INDEX IF NOT EXISTS idx_projects_user ON content_projects(user_id);
        CREATE INDEX IF NOT EXISTS idx_projects_channel ON content_projects(channel_id);
        CREATE INDEX IF NOT EXISTS idx_scenes_project ON video_scenes(project_id, scene_index);
        CREATE INDEX IF NOT EXISTS idx_assets_project ON generated_assets(project_id);
        CREATE INDEX IF NOT EXISTS idx_jobs_project ON video_jobs(project_id, stage);
      `;
    }
    dbInstance.exec(schemaSql);

    // Apply incremental migrations for existing DB instances safely
    const safeAddColumn = (table: string, column: string, typeDef: string) => {
      try {
        dbInstance?.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${typeDef}`).run();
      } catch {
        // column already exists
      }
    };

    safeAddColumn('channels', 'voice_speed', "TEXT NOT NULL DEFAULT '1.0x'");
    safeAddColumn('channels', 'target_duration_minutes', 'INTEGER NOT NULL DEFAULT 5');
    safeAddColumn('channels', 'visual_style', "TEXT NOT NULL DEFAULT 'Cinematic High-Contrast'");
    safeAddColumn('channels', 'subtitle_style', "TEXT NOT NULL DEFAULT 'Modern Clean White'");
    safeAddColumn('channels', 'intro_style', "TEXT NOT NULL DEFAULT 'High-Impact Dramatic Question'");
    safeAddColumn('channels', 'outro_cta', "TEXT NOT NULL DEFAULT 'Subscribe to the channel and leave your thoughts below'");
    safeAddColumn('channels', 'publishing_platform', "TEXT NOT NULL DEFAULT 'YouTube'");
    safeAddColumn('channels', 'content_rules', "TEXT NOT NULL DEFAULT 'Engaging, clear, professional tone'");

    safeAddColumn('channels', 'publishing_days', "TEXT NOT NULL DEFAULT '[\"Monday\",\"Wednesday\",\"Friday\"]'");
    safeAddColumn('channels', 'publishing_time', "TEXT NOT NULL DEFAULT '14:00'");
    safeAddColumn('channels', 'timezone', "TEXT NOT NULL DEFAULT 'UTC'");
    safeAddColumn('channels', 'default_visibility', "TEXT NOT NULL DEFAULT 'PRIVATE'");
    safeAddColumn('channels', 'auto_publish', 'INTEGER NOT NULL DEFAULT 0');

    safeAddColumn('content_projects', 'preset', "TEXT NOT NULL DEFAULT 'STANDARD'");
    safeAddColumn('content_projects', 'platform', "TEXT NOT NULL DEFAULT 'YouTube'");
    safeAddColumn('content_projects', 'visibility', "TEXT NOT NULL DEFAULT 'PRIVATE'");
    safeAddColumn('content_projects', 'scheduled_at', 'TEXT');
    safeAddColumn('content_projects', 'published_at', 'TEXT');
    safeAddColumn('content_projects', 'publishing_status', "TEXT NOT NULL DEFAULT 'DRAFT'");
    safeAddColumn('content_projects', 'publish_provider', 'TEXT');
    safeAddColumn('content_projects', 'publish_video_id', 'TEXT');
    safeAddColumn('content_projects', 'publish_url', 'TEXT');
    safeAddColumn('content_projects', 'publish_started_at', 'TEXT');
    safeAddColumn('content_projects', 'publish_completed_at', 'TEXT');
    safeAddColumn('content_projects', 'auto_publish', 'INTEGER NOT NULL DEFAULT 0');
    safeAddColumn('content_projects', 'publish_error', 'TEXT');
    safeAddColumn('video_scenes', 'quality_report_json', 'TEXT');

    dbInstance.exec(`
      CREATE TABLE IF NOT EXISTS user_voices (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        name TEXT NOT NULL,
        voice_id TEXT NOT NULL,
        sample_url TEXT,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_user_voices_user ON user_voices(user_id);
    `);
    safeAddColumn('content_projects', 'metadata_json', 'TEXT');
    safeAddColumn('content_projects', 'telemetry_json', 'TEXT');
    safeAddColumn('user_credits', 'created_at', 'TEXT');
    safeAddColumn('user_credits', 'stripe_customer_id', 'TEXT');
    safeAddColumn('user_credits', 'stripe_subscription_id', 'TEXT');

    safeAddColumn('video_scenes', 'visual_subject', 'TEXT');
    safeAddColumn('video_scenes', 'environment', 'TEXT');
    safeAddColumn('video_scenes', 'camera_movement', 'TEXT');
    safeAddColumn('video_scenes', 'lighting', 'TEXT');
    safeAddColumn('video_scenes', 'color_style', 'TEXT');
    safeAddColumn('video_scenes', 'continuity_notes', 'TEXT');
    safeAddColumn('video_scenes', 'reference_image_url', 'TEXT');
    safeAddColumn('video_scenes', 'character_prompt', 'TEXT');
    safeAddColumn('content_projects', 'aspect_ratio', "TEXT NOT NULL DEFAULT '9:16'");
    safeAddColumn('content_projects', 'generation_mode', "TEXT NOT NULL DEFAULT 'text-to-video'");
    safeAddColumn('content_projects', 'character_id', 'TEXT');
    safeAddColumn('content_projects', 'reference_image_url', 'TEXT');
    safeAddColumn('video_scenes', 'audio_storage_key', 'TEXT');
    safeAddColumn('video_scenes', 'audio_duration_sec', 'REAL');
    safeAddColumn('video_scenes', 'visual_tier', "TEXT DEFAULT 'motion_still'");
    safeAddColumn('user_sessions', 'session_token', 'TEXT');
    safeAddColumn('user_sessions', 'user_agent', 'TEXT');
    safeAddColumn('user_sessions', 'ip_address', 'TEXT');

    dbInstance.exec(`
      CREATE TABLE IF NOT EXISTS project_characters (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        project_id TEXT,
        name TEXT NOT NULL,
        description TEXT NOT NULL,
        reference_image_url TEXT,
        gender TEXT,
        voice_id TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_characters_user_project ON project_characters(user_id, project_id);
    `);

    // Create oauth_connections table if missing
    dbInstance.exec(`
      CREATE TABLE IF NOT EXISTS oauth_connections (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        platform TEXT NOT NULL,
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
      CREATE INDEX IF NOT EXISTS idx_oauth_user_platform ON oauth_connections(user_id, platform);

      CREATE TABLE IF NOT EXISTS api_credentials (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        provider TEXT NOT NULL,
        api_key TEXT NOT NULL,
        is_active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        UNIQUE(user_id, provider)
      );
      CREATE INDEX IF NOT EXISTS idx_api_credentials_user ON api_credentials(user_id, provider);

      CREATE TABLE IF NOT EXISTS user_credits (
        user_id TEXT PRIMARY KEY,
        balance INTEGER NOT NULL DEFAULT 500,
        tier TEXT NOT NULL DEFAULT 'CREATOR',
        subscription_status TEXT NOT NULL DEFAULT 'ACTIVE',
        monthly_allowance INTEGER NOT NULL DEFAULT 500,
        renews_at TEXT,
        stripe_customer_id TEXT,
        stripe_subscription_id TEXT,
        created_at TEXT,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS credit_transactions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        amount INTEGER NOT NULL,
        balance_after INTEGER NOT NULL,
        type TEXT NOT NULL,
        description TEXT NOT NULL,
        project_id TEXT,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_credit_tx_user ON credit_transactions(user_id, created_at);

      CREATE TABLE IF NOT EXISTS billing_plans (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        price_monthly INTEGER NOT NULL,
        credits_monthly INTEGER NOT NULL,
        max_channels INTEGER NOT NULL,
        resolution TEXT NOT NULL,
        features_json TEXT NOT NULL,
        is_popular INTEGER NOT NULL DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS automation_templates (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        category TEXT NOT NULL,
        description TEXT NOT NULL,
        format TEXT NOT NULL,
        duration_minutes INTEGER NOT NULL,
        visual_style TEXT NOT NULL,
        voice TEXT NOT NULL,
        niche TEXT NOT NULL,
        icon TEXT NOT NULL,
        prompt_starter TEXT NOT NULL,
        created_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS users (
        id TEXT PRIMARY KEY,
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        salt TEXT NOT NULL,
        name TEXT NOT NULL,
        avatar TEXT,
        email_verified INTEGER NOT NULL DEFAULT 0,
        verification_token TEXT,
        verification_token_expires TEXT,
        reset_token TEXT,
        reset_token_expires TEXT,
        role TEXT NOT NULL DEFAULT 'CUSTOMER',
        status TEXT NOT NULL DEFAULT 'ACTIVE',
        onboarding_completed INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);

      CREATE TABLE IF NOT EXISTS user_sessions (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        session_token TEXT UNIQUE NOT NULL,
        expires_at TEXT NOT NULL,
        user_agent TEXT,
        ip_address TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_user_sessions_token ON user_sessions(session_token);
      CREATE INDEX IF NOT EXISTS idx_user_sessions_user ON user_sessions(user_id);

      CREATE TABLE IF NOT EXISTS personal_creator_profiles (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL UNIQUE,
        avatar_asset_id TEXT,
        voice_asset_id TEXT,
        default_style TEXT NOT NULL DEFAULT 'PODCAST',
        default_language TEXT NOT NULL DEFAULT 'en',
        consent_agreed_at TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_personal_profiles_user ON personal_creator_profiles(user_id);

      CREATE TABLE IF NOT EXISTS personal_creator_projects (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        title TEXT NOT NULL,
        topic TEXT,
        script TEXT,
        style TEXT NOT NULL DEFAULT 'PODCAST',
        language TEXT NOT NULL DEFAULT 'en',
        aspect_ratio TEXT NOT NULL DEFAULT '16:9',
        presenter_position TEXT NOT NULL DEFAULT 'center',
        presenter_framing TEXT NOT NULL DEFAULT 'medium',
        camera_motion TEXT NOT NULL DEFAULT 'subtle',
        captions_enabled INTEGER NOT NULL DEFAULT 1,
        caption_style TEXT NOT NULL DEFAULT 'YouTube',
        music_enabled INTEGER NOT NULL DEFAULT 1,
        music_volume INTEGER NOT NULL DEFAULT 20,
        duration REAL NOT NULL DEFAULT 0,
        status TEXT NOT NULL DEFAULT 'QUEUED',
        progress INTEGER NOT NULL DEFAULT 0,
        current_stage_label TEXT NOT NULL DEFAULT 'Queued',
        voice_type TEXT NOT NULL DEFAULT 'personal',
        avatar_status TEXT NOT NULL DEFAULT 'standard_presenter',
        final_video_url TEXT,
        final_video_path TEXT,
        error_message TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_personal_projects_user ON personal_creator_projects(user_id);

      CREATE TABLE IF NOT EXISTS personal_creator_scenes (
        id TEXT PRIMARY KEY,
        project_id TEXT NOT NULL,
        scene_number INTEGER NOT NULL,
        narration TEXT NOT NULL,
        visual_prompt TEXT NOT NULL,
        scene_topic TEXT,
        avatar_video TEXT,
        broll_asset TEXT,
        caption_data TEXT,
        duration REAL NOT NULL DEFAULT 5,
        status TEXT NOT NULL DEFAULT 'PENDING',
        created_at TEXT NOT NULL,
        FOREIGN KEY (project_id) REFERENCES personal_creator_projects(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_personal_scenes_proj ON personal_creator_scenes(project_id, scene_number);

      CREATE TABLE IF NOT EXISTS personal_creator_assets (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        type TEXT NOT NULL,
        storage_key TEXT NOT NULL,
        mime_type TEXT NOT NULL,
        size INTEGER NOT NULL DEFAULT 0,
        metadata_json TEXT,
        created_at TEXT NOT NULL,
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_personal_assets_user ON personal_creator_assets(user_id, type);

      CREATE TABLE IF NOT EXISTS competitor_channels (
        id TEXT PRIMARY KEY,
        user_id TEXT NOT NULL,
        channel_handle TEXT NOT NULL,
        channel_id TEXT NOT NULL,
        channel_title TEXT NOT NULL,
        thumbnail_url TEXT,
        subscriber_count INTEGER DEFAULT 0,
        avg_views_7d INTEGER DEFAULT 0,
        platform TEXT DEFAULT 'YOUTUBE',
        last_refreshed TEXT NOT NULL,
        created_at TEXT NOT NULL,
        UNIQUE(user_id, channel_handle),
        FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_competitors_user ON competitor_channels(user_id);

      CREATE TABLE IF NOT EXISTS competitor_viral_cache (
        id TEXT PRIMARY KEY,
        competitor_id TEXT NOT NULL,
        video_id TEXT NOT NULL,
        title TEXT NOT NULL,
        view_count INTEGER NOT NULL,
        like_count INTEGER DEFAULT 0,
        published_at TEXT NOT NULL,
        viral_score REAL NOT NULL,
        platform TEXT DEFAULT 'YOUTUBE',
        thumbnail_url TEXT,
        cached_at TEXT NOT NULL,
        FOREIGN KEY (competitor_id) REFERENCES competitor_channels(id) ON DELETE CASCADE
      );
      CREATE INDEX IF NOT EXISTS idx_viral_cache_comp ON competitor_viral_cache(competitor_id);
    `);

    safeAddColumn('competitor_channels', 'platform', "TEXT DEFAULT 'YOUTUBE'");
    safeAddColumn('competitor_viral_cache', 'platform', "TEXT DEFAULT 'YOUTUBE'");

    safeAddColumn('user_credits', 'stripe_customer_id', 'TEXT');
    safeAddColumn('user_credits', 'stripe_subscription_id', 'TEXT');
    safeAddColumn('user_credits', 'created_at', 'TEXT');
    safeAddColumn('user_credits', 'renews_at', 'TEXT');

    // Ensure default demo user exists for smooth local development & onboarding
    try {
      const defaultUser = dbInstance.prepare('SELECT id FROM users WHERE id = ?').get(DEFAULT_USER_ID);
      if (!defaultUser) {
        dbInstance.prepare(`
          INSERT INTO users (id, email, password_hash, salt, name, email_verified, role, status, onboarding_completed, created_at, updated_at)
          VALUES (?, 'creator@autora.live', 'demo_hash_seeded', 'demo_salt', 'Creative Director', 1, 'CUSTOMER', 'ACTIVE', 1, ?, ?)
        `).run(DEFAULT_USER_ID, new Date().toISOString(), new Date().toISOString());
      }
    } catch {}

    // Ensure default user has credits initialized
    try {
      const existingCredits = dbInstance.prepare('SELECT balance FROM user_credits WHERE user_id = ?').get(DEFAULT_USER_ID);
      if (!existingCredits) {
        dbInstance.prepare(`
          INSERT INTO user_credits (user_id, balance, tier, subscription_status, monthly_allowance, renews_at, updated_at)
          VALUES (?, 500, 'CREATOR', 'ACTIVE', 500, ?, ?)
        `).run(DEFAULT_USER_ID, new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(), new Date().toISOString());
      }
    } catch {}

    // Customer auth tables (multi-tenant SaaS)
    dbInstance.exec(`
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

      -- Central Integration Configurations
      CREATE TABLE IF NOT EXISTS integration_configs (
        id TEXT PRIMARY KEY,
        category TEXT NOT NULL,
        provider TEXT NOT NULL UNIQUE,
        display_name TEXT NOT NULL,
        credentials_encrypted TEXT,
        settings_json TEXT,
        is_active INTEGER NOT NULL DEFAULT 1,
        is_primary INTEGER NOT NULL DEFAULT 0,
        last_tested_at TEXT,
        last_test_status TEXT,
        last_test_latency_ms INTEGER,
        last_test_error TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_integration_configs_category ON integration_configs(category);
      CREATE INDEX IF NOT EXISTS idx_integration_configs_provider ON integration_configs(provider);

      -- Payment Gateways Management
      CREATE TABLE IF NOT EXISTS payment_gateways (
        id TEXT PRIMARY KEY,
        provider TEXT NOT NULL UNIQUE,
        mode TEXT NOT NULL DEFAULT 'test',
        is_enabled INTEGER NOT NULL DEFAULT 0,
        is_default INTEGER NOT NULL DEFAULT 0,
        credentials_encrypted TEXT,
        settings_json TEXT,
        webhook_secret_encrypted TEXT,
        webhook_url TEXT,
        last_tested_at TEXT,
        last_test_status TEXT,
        last_test_error TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_payment_gateways_provider ON payment_gateways(provider);

      -- Integration Audit Logs
      CREATE TABLE IF NOT EXISTS integration_audit_logs (
        id TEXT PRIMARY KEY,
        admin_user TEXT NOT NULL,
        action TEXT NOT NULL,
        target_type TEXT NOT NULL,
        target_id TEXT NOT NULL,
        details_json TEXT,
        ip_address TEXT,
        created_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_integration_audit_target ON integration_audit_logs(target_type, target_id);
      CREATE INDEX IF NOT EXISTS idx_integration_audit_created ON integration_audit_logs(created_at);

      -- Connection Test Logs
      CREATE TABLE IF NOT EXISTS connection_test_logs (
        id TEXT PRIMARY KEY,
        provider TEXT NOT NULL,
        status TEXT NOT NULL,
        latency_ms INTEGER NOT NULL,
        endpoint TEXT,
        error_sanitized TEXT,
        tested_at TEXT NOT NULL
      );
      CREATE INDEX IF NOT EXISTS idx_conn_test_logs_provider ON connection_test_logs(provider, tested_at);

      -- Webhook Events & Idempotency Logs
      CREATE TABLE IF NOT EXISTS webhook_events (
        id TEXT PRIMARY KEY,
        provider TEXT NOT NULL,
        event_id TEXT NOT NULL,
        event_type TEXT NOT NULL,
        payload_json TEXT,
        status TEXT NOT NULL DEFAULT 'PROCESSED',
        error_message TEXT,
        processed_at TEXT NOT NULL
      );
      CREATE UNIQUE INDEX IF NOT EXISTS idx_webhook_events_unique ON webhook_events(provider, event_id);
      CREATE INDEX IF NOT EXISTS idx_webhook_events_processed ON webhook_events(processed_at);
    `);

  }
  return dbInstance;
}

export interface Channel {
  id: string;
  user_id: string;
  name: string;
  niche: string;
  language: string;
  voice: string;
  voice_speed: string;
  target_duration_minutes: number;
  visual_style: string;
  subtitle_style: string;
  intro_style: string;
  outro_cta: string;
  publishing_platform: string;
  content_rules: string;
  publishing_days: string; // JSON array string e.g. '["Monday","Wednesday","Friday"]'
  publishing_time: string; // e.g. '14:00'
  timezone: string; // e.g. 'UTC'
  default_visibility: 'PRIVATE' | 'UNLISTED' | 'PUBLIC';
  auto_publish: number; // 0 or 1
  created_at: string;
  updated_at: string;
  video_count?: number;
}

export interface OAuthConnection {
  id: string;
  user_id: string;
  platform: 'YOUTUBE' | 'TIKTOK' | 'INSTAGRAM' | 'FACEBOOK';
  account_email?: string | null;
  channel_id?: string | null;
  channel_title?: string | null;
  access_token: string;
  refresh_token?: string | null;
  token_expiry?: string | null;
  scope?: string | null;
  created_at: string;
  updated_at: string;
}

export interface ProjectMetadata {
  youtubeTitle: string;
  description: string;
  tags: string[];
  hashtags: string[];
  shortDescription: string;
  suggestedFilename: string;
}

export interface ProjectTelemetry {
  generationStartTime?: string;
  generationEndTime?: string;
  totalGenerationDurationSec?: number;
  sceneCount?: number;
  clipCount?: number;
  audioDurationSec?: number;
  finalVideoDurationSec?: number;
  filesizeBytes?: number;
  providerUsed?: string;
  generationStatus?: string;
  cost?: string; // Always 'UNAVAILABLE'
  publishingTelemetry?: {
    provider?: string;
    uploadStartTime?: string;
    uploadCompletionTime?: string;
    providerVideoId?: string;
    publishUrl?: string;
    visibility?: string;
    scheduledTime?: string;
    actualPublishTime?: string;
    uploadStatus?: string;
    errorMessage?: string;
  };
}

export interface ContentProject {
  id: string;
  user_id: string;
  channel_id: string;
  channel_name?: string;
  channel_niche?: string;
  channel_voice?: string;
  channel_voice_speed?: string;
  channel_visual_style?: string;
  channel_subtitle_style?: string;
  topic: string;
  target_length_minutes: number;
  preset: 'SHORT' | 'STANDARD' | 'LONG' | 'CUSTOM';
  language: string;
  platform: string;
  visibility: 'PRIVATE' | 'UNLISTED' | 'PUBLIC';
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  current_stage: 'PLAN' | 'SCRIPT' | 'VOICE' | 'SCENES' | 'VIDEO' | 'SUBTITLES' | 'FINAL_VIDEO' | 'THUMBNAIL';
  error_message?: string | null;
  scheduled_at?: string | null;
  published_at?: string | null;
  publishing_status: 'DRAFT' | 'READY' | 'SCHEDULED' | 'UPLOADING' | 'PUBLISHED' | 'FAILED' | 'NOT_CONNECTED';
  publish_provider?: string | null;
  publish_video_id?: string | null;
  publish_url?: string | null;
  publish_started_at?: string | null;
  publish_completed_at?: string | null;
  publish_error?: string | null;
  auto_publish: number; // 0 or 1
  metadata_json?: string | null;
  telemetry_json?: string | null;
  created_at: string;
  updated_at: string;
}

export interface VideoScene {
  id: string;
  project_id: string;
  scene_index: number;
  narration: string;
  visual_prompt: string;
  visual_subject?: string | null;
  environment?: string | null;
  camera_movement?: string | null;
  lighting?: string | null;
  color_style?: string | null;
  continuity_notes?: string | null;
  estimated_duration_sec: number;
  subtitle_text: string;
  quality_report_json?: string | null;
  audio_storage_key?: string | null;
  audio_duration_sec?: number | null;
  visual_tier?: string | null;
  created_at: string;
}

export interface GeneratedAsset {
  id: string;
  project_id: string;
  scene_id?: string | null;
  asset_type: 'plan' | 'script' | 'clip' | 'audio' | 'scene_audio' | 'subtitles' | 'final_video' | 'thumbnail';
  storage_key: string;
  url: string;
  duration_sec?: number | null;
  metadata_json?: string | null;
  created_at: string;
}

export interface VideoJob {
  id: string;
  project_id: string;
  stage: 'PLAN' | 'SCRIPT' | 'VOICE' | 'SCENES' | 'VIDEO' | 'SUBTITLES' | 'FINAL_VIDEO' | 'THUMBNAIL';
  status: 'PENDING' | 'PROCESSING' | 'COMPLETED' | 'FAILED';
  error_message?: string | null;
  started_at?: string | null;
  completed_at?: string | null;
}

export interface VideoOutput {
  id: string;
  project_id: string;
  storage_key: string;
  url: string;
  duration_sec: number;
  resolution: string;
  filesize_bytes: number;
  created_at: string;
}

export interface ApiCredential {
  id: string;
  user_id: string;
  provider: 'gemini' | 'openai' | 'runway' | 'replicate' | 'fal' | string;
  api_key: string;
  is_active: number;
  created_at: string;
  updated_at: string;
}

export function maskApiKey(key?: string | null): string {
  if (!key || typeof key !== 'string') return '';
  const trimmed = key.trim();
  if (trimmed.length <= 8) {
    return '••••••••';
  }
  const prefix = trimmed.slice(0, 4);
  const suffix = trimmed.slice(-4);
  return `${prefix}••••••••${suffix}`;
}

export function getApiKey(provider: string, userId: string = DEFAULT_USER_ID): string | null {
  try {
    const db = getDb();
    const p = provider.toLowerCase().trim();

    // 1. Check central integration configs (AES-256-GCM encrypted)
    const intRow = db.prepare('SELECT credentials_encrypted FROM integration_configs WHERE provider = ? AND is_active = 1').get(p) as { credentials_encrypted?: string } | undefined;
    if (intRow && intRow.credentials_encrypted) {
      const dec = decryptToken(intRow.credentials_encrypted);
      if (dec) {
        try {
          const parsed = JSON.parse(dec);
          if (parsed.apiKey) return parsed.apiKey.trim();
          if (parsed.apiToken) return parsed.apiToken.trim();
          if (parsed.secretKey) return parsed.secretKey.trim();
          if (parsed.accessToken) return parsed.accessToken.trim();
          if (parsed.accountId) return parsed.accountId.trim();
        } catch {}
      }
    }

    // Direct aliases check in integration_configs
    if (p === 'cloudflare_api_token' || p === 'cloudflare_token') {
      const cfRow = db.prepare("SELECT credentials_encrypted FROM integration_configs WHERE provider = 'cloudflare' AND is_active = 1").get() as any;
      if (cfRow?.credentials_encrypted) {
        const dec = decryptToken(cfRow.credentials_encrypted);
        if (dec) {
          try {
            const parsed = JSON.parse(dec);
            if (parsed.apiToken) return parsed.apiToken.trim();
          } catch {}
        }
      }
    }
    if (p === 'cloudflare_account_id' || p === 'cloudflare_account') {
      const cfRow = db.prepare("SELECT credentials_encrypted FROM integration_configs WHERE provider = 'cloudflare' AND is_active = 1").get() as any;
      if (cfRow?.credentials_encrypted) {
        const dec = decryptToken(cfRow.credentials_encrypted);
        if (dec) {
          try {
            const parsed = JSON.parse(dec);
            if (parsed.accountId) return parsed.accountId.trim();
          } catch {}
        }
      }
    }
    if (p === 'fal_key' || p === 'fal') {
      const falRow = db.prepare("SELECT credentials_encrypted FROM integration_configs WHERE provider = 'fal' AND is_active = 1").get() as any;
      if (falRow?.credentials_encrypted) {
        const dec = decryptToken(falRow.credentials_encrypted);
        if (dec) {
          try {
            const parsed = JSON.parse(dec);
            if (parsed.apiKey) return parsed.apiKey.trim();
          } catch {}
        }
      }
    }
    if (p === 'pexels_api_key' || p === 'pexels') {
      const pxRow = db.prepare("SELECT credentials_encrypted FROM integration_configs WHERE provider = 'pexels' AND is_active = 1").get() as any;
      if (pxRow?.credentials_encrypted) {
        const dec = decryptToken(pxRow.credentials_encrypted);
        if (dec) {
          try {
            const parsed = JSON.parse(dec);
            if (parsed.apiKey) return parsed.apiKey.trim();
          } catch {}
        }
      }
    }
    if (p === 'pixabay_api_key' || p === 'pixabay') {
      const pxRow = db.prepare("SELECT credentials_encrypted FROM integration_configs WHERE provider = 'pixabay' AND is_active = 1").get() as any;
      if (pxRow?.credentials_encrypted) {
        const dec = decryptToken(pxRow.credentials_encrypted);
        if (dec) {
          try {
            const parsed = JSON.parse(dec);
            if (parsed.apiKey) return parsed.apiKey.trim();
          } catch {}
        }
      }
    }

    // 2. Check legacy api_credentials table
    const row = db.prepare('SELECT api_key FROM api_credentials WHERE user_id = ? AND provider = ? AND is_active = 1').get(userId, p) as { api_key: string } | undefined;
    if (row && row.api_key && row.api_key.trim()) {
      return row.api_key.trim();
    }
  } catch (err) {
    console.warn(`Error reading API key for provider ${provider}:`, err);
  }

  // Fallback to environment variables
  const p = provider.toLowerCase();
  if (p === 'openrouter') {
    return process.env.OPENROUTER_API_KEY || null;
  }
  if (p === 'gemini') {
    return process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY || null;
  }
  if (p === 'elevenlabs') {
    return process.env.ELEVENLABS_API_KEY || null;
  }
  if (p === 'openai') {
    return process.env.OPENAI_API_KEY || null;
  }
  if (p === 'cloudflare' || p === 'cloudflare_api_token') {
    return process.env.CLOUDFLARE_API_TOKEN || null;
  }
  if (p === 'cloudflare_account_id' || p === 'cloudflare_account') {
    return process.env.CLOUDFLARE_ACCOUNT_ID || null;
  }
  if (p === 'pexels' || p === 'pexels_api_key') {
    return process.env.PEXELS_API_KEY || null;
  }
  if (p === 'pixabay' || p === 'pixabay_api_key') {
    return process.env.PIXABAY_API_KEY || null;
  }
  if (p === 'runway') {
    return process.env.RUNWAY_API_KEY || null;
  }
  if (p === 'replicate') {
    return process.env.REPLICATE_API_TOKEN || null;
  }
  if (p === 'fal') {
    return process.env.FAL_KEY || process.env.FAL_AI_KEY || null;
  }
  if (p === 'polar_access_token' || p === 'polar_token') {
    return process.env.POLAR_ACCESS_TOKEN || null;
  }
  if (p === 'polar_webhook_secret' || p === 'polar_secret') {
    return process.env.POLAR_WEBHOOK_SECRET || null;
  }
  if (p.startsWith('polar_')) {
    const envKey = p.toUpperCase();
    return process.env[envKey] || null;
  }
  return null;
}

export function saveApiKey(provider: string, apiKey: string, userId: string = DEFAULT_USER_ID): boolean {
  try {
    const db = getDb();
    const now = new Date().toISOString();
    const normalizedProvider = provider.toLowerCase().trim();
    const normalizedKey = apiKey.trim();

    if (!normalizedKey) {
      db.prepare('DELETE FROM api_credentials WHERE user_id = ? AND provider = ?').run(userId, normalizedProvider);
      return true;
    }

    db.prepare(`
      INSERT INTO api_credentials (id, user_id, provider, api_key, is_active, created_at, updated_at)
      VALUES (?, ?, ?, ?, 1, ?, ?)
      ON CONFLICT(user_id, provider) DO UPDATE SET
        api_key = excluded.api_key,
        is_active = 1,
        updated_at = excluded.updated_at
    `).run(
      `cred_${userId}_${normalizedProvider}`,
      userId,
      normalizedProvider,
      normalizedKey,
      now,
      now
    );
    return true;
  } catch (err) {
    console.error(`Failed to save API key for provider ${provider}:`, err);
    return false;
  }
}

export function getAllApiCredentials(userId: string = DEFAULT_USER_ID): Record<string, { configured: boolean; maskedKey: string; source: 'database' | 'env' | 'none' }> {
  const providers = [
    'openrouter',
    'gemini',
    'elevenlabs',
    'openai',
    'cloudflare_account_id',
    'cloudflare_api_token',
    'veo',
    'fal',
    'runway',
    'sora',
    'luma',
    'replicate'
  ];
  const result: Record<string, { configured: boolean; maskedKey: string; source: 'database' | 'env' | 'none' }> = {};

  const db = getDb();
  const dbRows = db.prepare('SELECT provider, api_key FROM api_credentials WHERE user_id = ? AND is_active = 1').all(userId) as Array<{ provider: string; api_key: string }>;
  const dbMap = new Map(dbRows.map((r) => [r.provider.toLowerCase(), r.api_key]));

  for (const p of providers) {
    const dbKey = dbMap.get(p);
    if (dbKey) {
      result[p] = {
        configured: true,
        maskedKey: maskApiKey(dbKey),
        source: 'database',
      };
      continue;
    }

    let envKey: string | undefined;
    if (p === 'openrouter') envKey = process.env.OPENROUTER_API_KEY;
    else if (p === 'gemini') envKey = process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY;
    else if (p === 'elevenlabs') envKey = process.env.ELEVENLABS_API_KEY;
    else if (p === 'openai') envKey = process.env.OPENAI_API_KEY;
    else if (p === 'cloudflare_account_id') envKey = process.env.CLOUDFLARE_ACCOUNT_ID;
    else if (p === 'cloudflare_api_token') envKey = process.env.CLOUDFLARE_API_TOKEN;
    else if (p === 'veo') envKey = process.env.VEO_API_KEY || process.env.GEMINI_API_KEY;
    else if (p === 'fal') envKey = process.env.FAL_KEY || process.env.FAL_AI_KEY;
    else if (p === 'runway') envKey = process.env.RUNWAY_API_KEY;
    else if (p === 'sora') envKey = process.env.SORA_API_KEY || process.env.OPENAI_API_KEY;
    else if (p === 'luma') envKey = process.env.LUMA_API_KEY;
    else if (p === 'replicate') envKey = process.env.REPLICATE_API_TOKEN;

    if (envKey && envKey.trim()) {
      result[p] = {
        configured: true,
        maskedKey: maskApiKey(envKey),
        source: 'env',
      };
    } else {
      result[p] = {
        configured: false,
        maskedKey: '',
        source: 'none',
      };
    }
  }

  return result;
}

export function getUserCredits(userId: string = DEFAULT_USER_ID): { balance: number; tier: string; subscription_status: string; monthly_allowance: number } {
  const db = getDb();
  const row = db.prepare('SELECT balance, tier, subscription_status, monthly_allowance FROM user_credits WHERE user_id = ?').get(userId) as any;
  if (!row) {
    return { balance: 500, tier: 'CREATOR', subscription_status: 'ACTIVE', monthly_allowance: 500 };
  }
  return row;
}

export function deductUserCredits(userId: string = DEFAULT_USER_ID, amount: number, type: string, description: string, projectId?: string): boolean {
  const db = getDb();
  const now = new Date().toISOString();

  // Ensure record exists
  db.prepare(`
    INSERT INTO user_credits (user_id, balance, tier, subscription_status, monthly_allowance, created_at, updated_at)
    VALUES (?, 500, 'CREATOR', 'ACTIVE', 500, ?, ?)
    ON CONFLICT(user_id) DO NOTHING
  `).run(userId, now, now);

  // Atomic decrement: updates ONLY IF current balance >= amount
  const updateRes = db.prepare(`
    UPDATE user_credits 
    SET balance = balance - ?, updated_at = ?
    WHERE user_id = ? AND balance >= ?
  `).run(amount, now, userId, amount);

  if (updateRes.changes === 0) {
    // Insufficient credits or race condition caught safely
    return false;
  }

  // Fetch verified new balance
  const updated = getUserCredits(userId);

  try {
    db.prepare(`
      INSERT INTO credit_transactions (id, user_id, amount, balance_after, type, description, project_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(uuidv4(), userId, -amount, updated.balance, type, description, projectId || null, now);
  } catch (err) {
    console.warn('[deductUserCredits] Error logging transaction:', err);
  }

  return true;
}

export function grantUserCredits(
  userId: string,
  amount: number,
  type: string,
  description: string,
  projectId?: string | null
): number {
  const db = getDb();
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO user_credits (user_id, balance, tier, subscription_status, monthly_allowance, created_at, updated_at)
    VALUES (?, ?, 'CREATOR', 'ACTIVE', 500, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET 
      balance = user_credits.balance + excluded.balance,
      updated_at = excluded.updated_at
  `).run(userId, amount, now, now);

  const updated = getUserCredits(userId);

  try {
    db.prepare(`
      INSERT INTO credit_transactions (id, user_id, amount, balance_after, type, description, project_id, created_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(uuidv4(), userId, amount, updated.balance, type, description, projectId || null, now);
  } catch (err) {
    console.warn('[grantUserCredits] Error logging transaction:', err);
  }

  return updated.balance;
}

export function getMonthlyVideoUsage(userId: string = DEFAULT_USER_ID): { used: number; limit: number; remaining: number } {
  const db = getDb();
  const LIMIT = 30;
  try {
    // Count non-failed projects created in the current calendar month
    // Zero-Waste Policy: Failed generation runs do NOT consume quota
    const row = db.prepare(`
      SELECT COUNT(*) as count FROM content_projects
      WHERE user_id = ? 
        AND status != 'FAILED'
        AND strftime('%Y-%m', created_at) = strftime('%Y-%m', 'now')
    `).get(userId) as { count: number } | undefined;
    const used = row?.count ?? 0;
    return {
      used,
      limit: LIMIT,
      remaining: Math.max(0, LIMIT - used),
    };
  } catch (err) {
    console.warn('[getMonthlyVideoUsage] Error querying monthly usage:', err);
    return { used: 0, limit: LIMIT, remaining: LIMIT };
  }
}

// ============================================================
// CUSTOMER AUTH INTERFACES & HELPERS
// ============================================================

export interface Customer {
  id: string;
  name: string;
  email: string;
  password_hash: string;
  avatar_url?: string | null;
  email_verified: number; // 0 | 1
  deleted_at?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CustomerSession {
  id: string;
  customer_id: string;
  token_hash: string;
  ip?: string | null;
  user_agent?: string | null;
  created_at: string;
  expires_at: string;
  revoked_at?: string | null;
}

export interface Workspace {
  id: string;
  customer_id: string;
  name: string;
  slug: string;
  plan: string;
  created_at: string;
  updated_at: string;
}

export function getCustomerByEmail(email: string): Customer | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM customers WHERE email = ? AND deleted_at IS NULL').get(email.toLowerCase().trim()) as Customer | undefined;
  return row || null;
}

export function getCustomerById(id: string): Customer | null {
  const db = getDb();
  const row = db.prepare('SELECT * FROM customers WHERE id = ? AND deleted_at IS NULL').get(id) as Customer | undefined;
  return row || null;
}

export function createCustomer(data: { id: string; name: string; email: string; password_hash: string }): Customer {
  const db = getDb();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO customers (id, name, email, password_hash, email_verified, created_at, updated_at)
    VALUES (?, ?, ?, ?, 0, ?, ?)
  `).run(data.id, data.name, data.email.toLowerCase().trim(), data.password_hash, now, now);
  return getCustomerById(data.id) as Customer;
}

export function updateCustomer(id: string, updates: Partial<Pick<Customer, 'name' | 'avatar_url' | 'email_verified' | 'password_hash'>>): void {
  const db = getDb();
  const now = new Date().toISOString();
  const fields = Object.entries(updates).map(([k]) => `${k} = ?`).join(', ');
  const values = Object.values(updates);
  db.prepare(`UPDATE customers SET ${fields}, updated_at = ? WHERE id = ?`).run(...values, now, id);
}

export function softDeleteCustomer(id: string): void {
  const db = getDb();
  const now = new Date().toISOString();
  db.prepare('UPDATE customers SET deleted_at = ?, updated_at = ? WHERE id = ?').run(now, now, id);
  db.prepare('UPDATE customer_sessions SET revoked_at = ? WHERE customer_id = ? AND revoked_at IS NULL').run(now, id);
}

export function createSession(data: { id: string; customer_id: string; token_hash: string; ip?: string; user_agent?: string }): void {
  const db = getDb();
  const now = new Date().toISOString();
  const expiresAt = new Date(Date.now() + 30 * 24 * 3600 * 1000).toISOString(); // 30 days
  db.prepare(`
    INSERT INTO customer_sessions (id, customer_id, token_hash, ip, user_agent, created_at, expires_at)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `).run(data.id, data.customer_id, data.token_hash, data.ip || null, data.user_agent || null, now, expiresAt);
}

export function validateSession(tokenHash: string): Customer | null {
  const db = getDb();
  const now = new Date().toISOString();
  const session = db.prepare(`
    SELECT s.customer_id FROM customer_sessions s
    WHERE s.token_hash = ? AND s.revoked_at IS NULL AND s.expires_at > ?
  `).get(tokenHash, now) as { customer_id: string } | undefined;
  if (!session) return null;
  return getCustomerById(session.customer_id);
}

export function invalidateSession(tokenHash: string): void {
  const db = getDb();
  const now = new Date().toISOString();
  db.prepare('UPDATE customer_sessions SET revoked_at = ? WHERE token_hash = ?').run(now, tokenHash);
}

export function invalidateAllSessions(customerId: string): void {
  const db = getDb();
  const now = new Date().toISOString();
  db.prepare('UPDATE customer_sessions SET revoked_at = ? WHERE customer_id = ? AND revoked_at IS NULL').run(now, customerId);
}

export function listActiveSessions(customerId: string): CustomerSession[] {
  const db = getDb();
  const now = new Date().toISOString();
  return db.prepare(`
    SELECT id, customer_id, ip, user_agent, created_at, expires_at
    FROM customer_sessions
    WHERE customer_id = ? AND revoked_at IS NULL AND expires_at > ?
    ORDER BY created_at DESC
  `).all(customerId, now) as CustomerSession[];
}

export function createEmailVerification(data: { id: string; customer_id: string; token_hash: string }): void {
  const db = getDb();
  const expiresAt = new Date(Date.now() + 24 * 3600 * 1000).toISOString(); // 24 hours
  db.prepare(`
    INSERT INTO email_verifications (id, customer_id, token_hash, expires_at)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(token_hash) DO NOTHING
  `).run(data.id, data.customer_id, data.token_hash, expiresAt);
}

export function consumeEmailVerification(tokenHash: string): string | null {
  const db = getDb();
  const now = new Date().toISOString();
  const row = db.prepare(`
    SELECT id, customer_id FROM email_verifications
    WHERE token_hash = ? AND expires_at > ? AND used_at IS NULL
  `).get(tokenHash, now) as { id: string; customer_id: string } | undefined;
  if (!row) return null;
  db.prepare('UPDATE email_verifications SET used_at = ? WHERE id = ?').run(now, row.id);
  return row.customer_id;
}

export function createPasswordReset(data: { id: string; customer_id: string; token_hash: string }): void {
  const db = getDb();
  const expiresAt = new Date(Date.now() + 1 * 3600 * 1000).toISOString(); // 1 hour
  // Invalidate prior resets for this customer
  db.prepare('UPDATE password_resets SET used_at = ? WHERE customer_id = ? AND used_at IS NULL').run(new Date().toISOString(), data.customer_id);
  db.prepare(`
    INSERT INTO password_resets (id, customer_id, token_hash, expires_at)
    VALUES (?, ?, ?, ?)
  `).run(data.id, data.customer_id, data.token_hash, expiresAt);
}

export function consumePasswordReset(tokenHash: string): string | null {
  const db = getDb();
  const now = new Date().toISOString();
  const row = db.prepare(`
    SELECT id, customer_id FROM password_resets
    WHERE token_hash = ? AND expires_at > ? AND used_at IS NULL
  `).get(tokenHash, now) as { id: string; customer_id: string } | undefined;
  if (!row) return null;
  db.prepare('UPDATE password_resets SET used_at = ? WHERE id = ?').run(now, row.id);
  return row.customer_id;
}

export function createWorkspace(data: { id: string; customer_id: string; name: string; slug: string }): Workspace {
  const db = getDb();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO workspaces (id, customer_id, name, slug, plan, created_at, updated_at)
    VALUES (?, ?, ?, ?, 'FREE', ?, ?)
  `).run(data.id, data.customer_id, data.name, data.slug, now, now);
  db.prepare(`
    INSERT INTO workspace_members (workspace_id, customer_id, role, joined_at)
    VALUES (?, ?, 'OWNER', ?)
  `).run(data.id, data.customer_id, now);
  return db.prepare('SELECT * FROM workspaces WHERE id = ?').get(data.id) as Workspace;
}

export function getWorkspacesByCustomer(customerId: string): Workspace[] {
  const db = getDb();
  return db.prepare('SELECT * FROM workspaces WHERE customer_id = ? ORDER BY created_at ASC').all(customerId) as Workspace[];
}

// ============================================================
// CLONED VOICES HELPERS
// ============================================================

export interface UserVoice {
  id: string;
  user_id: string;
  name: string;
  voice_id: string;
  sample_url?: string | null;
  created_at: string;
}

export function getUserVoices(userId: string = DEFAULT_USER_ID): UserVoice[] {
  const db = getDb();
  try {
    return db.prepare('SELECT * FROM user_voices WHERE user_id = ? ORDER BY created_at DESC').all(userId) as UserVoice[];
  } catch (err) {
    console.warn('[getUserVoices] Error querying user voices:', err);
    return [];
  }
}

export function addUserVoice(userId: string, name: string, voiceId: string, sampleUrl?: string): UserVoice {
  const db = getDb();
  const id = `vce_${uuidv4().replace(/-/g, '').substring(0, 16)}`;
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO user_voices (id, user_id, name, voice_id, sample_url, created_at)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run(id, userId, name, voiceId, sampleUrl || null, now);
  return { id, user_id: userId, name, voice_id: voiceId, sample_url: sampleUrl || null, created_at: now };
}

export function deleteUserVoice(userId: string, voiceDbId: string): boolean {
  const db = getDb();
  const res = db.prepare('DELETE FROM user_voices WHERE id = ? AND user_id = ?').run(voiceDbId, userId);
  return res.changes > 0;
}

// ============================================================
// PERSONAL AI CREATOR TYPES & HELPERS
// ============================================================

export interface PersonalCreatorProfile {
  id: string;
  user_id: string;
  avatar_asset_id: string | null;
  voice_asset_id: string | null;
  default_style: string;
  default_language: string;
  consent_agreed_at: string | null;
  created_at: string;
  updated_at: string;
}

export interface PersonalCreatorProject {
  id: string;
  user_id: string;
  title: string;
  topic: string | null;
  script: string | null;
  style: string;
  language: string;
  aspect_ratio: string;
  presenter_position: string;
  presenter_framing: string;
  camera_motion: string;
  captions_enabled: number;
  caption_style: string;
  music_enabled: number;
  music_volume: number;
  duration: number;
  status: string;
  progress: number;
  current_stage_label: string;
  voice_type: string;
  avatar_status: string;
  final_video_url: string | null;
  final_video_path: string | null;
  error_message: string | null;
  created_at: string;
  updated_at: string;
}

export interface PersonalCreatorScene {
  id: string;
  project_id: string;
  scene_number: number;
  narration: string;
  visual_prompt: string;
  scene_topic?: string | null;
  avatar_video?: string | null;
  broll_asset?: string | null;
  caption_data?: string | null;
  duration: number;
  status: string;
  created_at: string;
}

export interface PersonalCreatorAsset {
  id: string;
  user_id: string;
  type: string;
  storage_key: string;
  mime_type: string;
  size: number;
  metadata_json?: string | null;
  created_at: string;
}

export function getPersonalCreatorProfile(userId: string): PersonalCreatorProfile | null {
  const db = getDb();
  try {
    const row = db.prepare('SELECT * FROM personal_creator_profiles WHERE user_id = ?').get(userId) as any;
    return row || null;
  } catch (err) {
    console.error('[getPersonalCreatorProfile] Error:', err);
    return null;
  }
}

export function upsertPersonalCreatorProfile(
  userId: string,
  data: Partial<PersonalCreatorProfile>
): PersonalCreatorProfile {
  const db = getDb();
  const existing = getPersonalCreatorProfile(userId);
  const now = new Date().toISOString();

  if (existing) {
    db.prepare(`
      UPDATE personal_creator_profiles
      SET avatar_asset_id = COALESCE(?, avatar_asset_id),
          voice_asset_id = COALESCE(?, voice_asset_id),
          default_style = COALESCE(?, default_style),
          default_language = COALESCE(?, default_language),
          consent_agreed_at = COALESCE(?, consent_agreed_at),
          updated_at = ?
      WHERE user_id = ?
    `).run(
      data.avatar_asset_id !== undefined ? data.avatar_asset_id : null,
      data.voice_asset_id !== undefined ? data.voice_asset_id : null,
      data.default_style !== undefined ? data.default_style : null,
      data.default_language !== undefined ? data.default_language : null,
      data.consent_agreed_at !== undefined ? data.consent_agreed_at : null,
      now,
      userId
    );
    return getPersonalCreatorProfile(userId)!;
  } else {
    const id = `prof_${uuidv4().replace(/-/g, '').substring(0, 16)}`;
    db.prepare(`
      INSERT INTO personal_creator_profiles (
        id, user_id, avatar_asset_id, voice_asset_id, default_style, default_language, consent_agreed_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      id,
      userId,
      data.avatar_asset_id || null,
      data.voice_asset_id || null,
      data.default_style || 'PODCAST',
      data.default_language || 'en',
      data.consent_agreed_at || null,
      now,
      now
    );
    return getPersonalCreatorProfile(userId)!;
  }
}

export function createPersonalCreatorAsset(data: {
  userId: string;
  type: string;
  storageKey: string;
  mimeType: string;
  size: number;
  metadata?: any;
}): PersonalCreatorAsset {
  const db = getDb();
  const id = `ast_${uuidv4().replace(/-/g, '').substring(0, 16)}`;
  const now = new Date().toISOString();
  const metaJson = data.metadata ? JSON.stringify(data.metadata) : null;

  db.prepare(`
    INSERT INTO personal_creator_assets (id, user_id, type, storage_key, mime_type, size, metadata_json, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `).run(id, data.userId, data.type, data.storageKey, data.mimeType, data.size, metaJson, now);

  return {
    id,
    user_id: data.userId,
    type: data.type,
    storage_key: data.storageKey,
    mime_type: data.mimeType,
    size: data.size,
    metadata_json: metaJson,
    created_at: now,
  };
}

export function getPersonalCreatorAsset(assetId: string, userId?: string): PersonalCreatorAsset | null {
  const db = getDb();
  try {
    if (userId) {
      return (db.prepare('SELECT * FROM personal_creator_assets WHERE id = ? AND user_id = ?').get(assetId, userId) as any) || null;
    }
    return (db.prepare('SELECT * FROM personal_creator_assets WHERE id = ?').get(assetId) as any) || null;
  } catch {
    return null;
  }
}

export function deletePersonalCreatorAsset(assetId: string, userId: string): boolean {
  const db = getDb();
  const res = db.prepare('DELETE FROM personal_creator_assets WHERE id = ? AND user_id = ?').run(assetId, userId);
  return res.changes > 0;
}

export function createPersonalCreatorProject(
  data: Partial<PersonalCreatorProject> & { userId: string; title: string }
): PersonalCreatorProject {
  const db = getDb();
  const id = `pcp_${uuidv4().replace(/-/g, '').substring(0, 16)}`;
  const now = new Date().toISOString();

  db.prepare(`
    INSERT INTO personal_creator_projects (
      id, user_id, title, topic, script, style, language, aspect_ratio,
      presenter_position, presenter_framing, camera_motion, captions_enabled,
      caption_style, music_enabled, music_volume, duration, status, progress,
      current_stage_label, voice_type, avatar_status, final_video_url, final_video_path,
      error_message, created_at, updated_at
    ) VALUES (
      ?, ?, ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?,
      ?, ?, ?, ?, ?, ?,
      ?, ?, ?, ?, ?,
      ?, ?, ?
    )
  `).run(
    id,
    data.userId,
    data.title,
    data.topic || null,
    data.script || null,
    data.style || 'PODCAST',
    data.language || 'en',
    data.aspect_ratio || '16:9',
    data.presenter_position || 'center',
    data.presenter_framing || 'medium',
    data.camera_motion || 'subtle',
    data.captions_enabled !== undefined ? data.captions_enabled : 1,
    data.caption_style || 'YouTube',
    data.music_enabled !== undefined ? data.music_enabled : 1,
    data.music_volume !== undefined ? data.music_volume : 20,
    data.duration || 0,
    data.status || 'QUEUED',
    data.progress || 0,
    data.current_stage_label || 'Queued',
    data.voice_type || 'personal',
    data.avatar_status || 'standard_presenter',
    data.final_video_url || null,
    data.final_video_path || null,
    data.error_message || null,
    now,
    now
  );

  return getPersonalCreatorProject(id, data.userId)!;
}

export function getPersonalCreatorProject(projectId: string, userId?: string): PersonalCreatorProject | null {
  const db = getDb();
  try {
    if (userId) {
      return (db.prepare('SELECT * FROM personal_creator_projects WHERE id = ? AND user_id = ?').get(projectId, userId) as any) || null;
    }
    return (db.prepare('SELECT * FROM personal_creator_projects WHERE id = ?').get(projectId) as any) || null;
  } catch {
    return null;
  }
}

export function listPersonalCreatorProjects(userId: string): PersonalCreatorProject[] {
  const db = getDb();
  try {
    return db.prepare('SELECT * FROM personal_creator_projects WHERE user_id = ? ORDER BY created_at DESC').all(userId) as any[];
  } catch (err) {
    console.error('[listPersonalCreatorProjects] Error:', err);
    return [];
  }
}

export function updatePersonalCreatorProject(
  projectId: string,
  userId: string,
  data: Partial<PersonalCreatorProject>
): boolean {
  const db = getDb();
  const fields: string[] = [];
  const values: any[] = [];

  const allowedKeys: (keyof PersonalCreatorProject)[] = [
    'title', 'topic', 'script', 'style', 'language', 'aspect_ratio',
    'presenter_position', 'presenter_framing', 'camera_motion', 'captions_enabled',
    'caption_style', 'music_enabled', 'music_volume', 'duration', 'status',
    'progress', 'current_stage_label', 'voice_type', 'avatar_status',
    'final_video_url', 'final_video_path', 'error_message'
  ];

  for (const key of allowedKeys) {
    if (data[key] !== undefined) {
      fields.push(`${key} = ?`);
      values.push(data[key]);
    }
  }

  if (fields.length === 0) return false;

  fields.push('updated_at = ?');
  values.push(new Date().toISOString());

  // Where clause
  values.push(projectId);
  if (userId) {
    values.push(userId);
    const sql = `UPDATE personal_creator_projects SET ${fields.join(', ')} WHERE id = ? AND user_id = ?`;
    const res = db.prepare(sql).run(...values);
    return res.changes > 0;
  } else {
    const sql = `UPDATE personal_creator_projects SET ${fields.join(', ')} WHERE id = ?`;
    const res = db.prepare(sql).run(...values);
    return res.changes > 0;
  }
}

export function deletePersonalCreatorProject(projectId: string, userId: string): boolean {
  const db = getDb();
  const res = db.prepare('DELETE FROM personal_creator_projects WHERE id = ? AND user_id = ?').run(projectId, userId);
  return res.changes > 0;
}

export function createPersonalCreatorScenes(
  projectId: string,
  scenes: Array<Partial<PersonalCreatorScene>>
): void {
  const db = getDb();
  const insertStmt = db.prepare(`
    INSERT INTO personal_creator_scenes (
      id, project_id, scene_number, narration, visual_prompt,
      scene_topic, avatar_video, broll_asset, caption_data, duration, status, created_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const now = new Date().toISOString();
  const transaction = db.transaction((rows: Array<Partial<PersonalCreatorScene>>) => {
    for (let i = 0; i < rows.length; i++) {
      const s = rows[i];
      const id = `pcs_${uuidv4().replace(/-/g, '').substring(0, 16)}`;
      insertStmt.run(
        id,
        projectId,
        s.scene_number ?? (i + 1),
        s.narration || '',
        s.visual_prompt || '',
        s.scene_topic || null,
        s.avatar_video || null,
        s.broll_asset || null,
        s.caption_data || null,
        s.duration || 5,
        s.status || 'PENDING',
        now
      );
    }
  });

  transaction(scenes);
}

export function getPersonalCreatorScenes(projectId: string): PersonalCreatorScene[] {
  const db = getDb();
  try {
    return db.prepare('SELECT * FROM personal_creator_scenes WHERE project_id = ? ORDER BY scene_number ASC').all(projectId) as any[];
  } catch (err) {
    console.error('[getPersonalCreatorScenes] Error:', err);
    return [];
  }
}

export function updatePersonalCreatorScene(
  sceneId: string,
  data: Partial<PersonalCreatorScene>
): boolean {
  const db = getDb();
  const fields: string[] = [];
  const values: any[] = [];

  const allowedKeys: (keyof PersonalCreatorScene)[] = [
    'narration', 'visual_prompt', 'scene_topic', 'avatar_video', 'broll_asset', 'caption_data', 'duration', 'status'
  ];

  for (const key of allowedKeys) {
    if (data[key] !== undefined) {
      fields.push(`${key} = ?`);
      values.push(data[key]);
    }
  }

  if (fields.length === 0) return false;

  values.push(sceneId);
  const sql = `UPDATE personal_creator_scenes SET ${fields.join(', ')} WHERE id = ?`;
  const res = db.prepare(sql).run(...values);
  return res.changes > 0;
}

// -------------------------------------------------------------
// Automated Daily SEO Blog System Database Helpers
// -------------------------------------------------------------

export interface DbBlogPost {
  id: string;
  slug: string;
  title: string;
  excerpt: string;
  category: string;
  read_time: string;
  publish_date: string;
  author_name: string;
  author_role: string;
  author_avatar: string;
  cover_image: string;
  gradient: string;
  tags_json: string;
  featured: number;
  content: string;
  seo_title?: string;
  seo_description?: string;
  status: 'DRAFT' | 'SCHEDULED' | 'PUBLISHED' | 'ARCHIVED';
  word_count: number;
  published_at?: string;
  created_at: string;
  updated_at: string;
}

export interface DbEditorialCalendarItem {
  id: string;
  day_index: number;
  target_date?: string;
  topic: string;
  primary_keyword: string;
  search_intent: string;
  supporting_keywords_json: string;
  target_audience: string;
  proposed_title: string;
  proposed_slug: string;
  category: string;
  research_sources_json: string;
  status: 'SCHEDULED' | 'DRAFT_GENERATED' | 'APPROVED' | 'PUBLISHED' | 'SKIPPED';
  post_id?: string;
  published_at?: string;
  error_message?: string;
  created_at: string;
  updated_at: string;
}

export function getPublishedDbBlogPosts(): DbBlogPost[] {
  const db = getDb();
  try {
    return db.prepare("SELECT * FROM blog_posts WHERE status = 'PUBLISHED' ORDER BY datetime(published_at) DESC, datetime(created_at) DESC").all() as DbBlogPost[];
  } catch (err: any) {
    console.warn('[getPublishedDbBlogPosts] Warning:', err.message);
    return [];
  }
}

export function getDbBlogPostBySlug(slug: string): DbBlogPost | undefined {
  const db = getDb();
  try {
    return db.prepare('SELECT * FROM blog_posts WHERE slug = ?').get(slug) as DbBlogPost | undefined;
  } catch (err: any) {
    console.warn('[getDbBlogPostBySlug] Warning:', err.message);
    return undefined;
  }
}

export function saveDbBlogPost(post: Partial<DbBlogPost> & { slug: string; title: string; content: string }): DbBlogPost {
  const db = getDb();
  const now = new Date().toISOString();
  const existing = getDbBlogPostBySlug(post.slug);
  const postId = existing ? existing.id : (post.id || uuidv4());

  const wordCount = post.word_count || post.content.trim().split(/\s+/).length;
  const readTime = post.read_time || `${Math.max(1, Math.ceil(wordCount / 220))} min read`;
  const publishDate = post.publish_date || new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
  const category = post.category || 'Guides';
  const authorName = post.author_name || 'Rayyan Mustafa';
  const authorRole = post.author_role || 'Founder & AI Architect';
  const authorAvatar = post.author_avatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80';
  const coverImage = post.cover_image || 'https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?auto=format&fit=crop&w=1200&q=80';
  const gradient = post.gradient || 'linear-gradient(135deg, #4f46e5 0%, #06b6d4 100%)';
  const tagsJson = post.tags_json || JSON.stringify(['AI Video', 'YouTube Automation']);
  const featured = post.featured ? 1 : 0;
  const status = post.status || 'DRAFT';
  const publishedAt = status === 'PUBLISHED' ? (post.published_at || now) : (existing?.published_at || null);
  const excerpt = post.excerpt || post.content.replace(/^[#\s]+[^\n]+/m, '').trim().slice(0, 160) + '...';

  if (existing) {
    db.prepare(`
      UPDATE blog_posts SET
        title = ?,
        excerpt = ?,
        category = ?,
        read_time = ?,
        publish_date = ?,
        author_name = ?,
        author_role = ?,
        author_avatar = ?,
        cover_image = ?,
        gradient = ?,
        tags_json = ?,
        featured = ?,
        content = ?,
        seo_title = ?,
        seo_description = ?,
        status = ?,
        word_count = ?,
        published_at = ?,
        updated_at = ?
      WHERE id = ?
    `).run(
      post.title,
      excerpt,
      category,
      readTime,
      publishDate,
      authorName,
      authorRole,
      authorAvatar,
      coverImage,
      gradient,
      tagsJson,
      featured,
      post.content,
      post.seo_title || post.title,
      post.seo_description || excerpt,
      status,
      wordCount,
      publishedAt,
      now,
      postId
    );
  } else {
    db.prepare(`
      INSERT INTO blog_posts (
        id, slug, title, excerpt, category, read_time, publish_date,
        author_name, author_role, author_avatar, cover_image, gradient,
        tags_json, featured, content, seo_title, seo_description,
        status, word_count, published_at, created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      postId,
      post.slug,
      post.title,
      excerpt,
      category,
      readTime,
      publishDate,
      authorName,
      authorRole,
      authorAvatar,
      coverImage,
      gradient,
      tagsJson,
      featured,
      post.content,
      post.seo_title || post.title,
      post.seo_description || excerpt,
      status,
      wordCount,
      publishedAt,
      now,
      now
    );
  }

  return getDbBlogPostBySlug(post.slug)!;
}

export function hasPublishedBlogOnDate(dateStr: string): boolean {
  const db = getDb();
  try {
    // Matches YYYY-MM-DD prefix of published_at or created_at
    const row = db.prepare(`
      SELECT COUNT(*) as count FROM blog_posts 
      WHERE status = 'PUBLISHED' 
        AND (published_at LIKE ? OR publish_date LIKE ?)
    `).get(`${dateStr}%`, `%${dateStr}%`) as { count: number } | undefined;
    return !!row && row.count > 0;
  } catch (err: any) {
    console.warn('[hasPublishedBlogOnDate] Warning:', err.message);
    return false;
  }
}

export function getEditorialCalendar(): DbEditorialCalendarItem[] {
  const db = getDb();
  try {
    return db.prepare('SELECT * FROM editorial_calendar ORDER BY day_index ASC').all() as DbEditorialCalendarItem[];
  } catch (err: any) {
    console.warn('[getEditorialCalendar] Warning:', err.message);
    return [];
  }
}

export function getEditorialItemByDay(dayIndex: number): DbEditorialCalendarItem | undefined {
  const db = getDb();
  try {
    return db.prepare('SELECT * FROM editorial_calendar WHERE day_index = ?').get(dayIndex) as DbEditorialCalendarItem | undefined;
  } catch (err: any) {
    console.warn('[getEditorialItemByDay] Warning:', err.message);
    return undefined;
  }
}

export function getNextScheduledEditorialItem(): DbEditorialCalendarItem | undefined {
  const db = getDb();
  try {
    return db.prepare("SELECT * FROM editorial_calendar WHERE status IN ('SCHEDULED', 'DRAFT_GENERATED', 'APPROVED') ORDER BY day_index ASC LIMIT 1").get() as DbEditorialCalendarItem | undefined;
  } catch (err: any) {
    console.warn('[getNextScheduledEditorialItem] Warning:', err.message);
    return undefined;
  }
}

export function seedEditorialCalendar(items: Omit<DbEditorialCalendarItem, 'id' | 'created_at' | 'updated_at'>[]): void {
  const db = getDb();
  const now = new Date().toISOString();
  const stmt = db.prepare(`
    INSERT OR REPLACE INTO editorial_calendar (
      id, day_index, target_date, topic, primary_keyword, search_intent,
      supporting_keywords_json, target_audience, proposed_title, proposed_slug,
      category, research_sources_json, status, post_id, published_at, error_message,
      created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const tx = db.transaction((rows: typeof items) => {
    for (const r of rows) {
      const existing = getEditorialItemByDay(r.day_index);
      const id = existing ? existing.id : uuidv4();
      stmt.run(
        id,
        r.day_index,
        r.target_date || null,
        r.topic,
        r.primary_keyword,
        r.search_intent,
        r.supporting_keywords_json || '[]',
        r.target_audience,
        r.proposed_title,
        r.proposed_slug,
        r.category || 'Guides',
        r.research_sources_json || '[]',
        r.status || 'SCHEDULED',
        r.post_id || null,
        r.published_at || null,
        r.error_message || null,
        now,
        now
      );
    }
  });

  tx(items);
}

export function updateEditorialCalendarItem(
  id: string,
  updates: Partial<DbEditorialCalendarItem>
): boolean {
  const db = getDb();
  const fields: string[] = [];
  const values: any[] = [];
  const now = new Date().toISOString();

  const allowedKeys: (keyof DbEditorialCalendarItem)[] = [
    'target_date', 'topic', 'primary_keyword', 'search_intent',
    'supporting_keywords_json', 'target_audience', 'proposed_title',
    'proposed_slug', 'category', 'research_sources_json', 'status',
    'post_id', 'published_at', 'error_message'
  ];

  for (const k of allowedKeys) {
    if (updates[k] !== undefined) {
      fields.push(`${k} = ?`);
      values.push(updates[k]);
    }
  }

  if (fields.length === 0) return false;

  fields.push('updated_at = ?');
  values.push(now);
  values.push(id);

  const res = db.prepare(`UPDATE editorial_calendar SET ${fields.join(', ')} WHERE id = ?`).run(...values);
  return res.changes > 0;
}

// ============================================================
// CHARACTER & VISUAL CONSISTENCY REGISTRY
// ============================================================

export interface DbProjectCharacter {
  id: string;
  user_id: string;
  project_id?: string | null;
  name: string;
  description: string;
  reference_image_url?: string | null;
  gender?: string | null;
  voice_id?: string | null;
  created_at: string;
  updated_at: string;
}

export function saveProjectCharacter(character: Omit<DbProjectCharacter, 'created_at' | 'updated_at'>): DbProjectCharacter {
  const db = getDb();
  const now = new Date().toISOString();
  db.prepare(`
    INSERT INTO project_characters (
      id, user_id, project_id, name, description,
      reference_image_url, gender, voice_id, created_at, updated_at
    ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(id) DO UPDATE SET
      project_id = excluded.project_id,
      name = excluded.name,
      description = excluded.description,
      reference_image_url = excluded.reference_image_url,
      gender = excluded.gender,
      voice_id = excluded.voice_id,
      updated_at = excluded.updated_at
  `).run(
    character.id,
    character.user_id,
    character.project_id || null,
    character.name,
    character.description,
    character.reference_image_url || null,
    character.gender || null,
    character.voice_id || null,
    now,
    now
  );

  return {
    ...character,
    created_at: now,
    updated_at: now,
  };
}

export function getProjectCharacters(userId: string, projectId?: string): DbProjectCharacter[] {
  const db = getDb();
  if (projectId) {
    return db.prepare(`
      SELECT * FROM project_characters
      WHERE user_id = ? AND (project_id = ? OR project_id IS NULL)
      ORDER BY updated_at DESC
    `).all(userId, projectId) as DbProjectCharacter[];
  }
  return db.prepare(`
    SELECT * FROM project_characters
    WHERE user_id = ?
    ORDER BY updated_at DESC
  `).all(userId) as DbProjectCharacter[];
}

export function getCharacterById(characterId: string): DbProjectCharacter | null {
  const db = getDb();
  return (db.prepare('SELECT * FROM project_characters WHERE id = ?').get(characterId) as DbProjectCharacter) || null;
}

// ============================================================
// COMPETITOR INTELLIGENCE REPOSITORY
// ============================================================

export interface CompetitorChannel {
  id: string;
  user_id: string;
  channel_handle: string;
  channel_id: string;
  channel_title: string;
  thumbnail_url?: string;
  subscriber_count: number;
  avg_views_7d: number;
  platform?: 'YOUTUBE' | 'TIKTOK' | 'INSTAGRAM' | string;
  last_refreshed: string;
  created_at: string;
}

export interface CompetitorViralVideo {
  id: string;
  competitor_id: string;
  video_id: string;
  title: string;
  view_count: number;
  like_count: number;
  published_at: string;
  viral_score: number;
  platform?: 'YOUTUBE' | 'TIKTOK' | 'INSTAGRAM' | string;
  thumbnail_url?: string;
  cached_at: string;
}

export function listCompetitorChannels(userId: string, platform?: string): CompetitorChannel[] {
  const db = getDb();
  try {
    if (platform) {
      return db.prepare('SELECT * FROM competitor_channels WHERE user_id = ? AND UPPER(platform) = UPPER(?) ORDER BY created_at DESC').all(userId, platform) as CompetitorChannel[];
    }
    return db.prepare('SELECT * FROM competitor_channels WHERE user_id = ? ORDER BY created_at DESC').all(userId) as CompetitorChannel[];
  } catch (err) {
    console.error('[listCompetitorChannels] Error:', err);
    return [];
  }
}

export function getCompetitorViralVideos(competitorId: string): CompetitorViralVideo[] {
  const db = getDb();
  try {
    return db.prepare('SELECT * FROM competitor_viral_cache WHERE competitor_id = ? ORDER BY viral_score DESC').all(competitorId) as CompetitorViralVideo[];
  } catch (err) {
    console.error('[getCompetitorViralVideos] Error:', err);
    return [];
  }
}

export function deleteCompetitorChannel(id: string, userId: string): boolean {
  const db = getDb();
  try {
    const res = db.prepare('DELETE FROM competitor_channels WHERE id = ? AND user_id = ?').run(id, userId);
    return res.changes > 0;
  } catch (err) {
    console.error('[deleteCompetitorChannel] Error:', err);
    return false;
  }
}



