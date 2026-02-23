'use client';

// ============================================================
// KHARCHA — useBudget Hook
// Fetches the current month's encrypted income + expense data
// from the budget API route, decrypts it client-side using the
// in-memory AES key, and runs the budget calculation algorithm
// described in MASTER_PROJECT_DOCUMENT.md §7.1.
//
// The hook is disabled when the app is locked (no key in memory).
// ============================================================

import { useQuery } from '@tanstack/react-query';
import { useEncryption } from './useEncryption';
import { calculateBudget } from '@/lib/algorithms/daily-limit';
import type {
  BudgetState,
  BudgetResult,
  MonthlyBudgetQueryResult,
  IncomeType,
} from '@/types';

// ── Dashboard-specific budget type ──────────────────────────────────────────

/**
 * Extends BudgetResult with raw financial totals needed by dashboard cards.
 * The base BudgetResult is a pure calculation output; DashboardBudget adds
 * the source values so BalanceCard can show "₹X spent of ₹Y" without
 * reverse-engineering them from derived metrics.
 */
export interface DashboardBudget extends BudgetResult {
  /** Total income for the month (allowance + bonus) */
  totalBudget: number;
  /** Total expenses for the month (excludes pass-through) */
  totalSpent: number;
}

// ── Income type categorisation ────────────────────────────────────────────────

/** Income types that count toward the regular monthly budget. */
const ALLOWANCE_TYPES: IncomeType[] = ['allowance'];
const BONUS_TYPES: IncomeType[] = ['festival_bonus', 'other', 'vault_replenish'];

// ── Hook ──────────────────────────────────────────────────────────────────────

/**
 * Fetches, decrypts, and calculates the monthly budget in one step.
 *
 * @returns TanStack Query result with `data: DashboardBudget` when the app
 *          is unlocked and data is available; `undefined` otherwise.
 *
 * staleTime: 30 s — budget should feel real-time after every transaction.
 */
export function useBudget() {
  const { isUnlocked, decryptMany } = useEncryption();

  return useQuery<DashboardBudget>({
    queryKey: ['budget', 'monthly'],
    queryFn: async () => {
      // ── 1. Fetch encrypted budget data ──────────────────────
      const res = await fetch('/api/budget/monthly');
      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error((body as { error?: string }).error ?? 'Failed to fetch budget data');
      }
      const raw: MonthlyBudgetQueryResult = await res.json();

      // ── 2. Decrypt amounts client-side ──────────────────────
      const incomeAmounts = raw.total_income.length > 0
        ? await decryptMany(raw.total_income.map((i) => i.amount))
        : [];

      const expenseAmounts = raw.total_expenses.length > 0
        ? await decryptMany(raw.total_expenses.map((e) => e.amount))
        : [];

      // ── 3. Categorise income ────────────────────────────────
      let totalAllowance = 0;
      let totalBonus = 0;

      raw.total_income.forEach((entry, i) => {
        const amount = incomeAmounts[i] ?? 0;
        if (ALLOWANCE_TYPES.includes(entry.type)) {
          totalAllowance += amount;
        } else if (BONUS_TYPES.includes(entry.type)) {
          totalBonus += amount;
        }
        // emergency_fund and pass_through excluded from regular budget
      });

      // ── 4. Sum expenses ─────────────────────────────────────
      const totalExpenses = expenseAmounts.reduce((sum, a) => sum + a, 0);

      // ── 5. Calendar metadata ────────────────────────────────
      const now = new Date();
      const dayOfMonth = now.getDate();
      const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
      const dayOfWeek = now.getDay(); // 0 = Sunday, 6 = Saturday
      const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

      // ── 6. Build BudgetState and calculate ──────────────────
      const state: BudgetState = {
        totalAllowance,
        totalBonus,
        totalExpenses,
        expectedSubscriptions: 0, // Phase 6: subscription tracking
        dayOfMonth,
        daysInMonth,
        isWeekend,
      };

      const result = calculateBudget(state);

      return {
        ...result,
        totalBudget: totalAllowance + totalBonus,
        totalSpent: totalExpenses,
      };
    },
    // Only run when the app is unlocked — no key = cannot decrypt
    enabled: isUnlocked,
    staleTime: 30 * 1_000, // 30 seconds
  });
}
