'use client';

// ============================================================
// KHARCHA — useSubscriptions Hook (Phase 4 Stub)
// Returns upcoming subscription renewals for the dashboard
// SubscriptionAlert card.
//
// Stub implementation: returns empty array until Phase 6
// (Subscription Manager) implements the full system.
//
// Future: will fetch from Supabase subscriptions table,
// decrypt amounts, and compute upcoming renewals within N days.
// ============================================================

import { useQuery } from '@tanstack/react-query';
import { useEncryption } from './useEncryption';
import type { UpcomingSubscription } from '@/components/dashboard/SubscriptionAlert';

// ─── Query key ────────────────────────────────────────────────────────────────

export const SUBSCRIPTIONS_KEY = 'subscriptions' as const;

// ─── Hook ─────────────────────────────────────────────────────────────────────

/**
 * Fetches active subscriptions and filters for upcoming renewals.
 *
 * Phase 4 stub: returns empty array so the SubscriptionAlert card
 * hides itself (renders null when upcoming = []). Will be replaced
 * in Phase 6 with real Supabase queries + decryption.
 *
 * @param withinDays - Only return subscriptions renewing within
 *                     this many days (default: 3)
 * @returns TanStack Query result with `data: UpcomingSubscription[]`
 */
export function useUpcomingSubscriptions(withinDays = 3) {
  const { isUnlocked } = useEncryption();

  return useQuery<UpcomingSubscription[]>({
    queryKey: [SUBSCRIPTIONS_KEY, 'upcoming', withinDays],
    queryFn: async () => {
      // ── Phase 6 TODO: ───────────────────────────────────────────────────
      // 1. Fetch active subscriptions from Supabase
      // 2. Decrypt amounts
      // 3. Compute next_billing_date vs today
      // 4. Filter for renewals within `withinDays`
      // 5. Map to UpcomingSubscription[]
      //
      // For now, return empty array so the alert card stays hidden.
      return [];
    },
    enabled: isUnlocked,
    staleTime: 5 * 60 * 1_000, // 5 minutes — subscriptions are near-static
  });
}
