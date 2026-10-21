import crypto from 'node:crypto';
import { env } from '../config/env.js';

// Derive a fixed 32-byte key from server secret
const SECRET_SEED = env.clerkSecretKey || process.env.TOKEN_ENCRYPTION_SECRET || 'aajkyabanaye-swiggy-token-secure-key-seed';
const ENCRYPTION_KEY = crypto.createHash('sha256').update(SECRET_SEED).digest();

/**
 * Encrypt plaintext string using AES-256-GCM with authentication tag
 */
export function encryptToken(plainText: string): string {
  if (!plainText) return '';
  const iv = crypto.randomBytes(12); // standard 96-bit IV for GCM
  const cipher = crypto.createCipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
  
  const encrypted = Buffer.concat([cipher.update(plainText, 'utf8'), cipher.final()]);
  const authTag = cipher.getAuthTag();

  // Return formatted string: iv:authTag:encryptedContent
  return `${iv.toString('hex')}:${authTag.toString('hex')}:${encrypted.toString('hex')}`;
}

/**
 * Decrypt token ciphertext using AES-256-GCM and verify authentication tag
 */
export function decryptToken(cipherPackage: string): string | null {
  if (!cipherPackage) return null;
  const parts = cipherPackage.split(':');
  if (parts.length !== 3) {
    return null;
  }

  const [ivHex, authTagHex, encryptedHex] = parts;
  try {
    const iv = Buffer.from(ivHex, 'hex');
    const authTag = Buffer.from(authTagHex, 'hex');
    const encrypted = Buffer.from(encryptedHex, 'hex');

    const decipher = crypto.createDecipheriv('aes-256-gcm', ENCRYPTION_KEY, iv);
    decipher.setAuthTag(authTag);

    const decrypted = Buffer.concat([decipher.update(encrypted), decipher.final()]);
    return decrypted.toString('utf8');
  } catch (err) {
    console.warn('Token decryption failed or auth tag mismatched:', err);
    return null;
  }
}
