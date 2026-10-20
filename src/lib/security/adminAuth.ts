import crypto from 'crypto';

export const ADMIN_COOKIE_NAME = 'admin_session_token';

export function getAdminConfig(): { user: string; pass: string; secret: string } | null {
  const user = process.env.ADMIN_USER?.trim();
  const pass = process.env.ADMIN_PASSWORD?.trim();
  const secret = process.env.ADMIN_SECRET?.trim();

  // Fail-closed: If any admin credential is missing, do NOT fallback to hardcoded strings
  if (!user || !pass || !secret) {
    return null;
  }
  return { user, pass, secret };
}

export function signAdminToken(username: string): string {
  const config = getAdminConfig();
  if (!config) {
    throw new Error('Admin secret not configured in environment');
  }
  const timestamp = Date.now().toString();
  const signature = crypto
    .createHmac('sha256', config.secret)
    .update(`${timestamp}:${username}`)
    .digest('hex');
  return `${timestamp}.${username}.${signature}`;
}

export function verifyAdminToken(token: string): boolean {
  if (!token || !token.includes('.')) return false;
  const parts = token.split('.');
  if (parts.length !== 3) return false;

  const config = getAdminConfig();
  if (!config) return false;

  const [timestamp, username, signature] = parts;
  const tokenTime = parseInt(timestamp, 10);
  if (isNaN(tokenTime) || Date.now() - tokenTime > 7 * 24 * 3600 * 1000) {
    return false; // Expired after 7 days
  }

  const expectedSignature = crypto
    .createHmac('sha256', config.secret)
    .update(`${timestamp}:${username}`)
    .digest('hex');

  try {
    return crypto.timingSafeEqual(Buffer.from(signature, 'hex'), Buffer.from(expectedSignature, 'hex'));
  } catch {
    return false;
  }
}
