'use client';

// ============================================================
// KHARCHA — SubscriptionCard (Phase 6)
// Single subscription row with status badge, amount, and
// billing info. Follows TransactionItem layout pattern.
// ============================================================

import { RefreshCw } from 'lucide-react';
import Badge from '@/components/ui/Badge';
import type { SubscriptionDecrypted } from '@/types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

function formatUSD(amount: number): string {
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

function getOrdinalSuffix(n: number): string {
  const s = ['th', 'st', 'nd', 'rd'];
  const v = n % 100;
  return n + (s[(v - 20) % 10] || s[v] || s[0]);
}

type Status = 'paid' | 'pending' | 'overdue';

function computeStatus(sub: SubscriptionDecrypted): Status {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // If last_paid_date is in the current month → Paid
  if (sub.last_paid_date) {
    const lastPaid = new Date(sub.last_paid_date);
    if (
      lastPaid.getFullYear() === today.getFullYear() &&
      lastPaid.getMonth() === today.getMonth()
    ) {
      return 'paid';
    }
  }

  // If next_billing_date is past → Overdue
  if (sub.next_billing_date) {
    const nextBilling = new Date(sub.next_billing_date);
    nextBilling.setHours(0, 0, 0, 0);
    if (nextBilling < today) {
      return 'overdue';
    }
  }

  return 'pending';
}

const STATUS_CONFIG: Record<Status, { label: string; variant: 'income' | 'warning' | 'expense' }> = {
  paid:    { label: 'Paid',    variant: 'income'  },
  pending: { label: 'Pending', variant: 'warning' },
  overdue: { label: 'Overdue', variant: 'expense' },
};

// ─── Props ────────────────────────────────────────────────────────────────────

export interface SubscriptionCardProps {
  subscription: SubscriptionDecrypted;
  exchangeRate: number;
  onPress?: (id: string) => void;
  onDelete?: (id: string) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function SubscriptionCard({
  subscription: sub,
  exchangeRate,
  onPress,
}: SubscriptionCardProps) {
  const status = computeStatus(sub);
  const config = STATUS_CONFIG[status];
  const isUSD = sub.currency === 'USD';

  const primaryAmount = isUSD ? formatUSD(sub.amount) : formatINR(sub.amount);
  const secondaryAmount = isUSD
    ? `≈${formatINR(sub.amount * exchangeRate)}`
    : null;

  const billingLabel = [
    sub.billing_day ? `Renews ${getOrdinalSuffix(sub.billing_day)}` : null,
    sub.billing_cycle === 'yearly' ? 'Yearly' : 'Monthly',
  ]
    .filter(Boolean)
    .join(' · ');

  return (
    <button
      type="button"
      onClick={() => onPress?.(sub.id)}
      className="flex items-center gap-3 w-full text-left select-none"
      style={{
        paddingTop: 12,
        paddingBottom: 12,
        backgroundColor: 'var(--bg-surface)',
        borderBottom: '1px solid var(--border-default)',
      }}
    >
      {/* Icon */}
      <div
        className="flex-none flex items-center justify-center rounded-full"
        style={{
          width: 40,
          height: 40,
          backgroundColor: 'var(--color-accent)' + '1A',
        }}
      >
        <RefreshCw size={18} color="var(--color-accent)" />
      </div>

      {/* Middle: name + billing info */}
      <div className="flex-1 min-w-0">
        <p
          className="font-medium truncate leading-snug"
          style={{ color: 'var(--text-primary)', fontSize: 15 }}
        >
          {sub.name}
        </p>
        <p
          className="text-sm truncate leading-snug"
          style={{ color: 'var(--text-secondary)' }}
        >
          {billingLabel}
        </p>
      </div>

      {/* Right: status badge + amount */}
      <div className="flex-none flex flex-col items-end gap-1">
        <div className="flex items-center gap-2">
          <Badge variant={config.variant} size="sm">
            {config.label}
          </Badge>
          <span
            className="font-mono text-sm font-medium tabular-nums"
            style={{ color: 'var(--color-expense)' }}
          >
            {primaryAmount}
          </span>
        </div>
        {secondaryAmount && (
          <span
            className="text-xs tabular-nums"
            style={{ color: 'var(--text-secondary)' }}
          >
            {secondaryAmount}
          </span>
        )}
      </div>
    </button>
  );
}

export default SubscriptionCard;
