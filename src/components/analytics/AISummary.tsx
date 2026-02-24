'use client';

// ============================================================
// KHARCHA — AISummary
// AI-generated monthly spending summary card.
// Calls POST /api/ai/monthly-summary with decrypted data.
// Sections: Summary · Wins (sage) · Watch (amber) · Tip (bronze)
// Loading state: skeleton with pen-writing animation.
// ============================================================

import { useState, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Sparkles, TrendingUp, AlertCircle, Lightbulb, RefreshCw } from 'lucide-react';
import { format, parse } from 'date-fns';
import type { CategoryBreakdown } from '@/hooks/useMonthlyAnalytics';

// ── API response type ─────────────────────────────────────────────────────────

interface SummaryResult {
  summary: string;
  wins: string[];
  watch: string[];
  tip: string;
}

// ── Skeleton (pen writing animation) ─────────────────────────────────────────

function PenSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 12, padding: '4px 0' }}>
      {/* Animated shimmer lines */}
      {[90, 75, 85, 60, 70, 50].map((w, i) => (
        <motion.div
          key={i}
          initial={{ scaleX: 0, originX: 0 }}
          animate={{ scaleX: 1 }}
          transition={{ duration: 0.5, delay: i * 0.12, ease: 'easeInOut' }}
          style={{
            height: 10,
            width: `${w}%`,
            borderRadius: 4,
            background: 'var(--bg-navigation)',
          }}
        />
      ))}
      {/* Pen cursor */}
      <motion.div
        animate={{ opacity: [1, 0, 1] }}
        transition={{ repeat: Infinity, duration: 0.8 }}
        style={{
          width: 16,
          height: 16,
          borderRadius: 2,
          background: 'var(--color-accent)',
          opacity: 0.6,
          marginTop: -4,
        }}
      />
    </div>
  );
}

// ── Section row ───────────────────────────────────────────────────────────────

function SectionItem({
  icon,
  label,
  color,
  items,
}: {
  icon: React.ReactNode;
  label: string;
  color: string;
  items: string[];
}) {
  if (!items.length) return null;
  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
        <span style={{ color, display: 'flex' }}>{icon}</span>
        <span
          className="font-body"
          style={{ fontSize: 12, fontWeight: 700, color, letterSpacing: '0.04em', textTransform: 'uppercase' }}
        >
          {label}
        </span>
      </div>
      <ul style={{ margin: 0, padding: '0 0 0 18px', display: 'flex', flexDirection: 'column', gap: 4 }}>
        {items.map((item, i) => (
          <li
            key={i}
            className="font-body"
            style={{ fontSize: 13, color: 'var(--text-primary)', lineHeight: 1.55 }}
          >
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────

export interface AISummaryProps {
  monthYear: string;
  totalIncome: number;
  totalExpenses: number;
  subscriptionTotal: number;
  needsTotal: number;
  wantsTotal: number;
  categoryBreakdown: CategoryBreakdown[];
  /** vs-last-month deltas (optional — null if no prior data) */
  vsLastMonth?: { expensesDelta: number; savingsDelta: number } | null;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function AISummary({
  monthYear,
  totalIncome,
  totalExpenses,
  subscriptionTotal,
  needsTotal,
  wantsTotal,
  categoryBreakdown,
  vsLastMonth = null,
}: AISummaryProps) {
  const [result, setResult] = useState<SummaryResult | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const generate = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    setResult(null);

    try {
      const monthLabel = format(parse(monthYear, 'yyyy-MM', new Date()), 'MMMM yyyy');
      const totalSavings = totalIncome - totalExpenses;

      // Top categories → topExpenses proxy
      const topExpenses = categoryBreakdown
        .slice(0, 5)
        .map((c) => ({ description: c.name, amount: c.amount }));

      // Category breakdown → API shape
      const catBreakdown = categoryBreakdown.slice(0, 6).map((c) => ({
        name: c.name,
        amount: c.amount,
        pct: Math.round(c.percentage),
      }));

      const res = await fetch('/api/ai/monthly-summary', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          month: monthLabel,
          totalIncome,
          totalExpenses,
          totalSavings,
          subscriptionTotal,
          needsTotal,
          wantsTotal,
          categoryBreakdown: catBreakdown,
          topExpenses,
          vsLastMonth: vsLastMonth ?? null,
          anomalies: [],
        }),
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(
          (body as { error?: string }).error ?? `Request failed (${res.status})`,
        );
      }

      const data: SummaryResult = await res.json();
      setResult(data);
    } catch (err) {
      setError((err as Error).message || 'Something went wrong. Try again.');
    } finally {
      setIsLoading(false);
    }
  }, [
    monthYear,
    totalIncome,
    totalExpenses,
    subscriptionTotal,
    needsTotal,
    wantsTotal,
    categoryBreakdown,
    vsLastMonth,
  ]);

  const canGenerate = totalExpenses > 0;

  return (
    <div>
      {/* ── Header ──────────────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          marginBottom: result || isLoading ? 16 : 0,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <Sparkles size={16} color="var(--color-accent)" />
          <span
            className="font-body"
            style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 600, letterSpacing: '0.04em', textTransform: 'uppercase' }}
          >
            AI Summary
          </span>
        </div>

        {/* Regenerate / Generate button */}
        {!isLoading && (
          <button
            onClick={generate}
            disabled={!canGenerate}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: canGenerate ? 'var(--color-accent)' : 'var(--bg-navigation)',
              color: canGenerate ? '#FFFFFF' : 'var(--text-secondary)',
              border: 'none',
              borderRadius: 8,
              padding: '7px 12px',
              fontSize: 12,
              fontFamily: 'Inter, sans-serif',
              fontWeight: 600,
              cursor: canGenerate ? 'pointer' : 'not-allowed',
              minHeight: 44,
              minWidth: 44,
              opacity: canGenerate ? 1 : 0.6,
            }}
            aria-label={result ? 'Regenerate summary' : 'Generate summary'}
          >
            {result ? (
              <RefreshCw size={13} />
            ) : (
              <Sparkles size={13} />
            )}
            {result ? 'Regenerate' : 'Generate Summary'}
          </button>
        )}
      </div>

      {/* ── States ─────────────────────────────────────────── */}
      <AnimatePresence mode="wait">

        {/* Empty prompt */}
        {!isLoading && !result && !error && (
          <motion.div
            key="empty"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {!canGenerate ? (
              <p
                className="font-body"
                style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}
              >
                Add some expenses this month to generate an AI summary.
              </p>
            ) : (
              <p
                className="font-body"
                style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0 }}
              >
                Get a personalised monthly spending analysis powered by Claude.
              </p>
            )}
          </motion.div>
        )}

        {/* Loading skeleton */}
        {isLoading && (
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <div
              className="font-body"
              style={{ fontSize: 12, color: 'var(--color-accent)', marginBottom: 10, display: 'flex', alignItems: 'center', gap: 6 }}
            >
              <motion.span
                animate={{ rotate: 360 }}
                transition={{ repeat: Infinity, duration: 1.5, ease: 'linear' }}
                style={{ display: 'inline-flex' }}
              >
                <RefreshCw size={12} />
              </motion.span>
              Analysing your spending…
            </div>
            <PenSkeleton />
          </motion.div>
        )}

        {/* Error */}
        {!isLoading && error && (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            style={{
              background: '#FDF0EE',
              border: '1px solid #E8C8C0',
              borderRadius: 8,
              padding: '10px 14px',
              display: 'flex',
              gap: 8,
              alignItems: 'flex-start',
            }}
          >
            <AlertCircle size={14} color="var(--color-expense)" style={{ marginTop: 1, flexShrink: 0 }} />
            <p
              className="font-body"
              style={{ fontSize: 13, color: 'var(--color-expense)', margin: 0 }}
            >
              {error}
            </p>
          </motion.div>
        )}

        {/* Result */}
        {!isLoading && result && (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ type: 'spring', stiffness: 200, damping: 26 }}
            style={{ display: 'flex', flexDirection: 'column', gap: 16 }}
          >
            {/* Summary paragraph — word-by-word type-in (30ms per word) */}
            <motion.p
              className="font-body"
              style={{ fontSize: 14, color: 'var(--text-primary)', lineHeight: 1.6, margin: 0 }}
              variants={{
                visible: { transition: { staggerChildren: 0.03, delayChildren: 0.15 } },
              }}
              initial="hidden"
              animate="visible"
            >
              {result.summary.split(' ').map((word, i, arr) => (
                <motion.span
                  key={i}
                  variants={{
                    hidden: { opacity: 0, y: 4 },
                    visible: { opacity: 1, y: 0, transition: { duration: 0.18, ease: 'easeOut' } },
                  }}
                >
                  {word}{i < arr.length - 1 ? ' ' : ''}
                </motion.span>
              ))}
            </motion.p>

            <div
              style={{
                height: 1,
                background: 'var(--border-default)',
              }}
            />

            {/* Wins */}
            <SectionItem
              icon={<TrendingUp size={13} />}
              label="Wins"
              color="var(--color-income)"
              items={result.wins}
            />

            {/* Watch */}
            <SectionItem
              icon={<AlertCircle size={13} />}
              label="Watch"
              color="#B8860B"
              items={result.watch}
            />

            {/* Tip */}
            {result.tip && (
              <div
                style={{
                  background: 'var(--bg-global)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 8,
                  padding: '10px 12px',
                  display: 'flex',
                  gap: 8,
                  alignItems: 'flex-start',
                }}
              >
                <Lightbulb
                  size={14}
                  color="var(--color-accent)"
                  style={{ marginTop: 1, flexShrink: 0 }}
                />
                <p
                  className="font-body"
                  style={{ fontSize: 13, color: 'var(--text-primary)', margin: 0, lineHeight: 1.55 }}
                >
                  <strong style={{ color: 'var(--color-accent)' }}>Tip:</strong>{' '}
                  {result.tip}
                </p>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export default AISummary;
