'use client';

// ============================================================
// KHARCHA — NeedsVsWants
// Horizontal stacked bar: Sage (needs) + Terracotta (wants).
// Labels show "Needs 65%" on the left, "Wants 35%" on the right.
// Bar animates growing from the left on mount.
// ============================================================

import { motion } from 'framer-motion';

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(amount));
}

// ── Props ─────────────────────────────────────────────────────────────────────

export interface NeedsVsWantsProps {
  needs: number;
  wants: number;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function NeedsVsWants({ needs, wants }: NeedsVsWantsProps) {
  const total = needs + wants;

  if (total === 0) {
    return (
      <p
        className="font-body"
        style={{ fontSize: 14, color: 'var(--text-secondary)', textAlign: 'center', padding: '16px 0' }}
      >
        No expenses to classify yet.
      </p>
    );
  }

  const needsPct = Math.round((needs / total) * 100);
  const wantsPct = 100 - needsPct;

  return (
    <div>
      {/* ── Labels row ─────────────────────────────────────── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 10 }}>
        {/* Needs side */}
        <div>
          <p
            className="font-body"
            style={{ fontSize: 13, color: 'var(--color-income)', fontWeight: 600, margin: 0 }}
          >
            Needs {needsPct}%
          </p>
          <p
            className="font-mono"
            style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '2px 0 0' }}
          >
            {formatINR(needs)}
          </p>
        </div>
        {/* Wants side */}
        <div style={{ textAlign: 'right' }}>
          <p
            className="font-body"
            style={{ fontSize: 13, color: 'var(--color-expense)', fontWeight: 600, margin: 0 }}
          >
            Wants {wantsPct}%
          </p>
          <p
            className="font-mono"
            style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '2px 0 0' }}
          >
            {formatINR(wants)}
          </p>
        </div>
      </div>

      {/* ── Stacked bar track ─────────────────────────────── */}
      <div
        style={{
          width: '100%',
          height: 14,
          borderRadius: 'var(--radius-full)',
          background: 'var(--bg-navigation)',
          overflow: 'hidden',
          display: 'flex',
        }}
      >
        {/* Needs segment (sage) */}
        {needsPct > 0 && (
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${needsPct}%` }}
            transition={{ duration: 0.8, ease: [0.22, 0.97, 0.52, 1], delay: 0.15 }}
            style={{
              height: '100%',
              // CSS var works in HTML inline style
              background: 'var(--color-income)',
              borderRadius: wantsPct === 0 ? 'var(--radius-full)' : '999px 0 0 999px',
            }}
          />
        )}
        {/* Wants segment (terracotta) */}
        {wantsPct > 0 && (
          <motion.div
            initial={{ width: 0 }}
            animate={{ width: `${wantsPct}%` }}
            transition={{ duration: 0.8, ease: [0.22, 0.97, 0.52, 1], delay: 0.25 }}
            style={{
              height: '100%',
              background: 'var(--color-expense)',
              borderRadius: needsPct === 0 ? 'var(--radius-full)' : '0 999px 999px 0',
              flex: 1,
            }}
          />
        )}
      </div>

      {/* ── Guideline text ────────────────────────────────── */}
      <p
        className="font-body"
        style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 8, marginBottom: 0 }}
      >
        50/30/20 rule: aim for ≤ 50% needs, ≤ 30% wants, ≥ 20% savings.
      </p>
    </div>
  );
}

export default NeedsVsWants;
