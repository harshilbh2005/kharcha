'use client';

// ============================================================
// KHARCHA — useVault Hook (Phase 4 Stub)
// Returns the vault balance for the dashboard VaultPreview card.
//
// Stub implementation: returns hardcoded data until Phase 5
// (Emergency Vault) implements the full vault system.
//
// Future: will fetch from /api/vault, decrypt via useEncryption(),
// and support deposit/withdrawal mutations.
// ============================================================

import { useQuery } from '@tanstack/react-query';
import { useEncryption } from './useEncryption';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface VaultData {
  currentBalance: number;
  targetAmount: number | null;
}

// ─── Query key ────────────────────────────────────────────────────────────────

export const VAULT_KEY = 'vault' as const;

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Fetches the vault balance and target for the dashboard preview.
 *
 * Phase 4 stub: returns zeroed-out vault data so the VaultPreview
 * card renders correctly. Will be replaced in Phase 5 with real
 * Supabase queries + decryption.
 *
 * @returns TanStack Query result with `data: VaultData`
 */
export function useVault() {
  const { isUnlocked } = useEncryption();

  return useQuery<VaultData>({
    queryKey: [VAULT_KEY],
    queryFn: async () => {
      // ── Phase 5 TODO: ───────────────────────────────────────────────────
      // 1. Fetch vault row from Supabase (emergency_vault table)
      // 2. Decrypt current_balance_encrypted and target_amount_encrypted
      // 3. Return { currentBalance, targetAmount }
      //
      // For now, return stub data so the dashboard renders without errors.
      return {
        currentBalance: 0,
        targetAmount: null,
      };
    },
    enabled: isUnlocked,
    staleTime: 60 * 1_000, // 1 minute — vault changes less often
  });
}
