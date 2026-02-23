// ============================================================
// KHARCHA — Onboarding Page (Server Component)
//
// Acts as a server-side guard with two checks:
//
// 1. Clerk JWT check — if sessionClaims.metadata.onboarding_completed
//    is true, redirect immediately.
//
// 2. Supabase fallback — for users who onboarded before FIX 1 added
//    the Clerk metadata write, check the Supabase profiles table.
//    If onboarding_completed is true there, sync it to Clerk
//    publicMetadata and render a hard-redirect client component
//    (window.location.href) so the browser fetches a fresh JWT
//    that includes the newly synced claim.
//
// Only if BOTH checks fail does the wizard render.
// ============================================================

import { auth, clerkClient } from '@clerk/nextjs/server';
import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import OnboardingWizard from './OnboardingWizard';
import HardRedirect from './HardRedirect';

export default async function OnboardingPage() {
  const { userId, sessionClaims } = await auth();

  // ── Check 1: Clerk JWT says onboarding complete ───────────
  if (sessionClaims?.metadata?.onboarding_completed === true) {
    redirect('/');
  }

  // ── Check 2: Supabase fallback (pre-FIX-1 users) ─────────
  // User onboarded in Supabase but Clerk metadata was never set.
  // Sync it now and hard-redirect so the fresh JWT picks it up.
  if (userId) {
    const supabase = await createClient();
    const { data: profile } = await supabase
      .from('profiles')
      .select('onboarding_completed')
      .eq('clerk_user_id', userId)
      .single();

    if (profile?.onboarding_completed) {
      // Sync Clerk publicMetadata so future requests don't loop
      try {
        const client = await clerkClient();
        await client.users.updateUser(userId, {
          publicMetadata: { onboarding_completed: true },
        });
      } catch (e) {
        console.error('Failed to sync Clerk metadata for existing user:', e);
      }

      // Hard redirect (not Next.js redirect) — forces the browser to
      // fetch a fresh Clerk session token that includes the new claim.
      return <HardRedirect to="/" />;
    }
  }

  return <OnboardingWizard />;
}
