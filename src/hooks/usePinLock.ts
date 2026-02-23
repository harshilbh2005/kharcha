// ============================================================
// KHARCHA — usePinLock Hook
// Manages PIN lock state, inactivity timer, and tab visibility.
// ============================================================

'use client';

import { useEffect, useRef, useCallback, useState } from 'react';
import { useEncryptionStore, restoreKeyFromSession } from '@/stores/encryption-store';
import { deriveKey } from '@/lib/crypto';
import { verifyPin } from '@/app/actions/auth';

/** Lock after 5 minutes of inactivity (ms) */
const INACTIVITY_TIMEOUT = 5 * 60 * 1000;

/** Events that count as user activity */
const ACTIVITY_EVENTS: (keyof WindowEventMap)[] = [
  'click',
  'touchstart',
  'keydown',
  'scroll',
];

export interface PinLockState {
  isLocked: boolean;
  failedAttempts: number;
  lockoutSeconds: number | null;
  isFullyLocked: boolean;
  isVerifying: boolean;
  error: string | null;
}

export function usePinLock(clerkUserId: string | null) {
  const { isUnlocked, clearKey, updateActivity } = useEncryptionStore();
  const setKey = useEncryptionStore((s) => s.setKey);

  // Initialize from Zustand store — if the encryption key is already in memory
  // (e.g. user navigated between pages), skip the PIN screen.
  const [isLocked, setIsLocked] = useState(
    () => !useEncryptionStore.getState().isUnlocked,
  );
  const [failedAttempts, setFailedAttempts] = useState(0);
  const [lockoutSeconds, setLockoutSeconds] = useState<number | null>(null);
  const [isFullyLocked, setIsFullyLocked] = useState(false);
  const [isVerifying, setIsVerifying] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const inactivityTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hiddenTimestamp = useRef<number | null>(null);
  const lockoutInterval = useRef<ReturnType<typeof setInterval> | null>(null);
  const restorationAttempted = useRef(false);

  // ── Lock the app ──────────────────────────────────────────────
  const lock = useCallback(() => {
    clearKey();
    setIsLocked(true);
    setError(null);
  }, [clearKey]);

  // ── Reset inactivity timer ────────────────────────────────────
  const resetInactivityTimer = useCallback(() => {
    if (inactivityTimer.current) {
      clearTimeout(inactivityTimer.current);
    }
    updateActivity();
    inactivityTimer.current = setTimeout(lock, INACTIVITY_TIMEOUT);
  }, [lock, updateActivity]);

  // ── Restore key from sessionStorage on mount (survives refresh) ──
  useEffect(() => {
    if (restorationAttempted.current) return;
    restorationAttempted.current = true;

    // Only attempt if currently locked and store is empty
    if (!useEncryptionStore.getState().isUnlocked) {
      restoreKeyFromSession().then((result) => {
        if (result) {
          setKey(result.key, result.salt);
          setIsLocked(false);
          resetInactivityTimer();
        }
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Submit PIN for verification ───────────────────────────────
  const submitPin = useCallback(
    async (pin: string) => {
      if (!clerkUserId) return;
      if (isFullyLocked) return;

      setIsVerifying(true);
      setError(null);

      try {
        const result = await verifyPin(pin, clerkUserId);

        if (result.success) {
          // Derive encryption key from PIN + salt
          const saltBytes = Uint8Array.from(atob(result.salt), (c) => c.charCodeAt(0));
          const { key, salt } = await deriveKey(pin, saltBytes);

          setKey(key, salt);
          setIsLocked(false);
          setFailedAttempts(0);
          setLockoutSeconds(null);
          setError(null);
          resetInactivityTimer();
        } else if ('fullyLocked' in result && result.fullyLocked) {
          setIsFullyLocked(true);
          setError('Too many attempts. Please sign in again.');
        } else if ('locked' in result && result.locked) {
          setLockoutSeconds(result.lockoutSeconds);
          setFailedAttempts((prev) => prev + 1);
          setError(`Too many attempts`);
          startLockoutCountdown(result.lockoutSeconds);
        } else if ('attemptsRemaining' in result) {
          setFailedAttempts((prev) => prev + 1);
          setError(
            result.attemptsRemaining <= 3
              ? `${result.attemptsRemaining} attempts remaining`
              : 'Wrong PIN',
          );
        }
      } catch {
        setError('Verification failed');
      } finally {
        setIsVerifying(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [clerkUserId, isFullyLocked, setKey, resetInactivityTimer],
  );

  // ── Lockout countdown ─────────────────────────────────────────
  const startLockoutCountdown = useCallback((seconds: number) => {
    if (lockoutInterval.current) clearInterval(lockoutInterval.current);

    setLockoutSeconds(seconds);
    lockoutInterval.current = setInterval(() => {
      setLockoutSeconds((prev) => {
        if (prev === null || prev <= 1) {
          if (lockoutInterval.current) clearInterval(lockoutInterval.current);
          return null;
        }
        return prev - 1;
      });
    }, 1000);
  }, []);

  // ── Activity listeners (when unlocked) ────────────────────────
  useEffect(() => {
    if (isLocked || !isUnlocked) return;

    const handleActivity = () => resetInactivityTimer();

    for (const event of ACTIVITY_EVENTS) {
      window.addEventListener(event, handleActivity, { passive: true });
    }
    resetInactivityTimer();

    return () => {
      for (const event of ACTIVITY_EVENTS) {
        window.removeEventListener(event, handleActivity);
      }
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
    };
  }, [isLocked, isUnlocked, resetInactivityTimer]);

  // ── Tab visibility handling ───────────────────────────────────
  useEffect(() => {
    if (isLocked) return;

    const handleVisibility = () => {
      if (document.hidden) {
        hiddenTimestamp.current = Date.now();
      } else {
        if (
          hiddenTimestamp.current &&
          Date.now() - hiddenTimestamp.current > INACTIVITY_TIMEOUT
        ) {
          lock();
        }
        hiddenTimestamp.current = null;
      }
    };

    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, [isLocked, lock]);

  // ── Cleanup on unmount ────────────────────────────────────────
  useEffect(() => {
    return () => {
      if (inactivityTimer.current) clearTimeout(inactivityTimer.current);
      if (lockoutInterval.current) clearInterval(lockoutInterval.current);
    };
  }, []);

  return {
    isLocked,
    failedAttempts,
    lockoutSeconds,
    isFullyLocked,
    isVerifying,
    error,
    submitPin,
    lock,
  } as const;
}
