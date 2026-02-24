// ============================================================
// KHARCHA — Next.js Proxy (formerly middleware.ts in Next <16)
//
// Routing rules (in priority order):
//   1. /api/webhook/tasker — always public, no auth check
//   2. Unauthenticated    — only /sign-in and /sign-up allowed;
//                           everything else → redirectToSignIn
//   3. Authenticated, onboarding NOT complete
//                         — only /onboarding allowed;
//                           everything else → /onboarding
//   4. Authenticated, onboarding complete
//                         — /onboarding blocked → /
//                           everything else → proceed
//
// IMPORTANT: For sessionClaims.metadata to be available, add
// the following custom claim in the Clerk Dashboard:
//   Configure → Sessions → Edit → Custom claims:
//   { "metadata": "{{user.public_metadata}}" }
// ============================================================

import { clerkMiddleware, createRouteMatcher } from '@clerk/nextjs/server';
import { NextResponse } from 'next/server';

// ── Route matchers ───────────────────────────────────────────

/** Clerk-rendered sign-in / sign-up UI (catch-all slug included) */
const isPublicRoute = createRouteMatcher(['/sign-in(.*)', '/sign-up(.*)']);

/** Onboarding wizard */
const isOnboardingRoute = createRouteMatcher(['/onboarding(.*)']);

/** Tasker webhook — bypasses auth entirely */
const isWebhookRoute = createRouteMatcher([
  '/api/webhook/tasker(.*)',
  /** Internal push dispatcher — protected by x-push-secret header, not Clerk */
  '/api/push/send(.*)',
]);

// ── Proxy ────────────────────────────────────────────────────

export default clerkMiddleware(async (auth, req) => {
  // ── Rule 1: Public webhooks ─────────────────────────────
  if (isWebhookRoute(req)) return NextResponse.next();

  const { userId, sessionClaims, redirectToSignIn } = await auth();

  // ── Rule 2: Unauthenticated ─────────────────────────────
  if (!userId) {
    if (isPublicRoute(req)) return NextResponse.next();
    return redirectToSignIn({ returnBackUrl: req.url });
  }

  // Check Clerk publicMetadata claim for onboarding status.
  // Falls back to allowing all authenticated users through if the
  // custom session claim hasn't been configured in the Clerk Dashboard yet
  // (metadata will be undefined).  This avoids a redirect loop for users
  // who onboarded before FIX 1 or before the Dashboard claim was added.
  const metadata = sessionClaims?.metadata;
  const claimConfigured = metadata !== undefined;
  const onboardingCompleted = metadata?.onboarding_completed === true;

  if (claimConfigured) {
    // ── Rule 3: Authenticated but onboarding incomplete ─────
    if (!onboardingCompleted) {
      if (isOnboardingRoute(req)) return NextResponse.next();
      return NextResponse.redirect(new URL('/onboarding', req.url));
    }

    // ── Rule 4: Fully onboarded ─────────────────────────────
    if (isOnboardingRoute(req)) {
      return NextResponse.redirect(new URL('/', req.url));
    }
  }

  return NextResponse.next();
});

// ── Matcher config ───────────────────────────────────────────
// Runs on every request except Next.js internals and static files.

export const config = {
  matcher: [
    '/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)',
    '/(api|trpc)(.*)',
  ],
};
