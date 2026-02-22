// ============================================================
// KHARCHA — Protected App Layout
// Wraps all authenticated app pages with:
//   1. Onboarding redirect (if profile missing or not onboarded)
//   2. PIN lock gate (AuthGate — PinLockScreen overlay)
//   3. Bottom navigation
// ============================================================

import { redirect } from 'next/navigation';
import { getProfile } from '@/lib/auth';
import AuthGate from '@/components/layout/AuthGate';
import { BottomNavWrapper } from '@/components/layout/BottomNavWrapper';

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const profile = await getProfile();

  // No profile or onboarding incomplete → redirect to onboarding
  if (!profile || !profile.onboarding_completed) {
    redirect('/onboarding');
  }

  return (
    <AuthGate pinEnabled={profile.pin_enabled}>
      {children}
      <BottomNavWrapper />
    </AuthGate>
  );
}
