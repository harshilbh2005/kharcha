'use client';

// ============================================================
// KHARCHA — Dashboard Page (Phase 4)
//
// Financial command center — assembles all dashboard cards:
//   • BalanceCard       — available balance + progress bar
//   • DailyLimitCard    — today's limit + burn rate indicator
//   • VaultPreview      — vault health ring
//   • SubscriptionAlert — upcoming renewal warnings
//   • RecentTransactions — last 5 expenses
//
// Data flows:
//   useBudget()               → BalanceCard + DailyLimitCard
//   useTransactions()         → RecentTransactions (decrypt client-side)
//   useVault()                → VaultPreview (Phase 5 stub)
//   useUpcomingSubscriptions()→ SubscriptionAlert (Phase 6 stub)
//
// Layout: mobile single-column with StaggerContainer entrance.
// ============================================================

import { useEffect, useState } from 'react';
import { format } from 'date-fns';
import { Bell } from 'lucide-react';

import Header from '@/components/layout/Header';
import { StaggerContainer } from '@/components/animations/StaggerContainer';
import Skeleton from '@/components/ui/Skeleton';
import { BalanceCard } from '@/components/dashboard/BalanceCard';
import { DailyLimitCard } from '@/components/dashboard/DailyLimitCard';
import { VaultPreview } from '@/components/dashboard/VaultPreview';
import { SubscriptionAlert } from '@/components/dashboard/SubscriptionAlert';
import { RecentTransactions } from '@/components/dashboard/RecentTransactions';
import { useBudget } from '@/hooks/useBudget';
import { useTransactions } from '@/hooks/useTransactions';
import { useVault } from '@/hooks/useVault';
import { useUpcomingSubscriptions } from '@/hooks/useSubscriptions';
import { useEncryption } from '@/hooks/useEncryption';
import type { Transaction, TransactionDecrypted } from '@/types';

// ─── Component ────────────────────────────────────────────────────────────────

export default function DashboardPage() {
  // ── Data hooks ──────────────────────────────────────────────────────────────

  const { data: budget, isLoading: budgetLoading } = useBudget();
  const { data: rawTransactions, isLoading: txLoading } = useTransactions();
  const { data: vault, isLoading: vaultLoading } = useVault();
  const { data: upcomingSubs } = useUpcomingSubscriptions();
  const { decryptMany, isUnlocked } = useEncryption();

  // ── Decrypt recent transactions ─────────────────────────────────────────────
  // Transactions arrive encrypted from the server action.
  // We decrypt the 5 most recent amounts client-side and negate them
  // (transactions table stores positive values, display as expense).

  const [recentTransactions, setRecentTransactions] = useState<TransactionDecrypted[]>([]);
  const [decryptingTx, setDecryptingTx] = useState(false);

  useEffect(() => {
    const transactions = rawTransactions ?? [];

    if (transactions.length === 0 || !isUnlocked) {
      setRecentTransactions([]);
      return;
    }

    let cancelled = false;
    setDecryptingTx(true);

    // Only decrypt the first 5 (already sorted newest-first by server action)
    const first5 = transactions.slice(0, 5);

    decryptMany(first5.map((t) => t.amount_encrypted))
      .then((amounts) => {
        if (cancelled) return;

        const decrypted: TransactionDecrypted[] = first5.map(
          (t: Transaction, i: number) => {
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
            const { amount_encrypted, amount_hash, ...rest } = t;
            return { ...rest, amount: -amounts[i] }; // negate for expense display
          },
        );

        setRecentTransactions(decrypted);
        setDecryptingTx(false);
      })
      .catch(() => {
        if (!cancelled) {
          setRecentTransactions([]);
          setDecryptingTx(false);
        }
      });

    return () => {
      cancelled = true;
    };
  }, [rawTransactions, isUnlocked, decryptMany]);

  // ── Loading state ───────────────────────────────────────────────────────────

  const isLoading = budgetLoading || vaultLoading || !isUnlocked;
  const txIsLoading = txLoading || decryptingTx;

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── Sticky page header ────────────────────────────────────────────── */}
      <Header
        title="Kharcha"
        rightElement={
          <button
            aria-label="Notifications"
            className="flex items-center justify-center rounded-full"
            style={{
              width: 44,
              height: 44,
              background: 'transparent',
              border: 'none',
              cursor: 'pointer',
              color: 'var(--text-secondary)',
            }}
          >
            <Bell size={20} strokeWidth={1.8} />
          </button>
        }
      />

      {/* ── Main content ──────────────────────────────────────────────────── */}
      <div
        className="px-4 pb-24"
        style={{ paddingTop: 'var(--space-4)' }}
      >
        {isLoading ? (
          <DashboardSkeleton />
        ) : (
          <StaggerContainer className="flex flex-col gap-4" staggerDelay={0.06}>
            {/* ── Balance Card (full width) ─────────────────────────────────── */}
            <BalanceCard
              availableBalance={budget?.availableBalance ?? 0}
              totalSpent={budget?.totalSpent ?? 0}
              totalBudget={budget?.totalBudget ?? 0}
              budgetHorizon={budget?.budgetHorizon ?? null}
              expectedSubscriptions={budget?.expectedSubscriptions ?? 0}
            />

            {/* ── Half-width row: DailyLimit + VaultPreview ─────────────────── */}
            <div className="flex gap-3">
              <DailyLimitCard
                dailyLimit={Math.round(budget?.dailyLimit ?? 0)}
                weeklyBudget={Math.round(budget?.weeklyBudget ?? 0)}
                weeklySpent={Math.round(budget?.weeklySpent ?? 0)}
                burnStatus={budget?.burnStatus ?? 'safe'}
                todayRemaining={Math.round(budget?.todayRemaining ?? 0)}
                daysUntilBroke={budget?.daysUntilBroke ?? null}
              />

              <VaultPreview
                currentBalance={vault?.currentBalance ?? 0}
                targetAmount={vault?.targetAmount ?? null}
              />
            </div>

            {/* ── Budget period context line ──────────────────────────────── */}
            {budget?.budgetHorizon && budget?.budgetStartDate && (
              <p
                className="text-xs text-center -mt-1"
                style={{ color: 'var(--text-secondary)' }}
              >
                Budget period: {format(new Date(budget.budgetStartDate + 'T00:00:00'), 'MMM d')}
                {' → '}
                {format(budget.budgetHorizon, 'MMM d')}
              </p>
            )}

            {/* ── Subscription Alert (conditional — renders null if empty) ──── */}
            <SubscriptionAlert
              upcoming={upcomingSubs ?? []}
            />

            {/* ── Recent Transactions ───────────────────────────────────────── */}
            {txIsLoading ? (
              <RecentTransactionsSkeleton />
            ) : (
              <RecentTransactions
                transactions={recentTransactions}
                onTransactionPress={(txn) => {
                  // Phase 9: navigate to transaction detail
                  console.log('[Dashboard] tapped transaction', txn.id);
                }}
              />
            )}
          </StaggerContainer>
        )}
      </div>
    </>
  );
}

// ─── Skeleton loaders ─────────────────────────────────────────────────────────
//
// Match each card's approximate shape so the loading state feels
// like a natural "paper being drawn on" before data arrives.

function DashboardSkeleton() {
  return (
    <div className="flex flex-col gap-4">
      {/* Balance card skeleton */}
      <div
        className="p-5 flex flex-col gap-3"
        style={{
          background: 'var(--bg-surface)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-default)',
        }}
      >
        <Skeleton.Line width="40%" height="14px" />
        <Skeleton.Amount width="65%" />
        <Skeleton.Line width="100%" height="6px" />
        <Skeleton.Line width="55%" height="14px" />
        <Skeleton.Line width="45%" height="12px" />
      </div>

      {/* Half-width row skeleton */}
      <div className="flex gap-3">
        {/* DailyLimit skeleton */}
        <div
          className="flex-1 p-5 flex flex-col gap-2"
          style={{
            background: 'var(--bg-surface)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-default)',
          }}
        >
          <Skeleton.Line width="50%" height="12px" />
          <Skeleton.Amount width="80%" height="28px" />
          <Skeleton.Line width="40%" height="12px" />
          <Skeleton.Line width="55%" height="14px" />
        </div>

        {/* Vault skeleton */}
        <div
          className="flex-1 p-5 flex flex-col gap-2"
          style={{
            background: 'var(--bg-surface)',
            borderRadius: 'var(--radius-md)',
            border: '1px solid var(--border-default)',
          }}
        >
          <div className="flex items-center gap-3">
            <Skeleton.Circle width="60px" />
            <div className="flex flex-col gap-1">
              <Skeleton.Line width="56px" height="12px" />
              <Skeleton.Line width="36px" height="12px" />
            </div>
          </div>
          <Skeleton.Amount width="60%" height="22px" />
          <Skeleton.Line width="40%" height="12px" />
        </div>
      </div>

      {/* Recent transactions skeleton */}
      <RecentTransactionsSkeleton />
    </div>
  );
}

function RecentTransactionsSkeleton() {
  return (
    <div
      className="flex flex-col"
      style={{
        background: 'var(--bg-surface)',
        borderRadius: 'var(--radius-md)',
        border: '1px solid var(--border-default)',
      }}
    >
      {/* Header */}
      <div className="px-5 pt-5 pb-2">
        <Skeleton.Line width="45%" height="14px" />
      </div>

      {/* 5 transaction row skeletons */}
      {Array.from({ length: 5 }, (_, i) => (
        <div
          key={i}
          className="flex items-center gap-2.5 px-5"
          style={{
            paddingTop: 8,
            paddingBottom: 8,
            borderBottom: i < 4 ? '1px solid var(--border-default)' : 'none',
          }}
        >
          <Skeleton.Circle width="32px" />
          <div className="flex-1 flex flex-col gap-1">
            <Skeleton.Line width={`${65 - i * 5}%`} height="14px" />
            <Skeleton.Line width={`${40 - i * 3}%`} height="12px" />
          </div>
          <div className="flex flex-col items-end gap-1">
            <Skeleton.Line width="52px" height="12px" />
            <Skeleton.Line width="36px" height="10px" />
          </div>
        </div>
      ))}

      {/* View All skeleton */}
      <div className="flex justify-center py-3">
        <Skeleton.Line width="60px" height="14px" />
      </div>
    </div>
  );
}
