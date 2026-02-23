'use client';

import { motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import Card from '@/components/ui/Card';
import type { BurnStatus } from '@/types';

// ─── Props ────────────────────────────────────────────────────────────────────

export interface DailyLimitCardProps {
  /** Today's daily spending limit (₹) */
  dailyLimit: number;
  /** Weekly budget rollup (₹) */
  weeklyBudget: number;
  /** Burn rate status classification */
  burnStatus: BurnStatus;
  /** Days until budget runs out — null if user will make it through the month */
  daysUntilBroke: number | null;
  /** Reference date for the "₹0 by <date>" warning (defaults to today) */
  today?: Date;
  /** Stagger delay for card entrance animation */
  delay?: number;
}

// ─── Burn rate indicator config ───────────────────────────────────────────────

interface BurnIndicator {
  color: string;
  label: string;
}

const BURN_INDICATORS: Record<BurnStatus, BurnIndicator> = {
  safe: {
    color: 'var(--burn-safe)',       // Sage
    label: 'On track',
  },
  caution: {
    color: 'var(--burn-caution)',    // Amber
    label: 'Spending fast',
  },
  danger: {
    color: 'var(--burn-danger)',     // Brick
    label: 'Will run out!',
  },
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.abs(amount));
}

/**
 * Given a reference date + days offset, returns a short "Mon DD" date string.
 * e.g. "Feb 25" or "Mar 3"
 */
function futureDateLabel(today: Date, daysFromNow: number): string {
  const target = new Date(today);
  target.setDate(target.getDate() + daysFromNow);
  return target.toLocaleDateString('en-IN', { month: 'short', day: 'numeric' });
}

// ─── Component ────────────────────────────────────────────────────────────────
//
// Half-width card showing today's spending limit and burn rate.
//
// Layout:
//   ┌──────────────────────┐
//   │  Today's Limit       │
//   │  ₹535 / day          │
//   │  🟢 On track         │
//   │  ₹4,200 / week       │
//   │  ⚠️ ₹0 by Feb 25     │  ← only if daysUntilBroke !== null
//   └──────────────────────┘

export function DailyLimitCard({
  dailyLimit,
  weeklyBudget,
  burnStatus,
  daysUntilBroke,
  today = new Date(),
  delay = 0,
}: DailyLimitCardProps) {
  const indicator = BURN_INDICATORS[burnStatus];
  const brokeDate = daysUntilBroke !== null
    ? futureDateLabel(today, daysUntilBroke)
    : null;

  return (
    <Card animated delay={delay} className="flex-1 min-w-0">
      {/* ── Label ──────────────────────────────────────────────────────────── */}
      <p
        className="font-body text-xs leading-none mb-2"
        style={{ color: 'var(--text-secondary)' }}
      >
        Today&apos;s Limit
      </p>

      {/* ── Daily limit headline ───────────────────────────────────────────── */}
      <p className="font-display text-2xl leading-tight" style={{ color: 'var(--text-primary)' }}>
        ₹{formatINR(dailyLimit)}
        <span
          className="font-body text-sm ml-1"
          style={{ color: 'var(--text-secondary)' }}
        >
          / day
        </span>
      </p>

      {/* ── Burn rate indicator ────────────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 mt-2">
        {/* Animated dot */}
        <motion.span
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{
            type: 'spring',
            stiffness: 500,
            damping: 20,
            delay: delay + 0.4,
          }}
          style={{
            width: 8,
            height: 8,
            borderRadius: 'var(--radius-full)',
            backgroundColor: indicator.color,
            flexShrink: 0,
          }}
        />
        <span
          className="font-body text-xs font-medium"
          style={{ color: indicator.color }}
        >
          {indicator.label}
        </span>
      </div>

      {/* ── Weekly budget ──────────────────────────────────────────────────── */}
      <p
        className="font-body text-sm mt-2"
        style={{ color: 'var(--text-secondary)' }}
      >
        <span className="font-mono">₹{formatINR(weeklyBudget)}</span>
        {' / week'}
      </p>

      {/* ── Days until broke warning ───────────────────────────────────────── */}
      {brokeDate !== null && (
        <motion.div
          initial={{ opacity: 0, y: 4 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: delay + 0.5, duration: 0.3 }}
          className="flex items-center gap-1.5 mt-2 py-1 px-2 rounded"
          style={{
            backgroundColor: 'var(--color-warning-bg)',
          }}
        >
          <AlertTriangle
            size={12}
            style={{ color: 'var(--color-warning)', flexShrink: 0 }}
          />
          <span
            className="font-body text-xs"
            style={{ color: 'var(--color-warning)' }}
          >
            At this pace, ₹0 by {brokeDate}
          </span>
        </motion.div>
      )}
    </Card>
  );
}

export default DailyLimitCard;
