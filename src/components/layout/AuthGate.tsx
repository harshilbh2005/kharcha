'use client';

// ============================================================
// KHARCHA — AuthGate
// Wraps protected app content with PIN-based lock screen.
//
// Flow:
//   1. Server component checks onboarding status and redirects
//      to /onboarding if needed (happens before this renders).
//   2. This component manages the PIN lock overlay:
//      - On mount: isLocked = true → PinLockScreen shown
//      - User enters PIN → verifyPin server action
//      - On success → derive encryption key, store in memory
//      - Children (app content) become visible
//   3. Inactivity timer (5 min) → re-locks the app
// ============================================================

import { useState, useEffect } from 'react';
import { useAuth } from '@clerk/nextjs';
import PinLockScreen from '@/components/layout/PinLockScreen';
import { usePinLock } from '@/hooks/usePinLock';

interface AuthGateProps {
  /** Whether the user has PIN enabled (from server-fetched profile) */
  pinEnabled: boolean;
  children: React.ReactNode;
}

export default function AuthGate({ pinEnabled, children }: AuthGateProps) {
  const { userId } = useAuth();
  const {
    isLocked,
    lockoutSeconds,
    isFullyLocked,
    isVerifying,
    error,
    submitPin,
  } = usePinLock(userId ?? null);

  // Read saved PIN length from localStorage (set during onboarding)
  const [pinLength, setPinLength] = useState<4 | 6>(6);
  useEffect(() => {
    try {
      const saved = localStorage.getItem('kharcha_pin_length');
      if (saved === '4' || saved === '6') {
        setPinLength(Number(saved) as 4 | 6);
      }
    } catch {}
  }, []);

  // If PIN is not enabled (shouldn't happen post-onboarding, but defensive),
  // skip the lock screen entirely
  if (!pinEnabled) {
    return <>{children}</>;
  }

  return (
    <>
      {children}
      <PinLockScreen
        isLocked={isLocked}
        isVerifying={isVerifying}
        error={error}
        lockoutSeconds={lockoutSeconds}
        isFullyLocked={isFullyLocked}
        onSubmit={submitPin}
        pinLength={pinLength}
      />
    </>
  );
}
