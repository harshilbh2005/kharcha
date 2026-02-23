'use server';

// ============================================================
// KHARCHA — AI Server Actions
//
// saveAiLearningOverride: Persists a user's manual category
// correction to the ai_learning table so the 3-tier system
// uses the user's preference on all future categorizations
// for the same merchant.
// ============================================================

import { auth } from '@clerk/nextjs/server';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { saveAiLearning } from '@/lib/ai/categorize';
import { sanitizeText } from '@/lib/sanitize';

// ── Validation ───────────────────────────────────────────────────────────────

const aiLearningSchema = z.object({
  merchantKeyword:     z.string().trim().min(1).max(50).transform(sanitizeText),
  userCategory:        z.string().trim().min(1).max(50).transform(sanitizeText),
  userSubcategory:     z.string().trim().max(50).transform(sanitizeText).nullable(),
  isNeed:              z.boolean(),
  aiSuggestedCategory: z.string().trim().max(50).transform(sanitizeText).nullable(),
}).strict();

// ── Types ─────────────────────────────────────────────────────────────────────

type ActionResult = { success: true } | { error: string };

// ── Actions ───────────────────────────────────────────────────────────────────

/**
 * Save a user's manual category override to the ai_learning table.
 *
 * Called from AddExpenseModal when the user picks a category that
 * differs from the AI suggestion.  This teaches the system the user's
 * preference for that merchant so future transactions are categorized
 * correctly without an API call (Tier 1 cache hit).
 */
export async function saveAiLearningOverride(
  merchantKeyword:     string,
  userCategory:        string,
  userSubcategory:     string | null,
  isNeed:              boolean,
  aiSuggestedCategory: string | null,
): Promise<ActionResult> {
  // ── Auth ────────────────────────────────────────────────────────────────────
  const { userId } = await auth();
  if (!userId) return { error: 'Unauthenticated' };

  // ── Validate & sanitize ─────────────────────────────────────────────────────
  const parsed = aiLearningSchema.safeParse({
    merchantKeyword,
    userCategory,
    userSubcategory,
    isNeed,
    aiSuggestedCategory,
  });

  if (!parsed.success) {
    return { error: parsed.error.issues[0]?.message ?? 'Invalid input' };
  }

  const validated = parsed.data;

  // ── Profile lookup ──────────────────────────────────────────────────────────
  const supabase = await createClient();
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('clerk_user_id', userId)
    .single();

  if (profileError || !profile) return { error: 'Profile not found' };

  // ── Save learning ───────────────────────────────────────────────────────────
  try {
    await saveAiLearning(
      profile.id as string,
      validated.merchantKeyword,
      validated.userCategory,
      validated.userSubcategory,
      validated.isNeed,
      validated.aiSuggestedCategory,
    );
    return { success: true };
  } catch (e) {
    console.error('[saveAiLearningOverride] error:', e);
    return { error: (e as Error).message || 'Failed to save learning' };
  }
}
