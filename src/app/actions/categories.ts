'use server';

// ============================================================
// KHARCHA — Category Server Actions
// ============================================================

import { auth } from '@clerk/nextjs/server';
import { unstable_cache, revalidatePath, revalidateTag } from 'next/cache';
import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { categorySchema } from '@/lib/validations';
import type { Category } from '@/types';

// ============================================================
// CONSTANTS
// ============================================================

const REVALIDATE_PATHS = ['/dashboard', '/transactions', '/settings'] as const;

/** Per-user cache tag so mutations only invalidate the right user's cache. */
const categoryTag = (profileId: string) => `categories-${profileId}`;

// ============================================================
// LOCAL SCHEMAS
// ============================================================

/**
 * Partial update schema — all fields optional, none have defaults.
 * `categorySchema` uses `.strict()` so we derive from it rather than
 * duplicating regex rules.
 */
const updateCategorySchema = categorySchema.partial();

type CategoryUpdateInput = z.infer<typeof updateCategorySchema>;

// ============================================================
// RESPONSE TYPES
// ============================================================

type ActionResult<T> = { success: true; data: T } | { error: string };
type DeleteResult = { success: true } | { error: string };

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

function revalidateAll(profileId: string) {
  // Next.js 16: revalidateTag requires a second `profile` argument.
  // 'default' applies the standard cache-life profile after revalidation.
  revalidateTag(categoryTag(profileId), 'default');
  REVALIDATE_PATHS.forEach((path) => revalidatePath(path));
}

// ============================================================
// ACTION: getCategories
// ============================================================

/**
 * Returns all categories for the authenticated user, ordered by sort_order.
 *
 * Caching strategy:
 *   - Wrapped in `unstable_cache` keyed per-user: cache key is
 *     `['categories', profileId]`, tagged `categories-${profileId}`.
 *   - TTL: 1 hour (categories change infrequently).
 *   - Mutations call revalidateTag(categoryTag(profileId)) to purge only
 *     the affected user's cache — no cross-user interference.
 *   - The factory pattern (function returned and immediately invoked)
 *     is required so the `tags` array can contain the runtime profileId.
 */
export async function getCategories(): Promise<ActionResult<Category[]>> {
  try {
    const { profileId } = await getAuthenticatedProfile();

    // Per-user cached fetcher — created and invoked in one step
    const categories = await unstable_cache(
      async () => {
        const supabase = await createClient();
        const { data, error } = await supabase
          .from('categories')
          .select('*')
          .eq('profile_id', profileId)
          .order('sort_order', { ascending: true });

        if (error) {
          console.error('[getCategories] Supabase error:', error);
          return [] as Category[];
        }
        return (data ?? []) as Category[];
      },
      // Cache key: unique per user so their data never bleeds into another's
      [`categories-${profileId}`],
      {
        tags: [categoryTag(profileId)],
        revalidate: 3600, // 1 hour TTL; tag-based revalidation handles mutations
      },
    )();

    return { success: true, data: categories };
  } catch (error) {
    return { error: (error as Error).message || 'Something went wrong' };
  }
}

// ============================================================
// ACTION: createCategory
// ============================================================

/**
 * Creates a new custom category for the user.
 * `sort_order` is set to current max + 1 so it appears at the end of the list.
 * `is_default` is always false for user-created categories.
 */
export async function createCategory(
  input: { name: string; icon: string; color: string },
): Promise<ActionResult<Category>> {
  try {
    const { supabase, profileId } = await getAuthenticatedProfile();

    const parsed = categorySchema.safeParse(input);
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? 'Invalid input' };
    }
    const { name, icon, color } = parsed.data;

    // Determine sort_order: max existing + 1
    const { data: maxRow } = await supabase
      .from('categories')
      .select('sort_order')
      .eq('profile_id', profileId)
      .order('sort_order', { ascending: false })
      .limit(1)
      .maybeSingle();

    const nextSortOrder = (maxRow?.sort_order ?? 0) + 1;

    const { data: category, error } = await supabase
      .from('categories')
      .insert({
        profile_id: profileId,
        name,
        icon,
        color,
        is_default: false,
        sort_order: nextSortOrder,
      })
      .select()
      .single();

    if (error || !category) {
      console.error('[createCategory] Supabase error:', error);
      return { error: 'Failed to create category' };
    }

    revalidateAll(profileId);
    return { success: true, data: category as Category };
  } catch (error) {
    return { error: (error as Error).message || 'Something went wrong' };
  }
}

// ============================================================
// ACTION: updateCategory
// ============================================================

/**
 * Partially updates a category's name, icon, and/or color.
 * `sort_order` and `is_default` are not user-editable through this action.
 */
export async function updateCategory(
  id: string,
  input: Partial<{ name: string; icon: string; color: string }>,
): Promise<ActionResult<Category>> {
  try {
    const { supabase, profileId } = await getAuthenticatedProfile();

    const idResult = z.string().uuid().safeParse(id);
    if (!idResult.success) {
      return { error: 'Invalid category ID' };
    }

    const parsed = updateCategorySchema.safeParse(input);
    if (!parsed.success) {
      return { error: parsed.error.issues[0]?.message ?? 'Invalid input' };
    }
    const fields = parsed.data;

    // Build sparse update — only write explicitly provided fields
    const updatePayload: Record<string, unknown> = {};
    if (fields.name  !== undefined) updatePayload.name  = fields.name;
    if (fields.icon  !== undefined) updatePayload.icon  = fields.icon;
    if (fields.color !== undefined) updatePayload.color = fields.color;

    if (Object.keys(updatePayload).length === 0) {
      return { error: 'No fields provided for update' };
    }

    const { data: category, error } = await supabase
      .from('categories')
      .update(updatePayload)
      .eq('id', id)
      .eq('profile_id', profileId) // RLS guard
      .select()
      .single();

    if (error || !category) {
      console.error('[updateCategory] Supabase error:', error);
      return { error: 'Failed to update category' };
    }

    revalidateAll(profileId);
    return { success: true, data: category as Category };
  } catch (error) {
    return { error: (error as Error).message || 'Something went wrong' };
  }
}

// ============================================================
// ACTION: deleteCategory
// ============================================================

/**
 * Deletes a category only if no transactions reference it.
 *
 * Returns a descriptive error if the category is in use — the client
 * should prompt the user to reassign those transactions first.
 */
export async function deleteCategory(id: string): Promise<DeleteResult> {
  try {
    const { supabase, profileId } = await getAuthenticatedProfile();

    const idResult = z.string().uuid().safeParse(id);
    if (!idResult.success) {
      return { error: 'Invalid category ID' };
    }

    // Confirm the category belongs to this user before touching anything
    const { data: existing, error: fetchError } = await supabase
      .from('categories')
      .select('id, is_default')
      .eq('id', id)
      .eq('profile_id', profileId)
      .single();

    if (fetchError || !existing) {
      return { error: 'Category not found' };
    }

    // Check for transactions referencing this category.
    // `count: 'exact'` returns the count without fetching rows.
    const { count, error: countError } = await supabase
      .from('transactions')
      .select('id', { count: 'exact', head: true })
      .eq('category_id', id)
      .eq('profile_id', profileId);

    if (countError) {
      console.error('[deleteCategory] Count query error:', countError);
      return { error: 'Failed to check category usage' };
    }

    if (count && count > 0) {
      return {
        error: `Category has ${count} transaction${count === 1 ? '' : 's'}. Reassign them first.`,
      };
    }

    // Safe to delete
    const { error: deleteError } = await supabase
      .from('categories')
      .delete()
      .eq('id', id)
      .eq('profile_id', profileId);

    if (deleteError) {
      console.error('[deleteCategory] Supabase error:', deleteError);
      return { error: 'Failed to delete category' };
    }

    revalidateAll(profileId);
    return { success: true };
  } catch (error) {
    return { error: (error as Error).message || 'Something went wrong' };
  }
}
