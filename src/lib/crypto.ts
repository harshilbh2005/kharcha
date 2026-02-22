// ============================================================
// KHARCHA — Client-Side Encryption Module
// AES-256-GCM with PBKDF2 key derivation (Web Crypto API)
// ============================================================
//
// Architecture:
//   PIN → PBKDF2 (600,000 iterations, SHA-256) → AES-256-GCM Key
//   Each value encrypted with a unique random IV
//   Wire format: base64(IV‖ciphertext‖authTag)
//
// Flow:
//   1. User sets PIN during onboarding
//   2. PIN → PBKDF2 → encryption key (derived in browser)
//   3. Key held ONLY in a Zustand store (clears on tab close)
//   4. On reopen: user enters PIN → re-derive key from PIN + stored salt
//
// The PIN serves dual purpose:
//   - Unlocks the app (bcrypt hash check against DB)
//   - Derives the encryption key (PBKDF2 with stored salt)
//   - Forget PIN = lose access to encrypted data
// ============================================================

import type { DerivedKeyBundle } from '@/types';

// ============================================================
// CONSTANTS
// ============================================================

/** PBKDF2 iteration count — OWASP 2024 recommendation for SHA-256 */
const PBKDF2_ITERATIONS = 600_000;

/** Salt length in bytes for PBKDF2 key derivation */
const SALT_LENGTH = 16;

/** IV (nonce) length in bytes for AES-GCM — NIST recommended 96-bit */
const IV_LENGTH = 12;

// ============================================================
// CUSTOM ERRORS
// ============================================================

export class CryptoError extends Error {
  constructor(
    public readonly code: 'DECRYPTION_FAILED' | 'INVALID_INPUT',
    message: string,
  ) {
    super(message);
    this.name = 'CryptoError';
  }
}

// ============================================================
// KEY DERIVATION
// ============================================================

/**
 * Derives an AES-256-GCM encryption key from a user's PIN using PBKDF2.
 *
 * - Uses 600,000 iterations of PBKDF2 with SHA-256 (OWASP 2024 recommendation)
 * - Generates a random 16-byte salt if none is provided
 * - The derived key is NOT extractable (cannot be read back from CryptoKey)
 * - Salt is safe to store in the database — it is not secret
 *
 * @param pin       The user's PIN (4–6 digits)
 * @param existingSalt  Optional salt from a previous derivation (stored in DB)
 * @returns         A bundle containing the CryptoKey and the salt used
 */
export async function deriveKey(
  pin: string,
  existingSalt?: Uint8Array,
): Promise<DerivedKeyBundle> {
  if (!pin || pin.length === 0) {
    throw new CryptoError('INVALID_INPUT', 'PIN must not be empty');
  }

  const encoder = new TextEncoder();
  const salt = existingSalt
    ? new Uint8Array(existingSalt)
    : crypto.getRandomValues(new Uint8Array(SALT_LENGTH));

  // Import the raw PIN as PBKDF2 key material
  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    encoder.encode(pin),
    'PBKDF2',
    false,
    ['deriveBits', 'deriveKey'],
  );

  // Derive an AES-256-GCM key via PBKDF2
  const key = await crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      salt: salt.buffer as ArrayBuffer,
      iterations: PBKDF2_ITERATIONS,
      hash: 'SHA-256',
    },
    keyMaterial,
    { name: 'AES-GCM', length: 256 },
    false, // not extractable — key cannot be exported
    ['encrypt', 'decrypt'],
  );

  return { key, salt };
}

// ============================================================
// ENCRYPTION
// ============================================================

/**
 * Encrypts a plaintext string using AES-256-GCM.
 *
 * - Generates a fresh random 12-byte IV for every encryption call
 * - AES-GCM produces ciphertext + a 16-byte authentication tag
 * - Web Crypto appends the auth tag to the ciphertext automatically
 * - Returns: base64( IV‖ciphertext‖authTag )
 *
 * @param plaintext  The string to encrypt (e.g. "1234.56")
 * @param key        The AES-256-GCM CryptoKey from deriveKey()
 * @returns          Base64-encoded string of IV + ciphertext + authTag
 */
export async function encryptAmount(
  plaintext: string,
  key: CryptoKey,
): Promise<string> {
  if (typeof plaintext !== 'string') {
    throw new CryptoError('INVALID_INPUT', 'Plaintext must be a string');
  }

  const encoder = new TextEncoder();
  const iv = crypto.getRandomValues(new Uint8Array(IV_LENGTH));

  const ciphertext = await crypto.subtle.encrypt(
    { name: 'AES-GCM', iv: iv.buffer as ArrayBuffer },
    key,
    encoder.encode(plaintext),
  );

  // Combine IV (12 bytes) + ciphertext+authTag (variable)
  const combined = new Uint8Array(iv.length + ciphertext.byteLength);
  combined.set(iv);
  combined.set(new Uint8Array(ciphertext), iv.length);

  return btoa(Array.from(combined, (b) => String.fromCharCode(b)).join(''));
}

// ============================================================
// DECRYPTION
// ============================================================

/**
 * Decrypts an AES-256-GCM encrypted string back to plaintext.
 *
 * - Decodes the base64 input
 * - Extracts the 12-byte IV from the front
 * - Remaining bytes = ciphertext + authTag (verified automatically by AES-GCM)
 * - If the key is wrong or data has been tampered with, throws DECRYPTION_FAILED
 *
 * @param encryptedBase64  The base64-encoded string from encryptAmount()
 * @param key              The AES-256-GCM CryptoKey from deriveKey()
 * @returns                The original plaintext string
 * @throws                 CryptoError with code 'DECRYPTION_FAILED' on wrong key or tampered data
 */
export async function decryptAmount(
  encryptedBase64: string,
  key: CryptoKey,
): Promise<string> {
  if (!encryptedBase64 || typeof encryptedBase64 !== 'string') {
    throw new CryptoError('INVALID_INPUT', 'Encrypted input must be a non-empty string');
  }

  let combined: Uint8Array;
  try {
    combined = Uint8Array.from(atob(encryptedBase64), (c) => c.charCodeAt(0));
  } catch {
    throw new CryptoError('INVALID_INPUT', 'Input is not valid base64');
  }

  if (combined.length < IV_LENGTH + 1) {
    throw new CryptoError('INVALID_INPUT', 'Encrypted data is too short');
  }

  const iv = new Uint8Array(combined.slice(0, IV_LENGTH));
  const ciphertext = new Uint8Array(combined.slice(IV_LENGTH));

  try {
    const plaintext = await crypto.subtle.decrypt(
      { name: 'AES-GCM', iv: iv.buffer as ArrayBuffer },
      key,
      ciphertext,
    );
    return new TextDecoder().decode(plaintext);
  } catch {
    throw new CryptoError(
      'DECRYPTION_FAILED',
      'Decryption failed — wrong key or tampered data',
    );
  }
}

// ============================================================
// INTEGRITY HASH
// ============================================================

/**
 * Computes a SHA-256 hash of the amount string.
 *
 * Used for integrity verification — if someone modifies the encrypted blob
 * in the database, the hash won't match when we decrypt and re-hash.
 * The hash itself does NOT reveal the amount (SHA-256 is one-way),
 * but note: for small numeric spaces, an attacker could brute-force.
 * This is acceptable for our threat model (single-user, defense-in-depth).
 *
 * @param amount  The plaintext amount string (e.g. "1234.56")
 * @returns       Hex-encoded SHA-256 hash
 */
export async function hashAmount(amount: string): Promise<string> {
  if (typeof amount !== 'string') {
    throw new CryptoError('INVALID_INPUT', 'Amount must be a string');
  }

  const encoder = new TextEncoder();
  const hashBuffer = await crypto.subtle.digest('SHA-256', encoder.encode(amount));
  const hashArray = Array.from(new Uint8Array(hashBuffer));
  return hashArray.map((b) => b.toString(16).padStart(2, '0')).join('');
}

// ============================================================
// CONVENIENCE
// ============================================================

/**
 * Encrypts an amount AND computes its integrity hash in one call.
 *
 * This is the primary function used when storing amounts in the database.
 * Both values are stored together: encrypted blob in `amount_encrypted`,
 * hash in `amount_hash`.
 *
 * @param amount  The plaintext amount string (e.g. "1234.56")
 * @param key     The AES-256-GCM CryptoKey from deriveKey()
 * @returns       Object with `encrypted` (base64) and `hash` (hex) fields
 */
export async function encryptAndHash(
  amount: string,
  key: CryptoKey,
): Promise<{ encrypted: string; hash: string }> {
  const [encrypted, hash] = await Promise.all([
    encryptAmount(amount, key),
    hashAmount(amount),
  ]);
  return { encrypted, hash };
}

// ============================================================
// ROUNDTRIP TEST (uncomment to verify in browser console)
// ============================================================
//
// async function testCryptoRoundtrip() {
//   console.log('--- Crypto Roundtrip Test ---');
//
//   // 1. Derive key from PIN
//   const pin = '1234';
//   const { key, salt } = await deriveKey(pin);
//   console.log('Key derived. Salt:', btoa(String.fromCharCode(...salt)));
//
//   // 2. Encrypt an amount
//   const original = '4299.50';
//   const { encrypted, hash } = await encryptAndHash(original, key);
//   console.log('Original:', original);
//   console.log('Encrypted:', encrypted);
//   console.log('Hash:', hash);
//
//   // 3. Decrypt and verify
//   const decrypted = await decryptAmount(encrypted, key);
//   console.log('Decrypted:', decrypted);
//   console.log('Match:', original === decrypted ? 'PASS' : 'FAIL');
//
//   // 4. Verify hash
//   const rehash = await hashAmount(decrypted);
//   console.log('Hash match:', hash === rehash ? 'PASS' : 'FAIL');
//
//   // 5. Re-derive key from same PIN + salt (simulates app reopen)
//   const { key: key2 } = await deriveKey(pin, salt);
//   const decrypted2 = await decryptAmount(encrypted, key2);
//   console.log('Re-derived key decryption:', original === decrypted2 ? 'PASS' : 'FAIL');
//
//   // 6. Wrong key should fail
//   try {
//     const { key: wrongKey } = await deriveKey('9999');
//     await decryptAmount(encrypted, wrongKey);
//     console.log('Wrong key test: FAIL (should have thrown)');
//   } catch (e) {
//     const err = e as CryptoError;
//     console.log('Wrong key test:', err.code === 'DECRYPTION_FAILED' ? 'PASS' : 'FAIL');
//   }
//
//   console.log('--- Test Complete ---');
// }
//
// testCryptoRoundtrip();
