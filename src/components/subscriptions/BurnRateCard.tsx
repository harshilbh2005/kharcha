'use client';

// ============================================================
// KHARCHA — BurnRateCard (Phase 6)
// Summary card showing total monthly subscription cost,
// active count, and a proportional breakdown bar.
// Pattern: BalanceCard.tsx
// ============================================================

import Card from '@/components/ui/Card';

// ─── Constants ───────────────────────────────────────────────────────────────

/** Cycling design-system colors for the breakdown bar segments */
const SEGMENT_COLORS = [
  'var(--color-income)',   // Sage
  'var(--color-expense)',  // Terracotta
  'var(--color-accent)',   // Bronze
  'var(--color-vault)',    // Forest
  'var(--text-secondary)', // Muted Blue-Grey
  '#8BA090',               // Muted Sage
  '#C49B8D',               // Muted Terracotta
  '#A6956E',               // Muted Bronze
];

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface BurnRateCardProps {
  totalMonthly: number;
  activeCount: number;
  subscriptions: { name: string; amount: number }[];
  delay?: number;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function BurnRateCard({
  totalMonthly,
  activeCount,
  subscriptions,
  delay = 0,
}: BurnRateCardProps) {
  return (
    <Card animated delay={delay}>
      {/* Label */}
      <p
        className="font-body text-sm leading-none mb-1"
        style={{ color: 'var(--text-secondary)' }}
      >
        Monthly Subscriptions
      </p>

      {/* Total amount */}
      <p
        className="font-display text-2xl mt-1"
        style={{ color: 'var(--text-primary)' }}
      >
        <span className="font-mono">₹{formatINR(totalMonthly)}</span>
        <span
          className="font-body text-sm ml-1"
          style={{ color: 'var(--text-secondary)' }}
        >
          / month
        </span>
      </p>

      {/* Active count */}
      <p
        className="font-body text-sm mt-1 mb-3"
        style={{ color: 'var(--text-secondary)' }}
      >
        {activeCount} active subscription{activeCount !== 1 ? 's' : ''}
      </p>

      {/* Proportional breakdown bar */}
      {subscriptions.length > 0 && totalMonthly > 0 && (
        <div
          className="w-full flex overflow-hidden"
          style={{
            height: 8,
            borderRadius: 'var(--radius-full)',
            backgroundColor: 'var(--bg-navigation)',
          }}
          role="img"
          aria-label={`Subscription cost breakdown: ${subscriptions.map((s) => `${s.name} ₹${formatINR(s.amount)}`).join(', ')}`}
        >
          {subscriptions.map((sub, i) => {
            const pct = (sub.amount / totalMonthly) * 100;
            if (pct < 0.5) return null; // Skip tiny segments
            return (
              <div
                key={sub.name + i}
                title={`${sub.name}: ₹${formatINR(sub.amount)}`}
                style={{
                  width: `${pct}%`,
                  height: '100%',
                  backgroundColor: SEGMENT_COLORS[i % SEGMENT_COLORS.length],
                  transition: 'width 0.3s ease',
                }}
              />
            );
          })}
        </div>
      )}
    </Card>
  );
}

export default BurnRateCard;
