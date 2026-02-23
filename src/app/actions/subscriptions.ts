'use server';

// ============================================================
// KHARCHA — Subscription Server Actions
// Handles create, update, delete, query, and markAsPaid for
// tracked subscriptions. Amounts arrive pre-encrypted from the
// client (key never touches the server).
// ============================================================

import { auth } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { createSubscriptionSchema } from '@/lib/validations';
import type { CreateSubscriptionInput, UpdateSubscriptionInput } from '@/lib/validations';
import type { Subscription } from '@/types';

// ============================================================
// CONSTANTS
// ============================================================

const REVALIDATE_PATHS = ['/dashboard', '/transactions', '/subscriptions'] as const;

// ============================================================
// LOCAL VALIDATION SCHEMAS
// ============================================================

// Re-declare primitives locally so the update schema has no defaults
const encryptedField = z.string().trim().min(1).max(1000);
const dateField = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD');
const uuidSchema = z.string().uuid();

/**
 * Clean partial schema for subscription updates — no defaults, all optional.
 */
const updateSubscriptionSchema = z.object({
  name: z.string().trim().min(1).max(100).optional(),
  amount_encrypted: encryptedField.optional(),
  amount_inr_encrypted: encryptedField.nullable().optional(),
  currency: z.enum(['INR', 'USD']).optional(),
  billing_day: z.number().int().min(1).max(31).nullable().optional(),
  billing_cycle: z.enum(['monthly', 'yearly']).optional(),
  category_id: z.string().uuid().nullable().optional(),
  is_active: z.boolean().optional(),
  next_billing_date: dateField.nullable().optional(),
  last_paid_date: dateField.nullable().optional(),
  auto_match_keywords: z.array(z.string().trim().max(50)).max(10).nullable().optional(),
  remind_days_before: z.number().int().min(0).max(14).optional(),
  notes: z.string().trim().max(500).nullable().optional(),
}).strict();

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

/**
 * Compute the next billing date from a billing day.
 * If the computed date is in the past (or today), advance to next month.
 */
function computeNextBillingDate(
  billingDay: number,
  cycle: 'monthly' | 'yearly',
  fromDate: Date = new Date(),
): string {
  const year = fromDate.getFullYear();
  const month = fromDate.getMonth();

  // Clamp billing day to actual days in the target month
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const clampedDay = Math.min(billingDay, daysInMonth);

  let nextBilling = new Date(year, month, clampedDay);

  // If the computed date is today or in the past, advance
  if (nextBilling <= fromDate) {
    if (cycle === 'yearly') {
      nextBilling = new Date(year + 1, month, clampedDay);
    } else {
      // Monthly: advance one month, re-clamp day
      const nextMonth = month + 1;
      const nextYear = nextMonth > 11 ? year + 1 : year;
      const normalizedMonth = nextMonth % 12;
      const daysInNextMonth = new Date(nextYear, normalizedMonth + 1, 0).getDate();
      const clampedNextDay = Math.min(billingDay, daysInNextMonth);
      nextBilling = new Date(nextYear, normalizedMonth, clampedNextDay);
    }
  }

  return nextBilling.toISOString().slice(0, 10);
}

/**
 * Advance a billing date by one cycle (month or year).
 */
function advanceBillingDate(
  currentDate: string,
  billingDay: number,
  cycle: 'monthly' | 'yearly',
): string {
  const date = new Date(currentDate);
  const year = date.getFullYear();
  const month = date.getMonth();

  if (cycle === 'yearly') {
    const daysInTargetMonth = new Date(year + 1, month + 1, 0).getDate();
    const clampedDay = Math.min(billingDay, daysInTargetMonth);
    return new Date(year + 1, month, clampedDay).toISOString().slice(0, 10);
  }

  // Monthly
  const nextMonth = month + 1;
  const nextYear = nextMonth > 11 ? year + 1 : year;
  const normalizedMonth = nextMonth % 12;
  const daysInNextMonth = new Date(nextYear, normalizedMonth + 1, 0).getDate();
  const clampedDay = Math.min(billingDay, daysInNextMonth);
  return new Date(nextYear, normalizedMonth, clampedDay).toISOString().slice(0, 10);
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
// FILTERS FOR getSubscriptions
// ============================================================

export interface SubscriptionFilters {
  is_active?: boolean;
}

// ============================================================
// ACTION: getSubscriptions
// ============================================================

/**
 * Returns all subscriptions for the authenticated user.
 * Ordered by next_billing_date (soonest first), then created_at.
 */
export async function getSubscriptions(
  filters: SubscriptionFilters = {},
): Promise<ActionResult<Subscription[]>> {
  try {
    const { supabase, profileId } = await getAuthenticatedProfile();

    let query = supabase
      .from('subscriptions')
      .select('*')
      .eq('profile_id', profileId);

    if (filters.is_active !== undefined) {
      query = query.eq('is_active', filters.is_active);
    }

    const { data: subscriptions, error } = await query
      .order('next_billing_date', { ascending: true, nullsFirst: false })
      .order('created_at', { ascending: false });

    if (error) {
      console.error('[getSubscriptions] Supabase error:', error);
      return { error: 'Failed to fetch subscriptions' };
    }

    return { success: true, data: (subscriptions ?? []) as Subscription[] };
  } catch (error) {
    return { error: (error as Error).message || 'Something went wrong' };
  }
}

// ============================================================
// ACTION: createSubscription
// ============================================================

/**
 * Inserts a new subscription.
 *
 * The client encrypts amount_encrypted (and amount_inr_encrypted
 * for USD subscriptions) before calling this action.
 * Computes next_billing_date from billing_day automatically.
 */
export async function createSubscription(
  input: CreateSubscriptionInput & { amount_inr_encrypted?: string | null; notes?: string | null },
): Promise<ActionResult<Subscription>> {
  try {
    const { supabase, profileId } = await getAuthenticatedProfile();

    // Strip extra fields before strict schema validation
    const { amount_inr_encrypted: _inr, notes: _notes, ...schemaInput } = input;

    // Validate
    const parsed = createSubscriptionSchema.safeParse(schemaInput);
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? 'Invalid input' };
    }

    const validated = parsed.data;

    // Compute next billing date
    const nextBillingDate = computeNextBillingDate(
      validated.billing_day,
      validated.billing_cycle ?? 'monthly',
    );

    // Insert
    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .insert({
        profile_id: profileId,
        name: validated.name,
        amount_encrypted: validated.amount_encrypted,
        currency: validated.currency,
        amount_inr_encrypted: input.amount_inr_encrypted ?? null,
        billing_day: validated.billing_day,
        billing_cycle: validated.billing_cycle ?? 'monthly',
        category_id: validated.category_id ?? null,
        is_active: true,
        next_billing_date: nextBillingDate,
        auto_match_keywords: validated.auto_match_keywords ?? null,
        remind_days_before: validated.remind_days_before ?? 3,
        notes: input.notes ?? null,
      })
      .select()
      .single();

    if (error || !subscription) {
      console.error('[createSubscription] Supabase error:', error);
      return { error: 'Failed to create subscription' };
    }

    revalidateAll();

    return { success: true, data: subscription as Subscription };
  } catch (error) {
    return { error: (error as Error).message || 'Something went wrong' };
  }
}

// ============================================================
// ACTION: updateSubscription
// ============================================================

/**
 * Partially updates an existing subscription.
 * Only provided fields are written; omitted fields are untouched.
 */
export async function updateSubscription(
  id: string,
  input: UpdateSubscriptionInput,
): Promise<ActionResult<Subscription>> {
  try {
    const { supabase, profileId } = await getAuthenticatedProfile();

    // Validate id
    const idResult = uuidSchema.safeParse(id);
    if (!idResult.success) {
      return { error: 'Invalid subscription ID' };
    }

    // Validate the update payload
    const parsed = updateSubscriptionSchema.safeParse(input);
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? 'Invalid input' };
    }

    const fields = parsed.data;

    // Build sparse update — only fields that were explicitly provided
    const updatePayload: Record<string, unknown> = {};

    if (fields.name !== undefined) updatePayload.name = fields.name;
    if (fields.amount_encrypted !== undefined) updatePayload.amount_encrypted = fields.amount_encrypted;
    if (fields.amount_inr_encrypted !== undefined) updatePayload.amount_inr_encrypted = fields.amount_inr_encrypted;
    if (fields.currency !== undefined) updatePayload.currency = fields.currency;
    if (fields.billing_day !== undefined) updatePayload.billing_day = fields.billing_day;
    if (fields.billing_cycle !== undefined) updatePayload.billing_cycle = fields.billing_cycle;
    if (fields.category_id !== undefined) updatePayload.category_id = fields.category_id;
    if (fields.is_active !== undefined) updatePayload.is_active = fields.is_active;
    if (fields.next_billing_date !== undefined) updatePayload.next_billing_date = fields.next_billing_date;
    if (fields.last_paid_date !== undefined) updatePayload.last_paid_date = fields.last_paid_date;
    if (fields.auto_match_keywords !== undefined) updatePayload.auto_match_keywords = fields.auto_match_keywords;
    if (fields.remind_days_before !== undefined) updatePayload.remind_days_before = fields.remind_days_before;
    if (fields.notes !== undefined) updatePayload.notes = fields.notes;

    if (Object.keys(updatePayload).length === 0) {
      return { error: 'No fields provided for update' };
    }

    // If billing_day changed to a non-null value, recompute next_billing_date
    // (unless next_billing_date was explicitly set in this update)
    if (fields.billing_day != null && fields.next_billing_date === undefined) {
      const cycle = fields.billing_cycle ?? 'monthly';
      updatePayload.next_billing_date = computeNextBillingDate(fields.billing_day, cycle);
    }

    const { data: subscription, error } = await supabase
      .from('subscriptions')
      .update(updatePayload)
      .eq('id', id)
      .eq('profile_id', profileId) // RLS guard
      .select()
      .single();

    if (error || !subscription) {
      console.error('[updateSubscription] Supabase error:', error);
      return { error: 'Failed to update subscription' };
    }

    revalidateAll();

    return { success: true, data: subscription as Subscription };
  } catch (error) {
    return { error: (error as Error).message || 'Something went wrong' };
  }
}

// ============================================================
// ACTION: deleteSubscription
// ============================================================

/**
 * Deletes a subscription permanently.
 */
export async function deleteSubscription(id: string): Promise<DeleteResult> {
  try {
    const { supabase, profileId } = await getAuthenticatedProfile();

    const idResult = uuidSchema.safeParse(id);
    if (!idResult.success) {
      return { error: 'Invalid subscription ID' };
    }

    const { error } = await supabase
      .from('subscriptions')
      .delete()
      .eq('id', id)
      .eq('profile_id', profileId);

    if (error) {
      console.error('[deleteSubscription] Supabase error:', error);
      return { error: 'Failed to delete subscription' };
    }

    revalidateAll();

    return { success: true };
  } catch (error) {
    return { error: (error as Error).message || 'Something went wrong' };
  }
}

// ============================================================
// ACTION: markAsPaid
// ============================================================

/**
 * Links a transaction to a subscription payment.
 *
 * Updates:
 *   1. Subscription: `last_paid_date` → transaction date,
 *      `next_billing_date` advanced by one cycle
 *   2. Transaction: `is_subscription` = true,
 *      `subscription_id` = subscriptionId
 */
export async function markAsPaid(
  subscriptionId: string,
  transactionId: string,
): Promise<ActionResult<Subscription>> {
  try {
    const { supabase, profileId } = await getAuthenticatedProfile();

    // Validate IDs
    const subIdResult = uuidSchema.safeParse(subscriptionId);
    const txnIdResult = uuidSchema.safeParse(transactionId);
    if (!subIdResult.success || !txnIdResult.success) {
      return { error: 'Invalid ID' };
    }

    // Fetch the subscription to get billing_day and billing_cycle
    const { data: subscription, error: subError } = await supabase
      .from('subscriptions')
      .select('*')
      .eq('id', subscriptionId)
      .eq('profile_id', profileId)
      .single();

    if (subError || !subscription) {
      return { error: 'Subscription not found' };
    }

    // Fetch the transaction to get its date
    const { data: transaction, error: txnError } = await supabase
      .from('transactions')
      .select('date')
      .eq('id', transactionId)
      .eq('profile_id', profileId)
      .single();

    if (txnError || !transaction) {
      return { error: 'Transaction not found' };
    }

    const txnDate = transaction.date as string;
    const billingDay = (subscription.billing_day as number) ?? new Date(txnDate).getDate();
    const cycle = (subscription.billing_cycle as 'monthly' | 'yearly') ?? 'monthly';

    // Advance next_billing_date from the transaction date
    const nextBillingDate = advanceBillingDate(txnDate, billingDay, cycle);

    // Update subscription
    const { data: updatedSub, error: updateSubError } = await supabase
      .from('subscriptions')
      .update({
        last_paid_date: txnDate,
        next_billing_date: nextBillingDate,
      })
      .eq('id', subscriptionId)
      .eq('profile_id', profileId)
      .select()
      .single();

    if (updateSubError || !updatedSub) {
      console.error('[markAsPaid] Failed to update subscription:', updateSubError);
      return { error: 'Failed to update subscription' };
    }

    // Update transaction to link it
    const { error: updateTxnError } = await supabase
      .from('transactions')
      .update({
        is_subscription: true,
        subscription_id: subscriptionId,
      })
      .eq('id', transactionId)
      .eq('profile_id', profileId);

    if (updateTxnError) {
      console.error('[markAsPaid] Failed to update transaction:', updateTxnError);
      // Non-fatal — subscription was already updated
    }

    revalidateAll();

    return { success: true, data: updatedSub as Subscription };
  } catch (error) {
    return { error: (error as Error).message || 'Something went wrong' };
  }
}
