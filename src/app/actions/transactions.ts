'use server';

// ============================================================
// KHARCHA — Transaction Server Actions
// Handles create, update, delete, and query for expense
// transactions. Amounts arrive pre-encrypted from the client
// (key never touches the server).
// ============================================================

import { auth } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createTransactionSchema, updateTransactionSchema } from '@/lib/validations';
import type { CreateTransactionInput } from '@/lib/validations';
import type { Transaction, SubscriptionMatchResult, NotificationCreate } from '@/types';
import { checkAnomaly, anomaliesToNotifications } from '@/lib/algorithms/anomaly-detector';
import { sanitizeText } from '@/lib/sanitize';

// ============================================================
// CONSTANTS
// ============================================================

const REVALIDATE_PATHS = ['/dashboard', '/transactions'] as const;
const PAGE_LIMIT = 50;

// ============================================================
// STUB — Subscription Matching (implemented in Phase 6)
// ============================================================

/**
 * Checks whether a newly-created transaction matches a tracked
 * subscription (by keywords, amount hash ± 5%, date ± 3 days).
 * Returns the best match or null if none found.
 */
async function matchTransaction(
  _transaction: Transaction,
  _profileId: string,
): Promise<SubscriptionMatchResult | null> {
  // TODO(Phase 6): implement subscription auto-matching
  return null;
}

// ============================================================
// HELPERS
// ============================================================

/** Fetch the authenticated Clerk user and their Supabase profile. */
async function getAuthenticatedProfile() {
  const { userId } = await auth();
  if (!userId) {
    throw new Error('Unauthenticated');
  }

  const supabase = await createClient();
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('id')
    .eq('clerk_user_id', userId)
    .single();

  if (error || !profile) {
    throw new Error('Profile not found');
  }

  return { supabase, profileId: profile.id as string };
}

function revalidateAll() {
  REVALIDATE_PATHS.forEach((path) => revalidatePath(path));
}

// ============================================================
// RESPONSE TYPES
// ============================================================

type ActionResult<T> =
  | { success: true; data: T }
  | { error: string };

type DeleteResult =
  | { success: true }
  | { error: string };

// ============================================================
// FILTERS FOR getTransactions
// ============================================================

export interface TransactionFilters {
  /** YYYY-MM format — matches the generated month_year column */
  month?: string;
  category_id?: string;
  /** 'income' is not stored in the transactions table; passing it returns [] */
  type?: 'expense' | 'income' | 'pass_through';
  /** Case-insensitive substring search across description and merchant */
  search?: string;
  /** Zero-based offset for pagination (default: 0) */
  offset?: number;
}

const monthSchema = z.string().regex(/^\d{4}-\d{2}$/, 'Month must be YYYY-MM');
const uuidSchema = z.string().uuid();

// ============================================================
// ACTION: createTransaction
// ============================================================

/**
 * Inserts a new expense transaction.
 *
 * The client is responsible for:
 *   - Encrypting the amount (amount_encrypted)
 *   - Hashing the amount (amount_hash) via hashAmount()
 *
 * After insertion the transaction is checked against tracked
 * subscriptions via matchTransaction() (stubbed for Phase 6).
 */
export async function createTransaction(
  input: CreateTransactionInput,
): Promise<ActionResult<Transaction>> {
  try {
    const { supabase, profileId } = await getAuthenticatedProfile();

    // Validate
    const parsed = createTransactionSchema.safeParse(input);
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? 'Invalid input' };
    }

    const validated = parsed.data;

    // Insert — profile_id comes from server, never from client
    const { data: transaction, error } = await supabase
      .from('transactions')
      .insert({
        profile_id: profileId,
        amount_encrypted: validated.amount_encrypted,
        amount_hash: validated.amount_hash,
        currency: validated.currency ?? 'INR',
        category_id: validated.category_id ?? null,
        description: validated.description,
        merchant: validated.merchant ?? null,
        is_pass_through: validated.is_pass_through ?? false,
        linked_income_id: validated.linked_income_id ?? null,
        is_need: validated.is_need ?? true,
        date: validated.date ?? new Date().toISOString().slice(0, 10),
        time: validated.time ?? null,
        source: 'manual',
      })
      .select()
      .single();

    if (error || !transaction) {
      console.error('[createTransaction] Supabase error:', error);
      return { error: 'Failed to create transaction' };
    }

    // Subscription matching (Phase 6 stub — no-op for now)
    await matchTransaction(transaction as Transaction, profileId);

    // ── Anomaly detection (Phase 7) ───────────────────────────────────────────
    // Velocity check runs unconditionally (count-based, no decryption needed).
    // Amount-based checks require plain_amount — not available here because
    // amounts arrive pre-encrypted from the client.
    void checkAnomaly({
      profileId,
      transactionId: (transaction as Transaction).id,
      categoryId:    validated.category_id ?? null,
      date:          validated.date ?? new Date().toISOString().slice(0, 10),
      // plain_amount intentionally omitted — key never touches server
    }).then(async (anomalies) => {
      const notifications = anomaliesToNotifications(anomalies);
      if (notifications.length === 0) return;

      const supabaseInner = await createClient();
      const rows: NotificationCreate[] = notifications.map((n) => ({
        profile_id: profileId,
        type:       'anomaly_detected',
        title:      n.title,
        message:    n.message,
        is_read:    false,
        action_url: '/transactions',
      }));

      const { error } = await supabaseInner
        .from('notifications')
        .insert(rows);

      if (error) {
        console.warn('[createTransaction] Failed to insert anomaly notifications:', error.message);
      }
    }).catch((err: unknown) => {
      // Non-critical — never block the response
      console.warn('[createTransaction] Anomaly detection error:', err);
    });

    revalidateAll();

    return { success: true, data: transaction as Transaction };
  } catch (error) {
    return { error: (error as Error).message || 'Something went wrong' };
  }
}

// ============================================================
// ACTION: updateTransaction
// ============================================================

/**
 * Partially updates an existing transaction.
 * Only provided fields are written; omitted fields are untouched.
 */
export async function updateTransaction(
  id: string,
  input: Partial<CreateTransactionInput>,
): Promise<ActionResult<Transaction>> {
  try {
    const { supabase, profileId } = await getAuthenticatedProfile();

    // Validate id
    const idResult = uuidSchema.safeParse(id);
    if (!idResult.success) {
      return { error: 'Invalid transaction ID' };
    }

    // Validate the update payload by running it through updateTransactionSchema
    // (which makes all fields optional). We inject the id so the schema is satisfied.
    const parsed = updateTransactionSchema.safeParse({ id, ...input });
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? 'Invalid input' };
    }

    // Build only the fields that were explicitly provided
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { id: _id, ...fields } = parsed.data;
    const updatePayload: Record<string, unknown> = {};

    if (fields.amount_encrypted !== undefined) updatePayload.amount_encrypted = fields.amount_encrypted;
    if (fields.amount_hash !== undefined)      updatePayload.amount_hash      = fields.amount_hash;
    if (fields.currency !== undefined)         updatePayload.currency         = fields.currency;
    if (fields.category_id !== undefined)      updatePayload.category_id      = fields.category_id;
    if (fields.description !== undefined)      updatePayload.description      = fields.description;
    if (fields.merchant !== undefined)         updatePayload.merchant         = fields.merchant;
    if (fields.is_pass_through !== undefined)  updatePayload.is_pass_through  = fields.is_pass_through;
    if (fields.linked_income_id !== undefined) updatePayload.linked_income_id = fields.linked_income_id;
    if (fields.is_need !== undefined)          updatePayload.is_need          = fields.is_need;
    if (fields.date !== undefined)             updatePayload.date             = fields.date;
    if (fields.time !== undefined)             updatePayload.time             = fields.time;

    if (Object.keys(updatePayload).length === 0) {
      return { error: 'No fields provided for update' };
    }

    const { data: transaction, error } = await supabase
      .from('transactions')
      .update(updatePayload)
      .eq('id', id)
      .eq('profile_id', profileId) // RLS guard: only own transactions
      .select()
      .single();

    if (error || !transaction) {
      console.error('[updateTransaction] Supabase error:', error);
      return { error: 'Failed to update transaction' };
    }

    revalidateAll();

    return { success: true, data: transaction as Transaction };
  } catch (error) {
    return { error: (error as Error).message || 'Something went wrong' };
  }
}

// ============================================================
// ACTION: deleteTransaction
// ============================================================

/**
 * Deletes a transaction.
 *
 * Pass-through handling:
 *   If the transaction is a pass-through expense, the linked income
 *   entry has its linked_expense_id nulled out before deletion so the
 *   income entry is not orphaned with a dangling FK reference.
 */
export async function deleteTransaction(id: string): Promise<DeleteResult> {
  try {
    const { supabase, profileId } = await getAuthenticatedProfile();

    // Validate id
    const idResult = uuidSchema.safeParse(id);
    if (!idResult.success) {
      return { error: 'Invalid transaction ID' };
    }

    // Fetch the transaction to check is_pass_through and linked_income_id
    const { data: transaction, error: fetchError } = await supabase
      .from('transactions')
      .select('id, is_pass_through, linked_income_id')
      .eq('id', id)
      .eq('profile_id', profileId)
      .single();

    if (fetchError || !transaction) {
      return { error: 'Transaction not found' };
    }

    // If pass-through, unlink the paired income entry first
    if (transaction.is_pass_through && transaction.linked_income_id) {
      const { error: unlinkError } = await supabase
        .from('income_entries')
        .update({ linked_expense_id: null })
        .eq('id', transaction.linked_income_id)
        .eq('profile_id', profileId);

      if (unlinkError) {
        console.error('[deleteTransaction] Failed to unlink income entry:', unlinkError);
        // Non-fatal — proceed with deletion anyway
      }
    }

    // Delete the transaction
    const { error: deleteError } = await supabase
      .from('transactions')
      .delete()
      .eq('id', id)
      .eq('profile_id', profileId);

    if (deleteError) {
      console.error('[deleteTransaction] Supabase error:', deleteError);
      return { error: 'Failed to delete transaction' };
    }

    revalidateAll();

    return { success: true };
  } catch (error) {
    return { error: (error as Error).message || 'Something went wrong' };
  }
}

// ============================================================
// ACTION: getTransactions
// ============================================================

/**
 * Returns a paginated, encrypted list of transactions.
 *
 * Decryption is the client's responsibility — amounts are returned
 * as-is (amount_encrypted, amount_hash).
 *
 * Ordering: date DESC, created_at DESC (newest first).
 * Pagination: limit 50 per page, offset-based.
 */
export async function getTransactions(
  filters: TransactionFilters = {},
): Promise<ActionResult<Transaction[]>> {
  try {
    const { supabase, profileId } = await getAuthenticatedProfile();

    const { month, category_id, type, search, offset = 0 } = filters;

    // Income type is stored in a separate table — not accessible here
    if (type === 'income') {
      return { success: true, data: [] };
    }

    // Validate optional filter values
    if (month !== undefined) {
      const result = monthSchema.safeParse(month);
      if (!result.success) {
        return { error: 'Month must be in YYYY-MM format' };
      }
    }

    if (category_id !== undefined) {
      const result = uuidSchema.safeParse(category_id);
      if (!result.success) {
        return { error: 'Invalid category ID' };
      }
    }

    let query = supabase
      .from('transactions')
      .select('*')
      .eq('profile_id', profileId);

    // ── Filters ──────────────────────────────────────────────

    if (month) {
      query = query.eq('month_year', month);
    }

    if (category_id) {
      query = query.eq('category_id', category_id);
    }

    if (type === 'pass_through') {
      query = query.eq('is_pass_through', true);
    } else if (type === 'expense') {
      query = query.eq('is_pass_through', false);
    }

    if (search && search.trim().length > 0) {
      // Sanitize + escape PostgreSQL ilike special characters (%, _, \)
      const sanitized = sanitizeText(search);
      const term = sanitized
        .replace(/\\/g, '\\\\')
        .replace(/%/g, '\\%')
        .replace(/_/g, '\\_');
      // Search description OR merchant (case-insensitive)
      query = query.or(
        `description.ilike.%${term}%,merchant.ilike.%${term}%`,
      );
    }

    // ── Ordering + Pagination ─────────────────────────────────

    const { data: transactions, error } = await query
      .order('date', { ascending: false })
      .order('created_at', { ascending: false })
      .range(offset, offset + PAGE_LIMIT - 1);

    if (error) {
      console.error('[getTransactions] Supabase error:', error);
      return { error: 'Failed to fetch transactions' };
    }

    return { success: true, data: (transactions ?? []) as Transaction[] };
  } catch (error) {
    return { error: (error as Error).message || 'Something went wrong' };
  }
}
