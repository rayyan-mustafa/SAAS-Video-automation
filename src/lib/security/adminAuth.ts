import { cookies, headers } from 'next/headers';
import crypto from 'crypto';

export function signAdminToken(username: string): string {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) {
    throw new Error('ADMIN_SECRET environment variable is not configured.');
  }
  const timestamp = Date.now().toString();
  const signature = crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}:${username}`)
    .digest('hex');
  return `${timestamp}.${username}.${signature}`;
}

export function verifyAdminToken(token: string): boolean {
  const secret = process.env.ADMIN_SECRET;
  if (!secret) {
    // Fail closed: without ADMIN_SECRET configured, no admin token is ever valid
    return false;
  }
  if (!token || !token.includes('.')) return false;
  const parts = token.split('.');
  if (parts.length !== 3) return false;

  const [timestamp, username, signature] = parts;
  const tokenTime = parseInt(timestamp, 10);
  if (isNaN(tokenTime) || Date.now() - tokenTime > 7 * 24 * 3600 * 1000) {
    return false; // Expired after 7 days
  }

  const expectedSignature = crypto
    .createHmac('sha256', secret)
    .update(`${timestamp}:${username}`)
    .digest('hex');

  try {
    const sigBuf = Buffer.from(signature, 'hex');
    const expBuf = Buffer.from(expectedSignature, 'hex');
    return sigBuf.length === expBuf.length && crypto.timingSafeEqual(sigBuf, expBuf);
  } catch {
    return false;
  }
}

export function checkAdminSession(): { authorized: boolean; username: string | null } {
  try {
    const cookieStore = cookies();
    const token = cookieStore.get('admin_session_token')?.value;

    if (token && verifyAdminToken(token)) {
      const parts = token.split('.');
      return { authorized: true, username: parts[1] || 'admin' };
    }

    // Also support Authorization header Bearer token for automated CLI / external webhook tests
    const headerStore = headers();
    const authHeader = headerStore.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      const bearerToken = authHeader.substring(7).trim();
      if (verifyAdminToken(bearerToken)) {
        const parts = bearerToken.split('.');
        return { authorized: true, username: parts[1] || 'admin' };
      }
    }

    return { authorized: false, username: null };
  } catch {
    return { authorized: false, username: null };
  }
}

