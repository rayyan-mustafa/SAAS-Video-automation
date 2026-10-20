/**
 * Sliding-Window IP-Based Rate Limiter
 * Provides robust brute-force protection for sensitive endpoints (e.g. admin auth).
 */

interface RateLimitRecord {
  timestamps: number[];
}

const rateLimitStore = new Map<string, RateLimitRecord>();

// Periodically clean up stale entries every 5 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    rateLimitStore.forEach((record, key) => {
      record.timestamps = record.timestamps.filter((ts: number) => now - ts < 3600000); // 1 hour max retention
      if (record.timestamps.length === 0) {
        rateLimitStore.delete(key);
      }
    });
  }, 300000).unref?.();
}

export interface RateLimitResult {
  limited: boolean;
  remaining: number;
  resetMs: number;
  totalAttempts: number;
}

export function checkRateLimit(
  key: string,
  maxAttempts: number = 5,
  windowMs: number = 15 * 60 * 1000 // 15 minutes default
): RateLimitResult {
  const now = Date.now();
  let record = rateLimitStore.get(key);

  if (!record) {
    record = { timestamps: [] };
    rateLimitStore.set(key, record);
  }

  // Filter out timestamps outside the sliding window
  record.timestamps = record.timestamps.filter((ts) => now - ts < windowMs);

  if (record.timestamps.length >= maxAttempts) {
    const oldest = record.timestamps[0];
    const resetMs = Math.max(0, windowMs - (now - oldest));
    return {
      limited: true,
      remaining: 0,
      resetMs,
      totalAttempts: record.timestamps.length,
    };
  }

  // Record this attempt
  record.timestamps.push(now);

  const remaining = Math.max(0, maxAttempts - record.timestamps.length);
  const oldest = record.timestamps[0];
  const resetMs = Math.max(0, windowMs - (now - oldest));

  return {
    limited: false,
    remaining,
    resetMs,
    totalAttempts: record.timestamps.length,
  };
}

export function resetRateLimit(key: string): void {
  rateLimitStore.delete(key);
}

export function getClientIp(req: Request): string {
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) {
    return forwarded.split(',')[0].trim();
  }
  const realIp = req.headers.get('x-real-ip');
  if (realIp) {
    return realIp.trim();
  }
  return '127.0.0.1';
}
