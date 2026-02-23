'use server';

// ============================================================
// KHARCHA — Onboarding Server Action
// Creates all initial records in sequence when a new user
// completes the onboarding wizard.
// ============================================================

import bcrypt from 'bcryptjs';
import { z } from 'zod';
import { clerkClient } from '@clerk/nextjs/server';
import { createClient } from '@/lib/supabase/server';

const BCRYPT_ROUNDS = 12;

const onboardingSchema = z.object({
  clerkUserId: z.string().min(1),
  displayName: z.string().min(1).max(50).trim(),
  pin: z.string().regex(/^\d{4,6}$/),
});

type OnboardingResult =
  | { success: true; salt: string }
  | { success: false; error: string };

/**
 * Completes the onboarding flow for a new user.
 *
 * Steps (executed in sequence):
 *   1. Validate input with Zod
 *   2. Hash PIN with bcrypt (12 rounds)
 *   3. Generate random 16-byte PBKDF2 salt
 *   4. Create or update profile record
 *   5. Seed 10 default expense categories
 *   6. Create empty emergency vault record
 *   7. Create default app_settings record
 *   8. Return the salt so the client can derive the encryption key
 */
export async function completeOnboarding(data: {
  clerkUserId: string;
  displayName: string;
  pin: string;
}): Promise<OnboardingResult> {
  // ── 1. Validate ───────────────────────────────────────────────
  const parsed = onboardingSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, error: 'Invalid input' };
  }

  const { clerkUserId, displayName, pin } = parsed.data;

  // ── 2. Hash PIN ───────────────────────────────────────────────
  const pinHash = await bcrypt.hash(pin, BCRYPT_ROUNDS);

  // ── 3. Generate PBKDF2 salt ───────────────────────────────────
  const saltBytes = new Uint8Array(16);
  crypto.getRandomValues(saltBytes);
  const saltBase64 = Buffer.from(saltBytes).toString('base64');

  const supabase = await createClient();

  // ── 4. Check for existing profile ─────────────────────────────
  const { data: existing } = await supabase
    .from('profiles')
    .select('id, onboarding_completed')
    .eq('clerk_user_id', clerkUserId)
    .single();

  if (existing?.onboarding_completed) {
    return { success: false, error: 'Onboarding already completed' };
  }

  let profileId: string;

  if (existing) {
    // Profile exists but onboarding not completed — update it
    const { error } = await supabase
      .from('profiles')
      .update({
        display_name: displayName,
        pin_hash: pinHash,
        encryption_salt: saltBase64,
        pin_enabled: true,
        onboarding_completed: true,
      })
      .eq('id', existing.id);

    if (error) {
      console.error('Failed to update profile:', error);
      return { success: false, error: 'Failed to update profile' };
    }
    profileId = existing.id;
  } else {
    // Create new profile
    const { data: newProfile, error } = await supabase
      .from('profiles')
      .insert({
        clerk_user_id: clerkUserId,
        display_name: displayName,
        pin_hash: pinHash,
        encryption_salt: saltBase64,
        pin_enabled: true,
        onboarding_completed: true,
      })
      .select('id')
      .single();

    if (error || !newProfile) {
      console.error('Failed to create profile:', error);
      return { success: false, error: 'Failed to create profile' };
    }
    profileId = newProfile.id;
  }

  // ── 5. Seed default categories ────────────────────────────────
  const defaultCategories = [
    { name: 'Food & Dining', icon: 'UtensilsCrossed', color: '#A37B6F', sort_order: 1 },
    { name: 'Transport', icon: 'Car', color: '#8B7355', sort_order: 2 },
    { name: 'Entertainment', icon: 'Gamepad2', color: '#7B6B8A', sort_order: 3 },
    { name: 'Shopping', icon: 'ShoppingBag', color: '#6B8A7B', sort_order: 4 },
    { name: 'Subscriptions', icon: 'RefreshCw', color: '#8A7B6B', sort_order: 5 },
    { name: 'Education', icon: 'GraduationCap', color: '#6B707C', sort_order: 6 },
    { name: 'Health', icon: 'Heart', color: '#B85C5C', sort_order: 7 },
    { name: 'Utilities', icon: 'Zap', color: '#C4935A', sort_order: 8 },
    { name: 'Personal', icon: 'User', color: '#6B7D71', sort_order: 9 },
    { name: 'Other', icon: 'MoreHorizontal', color: '#9599A3', sort_order: 10 },
  ];

  const { error: catError } = await supabase
    .from('categories')
    .insert(
      defaultCategories.map((cat) => ({
        profile_id: profileId,
        is_default: true,
        ...cat,
      })),
    );

  if (catError) {
    console.error('Failed to seed categories:', catError);
    // Non-fatal — continue
  }

  // ── 6. Create empty emergency vault ───────────────────────────
  const { error: vaultError } = await supabase
    .from('emergency_vault')
    .insert({
      profile_id: profileId,
      current_balance_encrypted: '0',
    });

  if (vaultError) {
    console.error('Failed to create vault:', vaultError);
    // Non-fatal — continue
  }

  // ── 7. Create app settings ────────────────────────────────────
  const { error: settingsError } = await supabase
    .from('app_settings')
    .insert({
      profile_id: profileId,
    });

  if (settingsError) {
    console.error('Failed to create app settings:', settingsError);
    // Non-fatal — continue
  }

  // ── 8. Mark onboarding complete in Clerk publicMetadata ───────
  // This is read by the middleware (via sessionClaims.metadata) to
  // gate routing — no DB call required on every request.
  try {
    const client = await clerkClient();
    await client.users.updateUser(clerkUserId, {
      publicMetadata: { onboarding_completed: true },
    });
  } catch (e) {
    // Non-fatal — the Supabase profile already has onboarding_completed:true.
    // The middleware will fall back gracefully: at worst the user sees
    // /onboarding again until their Clerk session token refreshes.
    console.error('Failed to update Clerk publicMetadata:', e);
  }

  return { success: true, salt: saltBase64 };
}
