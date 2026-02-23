'use client';

// ============================================================
// KHARCHA — PIN Lock Screen
// Full-screen overlay with numpad for PIN entry.
// ============================================================

import { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Delete } from 'lucide-react';

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

const NUM_KEYS = [
  ['1', '2', '3'],
  ['4', '5', '6'],
  ['7', '8', '9'],
  ['', '0', 'backspace'],
] as const;

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
  const [shakeKey, setShakeKey] = useState(0);

  const isLockedOut = lockoutSeconds !== null && lockoutSeconds > 0;
  const isDisabled = isVerifying || isLockedOut || isFullyLocked;

  // ── Handle key press ──────────────────────────────────────────
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

  // ── Physical keyboard support ─────────────────────────────────
  useEffect(() => {
    if (!isLocked) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key >= '0' && e.key <= '9') {
        handleKey(e.key);
      } else if (e.key === 'Backspace') {
        handleKey('backspace');
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isLocked, handleKey]);

  // ── Auto-submit when PIN reaches exact length ─────────────────
  useEffect(() => {
    if (pin.length === pinLength) {
      onSubmit(pin);
    }
  }, [pin, pinLength, onSubmit]);

  // ── React to error → shake + clear ────────────────────────────
  useEffect(() => {
    if (error) {
      setShakeKey((k) => k + 1);
      if (navigator.vibrate) {
        navigator.vibrate(200);
      }
      // Clear PIN after shake
      const timer = setTimeout(() => setPin(''), 400);
      return () => clearTimeout(timer);
    }
  }, [error]);

  // ── React to success → brief green flash ──────────────────────
  useEffect(() => {
    if (!isLocked && pin.length > 0) {
      setShowSuccess(true);
      const timer = setTimeout(() => {
        setShowSuccess(false);
        setPin('');
      }, 500);
      return () => clearTimeout(timer);
    }
  }, [isLocked, pin.length]);

  return (
    <AnimatePresence>
      {isLocked && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-stone-global"
        >
          {/* App name */}
          <div className="mb-2 font-display text-3xl text-ink-primary">
            Kharcha
          </div>

          {/* Subtitle */}
          <div className="mb-8 font-body text-sm text-ink-secondary">
            {isFullyLocked
              ? 'Account locked — please sign in again'
              : lockoutSeconds
                ? `Try again in ${lockoutSeconds}s`
                : 'Enter your PIN'}
          </div>

          {/* PIN circles */}
          <motion.div
            key={shakeKey}
            animate={
              shakeKey > 0
                ? { x: [-10, 10, -10, 10, 0] }
                : {}
            }
            transition={{ duration: 0.4, ease: 'easeInOut' }}
            className="mb-8 flex gap-3"
          >
            {Array.from({ length: pinLength }).map((_, i) => {
              const isFilled = i < pin.length;
              const isSuccess = showSuccess && isFilled;

              return (
                <motion.div
                  key={i}
                  animate={
                    isFilled
                      ? { scale: [1, 1.2, 1] }
                      : { scale: 1 }
                  }
                  transition={{ duration: 0.15 }}
                  className="h-3.5 w-3.5 rounded-full transition-colors duration-150"
                  style={{
                    backgroundColor: isSuccess
                      ? 'var(--color-income)'
                      : isFilled
                        ? 'var(--color-accent)'
                        : 'transparent',
                    border: isSuccess
                      ? '2px solid var(--color-income)'
                      : isFilled
                        ? '2px solid var(--color-accent)'
                        : '2px solid var(--border-default)',
                  }}
                />
              );
            })}
          </motion.div>

          {/* Error / attempts message */}
          <div className="mb-6 h-5 text-center font-body text-sm text-terracotta">
            {error ?? ''}
          </div>

          {/* Number pad */}
          <div className="grid grid-cols-3 gap-3">
            {NUM_KEYS.flat().map((key, i) => {
              if (key === '') {
                // Empty spacer (bottom-left)
                return <div key={i} className="h-16 w-16" />;
              }

              const isBackspace = key === 'backspace';

              return (
                <motion.button
                  key={i}
                  type="button"
                  whileTap={!isDisabled ? { scale: 0.92 } : undefined}
                  transition={{ type: 'spring', stiffness: 400, damping: 25 }}
                  onClick={() => handleKey(key)}
                  disabled={isDisabled}
                  className={[
                    'flex h-16 w-16 items-center justify-center rounded-full',
                    'font-display text-2xl text-ink-primary',
                    'bg-stone-surface',
                    'transition-colors duration-fast',
                    'active:bg-stone-surface-hover',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                    'select-none',
                  ].join(' ')}
                  aria-label={isBackspace ? 'Delete' : key}
                >
                  {isBackspace ? (
                    <Delete size={22} className="text-ink-secondary" />
                  ) : (
                    key
                  )}
                </motion.button>
              );
            })}
          </div>

          {/* Future: biometric button placeholder */}
          <div className="mt-8 h-10" />
        </motion.div>
      )}
    </AnimatePresence>
  );
}
