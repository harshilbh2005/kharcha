'use client';

// ============================================================
// KHARCHA — useTransactions Hooks
// TanStack Query wrappers for transaction server actions.
// Mutations show toast feedback and invalidate related queries.
// ============================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/ui/ToastProvider';
import {
  getTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  type TransactionFilters,
} from '@/app/actions/transactions';
import type { CreateTransactionInput } from '@/lib/validations';
import type { Transaction } from '@/types';

// ── Query keys ────────────────────────────────────────────────────────────────

export const TRANSACTIONS_KEY = 'transactions' as const;

// ── Queries ───────────────────────────────────────────────────────────────────

/**
 * Paginated, filtered transaction list.
 *
 * Returns encrypted amounts — pass each `amount_encrypted` through
 * `useEncryption().decrypt()` to display the plaintext figure.
 */
export function useTransactions(filters?: TransactionFilters) {
  return useQuery({
    queryKey: [TRANSACTIONS_KEY, filters],
    queryFn: async () => {
      const result = await getTransactions(filters);
      if ('error' in result) throw new Error(result.error);
      return result.data;
    },
  });
}

/**
 * Fetch a single transaction by ID.
 *
 * Checks cached transaction lists first so there's no extra network
 * round-trip when the list has already been fetched.
 */
export function useTransaction(id: string) {
  const queryClient = useQueryClient();

  return useQuery<Transaction | null>({
    queryKey: [TRANSACTIONS_KEY, { id }],
    queryFn: async () => {
      // Fast path: search any cached list before making a server call
      const cachedQueries = queryClient.getQueriesData<Transaction[]>({
        queryKey: [TRANSACTIONS_KEY],
      });
      for (const [, data] of cachedQueries) {
        if (Array.isArray(data)) {
          const found = data.find((t) => t.id === id);
          if (found) return found;
        }
      }

      // Slow path: fetch latest list and extract the transaction
      const result = await getTransactions();
      if ('error' in result) throw new Error(result.error);
      return result.data.find((t) => t.id === id) ?? null;
    },
    enabled: !!id,
  });
}

// ── Mutations ─────────────────────────────────────────────────────────────────

/** Create a new expense transaction. Invalidates list + budget queries. */
export function useCreateTransaction() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: CreateTransactionInput) => {
      const result = await createTransaction(input);
      if ('error' in result) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TRANSACTIONS_KEY] });
      queryClient.invalidateQueries({ queryKey: ['budget'] });
      toast({ title: 'Transaction added', variant: 'success' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to add transaction',
        description: error.message,
        variant: 'error',
      });
    },
  });
}

/** Partially update an existing transaction. */
export function useUpdateTransaction() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      id,
      ...input
    }: { id: string } & Partial<CreateTransactionInput>) => {
      const result = await updateTransaction(id, input);
      if ('error' in result) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TRANSACTIONS_KEY] });
      queryClient.invalidateQueries({ queryKey: ['budget'] });
      toast({ title: 'Transaction updated', variant: 'success' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to update transaction',
        description: error.message,
        variant: 'error',
      });
    },
  });
}

/** Delete a transaction (handles pass-through unlinking automatically). */
export function useDeleteTransaction() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await deleteTransaction(id);
      if ('error' in result) throw new Error(result.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [TRANSACTIONS_KEY] });
      queryClient.invalidateQueries({ queryKey: ['budget'] });
      toast({ title: 'Transaction deleted', variant: 'success' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to delete transaction',
        description: error.message,
        variant: 'error',
      });
    },
  });
}
