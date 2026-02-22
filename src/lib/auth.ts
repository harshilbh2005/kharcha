// ============================================================
// KHARCHA — Server-Side Auth Utilities
// Fetches the current user's profile from Supabase using Clerk JWT.
// ============================================================

import { auth } from '@clerk/nextjs/server';
import { createClient } from '@/lib/supabase/server';
import type { Profile } from '@/types';

// ============================================================
// getProfile — Fetches the current user's profile
// ============================================================

/**
 * Fetches the authenticated user's profile from Supabase.
 *
 * Returns `null` in three cases:
 *   1. User is not signed in via Clerk
 *   2. Profile row does not exist yet (pre-onboarding)
 *   3. Database error
 *
 * Used by layouts and pages to determine:
 *   - Whether to redirect to /onboarding (no profile or onboarding_completed = false)
 *   - Whether the user has PIN enabled
 */
export async function getProfile(): Promise<Profile | null> {
  const { userId } = await auth();
  if (!userId) return null;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('clerk_user_id', userId)
    .single();

  if (error || !data) return null;

  return data as Profile;
}

/**
 * Returns the Clerk user ID for the current request.
 * Returns null if not authenticated.
 */
export async function getClerkUserId(): Promise<string | null> {
  const { userId } = await auth();
  return userId;
}
