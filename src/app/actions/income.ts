'use server';

// ============================================================
// KHARCHA — Income Server Actions
// Handles create, update, delete, and query for income_entries.
//
// Encryption constraint:
//   The server never holds the AES key (derived from PIN client-side).
//   Therefore, whenever an emergency_fund income entry must update the
//   vault balance, the client pre-computes the new encrypted balance
//   and passes it as VaultUpdatePayload. The server only stores it.
// ============================================================

import { auth } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createIncomeSchema } from '@/lib/validations';
import type { CreateIncomeInput } from '@/lib/validations';
import type { IncomeEntry, IncomeType } from '@/types';

// ============================================================
// CONSTANTS
// ============================================================

const REVALIDATE_PATHS = ['/dashboard', '/transactions', '/vault'] as const;

const INCOME_TYPES = [
  'allowance',
  'emergency_fund',
  'festival_bonus',
  'pass_through',
  'vault_replenish',
  'other',
] as const;

// ============================================================
// LOCAL VALIDATION SCHEMAS
// ============================================================

// Re-declare primitives locally so the update schema has no defaults
// (avoids Zod applying 'INR' default when currency is omitted in a partial update)
const encryptedField = z.string().trim().min(1).max(1000);
const hashField = z.string().regex(/^[a-f0-9]{64}$/, 'Invalid hash format');
const dateField = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD');

const monthSchema = z.string().regex(/^\d{4}-\d{2}$/, 'Month must be YYYY-MM');
const uuidSchema = z.string().uuid();

/**
 * Clean partial schema for income updates — no defaults, all optional.
 * Uses `.strict()` so callers cannot pass arbitrary extra keys.
 */
const updateIncomeSchema = z.object({
  amount_encrypted: encryptedField.optional(),
  amount_hash: hashField.optional(),
  currency: z.enum(['INR', 'USD']).optional(),
  type: z.enum(INCOME_TYPES).optional(),
  description: z.string().trim().max(200).nullable().optional(),
  pass_through_for: z.string().trim().max(200).nullable().optional(),
  date: dateField.optional(),
}).strict();

// ============================================================
// VAULT PAYLOAD
// ============================================================

/**
 * Required whenever an operation touches the emergency vault balance.
 * The client decrypts the current balance, computes the new balance,
 * re-encrypts it, and passes the result here.
 */
export interface VaultUpdatePayload {
  /** AES-256-GCM encrypted new vault balance */
  new_balance_encrypted: string;
  /** SHA-256 hash of the raw new balance for integrity checks */
  new_balance_hash: string;
}

const vaultPayloadSchema = z.object({
  new_balance_encrypted: encryptedField,
  new_balance_hash: hashField,
}).strict();

// ============================================================
// RESPONSE TYPES
// ============================================================

type ActionResult<T> = { success: true; data: T } | { error: string };
type DeleteResult = { success: true } | { error: string };

// ============================================================
// INCOME FILTERS
// ============================================================

export interface IncomeFilters {
  /** YYYY-MM format — matches the generated month_year column */
  month?: string;
  type?: IncomeType;
}

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
// ACTION: createIncome
// ============================================================

/**
 * Inserts a new income entry.
 *
 * When type === 'emergency_fund', also:
 *   1. Creates a vault_transactions deposit record
 *   2. Updates emergency_vault.current_balance_encrypted
 *
 * `vaultPayload` is required for emergency_fund entries — the client
 * must provide the new encrypted vault balance since the server cannot
 * decrypt/compute it.
 */
export async function createIncome(
  input: CreateIncomeInput,
  vaultPayload?: VaultUpdatePayload,
): Promise<ActionResult<IncomeEntry>> {
  try {
    const { supabase, profileId } = await getAuthenticatedProfile();

    // Validate input
    const parsed = createIncomeSchema.safeParse(input);
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? 'Invalid input' };
    }
    const validated = parsed.data;

    // Require vault payload for emergency_fund
    if (validated.type === 'emergency_fund') {
      if (!vaultPayload) {
        return { error: 'Vault balance update is required for emergency fund entries' };
      }
      const vaultCheck = vaultPayloadSchema.safeParse(vaultPayload);
      if (!vaultCheck.success) {
        return { error: 'Invalid vault payload' };
      }
    }

    const today = new Date().toISOString().slice(0, 10);

    // Insert income entry
    const { data: entry, error: insertError } = await supabase
      .from('income_entries')
      .insert({
        profile_id: profileId,
        amount_encrypted: validated.amount_encrypted,
        amount_hash: validated.amount_hash,
        currency: validated.currency ?? 'INR',
        type: validated.type,
        description: validated.description ?? null,
        pass_through_for: validated.pass_through_for ?? null,
        date: validated.date ?? today,
        target_month: validated.target_month ?? null,
        source: 'manual',
      })
      .select()
      .single();

    if (insertError || !entry) {
      console.error('[createIncome] Insert error:', insertError);
      return { error: 'Failed to create income entry' };
    }

    // ── Vault side-effects ────────────────────────────────────
    if (validated.type === 'emergency_fund' && vaultPayload) {
      const { data: vault, error: vaultFetchError } = await supabase
        .from('emergency_vault')
        .select('id')
        .eq('profile_id', profileId)
        .single();

      if (vaultFetchError || !vault) {
        // Income entry was saved; vault sync is out of step.
        // Log prominently — client should surface this to the user.
        console.error('[createIncome] Vault not found for profile:', profileId, vaultFetchError);
      } else {
        // 1. Vault transaction record (audit trail)
        const { error: vaultTxError } = await supabase
          .from('vault_transactions')
          .insert({
            profile_id: profileId,
            vault_id: vault.id,
            type: 'deposit',
            amount_encrypted: validated.amount_encrypted,
            amount_hash: validated.amount_hash,
            reason: 'Emergency fund deposit',
            balance_after_encrypted: vaultPayload.new_balance_encrypted,
            linked_income_id: entry.id,
            date: validated.date ?? today,
          });

        if (vaultTxError) {
          console.error('[createIncome] Vault transaction insert error:', vaultTxError);
        }

        // 2. Update vault current balance
        const { error: vaultUpdateError } = await supabase
          .from('emergency_vault')
          .update({ current_balance_encrypted: vaultPayload.new_balance_encrypted })
          .eq('id', vault.id)
          .eq('profile_id', profileId);

        if (vaultUpdateError) {
          console.error('[createIncome] Vault balance update error:', vaultUpdateError);
        }
      }
    }

    revalidateAll();
    return { success: true, data: entry as IncomeEntry };
  } catch (error) {
    return { error: (error as Error).message || 'Something went wrong' };
  }
}

// ============================================================
// ACTION: updateIncome
// ============================================================

/**
 * Partially updates an existing income entry.
 *
 * Vault handling on type change:
 *   - NOT emergency_fund → emergency_fund: creates a vault deposit,
 *     requires vaultPayload.
 *   - emergency_fund → NOT emergency_fund: creates a vault withdrawal
 *     (reversal), requires vaultPayload.
 *   - Type unchanged but amount changed while still emergency_fund:
 *     vaultPayload is optional; if provided the vault balance is updated.
 *     (TODO Phase 5: always require it for amount changes on EF entries)
 */
export async function updateIncome(
  id: string,
  input: Partial<CreateIncomeInput>,
  vaultPayload?: VaultUpdatePayload,
): Promise<ActionResult<IncomeEntry>> {
  try {
    const { supabase, profileId } = await getAuthenticatedProfile();

    // Validate id
    const idResult = uuidSchema.safeParse(id);
    if (!idResult.success) {
      return { error: 'Invalid income entry ID' };
    }

    // Pre-fetch existing entry to compare type and get current amount
    const { data: existing, error: fetchError } = await supabase
      .from('income_entries')
      .select('id, type, amount_encrypted, amount_hash, date')
      .eq('id', id)
      .eq('profile_id', profileId)
      .single();

    if (fetchError || !existing) {
      return { error: 'Income entry not found' };
    }

    // Validate update fields (no defaults — uses local updateIncomeSchema)
    const parsed = updateIncomeSchema.safeParse(input);
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? 'Invalid input' };
    }
    const fields = parsed.data;

    // Build sparse update payload
    const updatePayload: Record<string, unknown> = {};
    if (fields.amount_encrypted !== undefined) updatePayload.amount_encrypted = fields.amount_encrypted;
    if (fields.amount_hash !== undefined)      updatePayload.amount_hash      = fields.amount_hash;
    if (fields.currency !== undefined)         updatePayload.currency         = fields.currency;
    if (fields.type !== undefined)             updatePayload.type             = fields.type;
    if (fields.description !== undefined)      updatePayload.description      = fields.description;
    if (fields.pass_through_for !== undefined) updatePayload.pass_through_for = fields.pass_through_for;
    if (fields.date !== undefined)             updatePayload.date             = fields.date;

    if (Object.keys(updatePayload).length === 0) {
      return { error: 'No fields provided for update' };
    }

    // Determine vault interaction requirement
    const oldType = existing.type as IncomeType;
    const newType = (fields.type ?? oldType) as IncomeType;
    const typeChangedToEF   = oldType !== 'emergency_fund' && newType === 'emergency_fund';
    const typeChangedFromEF = oldType === 'emergency_fund' && newType !== 'emergency_fund';

    if ((typeChangedToEF || typeChangedFromEF) && !vaultPayload) {
      return {
        error: 'Vault balance update is required when changing to or from emergency fund type',
      };
    }

    if (vaultPayload) {
      const vaultCheck = vaultPayloadSchema.safeParse(vaultPayload);
      if (!vaultCheck.success) {
        return { error: 'Invalid vault payload' };
      }
    }

    // Update income entry
    const { data: entry, error: updateError } = await supabase
      .from('income_entries')
      .update(updatePayload)
      .eq('id', id)
      .eq('profile_id', profileId)
      .select()
      .single();

    if (updateError || !entry) {
      console.error('[updateIncome] Update error:', updateError);
      return { error: 'Failed to update income entry' };
    }

    // ── Vault side-effects on type change ────────────────────
    if (vaultPayload && (typeChangedToEF || typeChangedFromEF)) {
      const { data: vault } = await supabase
        .from('emergency_vault')
        .select('id')
        .eq('profile_id', profileId)
        .single();

      if (vault) {
        const vaultTxType   = typeChangedToEF ? 'deposit' : 'withdrawal';
        const amountEncrypted = (fields.amount_encrypted ?? existing.amount_encrypted) as string;
        const amountHash      = (fields.amount_hash      ?? existing.amount_hash)      as string;
        const entryDate       = (fields.date             ?? existing.date)             as string;
        const reason = typeChangedToEF
          ? 'Emergency fund deposit (entry type changed)'
          : 'Emergency fund reversal (entry type changed)';

        // Vault transaction record (audit trail)
        const { error: vaultTxError } = await supabase
          .from('vault_transactions')
          .insert({
            profile_id: profileId,
            vault_id: vault.id,
            type: vaultTxType,
            amount_encrypted: amountEncrypted,
            amount_hash: amountHash,
            reason,
            balance_after_encrypted: vaultPayload.new_balance_encrypted,
            linked_income_id: id,
            date: entryDate,
          });

        if (vaultTxError) {
          console.error('[updateIncome] Vault transaction insert error:', vaultTxError);
        }

        // Update vault current balance
        const { error: vaultUpdateError } = await supabase
          .from('emergency_vault')
          .update({ current_balance_encrypted: vaultPayload.new_balance_encrypted })
          .eq('id', vault.id)
          .eq('profile_id', profileId);

        if (vaultUpdateError) {
          console.error('[updateIncome] Vault balance update error:', vaultUpdateError);
        }
      } else {
        console.error('[updateIncome] Vault not found for profile:', profileId);
      }
    }

    revalidateAll();
    return { success: true, data: entry as IncomeEntry };
  } catch (error) {
    return { error: (error as Error).message || 'Something went wrong' };
  }
}

// ============================================================
// ACTION: deleteIncome
// ============================================================

/**
 * Deletes an income entry.
 *
 * Side-effects (executed before deletion):
 *   1. If linked_expense_id exists: unlinks the paired expense
 *      (sets is_pass_through=false, linked_income_id=null on the transaction).
 *   2. If type === 'emergency_fund': creates a reversal withdrawal in
 *      vault_transactions and updates the vault balance.
 *      `vaultPayload` is required for this case.
 */
export async function deleteIncome(
  id: string,
  vaultPayload?: VaultUpdatePayload,
): Promise<DeleteResult> {
  try {
    const { supabase, profileId } = await getAuthenticatedProfile();

    const idResult = uuidSchema.safeParse(id);
    if (!idResult.success) {
      return { error: 'Invalid income entry ID' };
    }

    // Fetch entry for side-effect checks
    const { data: entry, error: fetchError } = await supabase
      .from('income_entries')
      .select('id, type, linked_expense_id, amount_encrypted, amount_hash, date')
      .eq('id', id)
      .eq('profile_id', profileId)
      .single();

    if (fetchError || !entry) {
      return { error: 'Income entry not found' };
    }

    // Require vault payload when reversing an emergency_fund deposit
    if (entry.type === 'emergency_fund' && !vaultPayload) {
      return { error: 'Vault balance update is required when deleting emergency fund entries' };
    }

    if (vaultPayload) {
      const vaultCheck = vaultPayloadSchema.safeParse(vaultPayload);
      if (!vaultCheck.success) {
        return { error: 'Invalid vault payload' };
      }
    }

    // ── 1. Unlink paired pass-through expense ─────────────────
    if (entry.linked_expense_id) {
      const { error: unlinkError } = await supabase
        .from('transactions')
        .update({ is_pass_through: false, linked_income_id: null })
        .eq('id', entry.linked_expense_id)
        .eq('profile_id', profileId);

      if (unlinkError) {
        console.error('[deleteIncome] Failed to unlink expense:', unlinkError);
        // Non-fatal — proceed; the expense will appear as a normal expense
      }
    }

    // ── 2. Reverse vault deposit ──────────────────────────────
    if (entry.type === 'emergency_fund' && vaultPayload) {
      const { data: vault } = await supabase
        .from('emergency_vault')
        .select('id')
        .eq('profile_id', profileId)
        .single();

      if (vault) {
        // Reversal withdrawal (audit trail)
        const { error: vaultTxError } = await supabase
          .from('vault_transactions')
          .insert({
            profile_id: profileId,
            vault_id: vault.id,
            type: 'withdrawal',
            amount_encrypted: entry.amount_encrypted as string,
            amount_hash: entry.amount_hash as string,
            reason: 'Emergency fund reversal (income entry deleted)',
            balance_after_encrypted: vaultPayload.new_balance_encrypted,
            linked_income_id: id,
            date: new Date().toISOString().slice(0, 10),
          });

        if (vaultTxError) {
          console.error('[deleteIncome] Vault transaction insert error:', vaultTxError);
        }

        // Update vault current balance
        const { error: vaultUpdateError } = await supabase
          .from('emergency_vault')
          .update({ current_balance_encrypted: vaultPayload.new_balance_encrypted })
          .eq('id', vault.id)
          .eq('profile_id', profileId);

        if (vaultUpdateError) {
          console.error('[deleteIncome] Vault balance update error:', vaultUpdateError);
        }
      } else {
        console.error('[deleteIncome] Vault not found for profile:', profileId);
      }
    }

    // ── 3. Delete the income entry ────────────────────────────
    const { error: deleteError } = await supabase
      .from('income_entries')
      .delete()
      .eq('id', id)
      .eq('profile_id', profileId);

    if (deleteError) {
      console.error('[deleteIncome] Delete error:', deleteError);
      return { error: 'Failed to delete income entry' };
    }

    revalidateAll();
    return { success: true };
  } catch (error) {
    return { error: (error as Error).message || 'Something went wrong' };
  }
}

// ============================================================
// ACTION: getIncomeEntries
// ============================================================

/**
 * Returns income entries, optionally filtered by month and/or type.
 * Amounts are returned encrypted — client decrypts.
 * Ordered by date DESC, created_at DESC (newest first).
 */
export async function getIncomeEntries(
  filters: IncomeFilters = {},
): Promise<ActionResult<IncomeEntry[]>> {
  try {
    const { supabase, profileId } = await getAuthenticatedProfile();

    const { month, type } = filters;

    // Validate month
    if (month !== undefined) {
      const result = monthSchema.safeParse(month);
      if (!result.success) {
        return { error: 'Month must be in YYYY-MM format' };
      }
    }

    // Validate type
    if (type !== undefined && !(INCOME_TYPES as readonly string[]).includes(type)) {
      return { error: 'Invalid income type' };
    }

    let query = supabase
      .from('income_entries')
      .select('*')
      .eq('profile_id', profileId);

    if (month) {
      query = query.eq('month_year', month);
    }

    if (type) {
      query = query.eq('type', type);
    }

    const { data: entries, error } = await query
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[getIncomeEntries] Supabase error:', error);
      return { error: 'Failed to fetch income entries' };
    }

    return { success: true, data: (entries ?? []) as IncomeEntry[] };
  } catch (error) {
    return { error: (error as Error).message || 'Something went wrong' };
  }
}
