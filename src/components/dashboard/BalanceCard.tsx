'use client';

import { motion } from 'framer-motion';
import { format } from 'date-fns';
import Card from '@/components/ui/Card';
import { OdometerValue } from '@/components/animations/OdometerValue';

// ─── Props ────────────────────────────────────────────────────────────────────

export interface BalanceCardProps {
  /** Available balance remaining (₹) */
  availableBalance: number;
  /** Total spent so far (₹) — excludes pass-through */
  totalSpent: number;
  /** Total budget (allowance + bonus) */
  totalBudget: number;
  /** Budget horizon date — spending must last until this date */
  budgetHorizon: Date | null;
  /** Upcoming subscription costs reserved from available balance */
  expectedSubscriptions?: number;
  /** Stagger delay for card entrance animation */
  delay?: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.abs(amount));
}

// ─── Component ────────────────────────────────────────────────────────────────
//
// Primary dashboard card — shows the available balance with a rolling
// odometer animation, progress bar, and the budget horizon date.
//
// Layout:
//   ┌────────────────────────────────────────┐
//   │  Available Balance              (label)│
//   │  ₹12,345                   (odometer)  │
//   │  ████████░░░░░░░░░░░░       (progress) │
//   │  ₹8,655 spent of ₹21,000    (caption)  │
//   │  Covers you until March 31   (horizon)  │
//   └────────────────────────────────────────┘

export function BalanceCard({
  availableBalance,
  totalSpent,
  totalBudget,
  budgetHorizon,
  expectedSubscriptions = 0,
  delay = 0,
}: BalanceCardProps) {
  const isLow = availableBalance <= 0;
  const horizonLabel = budgetHorizon
    ? format(budgetHorizon, 'MMMM d')
    : null;

  // Progress bar: percentage of budget spent, clamped 0–100
  const spentPercent = totalBudget > 0
    ? Math.min(100, Math.max(0, (totalSpent / totalBudget) * 100))
    : 0;

  const progressColor =
    spentPercent <= 50
      ? 'var(--color-income)'       // Sage — healthy
      : spentPercent <= 80
        ? 'var(--color-accent)'     // Bronze — moderate
        : 'var(--color-expense)';   // Terracotta — high spend

  return (
    <Card animated delay={delay}>
      {/* ── Label ──────────────────────────────────────────────────────────── */}
      <p
        className="font-body text-sm leading-none mb-1"
        style={{ color: 'var(--text-secondary)' }}
      >
        Available Balance
      </p>

      {/* ── Main balance (animated odometer, xl size) ──────────────────────── */}
      <div className="mt-2 mb-4">
        <OdometerValue
          value={availableBalance}
          prefix="₹"
          size="xl"
          duration={900}
          colored={isLow}
        />
      </div>

      {/* ── Progress bar ───────────────────────────────────────────────────── */}
      <div
        className="w-full overflow-hidden"
        style={{
          height: 6,
          borderRadius: 'var(--radius-full)',
          backgroundColor: 'var(--bg-navigation)',
        }}
        role="progressbar"
        aria-valuenow={Math.round(spentPercent)}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${Math.round(spentPercent)}% of budget spent`}
      >
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${spentPercent}%` }}
          transition={{
            duration: 0.8,
            ease: 'easeOut',
            delay: delay + 0.3,
          }}
          style={{
            height: '100%',
            borderRadius: 'var(--radius-full)',
            backgroundColor: progressColor,
          }}
        />
      </div>

      {/* ── Spent caption ────────────────────────────────────────────────── */}
      <p
        className="font-body text-sm mt-2"
        style={{ color: 'var(--text-secondary)' }}
      >
        <span className="font-mono" style={{ color: 'var(--color-expense)' }}>
          ₹{formatINR(totalSpent)}
        </span>
        {' spent of '}
        <span className="font-mono">₹{formatINR(totalBudget)}</span>
      </p>

      {/* ── Subscription reserved note ─────────────────────────────────── */}
      {expectedSubscriptions > 0 && (
        <p
          className="font-body text-xs mt-1"
          style={{ color: 'var(--text-secondary)' }}
        >
          <span className="font-mono" style={{ color: 'var(--color-accent)' }}>
            ₹{formatINR(expectedSubscriptions)}
          </span>
          {' reserved for subscriptions'}
        </p>
      )}

      {/* ── Horizon line ─────────────────────────────────────────────────── */}
      {horizonLabel && (
        <p
          className="font-body text-xs mt-1"
          style={{ color: isLow ? 'var(--color-expense)' : 'var(--text-secondary)' }}
        >
          {isLow ? 'Budget exhausted' : `Covers you until ${horizonLabel}`}
        </p>
      )}
    </Card>
  );
}

export default BalanceCard;
