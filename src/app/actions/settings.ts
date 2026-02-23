'use server';

// ============================================================
// KHARCHA — Settings Server Actions
//
// Covers:
//   • updateProfileSettings  — biometrics, budget alert %, toggles
//   • updateAppSettings      — AI categorization flag
//   • getAppSettings         — fetch current app_settings row
//   • changePinAction        — thin wrapper; auth.ts changePin doesn't expose userId
//   • getTaskerWebhookSecret — retrieve (masked) secret
//   • regenerateTaskerSecret — generate a new 32-byte hex secret
//   • exportTransactionsCSV  — returns CSV string (amounts excluded — encrypted on server)
// ============================================================

import { auth } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { sanitizeText } from '@/lib/sanitize';
import { changePin } from '@/app/actions/auth';
import type { AppSettings, Profile } from '@/types';

// ── Response types ────────────────────────────────────────────────────────────

type ActionResult<T> = { success: true; data: T } | { error: string };

// ── Auth helper ───────────────────────────────────────────────────────────────

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
  return { supabase, profileId: profile.id as string, clerkUserId: userId };
}

// ── getAppSettings ────────────────────────────────────────────────────────────

/**
 * Fetch the app_settings row for the current user.
 * Called by the settings page server component.
 */
export async function getAppSettings(): Promise<ActionResult<AppSettings>> {
  try {
    const { supabase, profileId } = await getAuthenticatedProfile();

    const { data, error } = await supabase
      .from('app_settings')
      .select('*')
      .eq('profile_id', profileId)
      .single();

    if (error || !data) return { error: 'App settings not found' };
    return { success: true, data: data as AppSettings };
  } catch (err) {
    return { error: (err as Error).message || 'Something went wrong' };
  }
}

// ── updateProfileSettings ─────────────────────────────────────────────────────

const updateProfileSchema = z
  .object({
    display_name:             z.string().trim().min(1).max(60).transform(sanitizeText).optional(),
    biometric_enabled:        z.boolean().optional(),
    monthly_budget_alert_pct: z.number().int().min(10).max(100).optional(),
    daily_limit_enabled:      z.boolean().optional(),
    notification_enabled:     z.boolean().optional(),
  })
  .strict();

type ProfileUpdateInput = z.infer<typeof updateProfileSchema>;

/**
 * Partially update the current user's profile settings.
 * Only the fields explicitly provided are written; others remain unchanged.
 */
export async function updateProfileSettings(
  input: ProfileUpdateInput,
): Promise<ActionResult<Profile>> {
  try {
    const { supabase, profileId } = await getAuthenticatedProfile();

    const parsed = updateProfileSchema.safeParse(input);
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? 'Invalid input' };
    }

    const payload = parsed.data as Record<string, unknown>;
    if (Object.keys(payload).length === 0) return { error: 'No fields to update' };

    const { data: profile, error } = await supabase
      .from('profiles')
      .update(payload)
      .eq('id', profileId)
      .select()
      .single();

    if (error || !profile) return { error: 'Failed to update settings' };

    revalidatePath('/settings');
    revalidatePath('/dashboard');
    return { success: true, data: profile as Profile };
  } catch (err) {
    return { error: (err as Error).message || 'Something went wrong' };
  }
}

// ── updateAppSettings ─────────────────────────────────────────────────────────

const updateAppSettingsSchema = z
  .object({
    ai_categorization_enabled: z.boolean().optional(),
  })
  .strict();

type AppSettingsUpdateInput = z.infer<typeof updateAppSettingsSchema>;

export async function updateAppSettings(
  input: AppSettingsUpdateInput,
): Promise<ActionResult<AppSettings>> {
  try {
    const { supabase, profileId } = await getAuthenticatedProfile();

    const parsed = updateAppSettingsSchema.safeParse(input);
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? 'Invalid input' };
    }

    const { data, error } = await supabase
      .from('app_settings')
      .update(parsed.data)
      .eq('profile_id', profileId)
      .select()
      .single();

    if (error || !data) return { error: 'Failed to update app settings' };

    revalidatePath('/settings');
    return { success: true, data: data as AppSettings };
  } catch (err) {
    return { error: (err as Error).message || 'Something went wrong' };
  }
}

// ── changePinAction ───────────────────────────────────────────────────────────

/**
 * Thin wrapper so the client never has to pass clerkUserId.
 * The actual bcrypt + salt logic lives in src/app/actions/auth.ts.
 */
export async function changePinAction(
  oldPin: string,
  newPin: string,
): Promise<{ success: true; newSalt: string } | { success: false; error: string }> {
  const { userId } = await auth();
  if (!userId) return { success: false, error: 'Not authenticated' };

  const result = await changePin(oldPin, newPin, userId);
  if (result.success) {
    revalidatePath('/settings');
    return { success: true, newSalt: result.newSalt };
  }
  return { success: false, error: result.error };
}

// ── getTaskerWebhookSecret ────────────────────────────────────────────────────

export async function getTaskerWebhookSecret(): Promise<ActionResult<string | null>> {
  try {
    const { supabase, profileId } = await getAuthenticatedProfile();

    const { data, error } = await supabase
      .from('app_settings')
      .select('tasker_webhook_secret')
      .eq('profile_id', profileId)
      .single();

    if (error) return { error: 'Failed to retrieve secret' };
    return { success: true, data: data?.tasker_webhook_secret ?? null };
  } catch (err) {
    return { error: (err as Error).message || 'Something went wrong' };
  }
}

// ── regenerateTaskerSecret ────────────────────────────────────────────────────

export async function regenerateTaskerSecret(): Promise<ActionResult<string>> {
  try {
    const { supabase, profileId } = await getAuthenticatedProfile();

    // 32-byte cryptographically random hex secret
    const bytes = new Uint8Array(32);
    crypto.getRandomValues(bytes);
    const secret = Array.from(bytes)
      .map((b) => b.toString(16).padStart(2, '0'))
      .join('');

    const { error } = await supabase
      .from('app_settings')
      .update({ tasker_webhook_secret: secret })
      .eq('profile_id', profileId);

    if (error) return { error: 'Failed to regenerate secret' };
    return { success: true, data: secret };
  } catch (err) {
    return { error: (err as Error).message || 'Something went wrong' };
  }
}

// ── exportTransactionsCSV ─────────────────────────────────────────────────────

/**
 * Exports all transactions as a CSV string.
 *
 * NOTE: Amounts are AES-256-GCM encrypted on the server and cannot be
 * decrypted here (the key is derived from the user's PIN client-side and
 * never leaves the device). The exported CSV therefore omits amount columns.
 * A full export with amounts would require a client-side decryption step.
 */
export async function exportTransactionsCSV(): Promise<ActionResult<string>> {
  try {
    const { supabase, profileId } = await getAuthenticatedProfile();

    const { data: rows, error } = await supabase
      .from('transactions')
      .select(
        'date, time, category_name, subcategory, description, merchant, is_need, is_pass_through, is_subscription, source',
      )
      .eq('profile_id', profileId)
      .order('date', { ascending: false })
      .order('created_at', { ascending: false });

    if (error) return { error: 'Failed to export data' };

    const header = [
      'Date', 'Time', 'Category', 'Subcategory',
      'Description', 'Merchant', 'Need/Want', 'Pass-Through', 'Subscription', 'Source',
    ];

    const dataRows = (rows ?? []).map((t) => [
      t.date   ?? '',
      t.time   ?? '',
      t.category_name  ?? '',
      t.subcategory    ?? '',
      csvEsc(t.description ?? ''),
      csvEsc(t.merchant    ?? ''),
      t.is_need         ? 'Need' : 'Want',
      t.is_pass_through ? 'Yes'  : 'No',
      t.is_subscription ? 'Yes'  : 'No',
      t.source ?? 'manual',
    ]);

    const csv = [header, ...dataRows].map((r) => r.join(',')).join('\n');
    return { success: true, data: csv };
  } catch (err) {
    return { error: (err as Error).message || 'Something went wrong' };
  }
}

function csvEsc(val: string): string {
  if (val.includes(',') || val.includes('"') || val.includes('\n')) {
    return `"${val.replace(/"/g, '""')}"`;
  }
  return val;
}
