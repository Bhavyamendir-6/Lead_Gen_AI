// Professional Lead Gen Platform - Enterprise Module
// Secure Cookie Encryption Layer

import crypto from 'crypto';

// The encryption key must be 32 bytes (256 bits) for AES-256-GCM
// This is fetched from environment variables.
const ENCRYPTION_KEY = process.env.ENCRYPTION_KEY || 'default_32_byte_key_for_dev_only!';
const ALGORITHM = 'aes-256-gcm';

export const encryptCookie = (text: string): string => {
  const iv = crypto.randomBytes(16); // Initialization vector
  const cipher = crypto.createCipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY.padEnd(32).substring(0, 32)), iv);
  
  let encrypted = cipher.update(text, 'utf8', 'hex');
  encrypted += cipher.final('hex');
  
  const authTag = cipher.getAuthTag();

  // Combine IV, encrypted text, and AuthTag for storage
  return `${iv.toString('hex')}:${encrypted}:${authTag.toString('hex')}`;
};

export const decryptCookie = (encryptedText: string): string => {
  const parts = encryptedText.split(':');
  if (parts.length !== 3) throw new Error('Invalid encrypted text format');

  const iv = Buffer.from(parts[0], 'hex');
  const encryptedTextBuffer = Buffer.from(parts[1], 'hex');
  const authTag = Buffer.from(parts[2], 'hex');

  const decipher = crypto.createDecipheriv(ALGORITHM, Buffer.from(ENCRYPTION_KEY.padEnd(32).substring(0, 32)), iv);
  decipher.setAuthTag(authTag);

  let decrypted = decipher.update(encryptedTextBuffer, undefined, 'utf8');
  decrypted += decipher.final('utf8');

  return decrypted;
};