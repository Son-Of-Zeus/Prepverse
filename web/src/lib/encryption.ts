/**
 * Encryption Manager for E2E messaging.
 * Uses AES-256-CBC to match Android implementation.
 * Format: "iv:ciphertext" in Base64
 */

// Store session keys in memory (cleared on page reload for security)
const sessionKeys = new Map<string, CryptoKey>();

/**
 * Generate a new AES-256 key for a session.
 * Returns the key as a Base64-encoded string for sharing.
 */
export async function generateSessionKey(): Promise<string> {
  const key = await crypto.subtle.generateKey(
    { name: 'AES-CBC', length: 256 },
    true, // extractable
    ['encrypt', 'decrypt']
  );

  const rawKey = await crypto.subtle.exportKey('raw', key);
  return arrayBufferToBase64(rawKey);
}

/**
 * Store a session key for encryption/decryption.
 * Call this when joining a session with the shared key.
 */
export async function storeSessionKey(sessionId: string, keyBase64: string): Promise<void> {
  const keyData = base64ToArrayBuffer(keyBase64);
  const key = await crypto.subtle.importKey(
    'raw',
    keyData,
    { name: 'AES-CBC', length: 256 },
    false, // not extractable
    ['encrypt', 'decrypt']
  );
  sessionKeys.set(sessionId, key);
}

/**
 * Get the session key if it exists.
 */
export function hasSessionKey(sessionId: string): boolean {
  return sessionKeys.has(sessionId);
}

/**
 * Encrypt a message for a specific session.
 * Returns: "iv:ciphertext" format in Base64 (matching Android)
 */
export async function encrypt(message: string, sessionId: string): Promise<string> {
  const key = sessionKeys.get(sessionId);
  if (!key) {
    throw new Error(`No key found for session ${sessionId}`);
  }

  // Generate random 16-byte IV
  const iv = crypto.getRandomValues(new Uint8Array(16));

  // Encrypt
  const encoder = new TextEncoder();
  const data = encoder.encode(message);

  const encrypted = await crypto.subtle.encrypt(
    { name: 'AES-CBC', iv },
    key,
    data
  );

  // Format: "iv:ciphertext" in Base64
  const ivBase64 = arrayBufferToBase64(iv.buffer);
  const encryptedBase64 = arrayBufferToBase64(encrypted);

  return `${ivBase64}:${encryptedBase64}`;
}

/**
 * Decrypt a message for a specific session.
 * Input format: "iv:ciphertext" in Base64
 */
export async function decrypt(encryptedData: string, sessionId: string): Promise<string> {
  const key = sessionKeys.get(sessionId);
  if (!key) {
    throw new Error(`No key found for session ${sessionId}`);
  }

  const parts = encryptedData.split(':');
  if (parts.length !== 2 || !parts[0] || !parts[1]) {
    throw new Error('Invalid encrypted data format');
  }

  const iv = base64ToArrayBuffer(parts[0]);
  const encrypted = base64ToArrayBuffer(parts[1]);

  const decrypted = await crypto.subtle.decrypt(
    { name: 'AES-CBC', iv: new Uint8Array(iv) },
    key,
    encrypted
  );

  const decoder = new TextDecoder();
  return decoder.decode(decrypted);
}

/**
 * Clear session key when leaving a session.
 */
export function clearSessionKey(sessionId: string): void {
  sessionKeys.delete(sessionId);
}

/**
 * Clear all session keys (call on logout).
 */
export function clearAllKeys(): void {
  sessionKeys.clear();
}

// Utility functions for Base64 encoding/decoding
function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    const byte = bytes[i];
    if (byte !== undefined) {
      binary += String.fromCharCode(byte);
    }
  }
  return btoa(binary);
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binary = atob(base64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  return bytes.buffer;
}
