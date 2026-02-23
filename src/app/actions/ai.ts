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
import { createClient } from '@/lib/supabase/server';
import { saveAiLearning } from '@/lib/ai/categorize';

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
 *
 * @param merchantKeyword      - Normalized description snippet (≤ 50 chars)
 * @param userCategory         - Category name chosen by the user
 * @param userSubcategory      - Subcategory (null — not exposed in UI)
 * @param isNeed               - Need / Want value chosen by the user
 * @param aiSuggestedCategory  - What the AI originally suggested (for analytics)
 */
export async function saveAiLearningOverride(
  merchantKeyword:     string,
  userCategory:        string,
  userSubcategory:     string | null,
  isNeed:              boolean,
  aiSuggestedCategory: string | null,
): Promise<ActionResult> {
  const { userId } = await auth();
  if (!userId) return { error: 'Unauthenticated' };

  const supabase = await createClient();
  const { data: profile, error: profileError } = await supabase
    .from('profiles')
    .select('id')
    .eq('clerk_user_id', userId)
    .single();

  if (profileError || !profile) return { error: 'Profile not found' };

  try {
    await saveAiLearning(
      profile.id as string,
      merchantKeyword,
      userCategory,
      userSubcategory,
      isNeed,
      aiSuggestedCategory,
    );
    return { success: true };
  } catch (e) {
    console.error('[saveAiLearningOverride] error:', e);
    return { error: (e as Error).message || 'Failed to save learning' };
  }
}
