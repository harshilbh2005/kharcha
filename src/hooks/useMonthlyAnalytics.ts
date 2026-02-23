'use client';

// ============================================================
// KHARCHA — useMonthlyAnalytics Hook
// Fetches encrypted analytics for a calendar month from
// /api/analytics/monthly/[monthYear], decrypts amounts, and
// computes derived values (totals, category breakdown, footnotes,
// needs vs wants, and daily spending breakdown).
// ============================================================

import { useQuery } from '@tanstack/react-query';
import { useEncryption } from './useEncryption';
import type { MonthlyAnalyticsQueryResult } from '@/types';

// ── Output types ──────────────────────────────────────────────────────────────

export interface CategoryBreakdown {
  name: string;
  amount: number;
  /** 0–100 share of total spending */
  percentage: number;
  isSubscription: boolean;
}

/** Daily spending total for the heatmap */
export interface DailySpending {
  date: string; // "YYYY-MM-DD"
  amount: number;
}

/** Income entry where the allowance covers a different month than it was received */
export interface CrossMonthIncome {
  /** "YYYY-MM" — month the money arrived */
  receivedMonth: string;
  /** "YYYY-MM" — month the allowance is budgeted for */
  targetMonth: string;
  amount: number;
}

export interface MonthlyAnalyticsData {
  monthYear: string;
  totalReceived: number;
  totalSpent: number;
  categoryBreakdown: CategoryBreakdown[];
  /** Non-empty when any income entry covers a different month than received */
  crossMonthIncome: CrossMonthIncome[];
  /** Amount spent on "needs" (is_need = true) */
  needsTotal: number;
  /** Amount spent on "wants" (is_need = false) */
  wantsTotal: number;
  /** Per-day spending totals for the calendar heatmap */
  dailyBreakdown: DailySpending[];
  /** Total from subscription expenses only */
  subscriptionTotal: number;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useMonthlyAnalytics(monthYear: string) {
  const { isUnlocked, decryptMany } = useEncryption();

  return useQuery<MonthlyAnalyticsData>({
    queryKey: ['analytics', 'monthly', monthYear],
    queryFn: async () => {
      // ── 1. Fetch encrypted analytics data ───────────────────
      const res = await fetch(`/api/analytics/monthly/${monthYear}`);
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          (body as { error?: string }).error ?? 'Failed to fetch analytics',
        );
      }
      const raw: MonthlyAnalyticsQueryResult = await res.json();

      // ── 2. Decrypt all amounts in parallel ──────────────────
      const [incomeAmounts, expenseAmounts] = await Promise.all([
        raw.income.length > 0
          ? decryptMany(raw.income.map((i) => i.amount))
          : Promise.resolve([] as number[]),
        raw.expenses.length > 0
          ? decryptMany(raw.expenses.map((e) => e.amount))
          : Promise.resolve([] as number[]),
      ]);

      // ── 3. Totals ────────────────────────────────────────────
      const totalReceived = incomeAmounts.reduce((sum, a) => sum + a, 0);
      const totalSpent = expenseAmounts.reduce((sum, a) => sum + a, 0);

      // ── 4. Category breakdown ────────────────────────────────
      const catMap = new Map<string, { amount: number; isSubscription: boolean }>();
      raw.expenses.forEach((exp, i) => {
        const key = exp.category_name ?? 'Uncategorized';
        const existing = catMap.get(key);
        if (existing) {
          existing.amount += expenseAmounts[i];
        } else {
          catMap.set(key, {
            amount: expenseAmounts[i],
            isSubscription: exp.is_subscription,
          });
        }
      });

      const categoryBreakdown: CategoryBreakdown[] = Array.from(catMap.entries())
        .map(([name, { amount, isSubscription }]) => ({
          name,
          amount,
          percentage: totalSpent > 0 ? (amount / totalSpent) * 100 : 0,
          isSubscription,
        }))
        .sort((a, b) => b.amount - a.amount);

      // ── 5. Cross-month income (for footnote) ─────────────────
      const crossMonthIncome: CrossMonthIncome[] = raw.income
        .map((entry, i) => ({ entry, amount: incomeAmounts[i] }))
        .filter(
          ({ entry }) =>
            entry.target_month && entry.target_month !== entry.date.slice(0, 7),
        )
        .map(({ entry, amount }) => ({
          receivedMonth: entry.date.slice(0, 7),
          targetMonth: entry.target_month!,
          amount,
        }));

      // ── 6. Needs vs Wants ────────────────────────────────────
      let needsTotal = 0;
      let wantsTotal = 0;
      raw.expenses.forEach((exp, i) => {
        if (exp.is_need) {
          needsTotal += expenseAmounts[i];
        } else {
          wantsTotal += expenseAmounts[i];
        }
      });

      // ── 7. Daily breakdown (for heatmap) ─────────────────────
      const dayMap = new Map<string, number>();
      raw.expenses.forEach((exp, i) => {
        const day = exp.date.slice(0, 10); // "YYYY-MM-DD"
        dayMap.set(day, (dayMap.get(day) ?? 0) + expenseAmounts[i]);
      });
      const dailyBreakdown: DailySpending[] = Array.from(dayMap.entries())
        .map(([date, amount]) => ({ date, amount }))
        .sort((a, b) => a.date.localeCompare(b.date));

      // ── 8. Subscription total ────────────────────────────────
      const subscriptionTotal = raw.expenses.reduce(
        (sum, exp, i) => sum + (exp.is_subscription ? expenseAmounts[i] : 0),
        0,
      );

      return {
        monthYear,
        totalReceived,
        totalSpent,
        categoryBreakdown,
        crossMonthIncome,
        needsTotal,
        wantsTotal,
        dailyBreakdown,
        subscriptionTotal,
      };
    },
    enabled: isUnlocked && monthYear.length === 7,
    staleTime: 60 * 1_000,
  });
}
