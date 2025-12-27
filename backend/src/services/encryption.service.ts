import crypto from 'crypto';

const ALGORITHM = 'aes-256-gcm';
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY;

// Validate encryption key at startup
if (!ENCRYPTION_KEY) {
  throw new Error(
    'CRITICAL: ENCRYPTION_KEY environment variable is not set. ' +
    'This is required for encrypting sensitive data (OAuth tokens, integration credentials). ' +
    'Generate a 32-byte hex key with: openssl rand -hex 32'
  );
}

// Validate key format (must be 64 hex characters = 32 bytes)
if (!/^[a-fA-F0-9]{64}$/.test(ENCRYPTION_KEY)) {
  throw new Error(
    'CRITICAL: ENCRYPTION_KEY must be exactly 64 hexadecimal characters (32 bytes). ' +
    'Generate a valid key with: openssl rand -hex 32'
  );
}

// Store validated key as Buffer for use in crypto operations
const KEY_BUFFER = Buffer.from(ENCRYPTION_KEY, 'hex');

/**
 * Encrypts sensitive data using AES-256-GCM
 * @param text Plain text to encrypt
 * @returns Encrypted string in format: iv:authTag:encrypted
 */
export function encrypt(text: string): string {
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv(
    ALGORITHM,
    KEY_BUFFER,
    iv
  );

  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');

  const authTag = cipher.getAuthTag();

  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted}`;
}

/**
 * Decrypts data encrypted with the encrypt() function
 * @param encryptedData Encrypted string in format: iv:authTag:encrypted
 * @returns Decrypted plain text
 */
export function decrypt(encryptedData: string): string {
  const [ivHex, authTagHex, encrypted] = encryptedData.split(':');

  if (!ivHex || !authTagHex || !encrypted) {
    throw new Error('Invalid encrypted data format');
  }

  const iv = Buffer.from(ivHex, 'hex');
  const authTag = Buffer.from(authTagHex, 'hex');

  const decipher = crypto.createDecipheriv(
    ALGORITHM,
    KEY_BUFFER,
    iv
  );

  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encrypted, 'hex', 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
}

/**
 * Masks sensitive values for display (e.g., API keys)
 * Shows first 8 and last 4 characters with dots in between
 * @param value The sensitive value to mask
 * @returns Masked string like "gus_live_••••••••1234"
 */
export function maskSensitiveValue(value: string): string {
  if (!value || value.length <= 12) {
    return '••••••••';
  }

  const prefix = value.substring(0, 8);
  const suffix = value.substring(value.length - 4);
  return `${prefix}••••••••${suffix}`;
}
