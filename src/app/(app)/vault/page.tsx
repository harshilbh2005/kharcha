'use client';

// ============================================================
// KHARCHA — Emergency Vault Page (Phase 5)
//
// Layout:
//   • Header: "Emergency Vault" + Shield icon
//   • VaultDoor: GSAP animated safe-door (plays once on load)
//   • VaultBalance: ProgressRing + OdometerValue + status badge
//   • Action buttons: [Deposit] [Withdraw] side by side
//   • VaultHistory: scrollable transaction ledger
//
// Data flows:
//   useVault() → balance, target, transactions (all decrypted)
//   useVaultDeposit() / useVaultWithdraw() → mutations via modals
// ============================================================

import { useState } from 'react';
import { ShieldCheck, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';

import Header from '@/components/layout/Header';
import { StaggerContainer } from '@/components/animations/StaggerContainer';
import Skeleton from '@/components/ui/Skeleton';
import Button from '@/components/ui/Button';
import { VaultDoor } from '@/components/vault/VaultDoor';
import { VaultBalance } from '@/components/vault/VaultBalance';
import { VaultHistory } from '@/components/vault/VaultHistory';
import { DepositModal } from '@/components/vault/DepositModal';
import { WithdrawModal } from '@/components/vault/WithdrawModal';
import { useVault } from '@/hooks/useVault';

// ── Component ────────────────────────────────────────────────────────────────

export default function VaultPage() {
  const { data: vault, isLoading } = useVault();

  const [depositOpen, setDepositOpen] = useState(false);
  const [withdrawOpen, setWithdrawOpen] = useState(false);

  return (
    <>
      {/* ── Sticky page header ────────────────────────────────────────────── */}
      <Header
        title="Emergency Vault"
        rightElement={
          <div
            aria-label="Vault secured"
            className="flex items-center justify-center"
            style={{
              width: 40,
              height: 40,
              color: 'var(--color-vault)',
            }}
          >
            <ShieldCheck size={20} strokeWidth={1.8} />
          </div>
        }
      />

      {/* ── Main content ──────────────────────────────────────────────────── */}
      <div
        className="px-4 pb-24"
        style={{ paddingTop: 'var(--space-4)' }}
      >
        {isLoading ? (
          <VaultSkeleton />
        ) : (
          <StaggerContainer className="flex flex-col gap-5 items-center" staggerDelay={0.08}>
            {/* ── Vault door animation ─────────────────────────────────────── */}
            <div className="pt-2 pb-1">
              <VaultDoor size={180} />
            </div>

            {/* ── Balance + progress ring ──────────────────────────────────── */}
            <div
              className="w-full p-5 flex flex-col items-center"
              style={{
                background: 'var(--bg-surface)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-default)',
              }}
            >
              <VaultBalance
                currentBalance={vault?.currentBalance ?? 0}
                targetAmount={vault?.targetAmount ?? null}
                transactions={vault?.transactions ?? []}
              />
            </div>

            {/* ── Action buttons ───────────────────────────────────────────── */}
            <div className="flex gap-3 w-full">
              <Button
                onClick={() => setDepositOpen(true)}
                variant="secondary"
                size="lg"
                fullWidth
                className="!border-[var(--color-income)] !text-[var(--color-income)]"
              >
                <ArrowDownToLine size={18} strokeWidth={2} />
                Deposit
              </Button>

              <Button
                onClick={() => setWithdrawOpen(true)}
                variant="secondary"
                size="lg"
                fullWidth
                className="!border-[var(--color-expense)] !text-[var(--color-expense)]"
              >
                <ArrowUpFromLine size={18} strokeWidth={2} />
                Withdraw
              </Button>
            </div>

            {/* ── Transaction history ──────────────────────────────────────── */}
            <div
              className="w-full"
              style={{
                background: 'var(--bg-surface)',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--border-default)',
                padding: 'var(--space-5)',
              }}
            >
              <h3
                className="font-display text-base mb-3"
                style={{ color: 'var(--text-primary)' }}
              >
                History
              </h3>
              <VaultHistory transactions={vault?.transactions ?? []} />
            </div>
          </StaggerContainer>
        )}
      </div>

      {/* ── Modals ─────────────────────────────────────────────────────────── */}
      <DepositModal
        isOpen={depositOpen}
        onClose={() => setDepositOpen(false)}
        currentBalance={vault?.currentBalance ?? 0}
      />

      <WithdrawModal
        isOpen={withdrawOpen}
        onClose={() => setWithdrawOpen(false)}
        currentBalance={vault?.currentBalance ?? 0}
      />
    </>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function VaultSkeleton() {
  return (
    <div className="flex flex-col gap-5 items-center">
      {/* Door placeholder */}
      <Skeleton.Circle width="180px" />

      {/* Balance card skeleton */}
      <div
        className="w-full p-5 flex flex-col items-center gap-3"
        style={{
          background: 'var(--bg-surface)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-default)',
        }}
      >
        <Skeleton.Circle width="140px" />
        <Skeleton.Line width="120px" height="14px" />
        <Skeleton.Line width="80px" height="24px" />
      </div>

      {/* Button row skeleton */}
      <div className="flex gap-3 w-full">
        <Skeleton.Line width="100%" height="48px" />
        <Skeleton.Line width="100%" height="48px" />
      </div>

      {/* History skeleton */}
      <div
        className="w-full p-5 flex flex-col gap-3"
        style={{
          background: 'var(--bg-surface)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-default)',
        }}
      >
        <Skeleton.Line width="60px" height="16px" />
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="flex items-center justify-between">
            <div className="flex flex-col gap-1">
              <Skeleton.Line width={`${120 - i * 15}px`} height="14px" />
              <Skeleton.Line width="70px" height="12px" />
            </div>
            <Skeleton.Line width="60px" height="14px" />
          </div>
        ))}
      </div>
    </div>
  );
}
