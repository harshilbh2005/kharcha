'use client';

// ============================================================
// KHARCHA — PIN Lock Screen (Animation-Enhanced)
//
// Feature map:
//   1. Entrance   — bg fade, title float, dot stagger, pad slide
//   2. Digit tap  — dot spring (0→1.2→1), ink-drop ring, whileTap 0.88
//   3. Wrong PIN  — enhanced shake keyframes, terracotta flash,
//                   right-to-left drain, double vibrate
//   4. Correct    — green dots, SVG checkmark draw, screen exits upward
//   5. Lockout    — pad dims (opacity 0.4), countdown pulses each second
//   6. Backspace  — filled dot exits with scale 0 (0.15s)
// ============================================================

import { useState, useCallback, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Delete } from 'lucide-react';

// ─── Props ────────────────────────────────────────────────────────────────────

interface PinLockScreenProps {
  isLocked: boolean;
  isVerifying: boolean;
  error: string | null;
  lockoutSeconds: number | null;
  isFullyLocked: boolean;
  onSubmit: (pin: string) => void;
  /** Number of PIN digits (4 or 6). Defaults to 6 for backward compat. */
  pinLength?: 4 | 6;
}

// ─── Numpad layout ────────────────────────────────────────────────────────────

const NUM_KEYS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['', '0', 'backspace'],
] as const;

// ─── Component ────────────────────────────────────────────────────────────────

export default function PinLockScreen({
  isLocked,
  isVerifying,
  error,
  lockoutSeconds,
  isFullyLocked,
  onSubmit,
  pinLength = 6,
}: PinLockScreenProps) {
  const [pin, setPin] = useState('');
  const [showSuccess, setShowSuccess] = useState(false);

  // Shake: uses keyframe animate instead of key remount
  const [shaking, setShaking] = useState(false);

  // Ink-drop: which dot index should show the expanding ring
  const [inkDropIndex, setInkDropIndex] = useState<number | null>(null);

  // Drain: right-to-left scale-out of filled dots on error
  const [isDraining, setIsDraining] = useState(false);
  const [drainFromIndex, setDrainFromIndex] = useState(-1);

  // Terracotta flash on error
  const [errorFlash, setErrorFlash] = useState(false);

  // Ref tracks pin length without adding pin to effect deps
  const pinLengthRef = useRef(0);
  useEffect(() => {
    pinLengthRef.current = pin.length;
  });

  const isLockedOut = lockoutSeconds !== null && lockoutSeconds > 0;
  const isDisabled  = isVerifying || isLockedOut || isFullyLocked;

  // ── Detect digit added → trigger ink drop ──────────────────────────────────

  const prevPinLen = useRef(0);
  useEffect(() => {
    if (pin.length > prevPinLen.current) {
      setInkDropIndex(pin.length - 1);
    }
    prevPinLen.current = pin.length;
  }, [pin]);

  // ── Key handling ───────────────────────────────────────────────────────────

  const handleKey = useCallback(
    (key: string) => {
      if (isDisabled) return;
      if (key === 'backspace') {
        setPin((prev) => prev.slice(0, -1));
        return;
      }
      setPin((prev) => {
        if (prev.length >= pinLength) return prev;
        return prev + key;
      });
    },
    [isDisabled, pinLength],
  );

  // ── Physical keyboard ──────────────────────────────────────────────────────

  useEffect(() => {
    if (!isLocked) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') handleKey(e.key);
      else if (e.key === 'Backspace') handleKey('backspace');
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [isLocked, handleKey]);

  // ── Auto-submit ────────────────────────────────────────────────────────────

  useEffect(() => {
    if (pin.length === pinLength) onSubmit(pin);
  }, [pin, pinLength, onSubmit]);

  // ── Error → shake + drain + double vibrate ─────────────────────────────────
  //
  // `pin` intentionally omitted from deps so we capture the length AT the
  // moment the error prop first changes, not after setPin('') clears it.

  useEffect(() => {
    if (!error) return;

    const filledCount = pinLengthRef.current;

    setShaking(true);
    setErrorFlash(true);
    setIsDraining(true);
    setDrainFromIndex(filledCount - 1);

    // Two short buzzes (iOS ignores, Android/desktop may support)
    navigator.vibrate?.([100, 50, 100]);

    const t1 = setTimeout(() => setShaking(false), 500);
    const t2 = setTimeout(() => setErrorFlash(false), 500);
    // Clear pin after drain animation has started (drain = 0.15s × filledCount stagger)
    const t3 = setTimeout(() => setPin(''), 350);
    // Remove drain state after all dots have drained
    const t4 = setTimeout(() => {
      setIsDraining(false);
      setDrainFromIndex(-1);
    }, 650);

    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
      clearTimeout(t3);
      clearTimeout(t4);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [error]);

  // ── Success → green flash, then screen exits ───────────────────────────────

  useEffect(() => {
    if (!isLocked && pin.length > 0) {
      setShowSuccess(true);
      const timer = setTimeout(() => {
        setShowSuccess(false);
        setPin('');
      }, 600);
      return () => clearTimeout(timer);
    }
  }, [isLocked, pin.length]);

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <AnimatePresence>
      {isLocked && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          // Enhanced exit: screen floats upward as it fades
          exit={{
            opacity: 0,
            y: -30,
            scale: 1.02,
            transition: { duration: 0.4, ease: 'easeIn' as const },
          }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center"
          style={{ background: 'var(--bg-global)' }}
        >
          {/* ── App name (floats up on entrance) ── */}
          <motion.h1
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, ease: 'easeOut', delay: 0.05 }}
            className="font-display"
            style={{ fontSize: '1.875rem', color: 'var(--text-primary)', marginBottom: 8 }}
          >
            Kharcha
          </motion.h1>

          {/* ── Subtitle / lockout countdown ── */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.4, delay: 0.1 }}
            style={{ marginBottom: 32, minHeight: 20, textAlign: 'center' }}
          >
            {isFullyLocked ? (
              <p className="font-body" style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
                Account locked — please sign in again
              </p>
            ) : isLockedOut ? (
              <p className="font-body" style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
                Try again in{' '}
                {/*
                  key={lockoutSeconds} forces remount each second,
                  triggering the scale pulse animation.
                */}
                <motion.span
                  key={lockoutSeconds}
                  initial={{ scale: 1.1 }}
                  animate={{ scale: [1.1, 1] }}
                  transition={{ duration: 0.3, ease: 'easeOut' }}
                  style={{
                    display: 'inline-block',
                    fontFamily: 'IBM Plex Mono, monospace',
                    fontWeight: 600,
                    color: 'var(--color-expense)',
                  }}
                >
                  {lockoutSeconds}
                </motion.span>
                s
              </p>
            ) : (
              <p className="font-body" style={{ fontSize: 14, color: 'var(--text-secondary)' }}>
                Enter your PIN
              </p>
            )}
          </motion.div>

          {/* ── PIN dots ──────────────────────────────────────────────────────
            The container animates the horizontal shake keyframes.
            Individual dots each have:
              • Entrance: opacity 0 → 1 with 100ms stagger
              • Filled inner: AnimatePresence spring entry (scale 0→1 overshoots)
              • Drain inner: scale 1→0 from right to left
              • Ink drop: expands + fades on digit entry
          */}
          <motion.div
            className="flex gap-3"
            style={{ marginBottom: 24 }}
            animate={
              shaking
                ? { x: [0, -12, 10, -8, 6, -3, 0] }
                : { x: 0 }
            }
            transition={{ duration: 0.5, ease: 'easeInOut' }}
          >
            {Array.from({ length: pinLength }).map((_, i) => {
              const isFilled   = i < pin.length;
              const isDrainDot = isDraining && i <= drainFromIndex;
              const drainDelay = drainFromIndex >= 0 ? (drainFromIndex - i) * 0.05 : 0;

              return (
                <motion.div
                  key={i}
                  // Entrance stagger: 150ms base + 100ms per dot
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.15 + i * 0.1, duration: 0.3 }}
                  style={{ position: 'relative', width: 14, height: 14 }}
                >
                  {/* Always-visible border ring */}
                  <div
                    style={{
                      position: 'absolute',
                      inset: 0,
                      borderRadius: '50%',
                      border: `2px solid ${
                        errorFlash && i <= drainFromIndex
                          ? 'var(--color-expense)'       // terracotta flash
                          : showSuccess && isFilled
                          ? 'var(--color-income)'        // sage on success
                          : isFilled && !isDraining
                          ? 'var(--color-accent)'        // bronze when filled
                          : 'var(--border-default)'      // empty
                      }`,
                      transition: 'border-color 0.15s',
                    }}
                  />

                  {/* Filled dot — AnimatePresence handles enter/exit */}
                  <AnimatePresence>
                    {!isDraining && isFilled && (
                      <motion.div
                        key="filled"
                        // Spring with enough underdamping to naturally overshoot
                        // to ~1.2 scale before settling: stiffness=500, damping=20 → ζ≈0.45
                        initial={{ scale: 0 }}
                        animate={{ scale: 1 }}
                        exit={{ scale: 0, transition: { duration: 0.15, ease: 'easeIn' as const } }}
                        transition={{ type: 'spring', stiffness: 500, damping: 20 }}
                        style={{
                          position: 'absolute',
                          inset: 0,
                          borderRadius: '50%',
                          backgroundColor: showSuccess
                            ? 'var(--color-income)'
                            : 'var(--color-accent)',
                          transition: 'background-color 0.2s',
                        }}
                      />
                    )}

                    {/* Drain dot: mounted at scale 1, animates to 0 right→left */}
                    {isDrainDot && (
                      <motion.div
                        key="draining"
                        initial={{ scale: 1 }}
                        animate={{ scale: 0 }}
                        transition={{
                          duration: 0.15,
                          delay: drainDelay,
                          ease: 'easeIn' as const,
                        }}
                        style={{
                          position: 'absolute',
                          inset: 0,
                          borderRadius: '50%',
                          backgroundColor: 'var(--color-expense)',
                        }}
                      />
                    )}
                  </AnimatePresence>

                  {/* Ink-drop ring — expands + fades on digit entry */}
                  <AnimatePresence>
                    {inkDropIndex === i && (
                      <motion.div
                        key="inkdrop"
                        initial={{ scale: 1, opacity: 0.35 }}
                        animate={{ scale: 2.4, opacity: 0 }}
                        exit={{}}
                        transition={{ duration: 0.3, ease: 'easeOut' }}
                        onAnimationComplete={() => {
                          setInkDropIndex((prev) => (prev === i ? null : prev));
                        }}
                        style={{
                          position: 'absolute',
                          inset: 0,
                          borderRadius: '50%',
                          backgroundColor: 'var(--color-accent)',
                          pointerEvents: 'none',
                        }}
                      />
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </motion.div>

          {/* ── Error message ── */}
          <div style={{ marginBottom: 20, minHeight: 20, textAlign: 'center' }}>
            <AnimatePresence mode="wait">
              {error && (
                <motion.p
                  key={error}
                  initial={{ opacity: 0, y: -4 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="font-body"
                  style={{ fontSize: 13, color: 'var(--color-expense)' }}
                >
                  {error}
                </motion.p>
              )}
            </AnimatePresence>
          </div>

          {/* ── Number pad (slides up from below on entrance) ── */}
          <motion.div
            className="grid grid-cols-3 gap-3"
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: 'easeOut', delay: 0.3 }}
          >
            {NUM_KEYS.flat().map((key, i) => {
              if (key === '') {
                return <div key={i} style={{ width: 64, height: 64 }} />;
              }

              const isBackspace = key === 'backspace';

              return (
                <motion.button
                  key={i}
                  type="button"
                  // Snappy tap: 0.88 per spec
                  whileTap={!isDisabled ? { scale: 0.88 } : undefined}
                  // Dim entire pad during lockout/fully locked
                  animate={{ opacity: isLockedOut || isFullyLocked ? 0.4 : 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  onClick={() => handleKey(key)}
                  disabled={isDisabled}
                  style={{
                    width: 64,
                    height: 64,
                    borderRadius: '50%',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    background: 'var(--bg-surface)',
                    border: '1px solid var(--border-default)',
                    color: 'var(--text-primary)',
                    fontFamily: 'DM Serif Display, serif',
                    fontSize: 24,
                    cursor: isDisabled ? 'not-allowed' : 'pointer',
                    userSelect: 'none',
                  }}
                  aria-label={isBackspace ? 'Delete' : key}
                >
                  {isBackspace ? (
                    <Delete size={22} style={{ color: 'var(--text-secondary)' }} />
                  ) : (
                    key
                  )}
                </motion.button>
              );
            })}
          </motion.div>

          {/* ── Success checkmark (centered SVG draw-in) ──────────────────────
            Positioned absolutely so it overlays without shifting layout.
            motion.path pathLength: 0→1 creates the "drawing" effect.
          */}
          <AnimatePresence>
            {showSuccess && (
              <motion.div
                initial={{ opacity: 0, scale: 0.5 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.8, transition: { duration: 0.2 } }}
                transition={{ type: 'spring', stiffness: 400, damping: 22 }}
                style={{
                  position: 'absolute',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  zIndex: 10,
                  pointerEvents: 'none',
                }}
              >
                <svg width="72" height="72" viewBox="0 0 72 72" fill="none">
                  <circle cx="36" cy="36" r="30" fill="var(--color-income)" opacity="0.15" />
                  <motion.path
                    d="M22 36L31 45L50 24"
                    stroke="var(--color-income)"
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    fill="none"
                    initial={{ pathLength: 0, opacity: 0 }}
                    animate={{ pathLength: 1, opacity: 1 }}
                    transition={{ duration: 0.45, ease: 'easeOut', delay: 0.05 }}
                  />
                </svg>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Future: biometric button placeholder */}
          <div style={{ marginTop: 32, height: 40 }} />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
