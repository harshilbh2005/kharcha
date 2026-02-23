// ============================================================
// KHARCHA — Daily Spending Limit & Budget Calculator
// Section 7.1 of KHARCHA_MASTER_PROJECT_DOCUMENT.md
//
// Core budget engine for the dashboard. Computes:
//   - Available budget after expenses & upcoming subscriptions
//   - Smart daily limit with weekend 1.3x multiplier
//   - Burn rate with safe / caution / danger classification
//   - Month-end spending projection
//   - Days-until-broke countdown
//   - Weekly budget rollup
//
// Usage:
//   const result = calculateBudget({
//     totalAllowance: 15000,
//     totalBonus: 2000,
//     totalExpenses: 4200,
//     expectedSubscriptions: 800,
//     dayOfMonth: 12,
//     daysInMonth: 30,
//     isWeekend: true,
//   });
//   // result.dailyLimit → ₹665  (with weekend boost)
//   // result.burnStatus → 'safe'
// ============================================================

import type { BudgetState, BudgetResult, BurnStatus } from '@/types';

// ─── Constants ──────────────────────────────────────────────────────────────────

/** Minimum daily limit floor — ensures user always has emergency spending room */
const DAILY_LIMIT_FLOOR = 50;

/** Weekend multiplier — weekends get 30% more daily budget */
const WEEKEND_MULTIPLIER = 1.3;

/** Burn rate thresholds (ratio of actual vs ideal spending) */
const BURN_RATE_SAFE_UPPER = 0.8;
const BURN_RATE_CAUTION_UPPER = 1.0;

// ─── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Clamp a value between min and max (inclusive).
 */
function clamp(value: number, min: number, max: number): number {
  return Math.min(Math.max(value, min), max);
}

/**
 * Determine burn status from a burn rate ratio.
 *
 * | Ratio Range | Status    | Meaning                               |
 * |-------------|-----------|---------------------------------------|
 * | < 0.8       | safe      | Spending below ideal pace (sage)      |
 * | 0.8 – 1.0   | caution   | On track or slightly over (amber)     |
 * | > 1.0       | danger    | Overspending relative to time (brick) |
 */
function deriveBurnStatus(burnRate: number): BurnStatus {
  if (burnRate < BURN_RATE_SAFE_UPPER) return 'safe';
  if (burnRate <= BURN_RATE_CAUTION_UPPER) return 'caution';
  return 'danger';
}

// ─── Main Algorithm ─────────────────────────────────────────────────────────────

/**
 * Calculate the complete budget picture for the current month.
 *
 * ## Algorithm
 *
 * ```
 * totalBudget         = totalAllowance + totalBonus
 * available           = totalBudget − totalExpenses − expectedSubscriptions
 * daysRemaining       = daysInMonth − dayOfMonth + 1  (including today)
 * dailyLimit          = available / daysRemaining
 *                       × 1.3 if weekend
 *                       floor ₹50
 *
 * idealSpentByNow     = totalBudget × (dayOfMonth / daysInMonth)
 * burnRate            = totalExpenses / idealSpentByNow
 *
 * avgDailySpend       = totalExpenses / daysElapsed
 * projectedTotal      = avgDailySpend × daysInMonth
 * projectedMonthEnd   = totalBudget − projectedTotal
 * daysUntilBroke      = available / avgDailySpend  (null if won't run out)
 * weeklyBudget        = dailyLimit × 7
 * ```
 *
 * ## Edge Cases
 * - **Zero income**: Returns floor daily limit (₹50), burn rate 0, status 'safe'
 * - **First day of month**: daysElapsed = 1, full budget available
 * - **Last day of month**: daysRemaining = 1, all remaining budget is today's limit
 * - **Overspent (negative available)**: available clamped to 0, daily limit = ₹50 floor
 * - **No expenses yet**: avgDailySpend = 0, daysUntilBroke = null (won't run out)
 *
 * @param state - Current month's budget state (all amounts in INR, decrypted)
 * @returns Computed budget metrics for dashboard display
 *
 * @example
 * ```ts
 * // Mid-month, weekday
 * calculateBudget({
 *   totalAllowance: 15000,
 *   totalBonus: 0,
 *   totalExpenses: 6000,
 *   expectedSubscriptions: 500,
 *   dayOfMonth: 15,
 *   daysInMonth: 30,
 *   isWeekend: false,
 * });
 * // → { availableBudget: 8500, dailyLimit: 531, burnRate: 0.80, burnStatus: 'caution', ... }
 * ```
 */
export function calculateBudget(state: BudgetState): BudgetResult {
  const {
    totalAllowance,
    totalBonus,
    totalExpenses,
    expectedSubscriptions,
    dayOfMonth,
    daysInMonth,
    isWeekend,
  } = state;

  // ── Derived values ──────────────────────────────────────────────────────────

  const totalBudget = totalAllowance + totalBonus;
  const available = totalBudget - totalExpenses - expectedSubscriptions;

  // Days remaining including today; clamp to at least 1 to avoid division by zero
  const daysRemaining = Math.max(daysInMonth - dayOfMonth + 1, 1);

  // Days elapsed; on day 1 this is 1 (you've "started" the first day)
  const daysElapsed = clamp(dayOfMonth, 1, daysInMonth);

  // ── Daily limit ─────────────────────────────────────────────────────────────
  // Base: spread remaining budget evenly across remaining days
  // Weekend boost: college student spends more on Sat/Sun (outings, food)
  // Floor: always at least ₹50 so user isn't locked out of basic purchases

  let dailyLimit = available / daysRemaining;

  if (isWeekend) {
    dailyLimit *= WEEKEND_MULTIPLIER;
  }

  // Enforce minimum floor — even when budget is negative/zero,
  // user should see ₹50 (with a danger burn status to warn them)
  dailyLimit = Math.max(dailyLimit, DAILY_LIMIT_FLOOR);

  // ── Burn rate ───────────────────────────────────────────────────────────────
  // How fast are we spending relative to an ideal linear pace?
  //   idealSpentByNow = totalBudget × (dayOfMonth / daysInMonth)
  //   burnRate = actualSpent / idealSpent
  //
  // Edge: zero income → idealSpentByNow is 0 → burnRate defaults to 0 (safe)
  //        This makes sense: if you have no budget, no spending is expected.

  const idealSpentByNow = totalBudget * (daysElapsed / daysInMonth);
  const burnRate = idealSpentByNow > 0
    ? totalExpenses / idealSpentByNow
    : 0;
  const burnStatus = deriveBurnStatus(burnRate);

  // ── Month-end projection ────────────────────────────────────────────────────
  // Project forward: if user keeps spending at current avg, what's left at month end?
  //
  // Edge: first day with no expenses → avgDailySpend = 0 → projectedTotal = 0
  //        → projectedMonthEnd = totalBudget (full budget remaining, which is correct)

  const avgDailySpend = daysElapsed > 0
    ? totalExpenses / daysElapsed
    : 0;
  const projectedTotal = avgDailySpend * daysInMonth;
  const projectedMonthEnd = totalBudget - projectedTotal;

  // ── Days until broke ────────────────────────────────────────────────────────
  // At current spending pace, how many days until available balance hits zero?
  //
  // Returns null when:
  //   - No expenses yet (avgDailySpend = 0) → user won't run out at current pace
  //   - Projected broke date is AFTER month end → user will make it through
  //   - Available is negative → user is already "broke" (daysUntilBroke = 0 shown via clamp)

  let daysUntilBroke: number | null = null;

  if (avgDailySpend > 0) {
    const rawDaysUntilBroke = Math.floor(available / avgDailySpend);

    if (available <= 0) {
      // Already overspent — 0 days until broke
      daysUntilBroke = 0;
    } else if (rawDaysUntilBroke < daysRemaining) {
      // Will run out before month ends — surface the warning
      daysUntilBroke = rawDaysUntilBroke;
    }
    // else: will make it through the month → null (no warning needed)
  }

  // ── Weekly budget ───────────────────────────────────────────────────────────
  // Simple 7× daily limit for a glanceable weekly number.
  // Uses the adjusted daily limit (with weekend multiplier if applicable).

  const weeklyBudget = Math.round(Math.min(dailyLimit * 7, Math.max(available, 0)));

  // ── Return ──────────────────────────────────────────────────────────────────

  return {
    availableBudget: Math.max(Math.round(available), 0),
    dailyLimit: Math.round(dailyLimit),
    burnRate: Math.round(burnRate * 100) / 100,
    burnStatus,
    projectedMonthEnd: Math.round(projectedMonthEnd),
    daysUntilBroke,
    weeklyBudget,
  };
}

// ─── Convenience Builders ───────────────────────────────────────────────────────

/**
 * Build a `BudgetState` from raw values + a Date, deriving day-of-month
 * fields and weekend status automatically.
 *
 * Useful when calling from server actions or hooks where you have a Date
 * object rather than pre-computed day fields.
 *
 * @param params - Financial data for the current month
 * @param date   - The reference date (defaults to now)
 * @returns A fully populated BudgetState ready for `calculateBudget`
 *
 * @example
 * ```ts
 * const state = buildBudgetState({
 *   totalAllowance: 15000,
 *   totalBonus: 2000,
 *   totalExpenses: 4200,
 *   expectedSubscriptions: 800,
 * });
 * const result = calculateBudget(state);
 * ```
 */
export function buildBudgetState(
  params: {
    totalAllowance: number;
    totalBonus: number;
    totalExpenses: number;
    expectedSubscriptions: number;
  },
  date: Date = new Date(),
): BudgetState {
  const dayOfMonth = date.getDate();
  const year = date.getFullYear();
  const month = date.getMonth();

  // Total days in this calendar month
  // new Date(year, month + 1, 0).getDate() gives last day of current month
  const daysInMonth = new Date(year, month + 1, 0).getDate();

  // Saturday (6) or Sunday (0)
  const dayOfWeek = date.getDay();
  const isWeekend = dayOfWeek === 0 || dayOfWeek === 6;

  return {
    ...params,
    dayOfMonth,
    daysInMonth,
    isWeekend,
  };
}

/**
 * Create an empty/zero budget state for a given date.
 *
 * Useful as a default/fallback when data hasn't loaded yet,
 * or for the very start of a month with no income entries.
 *
 * @param date - The reference date (defaults to now)
 * @returns A BudgetState with all financial values set to 0
 */
export function emptyBudgetState(date: Date = new Date()): BudgetState {
  return buildBudgetState(
    {
      totalAllowance: 0,
      totalBonus: 0,
      totalExpenses: 0,
      expectedSubscriptions: 0,
    },
    date,
  );
}

/**
 * Format a BurnStatus into a human-readable label for the UI.
 *
 * @param status - The burn status classification
 * @returns A display-friendly label string
 */
export function burnStatusLabel(status: BurnStatus): string {
  switch (status) {
    case 'safe':
      return 'On Track';
    case 'caution':
      return 'Watch It';
    case 'danger':
      return 'Overspending';
  }
}

/**
 * Get the CSS variable color name for a given burn status.
 * Maps to the Slate & Parchment design system color tokens.
 *
 * | Status  | CSS Variable     | Color          |
 * |---------|------------------|----------------|
 * | safe    | --color-income   | Sage Moss      |
 * | caution | --color-accent   | Aged Bronze    |
 * | danger  | --color-expense  | Terracotta     |
 *
 * @param status - The burn status classification
 * @returns CSS variable name (without `var()` wrapper)
 */
export function burnStatusColor(status: BurnStatus): string {
  switch (status) {
    case 'safe':
      return '--color-income';
    case 'caution':
      return '--color-accent';
    case 'danger':
      return '--color-expense';
  }
}

// ─── Re-export types for convenience ────────────────────────────────────────────

export type { BudgetState, BudgetResult, BurnStatus };
