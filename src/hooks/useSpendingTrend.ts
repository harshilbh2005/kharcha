'use client';

// ============================================================
// KHARCHA — useSpendingTrend Hook
// Fetches and decrypts spending totals for the last 6 months
// (5 prior months + current month). Used by SpendingTrendLine.
// ============================================================

import { useQuery } from '@tanstack/react-query';
import { format, subMonths, parse } from 'date-fns';
import { useEncryption } from './useEncryption';
import type { MonthlyAnalyticsQueryResult } from '@/types';

export interface TrendMonth {
  monthYear: string;   // "YYYY-MM"
  label: string;       // "Feb 26"
  amount: number;
  isCurrentMonth: boolean;
}

export function useSpendingTrend(currentMonthYear: string) {
  const { isUnlocked, decryptMany } = useEncryption();

  return useQuery<TrendMonth[]>({
    queryKey: ['analytics', 'trend', currentMonthYear],
    queryFn: async () => {
      const currentDate = parse(currentMonthYear, 'yyyy-MM', new Date());

      // Build list: oldest first (5 months ago → current)
      const months = Array.from({ length: 6 }, (_, i) =>
        format(subMonths(currentDate, 5 - i), 'yyyy-MM'),
      );

      // ── Fetch all 6 months in parallel ──────────────────────
      const rawData = await Promise.all(
        months.map(async (m) => {
          try {
            const res = await fetch(`/api/analytics/monthly/${m}`);
            if (!res.ok) return { month_year: m, income: [], expenses: [] } as MonthlyAnalyticsQueryResult;
            return (await res.json()) as MonthlyAnalyticsQueryResult;
          } catch {
            return { month_year: m, income: [], expenses: [] } as MonthlyAnalyticsQueryResult;
          }
        }),
      );

      // ── Batch-decrypt all expense amounts across all months ──
      // Track which month index each amount belongs to
      const allAmounts: string[] = [];
      const monthIndices: number[] = [];

      rawData.forEach((monthData, monthIdx) => {
        monthData.expenses.forEach((exp) => {
          allAmounts.push(exp.amount);
          monthIndices.push(monthIdx);
        });
      });

      const decrypted =
        allAmounts.length > 0 ? await decryptMany(allAmounts) : ([] as number[]);

      // ── Sum totals per month ─────────────────────────────────
      const monthTotals = new Array<number>(6).fill(0);
      decrypted.forEach((amount, i) => {
        monthTotals[monthIndices[i]] += amount;
      });

      return months.map((m, i) => ({
        monthYear: m,
        label: format(parse(m, 'yyyy-MM', new Date()), 'MMM yy'),
        amount: monthTotals[i],
        isCurrentMonth: m === currentMonthYear,
      }));
    },
    enabled: isUnlocked && currentMonthYear.length === 7,
    staleTime: 5 * 60 * 1_000, // 5 min — trend changes rarely
  });
}
