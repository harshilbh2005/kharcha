'use client';

// ============================================================
// KHARCHA — VaultHistory
// Chronological list of vault transactions with staggered entrance.
//
// Deposits: sage color, "+" prefix
// Withdrawals: terracotta color, "-" prefix
// Each entry: amount, reason, date
// ============================================================

import { StaggerContainer } from '@/components/animations/StaggerContainer';
import type { VaultTransactionDecrypted } from '@/types';

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

function formatINR(amount: number): string {
  return '₹' + Math.round(amount).toLocaleString('en-IN');
}

// ── Props ────────────────────────────────────────────────────────────────────

export interface VaultHistoryProps {
  transactions: VaultTransactionDecrypted[];
}

// ── Single row ───────────────────────────────────────────────────────────────

function VaultHistoryItem({ tx }: { tx: VaultTransactionDecrypted }) {
  const isDeposit = tx.type === 'deposit';
  const sign = isDeposit ? '+' : '-';
  const color = isDeposit ? 'var(--color-income)' : 'var(--color-expense)';

  return (
    <div
      className="flex items-center justify-between py-3"
      style={{
        borderBottom: '1px solid var(--border-default)',
      }}
    >
      {/* Left: reason + date */}
      <div className="flex flex-col gap-0.5 min-w-0 flex-1">
        <span
          className="font-body text-sm truncate"
          style={{ color: 'var(--text-primary)' }}
        >
          {tx.reason || (isDeposit ? 'Deposit' : 'Withdrawal')}
        </span>
        <span
          className="font-body text-xs"
          style={{ color: 'var(--text-secondary)' }}
        >
          {formatDate(tx.date)}
        </span>
      </div>

      {/* Right: signed amount */}
      <span
        className="font-mono text-sm font-medium shrink-0 ml-3"
        style={{ color }}
      >
        {sign}{formatINR(tx.amount)}
      </span>
    </div>
  );
}

// ── Component ────────────────────────────────────────────────────────────────

export function VaultHistory({ transactions }: VaultHistoryProps) {
  if (transactions.length === 0) {
    return (
      <div
        className="flex items-center justify-center py-8 font-body text-sm"
        style={{ color: 'var(--text-secondary)' }}
      >
        No vault transactions yet
      </div>
    );
  }

  return (
    <StaggerContainer staggerDelay={0.06} initialDelay={0.15}>
      {transactions.map((tx) => (
        <VaultHistoryItem key={tx.id} tx={tx} />
      ))}
    </StaggerContainer>
  );
}

export default VaultHistory;
