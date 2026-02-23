// ============================================================
// KHARCHA — Subscription Matching Algorithm
// Section 7.2 of KHARCHA_MASTER_PROJECT_DOCUMENT.md
//
// Given a new transaction (description, amount, date), scores it
// against all active subscriptions using a 3-factor system:
//   1. Keyword match     → 0.8 points
//   2. Amount proximity  → 0.6 (within 5%) or 0.3 (within 15%)
//   3. Date proximity    → 0.3 (within 3 days) or 0.1 (within 7)
//
// Thresholds:
//   ≥ 1.0  → auto-match (link automatically)
//   ≥ 0.7  → suggest (ask user to confirm)
//   < 0.7  → no match
//
// Usage:
//   const result = matchTransaction(
//     'YouTube Premium via Google',
//     189,
//     new Date('2026-02-15'),
//     decryptedSubscriptions,
//     84.5, // USD→INR rate
//   );
//   // result?.auto_match → true if confident enough
// ============================================================

import type { SubscriptionMatchResult } from '@/types';

// ─── Constants ──────────────────────────────────────────────────────────────────

/** Points for a keyword/name substring match */
const KEYWORD_SCORE = 0.8;

/** Points for amount within ±5% */
const AMOUNT_EXACT_SCORE = 0.6;

/** Points for amount within ±15% (but > 5%) */
const AMOUNT_CLOSE_SCORE = 0.3;

/** Points for date within ±3 days of billing_day */
const DATE_NEAR_SCORE = 0.3;

/** Points for date within ±7 days of billing_day (but > 3) */
const DATE_FAR_SCORE = 0.1;

/** Amount tolerance thresholds */
const AMOUNT_EXACT_TOLERANCE = 0.05; // 5%
const AMOUNT_CLOSE_TOLERANCE = 0.15; // 15%

/** Date proximity thresholds (days) */
const DATE_NEAR_DAYS = 3;
const DATE_FAR_DAYS = 7;

/** Minimum score to return as a match */
const SUGGEST_THRESHOLD = 0.7;

/** Minimum score for automatic matching (no user confirmation) */
const AUTO_MATCH_THRESHOLD = 1.0;

// ─── Types ──────────────────────────────────────────────────────────────────────

/**
 * A decrypted subscription with plaintext amounts.
 * Only the fields needed for matching are required.
 */
export interface MatchableSubscription {
  id: string;
  name: string;
  amount: number;           // Decrypted plaintext amount
  currency: 'INR' | 'USD';
  billing_day: number | null;
  auto_match_keywords: string[] | null;
  is_active: boolean;
}

// ─── Main Algorithm ─────────────────────────────────────────────────────────────

/**
 * Score a transaction against all active subscriptions and return the
 * best match (if any meets the suggest threshold).
 *
 * ## Scoring
 *
 * | Factor   | Condition             | Points |
 * |----------|-----------------------|--------|
 * | Keyword  | substring match       | +0.8   |
 * | Amount   | within ±5%            | +0.6   |
 * | Amount   | within ±15%           | +0.3   |
 * | Date     | within ±3 days        | +0.3   |
 * | Date     | within ±7 days        | +0.1   |
 *
 * Maximum possible score: 1.7 (keyword + exact amount + near date)
 *
 * ## Thresholds
 *
 * | Score  | Action                              |
 * |--------|-------------------------------------|
 * | ≥ 1.0  | Auto-match (link without asking)    |
 * | ≥ 0.7  | Suggest (prompt user to confirm)    |
 * | < 0.7  | No match                            |
 *
 * @param description - Transaction description text
 * @param amount      - Decrypted transaction amount in INR
 * @param date        - Transaction date
 * @param subscriptions - Active subscriptions with decrypted amounts
 * @param exchangeRate  - Current USD→INR conversion rate
 * @returns Best match result, or null if no subscription scores ≥ 0.7
 */
export function matchTransaction(
  description: string,
  amount: number,
  date: Date,
  subscriptions: MatchableSubscription[],
  exchangeRate: number,
): SubscriptionMatchResult | null {
  let bestMatch: SubscriptionMatchResult | null = null;
  let bestScore = 0;

  const descLower = description.toLowerCase();
  const txDay = date.getDate();

  for (const sub of subscriptions) {
    // Only match against active subscriptions
    if (!sub.is_active) continue;

    let score = 0;

    // ── 1. Keyword match (0.8 points) ─────────────────────────
    // Check transaction description against auto_match_keywords.
    // If no keywords are configured, fall back to the subscription name.
    const keywords = sub.auto_match_keywords && sub.auto_match_keywords.length > 0
      ? sub.auto_match_keywords
      : [sub.name];

    const keywordMatched = keywords.some(
      (kw) => descLower.includes(kw.toLowerCase()),
    );

    if (keywordMatched) {
      score += KEYWORD_SCORE;
    }

    // ── 2. Amount match (0.6 or 0.3 points) ──────────────────
    // Convert subscription amount to INR if it's in USD.
    const subAmountINR = sub.currency === 'USD'
      ? sub.amount * exchangeRate
      : sub.amount;

    // Guard against division by zero
    if (subAmountINR > 0) {
      const amountDiff = Math.abs(amount - subAmountINR) / subAmountINR;

      if (amountDiff <= AMOUNT_EXACT_TOLERANCE) {
        score += AMOUNT_EXACT_SCORE;
      } else if (amountDiff <= AMOUNT_CLOSE_TOLERANCE) {
        score += AMOUNT_CLOSE_SCORE;
      }
    }

    // ── 3. Date proximity (0.3 or 0.1 points) ────────────────
    // Compare transaction day-of-month to subscription billing_day.
    if (sub.billing_day !== null) {
      const dayDiff = Math.abs(txDay - sub.billing_day);

      if (dayDiff <= DATE_NEAR_DAYS) {
        score += DATE_NEAR_SCORE;
      } else if (dayDiff <= DATE_FAR_DAYS) {
        score += DATE_FAR_SCORE;
      }
    }

    // ── Track best match ──────────────────────────────────────
    if (score > bestScore) {
      bestScore = score;
      bestMatch = {
        subscription_id: sub.id,
        subscription_name: sub.name,
        confidence: Math.round(score * 100) / 100,
        auto_match: score >= AUTO_MATCH_THRESHOLD,
      };
    }
  }

  // Only return if score meets the suggest threshold
  return bestScore >= SUGGEST_THRESHOLD ? bestMatch : null;
}

// ─── Re-export types for convenience ────────────────────────────────────────────

export type { SubscriptionMatchResult };
