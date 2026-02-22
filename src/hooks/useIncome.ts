'use client';

// ============================================================
// KHARCHA — useIncome Hooks
// TanStack Query wrappers for income server actions.
//
// Vault side-effects:
//   When creating/updating/deleting emergency_fund entries, the
//   client must supply a VaultUpdatePayload containing the new
//   encrypted vault balance. The server stores it as-is because
//   the AES key never leaves the client.
// ============================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/ui/ToastProvider';
import {
  getIncomeEntries,
  createIncome,
  updateIncome,
  deleteIncome,
  type IncomeFilters,
  type VaultUpdatePayload,
} from '@/app/actions/income';
import type { CreateIncomeInput } from '@/lib/validations';

// ── Query keys ────────────────────────────────────────────────────────────────

export const INCOME_KEY = 'income' as const;

// ── Queries ───────────────────────────────────────────────────────────────────

/**
 * Filtered income entry list for the authenticated user.
 *
 * Returns encrypted amounts — pass each `amount_encrypted` through
 * `useEncryption().decrypt()` to display the plaintext figure.
 */
export function useIncome(filters?: IncomeFilters) {
  return useQuery({
    queryKey: [INCOME_KEY, filters],
    queryFn: async () => {
      const result = await getIncomeEntries(filters);
      if ('error' in result) throw new Error(result.error);
      return result.data;
    },
  });
}

// ── Mutations ─────────────────────────────────────────────────────────────────

/**
 * Create a new income entry.
 *
 * When `input.type === 'emergency_fund'`, `vaultPayload` is REQUIRED —
 * the client must pre-compute the new vault balance before calling this.
 */
export function useCreateIncome() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      input,
      vaultPayload,
    }: {
      input: CreateIncomeInput;
      vaultPayload?: VaultUpdatePayload;
    }) => {
      const result = await createIncome(input, vaultPayload);
      if ('error' in result) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [INCOME_KEY] });
      queryClient.invalidateQueries({ queryKey: ['budget'] });
      queryClient.invalidateQueries({ queryKey: ['vault'] });
      toast({ title: 'Income added', variant: 'success' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to add income',
        description: error.message,
        variant: 'error',
      });
    },
  });
}

/**
 * Partially update an income entry.
 *
 * When `type` changes to/from `emergency_fund`, `vaultPayload` is REQUIRED.
 */
export function useUpdateIncome() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      id,
      input,
      vaultPayload,
    }: {
      id: string;
      input: Partial<CreateIncomeInput>;
      vaultPayload?: VaultUpdatePayload;
    }) => {
      const result = await updateIncome(id, input, vaultPayload);
      if ('error' in result) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [INCOME_KEY] });
      queryClient.invalidateQueries({ queryKey: ['budget'] });
      queryClient.invalidateQueries({ queryKey: ['vault'] });
      toast({ title: 'Income updated', variant: 'success' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to update income',
        description: error.message,
        variant: 'error',
      });
    },
  });
}

/**
 * Delete an income entry.
 *
 * When the entry is `emergency_fund`, `vaultPayload` is REQUIRED —
 * the client must pre-compute the new vault balance (current − amount).
 */
export function useDeleteIncome() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      id,
      vaultPayload,
    }: {
      id: string;
      vaultPayload?: VaultUpdatePayload;
    }) => {
      const result = await deleteIncome(id, vaultPayload);
      if ('error' in result) throw new Error(result.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [INCOME_KEY] });
      queryClient.invalidateQueries({ queryKey: ['budget'] });
      queryClient.invalidateQueries({ queryKey: ['vault'] });
      toast({ title: 'Income deleted', variant: 'success' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to delete income',
        description: error.message,
        variant: 'error',
      });
    },
  });
}
