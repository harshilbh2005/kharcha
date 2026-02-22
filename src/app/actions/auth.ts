'use server';

// ============================================================
// KHARCHA — PIN Authentication Server Actions
// Handles PIN setup, verification, change, and lockout logic.
// PIN serves dual purpose: app unlock (bcrypt) + encryption key derivation (PBKDF2).
// ============================================================

import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';

// ============================================================
// VALIDATION
// ============================================================

const pinSchema = z.string().regex(/^\d{4,6}$/, 'PIN must be 4–6 digits');

// ============================================================
// LOCKOUT TRACKING (in-memory, resets on server restart)
// ============================================================

interface LockoutEntry {
  attempts: number;
  lockedUntil: number; // timestamp (ms), 0 = not locked
}

const lockoutMap = new Map<string, LockoutEntry>();

/** Lockout schedule: attempts → lockout duration in seconds */
function getLockoutSeconds(attempts: number): number {
  if (attempts <= 3) return 0;
  if (attempts === 4) return 15;
  if (attempts === 5) return 30;
  if (attempts === 6) return 60;
  if (attempts === 7) return 300;
  return 900; // 8+: 15 minutes
}

const MAX_ATTEMPTS = 15;
const BCRYPT_ROUNDS = 12;

// ============================================================
// RESPONSE TYPES
// ============================================================

type SetupPinResult =
  | { success: true; salt: string }
  | { success: false; error: string };

type VerifyPinResult =
  | { success: true; salt: string }
  | { success: false; locked: true; lockoutSeconds: number }
  | { success: false; locked: false; attemptsRemaining: number }
  | { success: false; fullyLocked: true };

type ChangePinResult =
  | { success: true; needsReEncryption: true; newSalt: string }
  | { success: false; error: string };

// ============================================================
// ACTION: setupPin
// Called during onboarding to set the user's PIN for the first time.
// ============================================================

export async function setupPin(
  pin: string,
  clerkUserId: string,
): Promise<SetupPinResult> {
  // Validate
  const parsed = pinSchema.safeParse(pin);
  if (!parsed.success) {
    return { success: false, error: 'PIN must be 4–6 digits' };
  }

  // Hash PIN with bcrypt for verification
  const pinHash = await bcrypt.hash(pin, BCRYPT_ROUNDS);

  // Generate random 16-byte salt for PBKDF2 key derivation, encode as base64
  const saltBytes = new Uint8Array(16);
  crypto.getRandomValues(saltBytes);
  const saltBase64 = Buffer.from(saltBytes).toString('base64');

  // Store in profiles
  const supabase = await createClient();
  const { error } = await supabase
    .from('profiles')
    .update({
      pin_hash: pinHash,
      encryption_salt: saltBase64,
      pin_enabled: true,
    })
    .eq('clerk_user_id', clerkUserId);

  if (error) {
    return { success: false, error: 'Failed to save PIN' };
  }

  return { success: true, salt: saltBase64 };
}

// ============================================================
// ACTION: verifyPin
// Called on app open to unlock the app and derive encryption key.
// ============================================================

export async function verifyPin(
  pin: string,
  clerkUserId: string,
): Promise<VerifyPinResult> {
  // Validate format
  const parsed = pinSchema.safeParse(pin);
  if (!parsed.success) {
    return { success: false, locked: false, attemptsRemaining: 0 };
  }

  // Check lockout state
  const entry = lockoutMap.get(clerkUserId);
  if (entry) {
    // Fully locked after MAX_ATTEMPTS
    if (entry.attempts >= MAX_ATTEMPTS) {
      return { success: false, fullyLocked: true };
    }

    // Time-based lockout still active
    if (entry.lockedUntil > Date.now()) {
      const remainingMs = entry.lockedUntil - Date.now();
      return {
        success: false,
        locked: true,
        lockoutSeconds: Math.ceil(remainingMs / 1000),
      };
    }
  }

  // Fetch pin_hash and encryption_salt from DB
  const supabase = await createClient();
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('pin_hash, encryption_salt')
    .eq('clerk_user_id', clerkUserId)
    .single();

  if (error || !profile?.pin_hash || !profile?.encryption_salt) {
    return { success: false, locked: false, attemptsRemaining: 0 };
  }

  // Compare PIN
  const isValid = await bcrypt.compare(pin, profile.pin_hash);

  if (!isValid) {
    // Increment failed attempts
    const current = lockoutMap.get(clerkUserId) ?? { attempts: 0, lockedUntil: 0 };
    const newAttempts = current.attempts + 1;
    const lockoutSec = getLockoutSeconds(newAttempts);

    lockoutMap.set(clerkUserId, {
      attempts: newAttempts,
      lockedUntil: lockoutSec > 0 ? Date.now() + lockoutSec * 1000 : 0,
    });

    if (newAttempts >= MAX_ATTEMPTS) {
      return { success: false, fullyLocked: true };
    }

    if (lockoutSec > 0) {
      return { success: false, locked: true, lockoutSeconds: lockoutSec };
    }

    return {
      success: false,
      locked: false,
      attemptsRemaining: MAX_ATTEMPTS - newAttempts,
    };
  }

  // Success — clear lockout
  lockoutMap.delete(clerkUserId);

  return { success: true, salt: profile.encryption_salt };
}

// ============================================================
// ACTION: changePin
// Changes the PIN. Requires old PIN verification first.
// Returns a flag indicating all encrypted data must be re-encrypted.
// ============================================================

export async function changePin(
  oldPin: string,
  newPin: string,
  clerkUserId: string,
): Promise<ChangePinResult> {
  // Validate new PIN format
  const parsed = pinSchema.safeParse(newPin);
  if (!parsed.success) {
    return { success: false, error: 'New PIN must be 4–6 digits' };
  }

  // Verify old PIN first (reuse verifyPin logic inline to avoid double DB call)
  const supabase = await createClient();
  const { data: profile, error: fetchError } = await supabase
    .from('profiles')
    .select('pin_hash')
    .eq('clerk_user_id', clerkUserId)
    .single();

  if (fetchError || !profile?.pin_hash) {
    return { success: false, error: 'Profile not found' };
  }

  const isValid = await bcrypt.compare(oldPin, profile.pin_hash);
  if (!isValid) {
    return { success: false, error: 'Current PIN is incorrect' };
  }

  // Hash new PIN
  const newPinHash = await bcrypt.hash(newPin, BCRYPT_ROUNDS);

  // Generate new encryption salt
  const newSaltBytes = new Uint8Array(16);
  crypto.getRandomValues(newSaltBytes);
  const newSaltBase64 = Buffer.from(newSaltBytes).toString('base64');

  // Update in DB
  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      pin_hash: newPinHash,
      encryption_salt: newSaltBase64,
    })
    .eq('clerk_user_id', clerkUserId);

  if (updateError) {
    return { success: false, error: 'Failed to update PIN' };
  }

  // Clear any lockout state
  lockoutMap.delete(clerkUserId);

  return { success: true, needsReEncryption: true, newSalt: newSaltBase64 };
}
