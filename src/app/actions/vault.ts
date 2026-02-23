'use server';

// ============================================================
// KHARCHA — Vault Server Actions
// Full CRUD for emergency vault: balance, deposits, withdrawals,
// target amount, and transaction history.
//
// Encryption constraint:
//   The AES key never leaves the client — encrypted balances are
//   returned as-is for the client to decrypt. For mutations, the
//   client pre-computes the new encrypted balance and passes it
//   as VaultUpdatePayload.
// ============================================================

import { auth } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { vaultTransactionSchema } from '@/lib/validations';
import type { VaultTransactionInput } from '@/lib/validations';
import type { VaultTransaction } from '@/types';

// ============================================================
// CONSTANTS
// ============================================================

const REVALIDATE_PATHS = ['/dashboard', '/vault', '/transactions'] as const;

// ============================================================
// LOCAL VALIDATION SCHEMAS
// ============================================================

const encryptedField = z.string().trim().min(1).max(1000);
const hashField = z.string().regex(/^[a-f0-9]{64}$/, 'Invalid hash format');

const vaultPayloadSchema = z.object({
  new_balance_encrypted: encryptedField,
  new_balance_hash: hashField,
}).strict();

const targetAmountSchema = z.object({
  target_amount_encrypted: encryptedField,
}).strict();

// ============================================================
// TYPES
// ============================================================

/**
 * Required for any mutation that changes the vault balance.
 * The client decrypts the current balance, computes the new balance,
 * re-encrypts it, and passes the result here.
 */
export interface VaultUpdatePayload {
  /** AES-256-GCM encrypted new vault balance */
  new_balance_encrypted: string;
  /** SHA-256 hash of the raw new balance for integrity checks */
  new_balance_hash: string;
}

export interface VaultFullResult {
  vault: {
    id: string;
    current_balance_encrypted: string;
    target_amount_encrypted: string | null;
  };
  transactions: VaultTransaction[];
}

type ActionResult<T> = { success: true; data: T } | { error: string };
type MutationResult = { success: true } | { error: string };

// ============================================================
// HELPERS
// ============================================================

async function getAuthenticatedProfile() {
  const { userId } = await auth();
  if (!userId) throw new Error('Unauthenticated');

  const supabase = await createClient();
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('clerk_user_id', userId)
    .single();

  if (error || !profile) throw new Error('Profile not found');
  return { supabase, profileId: profile.id as string };
}

function revalidateAll() {
  REVALIDATE_PATHS.forEach((path) => revalidatePath(path));
}

// ============================================================
// ACTION: getVault
// ============================================================

/**
 * Returns the encrypted vault balance, target amount, and full
 * transaction history for the authenticated user.
 *
 * All amounts are returned encrypted — the client decrypts them.
 * Transactions are ordered newest-first.
 */
export async function getVault(): Promise<ActionResult<VaultFullResult>> {
  try {
    const { supabase, profileId } = await getAuthenticatedProfile();

    const { data: vault, error: vaultError } = await supabase
      .from('emergency_vault')
      .select('id, current_balance_encrypted, target_amount_encrypted')
      .eq('profile_id', profileId)
      .single();

    if (vaultError || !vault) {
      return { error: 'Vault not found — complete onboarding first' };
    }

    const { data: transactions, error: txError } = await supabase
      .from('vault_transactions')
      .select('*')
      .eq('vault_id', vault.id)
      .eq('profile_id', profileId)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    if (txError) {
      console.error('[getVault] Transactions fetch error:', txError);
      return { error: 'Failed to fetch vault transactions' };
    }

    return {
      success: true,
      data: {
        vault: vault as VaultFullResult['vault'],
        transactions: (transactions ?? []) as VaultTransaction[],
      },
    };
  } catch (err) {
    return { error: (err as Error).message || 'Something went wrong' };
  }
}

// ============================================================
// ACTION: depositToVault
// ============================================================

/**
 * Creates a direct deposit into the emergency vault.
 *
 * Steps:
 *   1. Validate input and balance payload
 *   2. Insert a vault_transactions record (type: 'deposit')
 *   3. Update emergency_vault.current_balance_encrypted
 *   4. Revalidate affected paths
 *
 * The client must pre-compute the new vault balance and pass it
 * as `balancePayload` since the server cannot decrypt.
 */
export async function depositToVault(
  input: VaultTransactionInput,
  balancePayload: VaultUpdatePayload,
): Promise<ActionResult<VaultTransaction>> {
  try {
    const { supabase, profileId } = await getAuthenticatedProfile();

    // Validate input
    const parsed = vaultTransactionSchema.safeParse(input);
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? 'Invalid input' };
    }

    if (parsed.data.type !== 'deposit') {
      return { error: 'Expected deposit transaction type' };
    }

    // Validate balance payload
    const balanceParsed = vaultPayloadSchema.safeParse(balancePayload);
    if (!balanceParsed.success) {
      return { error: 'Invalid vault balance payload' };
    }

    // Fetch vault
    const { data: vault, error: vaultError } = await supabase
      .from('emergency_vault')
      .select('id')
      .eq('profile_id', profileId)
      .single();

    if (vaultError || !vault) {
      return { error: 'Vault not found — complete onboarding first' };
    }

    const today = new Date().toISOString().slice(0, 10);

    // 1. Insert vault transaction record (audit trail)
    const { data: vaultTx, error: insertError } = await supabase
      .from('vault_transactions')
      .insert({
        profile_id: profileId,
        vault_id: vault.id,
        type: 'deposit',
        amount_encrypted: parsed.data.amount_encrypted,
        amount_hash: parsed.data.amount_hash,
        reason: parsed.data.reason,
        balance_after_encrypted: balancePayload.new_balance_encrypted,
        date: today,
      })
      .select()
      .single();

    if (insertError || !vaultTx) {
      console.error('[depositToVault] Insert error:', insertError);
      return { error: 'Failed to create vault deposit' };
    }

    // 2. Update vault balance
    const { error: updateError } = await supabase
      .from('emergency_vault')
      .update({ current_balance_encrypted: balancePayload.new_balance_encrypted })
      .eq('id', vault.id)
      .eq('profile_id', profileId);

    if (updateError) {
      console.error('[depositToVault] Balance update error:', updateError);
      return { error: 'Failed to update vault balance' };
    }

    revalidateAll();
    return { success: true, data: vaultTx as VaultTransaction };
  } catch (err) {
    return { error: (err as Error).message || 'Something went wrong' };
  }
}

// ============================================================
// ACTION: withdrawFromVault
// ============================================================

/**
 * Creates a withdrawal from the emergency vault.
 *
 * Steps:
 *   1. Validate input and balance payload
 *   2. Insert a vault_transactions record (type: 'withdrawal')
 *   3. Update emergency_vault.current_balance_encrypted
 *   4. Revalidate affected paths
 *
 * Balance validation (amount <= current balance) MUST be done
 * client-side — the server cannot decrypt to compare amounts.
 * The client decrypts the current balance, validates, computes
 * the new balance, and passes it as `balancePayload`.
 */
export async function withdrawFromVault(
  input: VaultTransactionInput,
  balancePayload: VaultUpdatePayload,
): Promise<ActionResult<VaultTransaction>> {
  try {
    const { supabase, profileId } = await getAuthenticatedProfile();

    // Validate input
    const parsed = vaultTransactionSchema.safeParse(input);
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? 'Invalid input' };
    }

    if (parsed.data.type !== 'withdrawal') {
      return { error: 'Expected withdrawal transaction type' };
    }

    // Validate balance payload
    const balanceParsed = vaultPayloadSchema.safeParse(balancePayload);
    if (!balanceParsed.success) {
      return { error: 'Invalid vault balance payload' };
    }

    // Fetch vault
    const { data: vault, error: vaultError } = await supabase
      .from('emergency_vault')
      .select('id')
      .eq('profile_id', profileId)
      .single();

    if (vaultError || !vault) {
      return { error: 'Vault not found — complete onboarding first' };
    }

    const today = new Date().toISOString().slice(0, 10);

    // 1. Insert vault transaction record (audit trail)
    const { data: vaultTx, error: insertError } = await supabase
      .from('vault_transactions')
      .insert({
        profile_id: profileId,
        vault_id: vault.id,
        type: 'withdrawal',
        amount_encrypted: parsed.data.amount_encrypted,
        amount_hash: parsed.data.amount_hash,
        reason: parsed.data.reason,
        balance_after_encrypted: balancePayload.new_balance_encrypted,
        date: today,
      })
      .select()
      .single();

    if (insertError || !vaultTx) {
      console.error('[withdrawFromVault] Insert error:', insertError);
      return { error: 'Failed to create vault withdrawal' };
    }

    // 2. Update vault balance
    const { error: updateError } = await supabase
      .from('emergency_vault')
      .update({ current_balance_encrypted: balancePayload.new_balance_encrypted })
      .eq('id', vault.id)
      .eq('profile_id', profileId);

    if (updateError) {
      console.error('[withdrawFromVault] Balance update error:', updateError);
      return { error: 'Failed to update vault balance' };
    }

    revalidateAll();
    return { success: true, data: vaultTx as VaultTransaction };
  } catch (err) {
    return { error: (err as Error).message || 'Something went wrong' };
  }
}

// ============================================================
// ACTION: updateVaultTarget
// ============================================================

/**
 * Sets the vault target amount (encrypted).
 * The target is displayed as a progress bar in the vault UI.
 */
export async function updateVaultTarget(
  targetAmountEncrypted: string,
): Promise<MutationResult> {
  try {
    const { supabase, profileId } = await getAuthenticatedProfile();

    // Validate
    const parsed = targetAmountSchema.safeParse({
      target_amount_encrypted: targetAmountEncrypted,
    });
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? 'Invalid target amount' };
    }

    // Update vault target
    const { error: updateError } = await supabase
      .from('emergency_vault')
      .update({ target_amount_encrypted: targetAmountEncrypted })
      .eq('profile_id', profileId);

    if (updateError) {
      console.error('[updateVaultTarget] Update error:', updateError);
      return { error: 'Failed to update vault target' };
    }

    revalidateAll();
    return { success: true };
  } catch (err) {
    return { error: (err as Error).message || 'Something went wrong' };
  }
}
