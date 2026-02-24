'use client';

// ============================================================
// KHARCHA — useVault Hooks
// TanStack Query wrappers for vault server actions.
//
// Decryption:
//   The vault stores all amounts encrypted. The useVault() query
//   fetches encrypted data and decrypts it client-side using the
//   in-memory AES key from useEncryption().
//
// Mutations:
//   useVaultDeposit() and useVaultWithdraw() accept pre-encrypted
//   inputs. The calling component must use useEncryption().encrypt()
//   to prepare amounts and compute the new vault balance before
//   calling these mutations.
// ============================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useToast } from '@/components/ui/ToastProvider';
import { useEncryption } from './useEncryption';
import {
  getVault,
  depositToVault,
  withdrawFromVault,
  updateVaultTarget,
  type VaultUpdatePayload,
} from '@/app/actions/vault';
import type { VaultTransactionInput } from '@/lib/validations';
import type { VaultTransactionDecrypted } from '@/types';

// ─── Query key ────────────────────────────────────────────────────────────────

export const VAULT_KEY = 'vault' as const;

// ─── Types ────────────────────────────────────────────────────────────────────

export interface VaultData {
  id: string;
  currentBalance: number;
  targetAmount: number | null;
  transactions: VaultTransactionDecrypted[];
}

// ─── Query ────────────────────────────────────────────────────────────────────

/**
 * Fetches the vault balance, target, and transaction history.
 *
 * All encrypted fields are decrypted client-side before returning.
 * The initial vault balance ('0' from onboarding) is handled as
 * a special case since it's stored as plaintext, not AES-encrypted.
 */
export function useVault() {
  const { isUnlocked, decrypt } = useEncryption();

  return useQuery<VaultData>({
    queryKey: [VAULT_KEY],
    queryFn: async () => {
      const result = await getVault();
      if ('error' in result) throw new Error(result.error);

      const { vault, transactions } = result.data;

      // Handle initial '0' balance from onboarding (stored as plaintext '0')
      const currentBalance = vault.current_balance_encrypted === '0'
        ? 0
        : await decrypt(vault.current_balance_encrypted);

      const targetAmount = vault.target_amount_encrypted
        ? await decrypt(vault.target_amount_encrypted)
        : null;

      // Decrypt transaction amounts and balance snapshots
      const decryptedTransactions: VaultTransactionDecrypted[] = await Promise.all(
        transactions.map(async (tx) => {
          const { amount_encrypted, amount_hash, balance_after_encrypted, ...rest } = tx;
          return {
            ...rest,
            amount: await decrypt(amount_encrypted),
            balance_after: await decrypt(balance_after_encrypted),
          };
        }),
      );

      return {
        id: vault.id,
        currentBalance,
        targetAmount,
        transactions: decryptedTransactions,
      };
    },
    enabled: isUnlocked,
    staleTime: 60 * 1_000, // 1 minute — vault changes less often
  });
}

// ─── Mutations ────────────────────────────────────────────────────────────────

/**
 * Deposit into the emergency vault.
 *
 * The caller must:
 *   1. Encrypt the deposit amount with useEncryption().encrypt()
 *   2. Compute newBalance = currentBalance + depositAmount
 *   3. Encrypt the new balance and pass it as `balancePayload`
 */
export function useVaultDeposit() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      input,
      balancePayload,
    }: {
      input: VaultTransactionInput;
      balancePayload: VaultUpdatePayload;
    }) => {
      const result = await depositToVault(input, balancePayload);
      if ('error' in result) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => {
      void queryClient.refetchQueries({ queryKey: [VAULT_KEY] });
      void queryClient.invalidateQueries({ queryKey: ['budget'] });
      toast({ title: 'Deposited to vault', variant: 'success' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Deposit failed',
        description: error.message,
        variant: 'error',
      });
    },
  });
}

/**
 * Withdraw from the emergency vault.
 *
 * The caller must:
 *   1. Verify withdrawalAmount <= currentBalance (client-side check)
 *   2. Encrypt the withdrawal amount with useEncryption().encrypt()
 *   3. Compute newBalance = currentBalance - withdrawalAmount
 *   4. Encrypt the new balance and pass it as `balancePayload`
 */
export function useVaultWithdraw() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({
      input,
      balancePayload,
    }: {
      input: VaultTransactionInput;
      balancePayload: VaultUpdatePayload;
    }) => {
      const result = await withdrawFromVault(input, balancePayload);
      if ('error' in result) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => {
      void queryClient.refetchQueries({ queryKey: [VAULT_KEY] });
      void queryClient.invalidateQueries({ queryKey: ['budget'] });
      toast({ title: 'Withdrawn from vault', variant: 'success' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Withdrawal failed',
        description: error.message,
        variant: 'error',
      });
    },
  });
}

/**
 * Update the vault target amount.
 *
 * The caller must encrypt the target amount before calling this.
 */
export function useUpdateVaultTarget() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (targetAmountEncrypted: string) => {
      const result = await updateVaultTarget(targetAmountEncrypted);
      if ('error' in result) throw new Error(result.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [VAULT_KEY] });
      toast({ title: 'Vault target updated', variant: 'success' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to update target',
        description: error.message,
        variant: 'error',
      });
    },
  });
}
