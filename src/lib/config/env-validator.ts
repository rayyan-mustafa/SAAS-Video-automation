/**
 * AUTORA SaaS Production Environment Validator
 * Enforces security and operational requirements before allowing production workloads.
 */

export interface EnvValidationResult {
  valid: boolean;
  errors: string[];
  warnings: string[];
}

const INSECURE_DEFAULT_PASSWORDS = [
  'AutoVideoAdmin2026!#',
  'admin',
  'password',
  '123456',
  'changeme',
];

const INSECURE_DEFAULT_SECRETS = [
  'autovideo_super_admin_hmac_secret_key_2026',
  'autovideo_saas_secure_fallback_secret_key_2026',
  'autovideo_oauth_state_secret_2026',
  'autovideo_oauth_state_hmac_secret_2026',
  'autovideo_default_encryption_key_32b!',
];

export function validateEnvironment(): EnvValidationResult {
  const isProd = process.env.NODE_ENV === 'production';
  const errors: string[] = [];
  const warnings: string[] = [];

  // 1. Production Secrets & Insecure Defaults Check
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (isProd) {
    if (!adminPassword || INSECURE_DEFAULT_PASSWORDS.includes(adminPassword)) {
      errors.push(
        'CRITICAL: Production ADMIN_PASSWORD is missing or set to an insecure default. Provide a strong custom password.'
      );
    }

    const adminSecret = process.env.ADMIN_SECRET;
    if (!adminSecret || INSECURE_DEFAULT_SECRETS.includes(adminSecret) || adminSecret.length < 32) {
      errors.push(
        'CRITICAL: Production ADMIN_SECRET must be at least 32 characters long and not a default secret. Generate with: openssl rand -hex 32'
      );
    }

    const encryptionKey = process.env.ENCRYPTION_KEY;
    if (!encryptionKey || INSECURE_DEFAULT_SECRETS.includes(encryptionKey)) {
      warnings.push(
        'ENCRYPTION_KEY is not explicitly set in production. Generating secure random key is strongly recommended.'
      );
    }
  }

  // 2. Database Configuration
  const dbUrl = process.env.DATABASE_URL || process.env.POSTGRES_URL || process.env.POSTGRES_PRISMA_URL;
  if (isProd && !dbUrl) {
    warnings.push(
      'DATABASE_URL is not set. Production serverless environments (Vercel) require a persistent PostgreSQL connection to prevent data loss across cold restarts.'
    );
  }

  // 3. AI Providers (At least one required for script generation)
  const hasGemini = !!(process.env.GEMINI_API_KEY || process.env.GOOGLE_API_KEY);
  const hasOpenRouter = !!process.env.OPENROUTER_API_KEY;
  const hasOpenAI = !!process.env.OPENAI_API_KEY;

  if (!hasGemini && !hasOpenRouter && !hasOpenAI) {
    errors.push('No AI script generation provider is configured. Set GEMINI_API_KEY or OPENROUTER_API_KEY.');
  }

  // 4. Stripe Payments Configuration
  const stripeKey = process.env.STRIPE_SECRET_KEY;
  if (stripeKey && !stripeKey.startsWith('sk_')) {
    errors.push('STRIPE_SECRET_KEY is configured but does not begin with "sk_".');
  }

  // 5. Cloud Storage (R2) Configuration
  const hasR2 = !!(
    process.env.R2_ACCOUNT_ID &&
    process.env.R2_ACCESS_KEY_ID &&
    process.env.R2_SECRET_ACCESS_KEY &&
    process.env.R2_BUCKET_NAME
  );
  if (isProd && !hasR2) {
    warnings.push('Cloudflare R2 is not fully configured. Using ephemeral local storage for media files.');
  }

  // 6. YouTube OAuth Configuration
  const hasYouTube = !!(process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET);
  if (!hasYouTube) {
    warnings.push('YouTube OAuth credentials (GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET) are missing. Video publishing to YouTube is disabled.');
  }

  return {
    valid: errors.length === 0,
    errors,
    warnings,
  };
}
