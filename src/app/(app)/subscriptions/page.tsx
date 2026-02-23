'use client';

// ============================================================
// KHARCHA — Subscriptions Page (Phase 6)
//
// Layout:
//   - Header: "Subscriptions" + back button + "+" button
//   - BurnRateCard: monthly total + breakdown bar
//   - "Due Soon" section: subs renewing within 7 days
//   - "Active Subscriptions" section: all active subs
//   - AddSubscriptionModal (opened via header "+" or empty-state button)
//
// Data flow:
//   useSubscriptions({ is_active: true }) → encrypted subs
//   useEncryption().decryptMany() → decrypt in useEffect
//   /api/exchange-rate → fetch once for USD conversion
// ============================================================

import { useState, useEffect, useCallback } from 'react';
import { motion } from 'framer-motion';
import { RefreshCw, Plus } from 'lucide-react';

import Header from '@/components/layout/Header';
import { StaggerContainer } from '@/components/animations/StaggerContainer';
import Skeleton from '@/components/ui/Skeleton';
import Button from '@/components/ui/Button';
import { SubscriptionCard } from '@/components/subscriptions/SubscriptionCard';
import { BurnRateCard } from '@/components/subscriptions/BurnRateCard';
import { AddSubscriptionModal } from '@/components/subscriptions/AddSubscriptionModal';
import { useSubscriptions } from '@/hooks/useSubscriptions';
import { useEncryption } from '@/hooks/useEncryption';
import type { Subscription, SubscriptionDecrypted } from '@/types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

/** Decrypt a list of subscriptions, merging plaintext amounts into the type */
async function decryptSubscriptions(
  subs: Subscription[],
  decryptMany: (values: string[]) => Promise<number[]>,
): Promise<SubscriptionDecrypted[]> {
  if (subs.length === 0) return [];

  const amounts = await decryptMany(subs.map((s) => s.amount_encrypted));

  // Decrypt INR amounts for USD subscriptions
  const inrAmounts = await Promise.all(
    subs.map(async (s, i) => {
      if (s.amount_inr_encrypted) {
        const [inr] = await decryptMany([s.amount_inr_encrypted]);
        return inr;
      }
      return null;
    }),
  );

  return subs.map((s, i) => {
    const { amount_encrypted, amount_inr_encrypted, ...rest } = s;
    return {
      ...rest,
      amount: amounts[i],
      amount_inr: inrAmounts[i],
    };
  });
}

/** Check if a subscription renews within N days from today */
function isRenewingSoon(sub: SubscriptionDecrypted, withinDays: number): boolean {
  if (!sub.next_billing_date) return false;
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const billing = new Date(sub.next_billing_date);
  billing.setHours(0, 0, 0, 0);
  const diffMs = billing.getTime() - today.getTime();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
  return diffDays >= 0 && diffDays <= withinDays;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function SubscriptionsPage() {
  const { data: subscriptions, isLoading: subsLoading } = useSubscriptions({ is_active: true });
  const { isUnlocked, decryptMany } = useEncryption();

  const [decryptedSubs, setDecryptedSubs] = useState<SubscriptionDecrypted[]>([]);
  const [exchangeRate, setExchangeRate] = useState(84.0);
  const [isDecrypting, setIsDecrypting] = useState(false);

  const [modalOpen, setModalOpen] = useState(false);
  const [editingSub, setEditingSub] = useState<SubscriptionDecrypted | undefined>(undefined);

  // ── Fetch exchange rate ─────────────────────────────────────────────────────
  useEffect(() => {
    async function fetchRate() {
      try {
        const res = await fetch('/api/exchange-rate');
        if (res.ok) {
          const data = await res.json();
          if (data.rate) setExchangeRate(data.rate);
        }
      } catch {
        // Use default rate
      }
    }
    fetchRate();
  }, []);

  // ── Decrypt subscriptions when data arrives ─────────────────────────────────
  useEffect(() => {
    if (!subscriptions || subscriptions.length === 0 || !isUnlocked) {
      setDecryptedSubs([]);
      return;
    }

    let cancelled = false;
    setIsDecrypting(true);

    decryptSubscriptions(subscriptions, decryptMany)
      .then((decrypted) => {
        if (!cancelled) {
          setDecryptedSubs(decrypted);
          setIsDecrypting(false);
        }
      })
      .catch(() => {
        if (!cancelled) setIsDecrypting(false);
      });

    return () => { cancelled = true; };
  }, [subscriptions, isUnlocked, decryptMany]);

  // ── Derived data ────────────────────────────────────────────────────────────
  const dueSoon = decryptedSubs.filter((s) => isRenewingSoon(s, 7));
  const allActive = decryptedSubs;

  const totalMonthly = decryptedSubs.reduce((sum, s) => {
    const amtINR = s.currency === 'USD' ? s.amount * exchangeRate : s.amount;
    // Yearly subscriptions: divide by 12 for monthly cost
    const monthly = s.billing_cycle === 'yearly' ? amtINR / 12 : amtINR;
    return sum + monthly;
  }, 0);

  const burnRateSubs = decryptedSubs.map((s) => ({
    name: s.name,
    amount: s.billing_cycle === 'yearly'
      ? (s.currency === 'USD' ? s.amount * exchangeRate : s.amount) / 12
      : (s.currency === 'USD' ? s.amount * exchangeRate : s.amount),
  }));

  // ── Handlers ────────────────────────────────────────────────────────────────
  const handleEdit = useCallback((id: string) => {
    const sub = decryptedSubs.find((s) => s.id === id);
    if (sub) {
      setEditingSub(sub);
      setModalOpen(true);
    }
  }, [decryptedSubs]);

  const handleAdd = useCallback(() => {
    setEditingSub(undefined);
    setModalOpen(true);
  }, []);

  const handleModalClose = useCallback(() => {
    setModalOpen(false);
    setEditingSub(undefined);
  }, []);

  const isLoading = subsLoading || isDecrypting;

  return (
    <>
      {/* ── Sticky page header ────────────────────────────────────────────── */}
      <Header
        title="Subscriptions"
        showBack
        rightElement={
          <motion.button
            type="button"
            onClick={handleAdd}
            whileTap={{ scale: 0.9 }}
            aria-label="Add subscription"
            style={{
              width: 40,
              height: 40,
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              border: 'none',
              background: 'transparent',
              cursor: 'pointer',
              color: 'var(--color-accent)',
            }}
          >
            <Plus size={22} strokeWidth={2} />
          </motion.button>
        }
      />

      {/* ── Main content ──────────────────────────────────────────────────── */}
      <div className="px-4 pb-28" style={{ paddingTop: 'var(--space-4)' }}>
        {isLoading ? (
          <SubscriptionsSkeleton />
        ) : decryptedSubs.length === 0 ? (
          <EmptyState onAdd={handleAdd} />
        ) : (
          <StaggerContainer className="flex flex-col gap-5" staggerDelay={0.08}>
            {/* ── Burn rate summary card ─────────────────────────────────── */}
            <BurnRateCard
              totalMonthly={totalMonthly}
              activeCount={decryptedSubs.length}
              subscriptions={burnRateSubs}
            />

            {/* ── Due Soon section ──────────────────────────────────────── */}
            {dueSoon.length > 0 && (
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
                  className="font-display text-base mb-2"
                  style={{ color: 'var(--color-expense)' }}
                >
                  Due Soon
                </h3>
                {dueSoon.map((sub) => (
                  <SubscriptionCard
                    key={sub.id}
                    subscription={sub}
                    exchangeRate={exchangeRate}
                    onPress={handleEdit}
                  />
                ))}
              </div>
            )}

            {/* ── All Active Subscriptions ──────────────────────────────── */}
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
                className="font-display text-base mb-2"
                style={{ color: 'var(--text-primary)' }}
              >
                Active Subscriptions
              </h3>
              {allActive.map((sub, i) => (
                <SubscriptionCard
                  key={sub.id}
                  subscription={sub}
                  exchangeRate={exchangeRate}
                  onPress={handleEdit}
                />
              ))}
            </div>
          </StaggerContainer>
        )}
      </div>

      {/* ── Modal ────────────────────────────────────────────────────────── */}
      <AddSubscriptionModal
        isOpen={modalOpen}
        onClose={handleModalClose}
        editSubscription={editingSub}
        exchangeRate={exchangeRate}
      />
    </>
  );
}

// ─── Empty State ─────────────────────────────────────────────────────────────

function EmptyState({ onAdd }: { onAdd: () => void }) {
  return (
    <div className="flex flex-col items-center justify-center pt-20 gap-4">
      <div
        className="flex items-center justify-center rounded-full"
        style={{
          width: 72,
          height: 72,
          backgroundColor: 'var(--color-accent)' + '1A',
        }}
      >
        <RefreshCw size={32} color="var(--color-accent)" strokeWidth={1.5} />
      </div>
      <h3
        className="font-display text-lg"
        style={{ color: 'var(--text-primary)' }}
      >
        No subscriptions yet
      </h3>
      <p
        className="font-body text-sm text-center max-w-[260px]"
        style={{ color: 'var(--text-secondary)' }}
      >
        Track your recurring expenses like Netflix, Spotify, and more.
      </p>
      <Button onClick={onAdd} size="md">
        <Plus size={18} strokeWidth={2} />
        Add Subscription
      </Button>
    </div>
  );
}

// ─── Skeleton ────────────────────────────────────────────────────────────────

function SubscriptionsSkeleton() {
  return (
    <div className="flex flex-col gap-5">
      {/* Burn rate card skeleton */}
      <div
        className="w-full p-5 flex flex-col gap-3"
        style={{
          background: 'var(--bg-surface)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-default)',
        }}
      >
        <Skeleton.Line width="140px" height="14px" />
        <Skeleton.Line width="180px" height="28px" />
        <Skeleton.Line width="120px" height="14px" />
        <Skeleton.Line width="100%" height="8px" />
      </div>

      {/* Subscription list skeleton */}
      <div
        className="w-full p-5 flex flex-col gap-3"
        style={{
          background: 'var(--bg-surface)',
          borderRadius: 'var(--radius-md)',
          border: '1px solid var(--border-default)',
        }}
      >
        <Skeleton.Line width="140px" height="16px" />
        {Array.from({ length: 3 }, (_, i) => (
          <div key={i} className="flex items-center gap-3 py-2">
            <Skeleton.Circle width="40px" />
            <div className="flex-1 flex flex-col gap-1">
              <Skeleton.Line width={`${120 - i * 15}px`} height="14px" />
              <Skeleton.Line width="80px" height="12px" />
            </div>
            <Skeleton.Line width="60px" height="14px" />
          </div>
        ))}
      </div>
    </div>
  );
}
