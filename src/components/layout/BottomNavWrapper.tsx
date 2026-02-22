"use client";

import { usePathname } from "next/navigation";
import { BottomNav } from "@/components/layout/BottomNav";

// ─── Auth-route prefixes ────────────────────────────────────────────────────────

const AUTH_PATHS = ["/sign-in", "/sign-up"];

// ─── BottomNavWrapper ───────────────────────────────────────────────────────────
//
// Phase 1 shell: renders BottomNav on every non-auth route.
//
// The proxy middleware already redirects unauthenticated users away from
// protected routes before the page renders, so BottomNav only ever appears
// in front of a user who is allowed to be on that page.
//
// Phase 2 will add back the Clerk isSignedIn guard once real encrypted data
// is behind the nav tabs and we need to guarantee the nav never surfaces to
// a signed-out visitor.
//
// NOTE: We intentionally removed useAuth() here because the Clerk JS bundle
// loads asynchronously from Clerk's CDN.  If that request is slow or fails
// (e.g. network issues in dev, ad-blockers, offline mode), isLoaded stays
// false indefinitely and the nav never mounts — a bad DX during shell work.
// The pathname check is instant and sufficient for Phase 1.

export function BottomNavWrapper() {
  const pathname = usePathname();

  // Never render on Clerk auth pages — they own their full-screen layout.
  // startsWith covers sub-paths like /sign-in/sso-callback.
  const isAuthPage = AUTH_PATHS.some((prefix) => pathname.startsWith(prefix));
  if (isAuthPage) return null;

  return <BottomNav />;
}

export default BottomNavWrapper;
