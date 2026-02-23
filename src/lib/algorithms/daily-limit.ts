// ============================================================
// KHARCHA — Continuous-Balance Budget Calculator
//
// Unlike a traditional monthly budget that resets each month,
// this algorithm treats all income as ONE continuous pool and
// stretches spending to the END of the furthest month the user
// has received allowance for (the "budget horizon").
//
// Example:
//   - Feb 1: Dad sends ₹12,000 (target_month: "2026-02")
//   - Feb 20: Dad sends ₹12,000 for March (target_month: "2026-03")
//   - Horizon jumps from Feb 28 → Mar 31 automatically
//   - Daily limit recalculates across the longer window
//
// Key formulas:
//   availableBalance = totalIncome − totalExpenses − expectedSubscriptions
//   daysRemaining    = days from today → last day of horizon (inclusive)
//   dailyLimit       = availableBalance / daysRemaining × weekend multiplier
//   burnRate         = totalExpenses / idealSpentByNow
//
// Usage:
//   const result = calculateBudget({
//     totalIncome: 24000,
//     totalExpenses: 4200,
//     todayExpenses: 350,
//     expectedSubscriptions: 800,
//     latestTargetMonth: '2026-03',
//     isWeekend: true,
//   });
//   // result.dailyLimit → ₹793 (with weekend boost)
//   // result.burnStatus → 'safe'
// ============================================================

// ─── Types ──────────────────────────────────────────────────────────────────────

export type BurnStatus = 'safe' | 'caution' | 'danger';

/**
 * Input to the budget calculator.
 *
 * All monetary values are in INR (decrypted). The caller is responsible
 * for decrypting amounts before passing them here.
 */
export interface BudgetInput {
  /** Sum of ALL allowance + bonus income (excludes pass-through, emergency_fund) */
  totalIncome: number;

  /** Sum of ALL expenses to date (excludes pass-through) */
  totalExpenses: number;

  /** Amount spent today specifically — used for todayRemaining calculation */
  todayExpenses: number;

  /** Unpaid subscriptions expected to bill before the budget horizon */
  expectedSubscriptions: number;

  /**
   * The furthest `target_month` from income_entries, e.g. "2026-03".
   * Determines the budget horizon (last day of that month).
   * If null, falls back to end of current month.
   */
  latestTargetMonth: string | null;

  /** Whether today is Saturday or Sunday — weekends get a 30% spending boost */
  isWeekend: boolean;
}

/**
 * Complete budget calculation output for dashboard display.
 *
 * All monetary values are rounded to whole rupees.
 */
export interface BudgetResult {
  /** Total money available right now (income − expenses − upcoming subscriptions, floored at 0) */
  availableBalance: number;

  /** Last day of the budget period — spending must last until this date */
  budgetHorizon: Date;

  /** Calendar days from today to budget horizon (inclusive, minimum 1) */
  daysRemaining: number;

  /**
   * How much can be spent today.
   * = availableBalance / daysRemaining, with weekend 1.3× multiplier, floored at ₹50.
   */
  dailyLimit: number;

  /** dailyLimit × 7 — glanceable weekly number, capped at availableBalance */
  weeklyBudget: number;

  /**
   * Spending pace relative to ideal linear consumption.
   *   < 0.8  → safe (under-spending)
   *   0.8–1.0 → caution (on track)
   *   > 1.0  → danger (over-spending)
   */
  burnRate: number;

  /** Categorical classification of burnRate */
  burnStatus: BurnStatus;

  /** Projected balance at horizon date if current avg daily spend continues */
  projectedEndBalance: number;

  /**
   * Days until balance hits zero at current spending pace.
   * null if pace is zero (no expenses yet) or if user will make it to horizon.
   */
  daysUntilBroke: number | null;

  /** dailyLimit − todayExpenses, floored at 0 */
  todayRemaining: number;
}

// ─── Constants ──────────────────────────────────────────────────────────────────

/** Minimum daily limit floor — ensures user always has emergency spending room */
const DAILY_LIMIT_FLOOR = 50;

/** Weekend multiplier — weekends get 30% more daily budget */
const WEEKEND_MULTIPLIER = 1.3;

/** Burn rate thresholds (ratio of actual vs ideal spending) */
const BURN_RATE_SAFE_UPPER = 0.8;
const BURN_RATE_CAUTION_UPPER = 1.0;

/** Milliseconds in one day */
const MS_PER_DAY = 86_400_000;

// ─── Helpers ────────────────────────────────────────────────────────────────────

/**
 * Determine burn status from a burn rate ratio.
 *
 * | Ratio Range | Status  | Meaning                                |
 * |-------------|---------|----------------------------------------|
 * | < 0.8       | safe    | Spending below ideal pace (sage)       |
 * | 0.8 – 1.0   | caution | On track or slightly over (amber)      |
 * | > 1.0       | danger  | Overspending relative to time (brick)  |
 */
function deriveBurnStatus(burnRate: number): BurnStatus {
  if (burnRate < BURN_RATE_SAFE_UPPER) return 'safe';
  if (burnRate <= BURN_RATE_CAUTION_UPPER) return 'caution';
  return 'danger';
}

/**
 * Get the start date of the current budget period.
 *
 * For simplicity, this returns the 1st of the current calendar month.
 * The budget period runs from this date through the budget horizon.
 *
 * Examples:
 *   - Feb allowance only → period: Feb 1 – Feb 28
 *   - Feb + March allowance → period: Feb 1 – Mar 31
 *   - Called on Feb 15 → always returns Feb 1
 *
 * @param _latestTargetMonth - Currently unused; reserved for future
 *   multi-month start detection (e.g., if user starts mid-month)
 * @returns Date object set to midnight on the 1st of the current month
 */
export function getHorizonStartDate(_latestTargetMonth: string | null): Date {
  const now = new Date();
  return new Date(now.getFullYear(), now.getMonth(), 1);
}

/**
 * Parse a "YYYY-MM" string into the last day of that month.
 *
 * Uses the `new Date(year, month, 0)` trick:
 *   "2026-03" → new Date(2026, 3, 0) → March 31, 2026
 *
 * @param ym - A string in "YYYY-MM" format
 * @returns Date set to the last day of the specified month at 23:59:59.999
 */
function lastDayOfMonth(ym: string): Date {
  const [year, month] = ym.split('-').map(Number);
  const d = new Date(year, month, 0); // day 0 of next month = last day of `month`
  d.setHours(23, 59, 59, 999);
  return d;
}

// ─── Main Algorithm ─────────────────────────────────────────────────────────────

/**
 * Calculate the complete budget picture using the continuous-balance model.
 *
 * ## Algorithm
 *
 * ```
 * 1. HORIZON
 *    horizonDate        = last day of latestTargetMonth (or current month)
 *
 * 2. DAYS
 *    daysRemaining      = ceil((horizon - today) / MS_PER_DAY), min 1
 *    daysElapsed        = ceil((today - periodStart) / MS_PER_DAY), min 1
 *    totalDays          = daysElapsed + daysRemaining - 1
 *
 * 3. BALANCE
 *    availableBalance   = max(0, totalIncome - totalExpenses - expectedSubscriptions)
 *
 * 4. DAILY LIMIT
 *    dailyLimit         = availableBalance / daysRemaining
 *                         × 1.3 if weekend
 *                         floor ₹50
 *
 * 5. BURN RATE
 *    idealSpentByNow    = totalIncome × (daysElapsed / totalDays)
 *    burnRate           = totalExpenses / idealSpentByNow
 *
 * 6. PROJECTIONS
 *    avgDailySpend      = totalExpenses / daysElapsed
 *    projectedEndBalance = availableBalance - (avgDailySpend × daysRemaining)
 *    daysUntilBroke     = floor(availableBalance / avgDailySpend)
 *
 * 7. TODAY
 *    todayRemaining     = max(0, dailyLimit - todayExpenses)
 * ```
 *
 * ## Edge Cases
 * - **No target_month**: Falls back to end of current month
 * - **Zero income**: dailyLimit = ₹50 floor, burnRate = 0, status 'safe'
 * - **First day**: daysElapsed = 1, full budget available
 * - **Last day of horizon**: daysRemaining = 1, all remaining is today's limit
 * - **Overspent**: availableBalance clamped to 0, dailyLimit = ₹50 floor
 * - **No expenses**: avgDailySpend = 0, daysUntilBroke = null
 * - **Horizon in the past**: daysRemaining = 1 (clamp), triggers danger burn
 *
 * @param input - Current budget state (all amounts in INR, decrypted)
 * @returns Computed budget metrics for dashboard display
 *
 * @example
 * ```ts
 * // Mid-month, March allowance received, weekday
 * calculateBudget({
 *   totalIncome: 24000,
 *   totalExpenses: 6000,
 *   todayExpenses: 200,
 *   expectedSubscriptions: 500,
 *   latestTargetMonth: '2026-03',
 *   isWeekend: false,
 * });
 * // → { availableBalance: 17500, dailyLimit: ~449, burnStatus: 'safe', ... }
 * ```
 */
export function calculateBudget(input: BudgetInput): BudgetResult {
  const {
    totalIncome,
    totalExpenses,
    todayExpenses,
    expectedSubscriptions,
    latestTargetMonth,
    isWeekend,
  } = input;

  // ── 1. Determine budget horizon ─────────────────────────────────────────────
  // End of the latest target month, or end of current month as fallback.

  let budgetHorizon: Date;
  if (latestTargetMonth) {
    budgetHorizon = lastDayOfMonth(latestTargetMonth);
  } else {
    const now = new Date();
    budgetHorizon = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    budgetHorizon.setHours(23, 59, 59, 999);
  }

  // ── 2. Calculate day counts ─────────────────────────────────────────────────

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Days from today to horizon (inclusive of both today and horizon day)
  const daysRemaining = Math.max(
    1,
    Math.ceil((budgetHorizon.getTime() - today.getTime()) / MS_PER_DAY),
  );

  // Days elapsed since the budget period started (1st of current month)
  const periodStart = getHorizonStartDate(latestTargetMonth);
  const daysElapsed = Math.max(
    1,
    Math.ceil((today.getTime() - periodStart.getTime()) / MS_PER_DAY) + 1, // +1: day 1 = first day
  );

  // Total days in the budget period
  const totalDays = daysElapsed + daysRemaining - 1; // -1: today counted in both

  // ── 3. Available balance ────────────────────────────────────────────────────
  // Subtract upcoming subscriptions — they're committed spending.

  const availableBalance = Math.max(
    0,
    totalIncome - totalExpenses - expectedSubscriptions,
  );

  // ── 4. Daily limit ──────────────────────────────────────────────────────────
  // Spread remaining balance evenly, boost on weekends, enforce floor.

  let dailyLimit = availableBalance / daysRemaining;

  if (isWeekend) {
    dailyLimit *= WEEKEND_MULTIPLIER;
  }

  dailyLimit = Math.max(dailyLimit, DAILY_LIMIT_FLOOR);

  // ── 5. Burn rate ────────────────────────────────────────────────────────────
  // How fast are we spending vs an ideal linear pace across the full period?
  //
  //   idealSpentByNow = totalIncome × (daysElapsed / totalDays)
  //   burnRate = actualSpent / idealSpent
  //
  // Zero income → burnRate = 0 (safe). No spending expected with no budget.

  const idealSpentByNow = totalIncome * (daysElapsed / totalDays);
  const burnRate = idealSpentByNow > 0
    ? totalExpenses / idealSpentByNow
    : 0;
  const burnStatus = deriveBurnStatus(burnRate);

  // ── 6. Projections ──────────────────────────────────────────────────────────
  // If user keeps spending at current avg daily rate, what's left at horizon?

  const avgDailySpend = daysElapsed > 0
    ? totalExpenses / daysElapsed
    : 0;

  const projectedEndBalance = availableBalance - (avgDailySpend * daysRemaining);

  // Days until balance hits zero at current pace.
  // null when: no expenses yet, or user will make it to horizon.
  let daysUntilBroke: number | null = null;

  if (avgDailySpend > 0) {
    if (availableBalance <= 0) {
      daysUntilBroke = 0;
    } else {
      const raw = Math.floor(availableBalance / avgDailySpend);
      if (raw < daysRemaining) {
        daysUntilBroke = raw;
      }
      // else: will make it to horizon → null (no warning)
    }
  }

  // ── 7. Today remaining ──────────────────────────────────────────────────────

  const todayRemaining = Math.max(0, dailyLimit - todayExpenses);

  // ── 8. Weekly budget ────────────────────────────────────────────────────────
  // Capped at available balance so it never exceeds what's actually there.

  const weeklyBudget = Math.round(
    Math.min(dailyLimit * 7, availableBalance),
  );

  // ── Return ──────────────────────────────────────────────────────────────────

  return {
    availableBalance: Math.round(availableBalance),
    budgetHorizon,
    daysRemaining,
    dailyLimit: Math.round(dailyLimit),
    weeklyBudget,
    burnRate: Math.round(burnRate * 100) / 100,
    burnStatus,
    projectedEndBalance: Math.round(projectedEndBalance),
    daysUntilBroke,
    todayRemaining: Math.round(todayRemaining),
  };
}

// ─── Convenience ────────────────────────────────────────────────────────────────

/**
 * Build a `BudgetInput` from raw financial data, auto-detecting
 * weekend status from the current date.
 *
 * @param params - Financial data (decrypted amounts in INR)
 * @returns A fully populated BudgetInput ready for `calculateBudget`
 */
export function buildBudgetInput(
  params: Omit<BudgetInput, 'isWeekend'>,
  date: Date = new Date(),
): BudgetInput {
  const dayOfWeek = date.getDay();
  return {
    ...params,
    isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
  };
}

/**
 * Create a zero-state BudgetInput — useful as a loading/fallback default.
 */
export function emptyBudgetInput(): BudgetInput {
  const dayOfWeek = new Date().getDay();
  return {
    totalIncome: 0,
    totalExpenses: 0,
    todayExpenses: 0,
    expectedSubscriptions: 0,
    latestTargetMonth: null,
    isWeekend: dayOfWeek === 0 || dayOfWeek === 6,
  };
}

/**
 * Format a BurnStatus into a human-readable label for the UI.
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
 * Get the CSS variable name for a given burn status.
 * Maps to the Slate & Parchment design system color tokens.
 *
 * | Status  | CSS Variable    | Color       |
 * |---------|-----------------|-------------|
 * | safe    | --color-income  | Sage Moss   |
 * | caution | --color-accent  | Aged Bronze |
 * | danger  | --color-expense | Terracotta  |
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
