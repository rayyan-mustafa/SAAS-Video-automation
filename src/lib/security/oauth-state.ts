import crypto from 'crypto';

const STATE_MAX_AGE_MS = 15 * 60 * 1000; // 15 minutes expiration window

function getStateSecret(): string {
  return process.env.AUTH_SECRET || process.env.ADMIN_SECRET || 'autovideo_oauth_state_hmac_secret_2026';
}

// Track used nonces in memory to prevent replay attacks
const usedNonces = new Set<string>();

/**
 * Generates an unpredictable, cryptographically signed, single-use, time-limited OAuth state token.
 */
export function generateOAuthState(userId: string): string {
  const nonce = crypto.randomBytes(16).toString('hex');
  const timestamp = Date.now();
  const data = `${userId}:${timestamp}:${nonce}`;
  const signature = crypto.createHmac('sha256', getStateSecret()).update(data).digest('hex');
  
  const payload = JSON.stringify({ userId, timestamp, nonce, signature });
  return Buffer.from(payload).toString('base64url');
}

/**
 * Validates the authenticity, freshness, session ownership, and single-use status of an OAuth state token.
 */
export function verifyOAuthState(
  state: string | null | undefined,
  expectedUserId?: string
): { valid: boolean; userId?: string; error?: string } {
  if (!state || typeof state !== 'string') {
    return { valid: false, error: 'Missing OAuth state' };
  }

  try {
    let jsonStr: string;
    try {
      jsonStr = Buffer.from(state, 'base64url').toString('utf8');
    } catch {
      return { valid: false, error: 'Invalid base64 encoding in state' };
    }

    const parsed = JSON.parse(jsonStr);
    const { userId, timestamp, nonce, signature } = parsed;

    if (!userId || !timestamp || !nonce || !signature) {
      return { valid: false, error: 'Malformed OAuth state structure' };
    }

    // 1. Verify expiration (15 minutes)
    if (Date.now() - timestamp > STATE_MAX_AGE_MS || timestamp > Date.now() + 60000) {
      return { valid: false, error: 'OAuth state has expired. Please initiate connection again.' };
    }

    // 2. Verify cryptographic signature
    const data = `${userId}:${timestamp}:${nonce}`;
    const expectedSig = crypto.createHmac('sha256', getStateSecret()).update(data).digest('hex');

    const sigBuffer = Buffer.from(signature, 'hex');
    const expectedBuffer = Buffer.from(expectedSig, 'hex');

    if (sigBuffer.length !== expectedBuffer.length || !crypto.timingSafeEqual(sigBuffer, expectedBuffer)) {
      return { valid: false, error: 'Tampered OAuth state signature' };
    }

    // 3. Single-use check (replay protection)
    if (usedNonces.has(nonce)) {
      return { valid: false, error: 'OAuth state has already been consumed (replay attempt detected)' };
    }

    // 4. Session matching check
    if (expectedUserId && expectedUserId !== userId) {
      return { valid: false, error: 'OAuth state does not match the active session user' };
    }

    usedNonces.add(nonce);
    return { valid: true, userId };
  } catch (err: any) {
    return { valid: false, error: 'Invalid or unparseable OAuth state' };
  }
}
