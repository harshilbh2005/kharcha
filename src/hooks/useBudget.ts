'use client';

// ============================================================
// KHARCHA — useBudget Hook
// Fetches the continuous balance from /api/budget/current,
// decrypts amounts client-side, and runs the budget calculator.
//
// The hook is disabled when the app is locked (no key in memory).
// ============================================================

import { useQuery } from '@tanstack/react-query';
import { useEncryption } from './useEncryption';
import { calculateBudget } from '@/lib/algorithms/daily-limit';
import type { BudgetInput, BudgetResult, BudgetQueryResult } from '@/types';

// ── Dashboard-specific budget type ──────────────────────────────────────────

/**
 * Extends BudgetResult with raw financial totals needed by dashboard cards.
 */
export interface DashboardBudget extends BudgetResult {
  /** Total income (allowance + bonus) */
  totalBudget: number;
  /** Total expenses (excludes pass-through) */
  totalSpent: number;
  /** Upcoming subscription costs reserved from available balance */
  expectedSubscriptions: number;
  /** Total expenses in the rolling 7-day window (for weekly spent display) */
  weeklySpent: number;
  /** Date the budget period started (earliest income entry, YYYY-MM-DD) */
  budgetStartDate: string | null;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Fetches, decrypts, and calculates the budget in one step.
 *
 * staleTime: 30 s — budget should feel real-time after every transaction.
 */
export function useBudget() {
  const { isUnlocked, decryptMany } = useEncryption();

  return useQuery<DashboardBudget>({
    queryKey: ['budget', 'current'],
    queryFn: async () => {
      // ── 1. Fetch encrypted budget data ──────────────────────
      const res = await fetch('/api/budget/current');
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? 'Failed to fetch budget data');
      }
      const raw: BudgetQueryResult = await res.json();

      // ── 2. Decrypt all amounts in parallel ──────────────────
      const [incomeAmounts, expenseAmounts, todayAmounts, yesterdayAmounts, weekAmounts, subAmounts] = await Promise.all([
        raw.total_income.length > 0
          ? decryptMany(raw.total_income.map((i) => i.amount))
          : Promise.resolve([] as number[]),
        raw.total_expenses.length > 0
          ? decryptMany(raw.total_expenses.map((e) => e.amount))
          : Promise.resolve([] as number[]),
        raw.today_expenses.length > 0
          ? decryptMany(raw.today_expenses.map((e) => e.amount))
          : Promise.resolve([] as number[]),
        raw.yesterday_expenses.length > 0
          ? decryptMany(raw.yesterday_expenses.map((e) => e.amount))
          : Promise.resolve([] as number[]),
        raw.week_expenses.length > 0
          ? decryptMany(raw.week_expenses.map((e) => e.amount))
          : Promise.resolve([] as number[]),
        raw.expected_subscriptions.length > 0
          ? decryptMany(raw.expected_subscriptions.map((s) => s.amount))
          : Promise.resolve([] as number[]),
      ]);

      // ── 3. Sum totals ───────────────────────────────────────
      const totalIncome = incomeAmounts.reduce((sum, a) => sum + a, 0);
      const totalExpenses = expenseAmounts.reduce((sum, a) => sum + a, 0);
      const todayExpenses = todayAmounts.reduce((sum, a) => sum + a, 0);
      const yesterdayExpenses = yesterdayAmounts.reduce((sum, a) => sum + a, 0);
      const weeklySpent = weekAmounts.reduce((sum, a) => sum + a, 0);
      const expectedSubscriptions = subAmounts.reduce((sum, a) => sum + a, 0);

      // ── 4. Weekend check ────────────────────────────────────
      const dayOfWeek = new Date().getDay();
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      // ── 5. Build BudgetInput and calculate ──────────────────
      const input: BudgetInput = {
        totalIncome,
        totalExpenses,
        todayExpenses,
        yesterdayExpenses,
        expectedSubscriptions,
        latestTargetMonth: raw.latest_target_month,
        isWeekend,
      };

      const result = calculateBudget(input);

      return {
        ...result,
        totalBudget: totalIncome,
        totalSpent: totalExpenses,
        expectedSubscriptions,
        weeklySpent: Math.round(weeklySpent),
        budgetStartDate: raw.budget_start_date,
      };
    },
    enabled: isUnlocked,
    staleTime: 30 * 1_000,
  });
}
