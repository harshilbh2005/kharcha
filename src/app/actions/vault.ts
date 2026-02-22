'use server';

// ============================================================
// KHARCHA — Vault Server Actions
// Minimal read-only actions for vault balance fetching.
//
// The AES key never leaves the client — encrypted balances are
// returned as-is for the client to decrypt and re-encrypt when
// computing VaultUpdatePayload for income mutations.
// ============================================================

import { auth } from '@clerk/nextjs/server';
import { createClient } from '@/lib/supabase/server';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface VaultBalanceResult {
  id: string;
  current_balance_encrypted: string;
}

type ActionResult<T> = { data: T } | { error: string };

// ── getVaultBalance ───────────────────────────────────────────────────────────

/**
 * Returns the current encrypted vault balance for the authenticated user.
 * The client decrypts this, computes a new balance, and re-encrypts it
 * before calling income mutations that touch emergency_fund entries.
 */
export async function getVaultBalance(): Promise<ActionResult<VaultBalanceResult>> {
  try {
    const { userId } = await auth();
    if (!userId) return { error: 'Unauthenticated' };

    const supabase = await createClient();

    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id')
      .eq('clerk_user_id', userId)
      .single();

    if (profileError || !profile) {
      return { error: 'Profile not found' };
    }

    const { data: vault, error: vaultError } = await supabase
      .from('emergency_vault')
      .select('id, current_balance_encrypted')
      .eq('profile_id', profile.id)
      .single();

    if (vaultError || !vault) {
      return { error: 'Vault not found — complete onboarding first' };
    }

    return { data: vault as VaultBalanceResult };
  } catch (err) {
    return { error: (err as Error).message || 'Something went wrong' };
  }
}
