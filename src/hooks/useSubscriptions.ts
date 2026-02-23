'use client';

// ============================================================
// KHARCHA — useSubscriptions Hooks (Phase 6)
// TanStack Query hooks for subscription CRUD operations.
//
// Queries:
//   useSubscriptions(filters?) — all subscriptions (encrypted)
//   useSubscription(id)        — single by ID (cache-first)
//   useUpcomingSubscriptions() — upcoming renewals for dashboard
//
// Mutations:
//   useCreateSubscription()
//   useUpdateSubscription()
//   useDeleteSubscription()
//   useMarkAsPaid()
// ============================================================

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useEncryption } from './useEncryption';
import { useToast } from '@/components/ui/ToastProvider';
import {
  getSubscriptions,
  createSubscription,
  updateSubscription,
  deleteSubscription,
  markAsPaid,
  type SubscriptionFilters,
} from '@/app/actions/subscriptions';
import type { CreateSubscriptionInput, UpdateSubscriptionInput } from '@/lib/validations';
import type { Subscription } from '@/types';
import type { UpcomingSubscription } from '@/components/dashboard/SubscriptionAlert';

// ─── Query keys ─────────────────────────────────────────────────────────────────

export const SUBSCRIPTIONS_KEY = 'subscriptions' as const;
const TRANSACTIONS_KEY = 'transactions' as const;

// ─── Queries ────────────────────────────────────────────────────────────────────

/**
 * Fetches all subscriptions for the authenticated user.
 * Returns encrypted amounts — caller must decrypt via useEncryption().
 */
export function useSubscriptions(filters?: SubscriptionFilters) {
  return useQuery<Subscription[]>({
    queryKey: [SUBSCRIPTIONS_KEY, filters],
    queryFn: async () => {
      const result = await getSubscriptions(filters);
      if ('error' in result) throw new Error(result.error);
      return result.data;
    },
  });
}

/**
 * Fetches a single subscription by ID.
 * Checks cached lists first for efficiency before falling back to a full fetch.
 */
export function useSubscription(id: string) {
  const queryClient = useQueryClient();

  return useQuery<Subscription | null>({
    queryKey: [SUBSCRIPTIONS_KEY, { id }],
    queryFn: async () => {
      // Fast path: search across all cached subscription lists
      const cachedQueries = queryClient.getQueriesData<Subscription[]>({
        queryKey: [SUBSCRIPTIONS_KEY],
      });

      for (const [, data] of cachedQueries) {
        if (Array.isArray(data)) {
          const found = data.find((s) => s.id === id);
          if (found) return found;
        }
      }

      // Slow path: fetch all and search
      const result = await getSubscriptions();
      if ('error' in result) throw new Error(result.error);
      return result.data.find((s) => s.id === id) ?? null;
    },
    enabled: !!id,
  });
}

/**
 * Fetches active subscriptions and filters for upcoming renewals
 * within `withinDays`. Decrypts amounts for display on the dashboard
 * SubscriptionAlert card.
 *
 * @param withinDays - Only return subscriptions renewing within
 *                     this many days (default: 3)
 */
export function useUpcomingSubscriptions(withinDays = 3) {
  const { isUnlocked, decryptMany } = useEncryption();

  return useQuery<UpcomingSubscription[]>({
    queryKey: [SUBSCRIPTIONS_KEY, 'upcoming', withinDays],
    queryFn: async () => {
      // 1. Fetch active subscriptions
      const result = await getSubscriptions({ is_active: true });
      if ('error' in result) throw new Error(result.error);

      const subs = result.data;
      if (subs.length === 0) return [];

      // 2. Filter for subscriptions with next_billing_date within range
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      const cutoff = new Date(today);
      cutoff.setDate(cutoff.getDate() + withinDays);

      const upcoming = subs.filter((sub) => {
        if (!sub.next_billing_date) return false;
        const billingDate = new Date(sub.next_billing_date);
        return billingDate >= today && billingDate <= cutoff;
      });

      if (upcoming.length === 0) return [];

      // 3. Decrypt amounts
      const amounts = await decryptMany(
        upcoming.map((s) => s.amount_encrypted),
      );

      // 4. Map to UpcomingSubscription[]
      return upcoming.map((sub, i) => {
        const billingDate = new Date(sub.next_billing_date!);
        const diffMs = billingDate.getTime() - today.getTime();
        const daysUntilRenewal = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

        return {
          id: sub.id,
          name: sub.name,
          amount: amounts[i] ?? 0,
          daysUntilRenewal,
        };
      });
    },
    enabled: isUnlocked,
    staleTime: 5 * 60 * 1_000, // 5 minutes — subscriptions are near-static
  });
}

// ─── Mutations ──────────────────────────────────────────────────────────────────

/**
 * Creates a new subscription.
 * Invalidates subscription and budget caches on success.
 */
export function useCreateSubscription() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (input: CreateSubscriptionInput & { amount_inr_encrypted?: string | null; notes?: string | null }) => {
      const result = await createSubscription(input);
      if ('error' in result) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SUBSCRIPTIONS_KEY] });
      queryClient.invalidateQueries({ queryKey: ['budget'] });
      toast({ title: 'Subscription added', variant: 'success' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to add subscription',
        description: error.message,
        variant: 'error',
      });
    },
  });
}

/**
 * Updates an existing subscription.
 * Invalidates subscription and budget caches on success.
 */
export function useUpdateSubscription() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ id, ...input }: { id: string } & UpdateSubscriptionInput) => {
      const result = await updateSubscription(id, input);
      if ('error' in result) throw new Error(result.error);
      return result.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SUBSCRIPTIONS_KEY] });
      queryClient.invalidateQueries({ queryKey: ['budget'] });
      toast({ title: 'Subscription updated', variant: 'success' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to update subscription',
        description: error.message,
        variant: 'error',
      });
    },
  });
}

/**
 * Deletes a subscription permanently.
 * Invalidates subscription and budget caches on success.
 */
export function useDeleteSubscription() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async (id: string) => {
      const result = await deleteSubscription(id);
      if ('error' in result) throw new Error(result.error);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [SUBSCRIPTIONS_KEY] });
      queryClient.invalidateQueries({ queryKey: ['budget'] });
      toast({ title: 'Subscription removed', variant: 'success' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to remove subscription',
        description: error.message,
        variant: 'error',
      });
    },
  });
}

/**
 * Links a transaction to a subscription payment.
 * Updates subscription dates and marks transaction as subscription expense.
 * Invalidates subscriptions, budget, and transactions caches.
 */
export function useMarkAsPaid() {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  return useMutation({
    mutationFn: async ({ subscriptionId, transactionId }: { subscriptionId: string; transactionId: string }) => {
      const result = await markAsPaid(subscriptionId, transactionId);
      if ('error' in result) throw new Error(result.error);
      return result.data;
    },
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: [SUBSCRIPTIONS_KEY] });
      queryClient.invalidateQueries({ queryKey: ['budget'] });
      queryClient.invalidateQueries({ queryKey: [TRANSACTIONS_KEY] });
      toast({ title: 'Payment linked', variant: 'success' });
    },
    onError: (error: Error) => {
      toast({
        title: 'Failed to link payment',
        description: error.message,
        variant: 'error',
      });
    },
  });
}
