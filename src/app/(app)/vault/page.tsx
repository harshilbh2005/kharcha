'use client';

// ============================================================
// KHARCHA — Emergency Vault Page
//
// Animation flow:
//   1. Page load → VaultDoor plays cinematic opening (~2.5 s)
//   2. onOpenComplete → contentVisible = true
//        · Door: Framer Motion fades to 30% + shrinks (decorative bg)
//        · VaultContent: staggered rise-from-paper entrance
//        · OdometerValue mounts + rolls (first render only)
//   3. Deposit success:
//        · Coin drop: 4 bronze circles bounce in from above the ring
//        · After coins land: balance odometer rolls to new value
//        · GoldenShimmer sweeps the balance card
// ============================================================

import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence, type Variants } from 'framer-motion';
import gsap from 'gsap';
import { ShieldCheck, ArrowDownToLine, ArrowUpFromLine } from 'lucide-react';

import Header from '@/components/layout/Header';
import Skeleton from '@/components/ui/Skeleton';
import Button from '@/components/ui/Button';
import { GoldenShimmer } from '@/components/animations/GoldenShimmer';
import { VaultDoor } from '@/components/vault/VaultDoor';
import { VaultBalance } from '@/components/vault/VaultBalance';
import { VaultHistory } from '@/components/vault/VaultHistory';
import { DepositModal } from '@/components/vault/DepositModal';
import { WithdrawModal } from '@/components/vault/WithdrawModal';
import { useVault } from '@/hooks/useVault';
import type { VaultTransactionDecrypted } from '@/types';

// ── Framer Motion variants ─────────────────────────────────────────────────────

const contentStagger: Variants = {
  hidden: {},
  visible: {
    transition: { staggerChildren: 0.1, delayChildren: 0.05 },
  },
};

const riseItem: Variants = {
  hidden:   { opacity: 0, y: 28 },
  visible:  { opacity: 1, y: 0,
    transition: { duration: 0.5, ease: 'easeOut' } },
};

// ── CoinDropAnimation ──────────────────────────────────────────────────────────
// 4 bronze circles that drop from above the balance ring on each deposit.
// Uses GSAP with bounce.out ease and stagger. GSAP context cleans up on unmount.

const COIN_X_OFFSETS = [-18, -6, 7, 19] as const; // fixed offsets so no random re-renders

interface CoinDropProps {
  active:     boolean;
  onComplete: () => void;
}

function CoinDropAnimation({ active, onComplete }: CoinDropProps) {
  const containerRef   = useRef<HTMLDivElement>(null);
  const onCompleteRef  = useRef(onComplete);
  onCompleteRef.current = onComplete; // keep ref current to avoid stale closure

  useEffect(() => {
    if (!active || !containerRef.current) return;

    const ctx = gsap.context(() => {
      const coins = containerRef.current!.querySelectorAll<HTMLElement>('.vault-coin');

      // Reset to top position
      gsap.set(coins, { y: 0, opacity: 1, scale: 1 });

      const tl = gsap.timeline({ onComplete: () => onCompleteRef.current() });

      // Phase A — Drop with physical bounce
      tl.to(coins, {
        y: 100,
        ease: 'bounce.out',
        duration: 0.9,
        stagger: 0.1,
      });

      // Phase B — Fade + shrink out
      tl.to(coins, {
        opacity: 0,
        scale: 0.35,
        duration: 0.25,
        stagger: 0.05,
        ease: 'power1.in',
      }, '-=0.15');
    }, containerRef);

    return () => ctx.revert();
  }, [active]);

  if (!active) return null;

  return (
    <div
      ref={containerRef}
      className="absolute pointer-events-none"
      aria-hidden="true"
      style={{
        top: 0,
        left: '50%',
        // Zero dimensions — coins positioned with absolute offsets
        width: 0,
        height: 0,
        zIndex: 10,
      }}
    >
      {COIN_X_OFFSETS.map((offsetX, i) => (
        <div
          key={i}
          className="vault-coin absolute"
          style={{
            width: 10,
            height: 10,
            borderRadius: '50%',
            background: 'var(--color-accent)',
            boxShadow: '0 0 8px var(--color-accent-light)',
            left: offsetX - 5,   // centre the 10 px coin on the offset point
            top: -28,            // start above the card top edge
          }}
        />
      ))}
    </div>
  );
}

// ── VaultContent ───────────────────────────────────────────────────────────────
// Renders after the door opens. Staggered Framer Motion entrance.
// Sits on top of the vault door (z-index: 1) with negative margin-top
// so the door peeks behind as a decorative background element.

interface VaultContentProps {
  balance:        number;
  targetAmount:   number | null;
  transactions:   VaultTransactionDecrypted[];
  showCoinDrop:   boolean;
  shimmerTrigger: boolean;
  onDepositClick:  () => void;
  onWithdrawClick: () => void;
  onCoinComplete:  () => void;
}

function VaultContent({
  balance, targetAmount, transactions,
  showCoinDrop, shimmerTrigger,
  onDepositClick, onWithdrawClick, onCoinComplete,
}: VaultContentProps) {
  return (
    <motion.div
      className="w-full flex flex-col gap-5"
      style={{ position: 'relative', zIndex: 1, marginTop: -56 }}
      variants={contentStagger}
      initial="hidden"
      animate="visible"
      exit={{ opacity: 0, y: 20, transition: { duration: 0.25 } }}
    >
      {/* ── Balance card ─────────────────────────────────────────────────── */}
      <motion.div variants={riseItem}>
        <GoldenShimmer trigger={shimmerTrigger} className="rounded-[var(--radius-md)]">
          {/*
            position: relative lets CoinDropAnimation (absolute) anchor here.
            Coins appear at top-center and fall 100 px down into the ring area.
          */}
          <div
            className="relative w-full p-5 flex flex-col items-center"
            style={{
              background:   'var(--bg-surface)',
              borderRadius: 'var(--radius-md)',
              border:       '1px solid var(--border-default)',
            }}
          >
            <CoinDropAnimation active={showCoinDrop} onComplete={onCoinComplete} />
            <VaultBalance
              currentBalance={balance}
              targetAmount={targetAmount}
              transactions={transactions}
            />
          </div>
        </GoldenShimmer>
      </motion.div>

      {/* ── Action buttons ───────────────────────────────────────────────── */}
      <motion.div variants={riseItem} className="flex gap-3 w-full">
        <Button
          onClick={onDepositClick}
          variant="secondary"
          size="lg"
          fullWidth
          className="!border-[var(--color-income)] !text-[var(--color-income)]"
        >
          <ArrowDownToLine size={18} strokeWidth={2} />
          Deposit
        </Button>

        <Button
          onClick={onWithdrawClick}
          variant="secondary"
          size="lg"
          fullWidth
          className="!border-[var(--color-expense)] !text-[var(--color-expense)]"
        >
          <ArrowUpFromLine size={18} strokeWidth={2} />
          Withdraw
        </Button>
      </motion.div>

      {/* ── Transaction history ──────────────────────────────────────────── */}
      <motion.div
        variants={riseItem}
        style={{
          background:   'var(--bg-surface)',
          borderRadius: 'var(--radius-md)',
          border:       '1px solid var(--border-default)',
          padding:      'var(--space-5)',
        }}
      >
        <h3
          className="font-display text-base mb-3"
          style={{ color: 'var(--text-primary)' }}
        >
          History
        </h3>
        <VaultHistory transactions={transactions} />
      </motion.div>
    </motion.div>
  );
}

// ── VaultPage ──────────────────────────────────────────────────────────────────

export default function VaultPage() {
  const { data: vault, isLoading } = useVault();

  const [contentVisible,  setContentVisible]  = useState(false);
  const [doorHidden,      setDoorHidden]      = useState(false);
  const [depositOpen,     setDepositOpen]     = useState(false);
  const [withdrawOpen,    setWithdrawOpen]    = useState(false);
  const [showCoinDrop,    setShowCoinDrop]    = useState(false);
  const [shimmerTrigger,  setShimmerTrigger]  = useState(false);

  // Timer ref for resetting shimmer (prevents memory leak)
  const shimmerTimerRef = useRef<ReturnType<typeof setTimeout>>(undefined);
  useEffect(() => () => clearTimeout(shimmerTimerRef.current), []);

  // ── Callbacks ─────────────────────────────────────────────────────────────

  const handleOpenComplete = useCallback(() => {
    setContentVisible(true);
  }, []);

  const handleDepositSuccess = useCallback(() => {
    // Start coin drop immediately after modal confirms deposit
    setShowCoinDrop(true);
  }, []);

  const handleCoinComplete = useCallback(() => {
    setShowCoinDrop(false);

    // fire shimmer: reset → true (so false→true edge fires for repeat deposits)
    setShimmerTrigger(false);
    requestAnimationFrame(() => {
      setShimmerTrigger(true);
      clearTimeout(shimmerTimerRef.current);
      shimmerTimerRef.current = setTimeout(() => setShimmerTrigger(false), 1_600);
    });
  }, []);

  // ── Render ────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── Header ──────────────────────────────────────────────────────── */}
      <Header
        title="Emergency Vault"
        rightElement={
          <div
            aria-label="Vault secured"
            role="img"
            className="flex items-center justify-center"
            style={{ width: 44, height: 44, color: 'var(--color-vault)' }}
          >
            <ShieldCheck size={20} strokeWidth={1.8} />
          </div>
        }
      />

      {/* ── Main ────────────────────────────────────────────────────────── */}
      <div className="px-4 pb-24" style={{ paddingTop: 'var(--space-4)' }}>
        {isLoading ? (
          <VaultSkeleton />
        ) : (
          <div className="flex flex-col items-center">

            {/*
              Vault door wrapper.
              · While door is playing: full opacity + scale (GSAP handles inner animation)
              · After onOpenComplete: Framer Motion fades outer wrapper to 30% opacity
                and scales it to 0.9 — making it a subtle decorative background.
              · Note: GSAP ONLY animates the inner svgWrapperRef (rotateY + scale),
                NOT opacity. Framer Motion owns opacity here to avoid compounding.
            */}
            <motion.div
              className="pt-2 flex justify-center"
              animate={
                contentVisible
                  ? { opacity: 0, scale: 0.9 }
                  : { opacity: 1, scale: 1 }
              }
              transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
              onAnimationComplete={() => {
                if (contentVisible) setDoorHidden(true);
              }}
              style={{
                // After fully faded, mark invisible so screen readers ignore it
                // and GSAP / hover events stop firing — space is preserved so
                // VaultContent's marginTop: -56 keeps working without a layout jump.
                visibility: doorHidden ? 'hidden' : undefined,
                pointerEvents: contentVisible ? 'none' : undefined,
              }}
            >
              <VaultDoor size={220} onOpenComplete={handleOpenComplete} />
            </motion.div>

            {/*
              VaultContent slides in after door opens.
              margin-top: -56 px pulls it up over the lower half of the door,
              creating the "content rising from behind the vault" effect.
            */}
            <AnimatePresence>
              {contentVisible && (
                <VaultContent
                  balance={vault?.currentBalance ?? 0}
                  targetAmount={vault?.targetAmount ?? null}
                  transactions={vault?.transactions ?? []}
                  showCoinDrop={showCoinDrop}
                  shimmerTrigger={shimmerTrigger}
                  onDepositClick={() => setDepositOpen(true)}
                  onWithdrawClick={() => setWithdrawOpen(true)}
                  onCoinComplete={handleCoinComplete}
                />
              )}
            </AnimatePresence>

          </div>
        )}
      </div>

      {/* ── Modals ──────────────────────────────────────────────────────── */}
      <DepositModal
        isOpen={depositOpen}
        onClose={() => setDepositOpen(false)}
        onSuccess={handleDepositSuccess}
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

// ── VaultSkeleton ──────────────────────────────────────────────────────────────

function VaultSkeleton() {
  return (
    <div className="flex flex-col gap-5 items-center">
      <Skeleton.Circle width="220px" />

      <div
        className="w-full p-5 flex flex-col items-center gap-3"
        style={{
          background:   'var(--bg-surface)',
          borderRadius: 'var(--radius-md)',
          border:       '1px solid var(--border-default)',
        }}
      >
        <Skeleton.Circle width="140px" />
        <Skeleton.Line width="120px" height="14px" />
        <Skeleton.Line width="80px"  height="24px" />
      </div>

      <div className="flex gap-3 w-full">
        <Skeleton.Line width="100%" height="48px" />
        <Skeleton.Line width="100%" height="48px" />
      </div>

      <div
        className="w-full p-5 flex flex-col gap-3"
        style={{
          background:   'var(--bg-surface)',
          borderRadius: 'var(--radius-md)',
          border:       '1px solid var(--border-default)',
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
