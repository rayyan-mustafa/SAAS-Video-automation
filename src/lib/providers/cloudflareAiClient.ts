import { getApiKey } from '../db';
import { IntegrationService } from '../config/integrationService';

export interface CloudflareCredentials {
  accountId: string;
  apiToken: string;
  gatewayId?: string;
}

export function getCloudflareCredentials(): CloudflareCredentials {
  let accountId = '';
  let apiToken = '';
  let gatewayId: string | undefined = undefined;

  try {
    const creds = IntegrationService.getDecryptedCredentials('cloudflare');
    accountId = creds.accountId || '';
    apiToken = creds.apiToken || '';
    gatewayId = creds.gatewayId || undefined;
  } catch {
    // Database or decryption error fallback
  }

  if (!accountId) {
    accountId = getApiKey('cloudflare_account_id') || process.env.CLOUDFLARE_ACCOUNT_ID || '';
  }
  if (!apiToken) {
    apiToken = getApiKey('cloudflare_api_token') || getApiKey('cloudflare') || process.env.CLOUDFLARE_API_TOKEN || '';
  }
  if (!gatewayId) {
    gatewayId = getApiKey('cloudflare_gateway_id') || process.env.CLOUDFLARE_AI_GATEWAY_ID || undefined;
  }

  return { accountId: accountId.trim(), apiToken: apiToken.trim(), gatewayId: gatewayId?.trim() };
}

export function isCloudflareConfigured(): boolean {
  const { accountId, apiToken } = getCloudflareCredentials();
  return Boolean(
    accountId &&
    apiToken &&
    accountId.length > 5 &&
    apiToken.length > 10 &&
    !apiToken.includes('placeholder')
  );
}

export function getCloudflareBaseUrl(creds?: Partial<CloudflareCredentials>): string {
  const resolved = { ...getCloudflareCredentials(), ...creds };
  if (!resolved.accountId) {
    throw new Error('Missing CLOUDFLARE_ACCOUNT_ID');
  }
  if (resolved.gatewayId) {
    return `https://gateway.ai.cloudflare.com/v1/${resolved.accountId}/${resolved.gatewayId}/workers-ai`;
  }
  return `https://api.cloudflare.com/client/v4/accounts/${resolved.accountId}/ai`;
}

/**
 * Execute a Cloudflare Workers AI model that returns JSON (LLMs, Whisper, Base64 FLUX, Embeddings)
 */
export async function runCloudflareJson<T = any>(
  model: string,
  payload: Record<string, unknown>,
  options?: { timeoutMs?: number; creds?: Partial<CloudflareCredentials> }
): Promise<T> {
  const creds = { ...getCloudflareCredentials(), ...options?.creds };
  if (!creds.accountId || !creds.apiToken) {
    throw new Error(`Cloudflare credentials not configured for model ${model}`);
  }

  const baseUrl = getCloudflareBaseUrl(creds);
  const url = creds.gatewayId
    ? `${baseUrl}/${model}`
    : `${baseUrl}/run/${model}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options?.timeoutMs ?? 90_000);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${creds.apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      throw new Error(
        `Cloudflare Workers AI error (${model}) [HTTP ${response.status}]: ${errorBody.slice(0, 400)}`
      );
    }

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const json = await response.json();
      return (json.result !== undefined ? json.result : json) as T;
    }

    // Binary response converted to base64
    const arrayBuffer = await response.arrayBuffer();
    const base64 = Buffer.from(arrayBuffer).toString('base64');
    return { binaryBase64: base64, contentType } as unknown as T;
  } finally {
    clearTimeout(timeout);
  }
}

/**
 * Execute a Cloudflare Workers AI model that returns a binary Buffer (e.g. Aura-2 TTS or binary PNG/JPEG)
 */
export async function runCloudflareBinary(
  model: string,
  payload: Record<string, unknown>,
  options?: { timeoutMs?: number; creds?: Partial<CloudflareCredentials> }
): Promise<Buffer> {
  const creds = { ...getCloudflareCredentials(), ...options?.creds };
  if (!creds.accountId || !creds.apiToken) {
    throw new Error(`Cloudflare credentials not configured for binary model ${model}`);
  }

  const baseUrl = getCloudflareBaseUrl(creds);
  const url = creds.gatewayId
    ? `${baseUrl}/${model}`
    : `${baseUrl}/run/${model}`;

  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), options?.timeoutMs ?? 90_000);

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${creds.apiToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
      signal: controller.signal,
    });

    if (!response.ok) {
      const errorBody = await response.text().catch(() => '');
      throw new Error(
        `Cloudflare Workers AI binary error (${model}) [HTTP ${response.status}]: ${errorBody.slice(0, 400)}`
      );
    }

    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('application/json')) {
      const json = await response.json();
      const b64 = json?.result?.image || json?.result?.audio || json?.image || json?.audio;
      if (typeof b64 === 'string') {
        return Buffer.from(b64, 'base64');
      }
      throw new Error(`Expected binary or base64 payload from ${model}, got JSON: ${JSON.stringify(json).slice(0, 200)}`);
    }

    const arrayBuffer = await response.arrayBuffer();
    return Buffer.from(arrayBuffer);
  } finally {
    clearTimeout(timeout);
  }
}
