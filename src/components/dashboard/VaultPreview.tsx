'use client';

import { useRouter } from 'next/navigation';
import Card from '@/components/ui/Card';
import ProgressRing from '@/components/ui/ProgressRing';

// ─── Props ────────────────────────────────────────────────────────────────────

export interface VaultPreviewProps {
  /** Current vault balance (₹, decrypted) */
  currentBalance: number;
  /** Target vault amount (₹, decrypted) — null if no target set */
  targetAmount: number | null;
  /** Stagger delay for card entrance animation */
  delay?: number;
}

// ─── Vault health thresholds ──────────────────────────────────────────────────
//
// Vault health is the ratio of current balance to target:
//   >= 70%  → "Healthy"  (sage)
//   >= 30%  → "Low"      (amber)
//   < 30%   → "Empty"    (brick)
//
// If no target is set, any balance > 0 is "Healthy".

interface VaultHealth {
  label: string;
  color: string;
  ringColor: string;
}

function getVaultHealth(balance: number, target: number | null): VaultHealth {
  if (target === null || target <= 0) {
    // No target set — any positive balance is considered healthy
    return balance > 0
      ? { label: 'Healthy', color: 'var(--burn-safe)', ringColor: 'var(--color-vault)' }
      : { label: 'Empty',   color: 'var(--burn-danger)', ringColor: 'var(--burn-danger)' };
  }

  const ratio = balance / target;

  if (ratio >= 0.7) {
    return { label: 'Healthy', color: 'var(--burn-safe)', ringColor: 'var(--color-vault)' };
  }
  if (ratio >= 0.3) {
    return { label: 'Low', color: 'var(--burn-caution)', ringColor: 'var(--burn-caution)' };
  }
  return { label: 'Empty', color: 'var(--burn-danger)', ringColor: 'var(--burn-danger)' };
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
// Half-width card showing vault health at a glance.
// Taps navigate to /vault.
//
// Layout:
//   ┌──────────────────────┐
//   │   ╭────╮             │
//   │   │ 72%│  Emergency  │
//   │   ╰────╯  Vault      │
//   │                      │
//   │  ₹15,000             │
//   │  Healthy              │
//   └──────────────────────┘

export function VaultPreview({
  currentBalance,
  targetAmount,
  delay = 0,
}: VaultPreviewProps) {
  const router = useRouter();
  const health = getVaultHealth(currentBalance, targetAmount);

  // Progress percentage for the ring (0–100)
  const progress = targetAmount && targetAmount > 0
    ? Math.min(100, Math.max(0, (currentBalance / targetAmount) * 100))
    : currentBalance > 0 ? 100 : 0;

  return (
    <Card
      animated
      delay={delay}
      hoverable
      onClick={() => router.push('/vault')}
      className="flex-1 min-w-0"
    >
      {/* ── Top row: ring + label ──────────────────────────────────────────── */}
      <div className="flex items-center gap-3">
        <ProgressRing
          progress={progress}
          size={60}
          strokeWidth={5}
          color={health.ringColor}
          showPercentage={false}
          label=""
        >
          {/* Custom centre: small percentage */}
          <span
            className="font-mono text-xs leading-none"
            style={{ color: 'var(--text-primary)' }}
          >
            {Math.round(progress)}%
          </span>
        </ProgressRing>

        <div className="min-w-0">
          <p
            className="font-body text-xs leading-none"
            style={{ color: 'var(--text-secondary)' }}
          >
            Emergency
          </p>
          <p
            className="font-body text-xs font-medium leading-snug"
            style={{ color: 'var(--text-primary)' }}
          >
            Vault
          </p>
        </div>
      </div>

      {/* ── Balance ────────────────────────────────────────────────────────── */}
      <p
        className="font-mono text-lg mt-3 leading-none"
        style={{ color: 'var(--text-primary)' }}
      >
        ₹{formatINR(currentBalance)}
      </p>

      {/* ── Status ─────────────────────────────────────────────────────────── */}
      <div className="flex items-center gap-1.5 mt-1">
        <span
          style={{
            width: 6,
            height: 6,
            borderRadius: 'var(--radius-full)',
            backgroundColor: health.color,
            flexShrink: 0,
          }}
        />
        <span
          className="font-body text-xs"
          style={{ color: health.color }}
        >
          {health.label}
        </span>
      </div>
    </Card>
  );
}

export default VaultPreview;
