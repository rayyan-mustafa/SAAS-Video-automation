import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const PREFIX = 'enc:v1:';

function getEncryptionKey(): Buffer {
  const envKey = process.env.ENCRYPTION_KEY || process.env.ADMIN_SECRET || 'autovideo_default_encryption_key_32b!';
  // Deterministically hash the key to ensure it is always 32 bytes for aes-256-gcm
  return crypto.createHash('sha256').update(envKey).digest();
}

/**
 * Encrypts sensitive credentials (like OAuth access/refresh tokens) using AES-256-GCM.
 * Output format: enc:v1:<iv_hex>:<tag_hex>:<ciphertext_hex>
 */
export function encryptToken(token: string | null | undefined): string | null {
  if (!token) return null;
  // If already encrypted, return as is
  if (token.startsWith(PREFIX)) return token;

  const iv = crypto.randomBytes(12); // 96-bit IV recommended for GCM
  const cipher = crypto.createCipheriv(ALGORITHM, getEncryptionKey(), iv);
  
  let ciphertext = cipher.update(token, 'utf8', 'hex');
  ciphertext += cipher.final('hex');
  const tag = cipher.getAuthTag().toString('hex');

  return `${PREFIX}${iv.toString('hex')}:${tag}:${ciphertext}`;
}

/**
 * Decrypts sensitive credentials encrypted with AES-256-GCM.
 * If the input is not encrypted (legacy plaintext token), it transparently returns the input.
 */
export function decryptToken(encryptedToken: string | null | undefined): string | null {
  if (!encryptedToken) return null;
  if (!encryptedToken.startsWith(PREFIX)) {
    // Legacy plaintext token migration path
    return encryptedToken;
  }

  try {
    const raw = encryptedToken.slice(PREFIX.length);
    const parts = raw.split(':');
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted token format');
    }

    const [ivHex, tagHex, ciphertextHex] = parts;
    const iv = Buffer.from(ivHex, 'hex');
    const tag = Buffer.from(tagHex, 'hex');
    const decipher = crypto.createDecipheriv(ALGORITHM, getEncryptionKey(), iv);
    decipher.setAuthTag(tag);

    let decrypted = decipher.update(ciphertextHex, 'hex', 'utf8');
    decrypted += decipher.final('utf8');
    return decrypted;
  } catch (err) {
    console.error('Failed to decrypt token:', err);
    return null;
  }
}
