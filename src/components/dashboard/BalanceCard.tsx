'use client';

import { motion } from 'framer-motion';
import Card from '@/components/ui/Card';
import { OdometerValue } from '@/components/animations/OdometerValue';

// ─── Props ────────────────────────────────────────────────────────────────────

export interface BalanceCardProps {
  /** Available budget remaining this month (₹) */
  availableBudget: number;
  /** Total spent so far this month (₹) — excludes pass-through */
  totalSpent: number;
  /** Total budget for the month (allowance + bonus) */
  totalBudget: number;
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
// Primary dashboard card — shows the main available balance with a rolling
// odometer animation and a progress bar visualising spending against budget.
//
// Layout:
//   ┌────────────────────────────────────────┐
//   │  Available Balance              (label)│
//   │  ₹12,345                   (odometer)  │
//   │  ████████░░░░░░░░░░░░       (progress) │
//   │  ₹8,655 spent of ₹21,000    (caption)  │
//   └────────────────────────────────────────┘

export function BalanceCard({
  availableBudget,
  totalSpent,
  totalBudget,
  delay = 0,
}: BalanceCardProps) {
  // Percentage spent — clamped 0–100 for the progress bar width
  const spentPercent = totalBudget > 0
    ? Math.min(100, Math.max(0, (totalSpent / totalBudget) * 100))
    : 0;

  // Progress bar colour: gradient from sage (low spend) → terracotta (overspending)
  // At 0% → pure sage, at 100% → pure terracotta, smooth blend between
  const progressColor =
    spentPercent <= 50
      ? 'var(--color-income)'         // Sage — healthy
      : spentPercent <= 80
        ? 'var(--color-accent)'       // Bronze — moderate
        : 'var(--color-expense)';     // Terracotta — high spend

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
          value={availableBudget}
          prefix="₹"
          size="xl"
          duration={900}
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

      {/* ── Caption ────────────────────────────────────────────────────────── */}
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
    </Card>
  );
}

export default BalanceCard;
