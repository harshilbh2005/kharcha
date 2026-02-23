'use client';

// ============================================================
// KHARCHA — VaultBalance
// Displays vault balance inside a ProgressRing with OdometerValue,
// target info, status badge, and last deposit/withdrawal dates.
// ============================================================

import ProgressRing from '@/components/ui/ProgressRing';
import { OdometerValue } from '@/components/animations/OdometerValue';
import Badge from '@/components/ui/Badge';
import type { VaultTransactionDecrypted } from '@/types';

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-IN', {
    day: 'numeric',
    month: 'short',
  });
}

type VaultStatus = 'healthy' | 'low' | 'critical';

function getVaultStatus(balance: number, target: number | null): VaultStatus {
  if (target === null || target <= 0) return 'healthy';
  const pct = (balance / target) * 100;
  if (pct >= 50) return 'healthy';
  if (pct >= 25) return 'low';
  return 'critical';
}

const STATUS_CONFIG: Record<VaultStatus, { label: string; variant: 'vault' | 'warning' | 'expense' }> = {
  healthy:  { label: 'Healthy',  variant: 'vault' },
  low:      { label: 'Low',      variant: 'warning' },
  critical: { label: 'Critical', variant: 'expense' },
};

// ── Props ────────────────────────────────────────────────────────────────────

export interface VaultBalanceProps {
  currentBalance: number;
  targetAmount: number | null;
  transactions: VaultTransactionDecrypted[];
}

// ── Component ────────────────────────────────────────────────────────────────

export function VaultBalance({
  currentBalance,
  targetAmount,
  transactions,
}: VaultBalanceProps) {
  const progress = targetAmount && targetAmount > 0
    ? Math.min(100, (currentBalance / targetAmount) * 100)
    : 0;

  const status = getVaultStatus(currentBalance, targetAmount);
  const { label: statusLabel, variant: statusVariant } = STATUS_CONFIG[status];

  // Find last deposit and withdrawal dates
  const lastDeposit = transactions.find((t) => t.type === 'deposit');
  const lastWithdrawal = transactions.find((t) => t.type === 'withdrawal');

  return (
    <div className="flex flex-col items-center gap-4">
      {/* ── Progress Ring with balance inside ───────────────────────── */}
      <ProgressRing
        progress={progress}
        size={140}
        strokeWidth={10}
        color="var(--color-vault)"
        showPercentage={false}
      >
        <div className="flex flex-col items-center">
          <OdometerValue
            value={currentBalance}
            prefix="₹"
            size="lg"
            duration={900}
          />
        </div>
      </ProgressRing>

      {/* ── Target label ────────────────────────────────────────────── */}
      {targetAmount !== null && targetAmount > 0 ? (
        <p
          className="font-body text-sm"
          style={{ color: 'var(--text-secondary)' }}
        >
          Target: ₹{Math.round(targetAmount).toLocaleString('en-IN')}
        </p>
      ) : (
        <p
          className="font-body text-sm"
          style={{ color: 'var(--text-secondary)' }}
        >
          No target set
        </p>
      )}

      {/* ── Status badge ────────────────────────────────────────────── */}
      <Badge variant={statusVariant} size="sm">
        {statusLabel}
      </Badge>

      {/* ── Last deposit / withdrawal ───────────────────────────────── */}
      <div
        className="flex gap-6 font-body text-xs"
        style={{ color: 'var(--text-secondary)' }}
      >
        <span>
          Last deposit:{' '}
          <span style={{ color: 'var(--text-primary)' }}>
            {lastDeposit ? formatDate(lastDeposit.date) : 'None'}
          </span>
        </span>
        <span>
          Last withdrawal:{' '}
          <span style={{ color: 'var(--text-primary)' }}>
            {lastWithdrawal ? formatDate(lastWithdrawal.date) : 'None'}
          </span>
        </span>
      </div>
    </div>
  );
}

export default VaultBalance;
