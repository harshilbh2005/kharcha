'use client';

// ============================================================
// KHARCHA — useCategories Hooks
// TanStack Query wrappers for category server actions.
//
// Categories are relatively static (user sets them up once and
// rarely changes them), so the list query uses a 10-minute
// staleTime to avoid unnecessary refetches.
// ============================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/ui/ToastProvider';
import {
  getCategories,
  createCategory,
  deleteCategory,
} from '@/app/actions/categories';
import type { CategoryInput } from '@/lib/validations';

// ── Query keys ────────────────────────────────────────────────────────────────

export const CATEGORIES_KEY = 'categories' as const;

/** Categories are slow-changing — 10 minutes before considered stale. */
const CATEGORIES_STALE_TIME = 10 * 60 * 1_000;

// ── Queries ───────────────────────────────────────────────────────────────────

/**
 * All categories for the authenticated user, sorted by sort_order.
 *
 * Results are cached for 10 minutes on the client (matching the
 * server-side `unstable_cache` TTL of 1 hour, so the client will
 * re-validate well before the server cache expires).
 */
export function useCategories() {
  return useQuery({
    queryKey: [CATEGORIES_KEY],
    queryFn: async () => {
      const result = await getCategories();
      if ('error' in result) throw new Error(result.error);
      return result.data;
    },
    staleTime: CATEGORIES_STALE_TIME,
  });
}

// ── Mutations ─────────────────────────────────────────────────────────────────

/** Create a new custom category. Auto-assigns sort_order on the server. */
export function useCreateCategory() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: CategoryInput) => {
      const result = await createCategory(input);
      if ('error' in result) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CATEGORIES_KEY] });
      toast({ title: 'Category created', variant: 'success' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to create category',
        description: error.message,
        variant: 'error',
      });
    },
  });
}

/**
 * Delete a category by ID.
 *
 * The server rejects the deletion if the category still has
 * linked transactions. The error toast surfaces this message.
 */
export function useDeleteCategory() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await deleteCategory(id);
      if ('error' in result) throw new Error(result.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [CATEGORIES_KEY] });
      toast({ title: 'Category deleted', variant: 'success' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to delete category',
        description: error.message,
        variant: 'error',
      });
    },
  });
}
