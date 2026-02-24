'use client';

import { motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';
import { addDays, format } from 'date-fns';
import Card from '@/components/ui/Card';
import type { BurnStatus } from '@/types';

// ─── Props ────────────────────────────────────────────────────────────────────

export interface DailyLimitCardProps {
  /** Today's daily spending limit (₹) — includes yesterday's carryover */
  dailyLimit: number;
  /** Weekly budget projection (₹) */
  weeklyBudget: number;
  /** Total expenses in the rolling 7-day window (₹) */
  weeklySpent: number;
  /** Burn rate status classification */
  burnStatus: BurnStatus;
  /** How much of today's daily limit is still unspent (₹) */
  todayRemaining: number;
  /** Days until budget runs out — null if user will make it to horizon */
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

// Pulse duration varies by urgency: safe → slow, danger → fast
const PULSE_DURATION: Record<BurnStatus, string> = {
  safe:    '3s',
  caution: '1.5s',
  danger:  '0.8s',
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.abs(amount));
}

function futureDateLabel(today: Date, daysFromNow: number): string {
  return format(addDays(today, daysFromNow), 'd MMM');
}

// ─── Component ────────────────────────────────────────────────────────────────
//
// Half-width card showing today's spending limit, burn rate, and remaining.
//
// Layout:
//   ┌──────────────────────┐
//   │  Today's Limit       │
//   │  ₹535                │
//   │  🟢 On track         │
//   │  ₹285 left today     │
//   │  ₹4,200 / week       │
//   │  ⚠️ ₹0 by Feb 25     │  ← only if daysUntilBroke !== null
//   └──────────────────────┘

export function DailyLimitCard({
  dailyLimit,
  weeklyBudget,
  weeklySpent,
  burnStatus,
  todayRemaining,
  daysUntilBroke,
  today = new Date(),
  delay = 0,
}: DailyLimitCardProps) {
  const indicator    = BURN_INDICATORS[burnStatus];
  const pulseDuration = PULSE_DURATION[burnStatus];
  const brokeDate    = daysUntilBroke !== null
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
      </p>

      {/* ── Burn rate indicator ────────────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 mt-2">
        {/*
          Two-layer dot:
          • Outer motion.div — Framer Motion spring entrance (scale 0→1).
            Framer owns `transform` on this element, so CSS can't safely
            animate it here.
          • Inner span — CSS dot-pulse animation (opacity + scale), free
            of any Framer Motion transforms.
          Pulse starts after the entrance spring finishes (~delay + 0.9 s).
        */}
        <motion.div
          initial={{ scale: 0 }}
          animate={{ scale: 1 }}
          transition={{
            type: 'spring',
            stiffness: 500,
            damping: 20,
            delay: delay + 0.4,
          }}
          style={{ width: 8, height: 8, flexShrink: 0 }}
        >
          <span
            style={{
              display: 'block',
              width: '100%',
              height: '100%',
              borderRadius: 'var(--radius-full)',
              backgroundColor: indicator.color,
              animation: `dot-pulse ${pulseDuration} ease-in-out ${delay + 0.9}s infinite`,
            }}
          />
        </motion.div>
        <span
          className="font-body text-xs font-medium"
          style={{ color: indicator.color }}
        >
          {indicator.label}
        </span>
      </div>

      {/* ── Today remaining ─────────────────────────────────────────────── */}
      <p
        className="font-body text-sm mt-2"
        style={{ color: 'var(--text-secondary)' }}
      >
        <span className="font-mono" style={{ color: todayRemaining > 0 ? 'var(--color-income)' : 'var(--color-expense)' }}>
          ₹{formatINR(todayRemaining)}
        </span>
        {' left today'}
      </p>

      {/* ── Weekly budget ──────────────────────────────────────────────────── */}
      <p
        className="font-body text-xs mt-1"
        style={{ color: 'var(--text-secondary)' }}
      >
        <span className="font-mono" style={{ color: weeklySpent > weeklyBudget ? 'var(--color-expense)' : 'var(--text-primary)' }}>
          ₹{formatINR(weeklySpent)}
        </span>
        <span>{' / '}</span>
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
