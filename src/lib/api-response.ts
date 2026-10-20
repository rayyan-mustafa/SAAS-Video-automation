import { NextResponse } from 'next/server';

export interface ApiErrorOptions {
  status?: number;
  internalError?: any;
  logPrefix?: string;
}

/**
 * Checks whether an error message is safe to expose to end users.
 * Internal database syntax errors, OS file paths, and stack traces are masked.
 */
function isSafeClientMessage(msg: string): boolean {
  if (!msg || typeof msg !== 'string') return false;
  const lower = msg.toLowerCase();
  
  // Sensitive keywords to mask
  const forbiddenPatterns = [
    'sqlite',
    'postgres',
    'sql_',
    'syntax error',
    'column',
    'relation',
    'table',
    'enoent',
    'eacces',
    'c:\\',
    '/home/',
    '/var/',
    '/tmp/',
    'node_modules',
    'stack',
    'secret',
    'bearer',
    'api_key',
    'password',
    'undefined is not',
    'null is not',
    'cannot read property',
  ];

  return !forbiddenPatterns.some((pattern) => lower.includes(pattern));
}

/**
 * Returns a standardized, sanitized JSON error response.
 */
export function apiError(
  clientMessage: string,
  options: ApiErrorOptions = {}
): NextResponse {
  const status = options.status || 500;
  const isProd = process.env.NODE_ENV === 'production';

  if (options.internalError) {
    const prefix = options.logPrefix ? `[${options.logPrefix}] ` : '';
    console.error(`${prefix}Internal Error (${status}):`, options.internalError);
  }

  let finalMessage = clientMessage;

  // In production, mask unsafe messages
  if (isProd && !isSafeClientMessage(clientMessage)) {
    finalMessage = 'An unexpected internal error occurred. Please try again later.';
  }

  return NextResponse.json(
    {
      success: false,
      error: finalMessage,
    },
    { status }
  );
}

/**
 * Returns a standardized JSON success response.
 */
export function apiSuccess<T extends Record<string, any>>(
  data: T,
  status: number = 200
): NextResponse {
  return NextResponse.json(
    {
      success: true,
      ...data,
    },
    { status }
  );
}
