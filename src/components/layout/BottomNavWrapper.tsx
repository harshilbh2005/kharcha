"use client";

// ============================================================
// KHARCHA — BottomNavWrapper
//
// Renders the bottom navigation bar and the floating action menu.
// Both are suppressed on Clerk auth pages (/sign-in, /sign-up)
// and the onboarding wizard, which own their full-screen layouts.
//
// Modal lifecycle is now entirely owned by FABMenu — this wrapper
// only decides whether to mount the two components.
// ============================================================

import { usePathname } from "next/navigation";
import { BottomNav } from "@/components/layout/BottomNav";
import { FABMenu } from "@/components/layout/FABMenu";

// ─── Suppressed-route prefixes ─────────────────────────────────────────────────

const HIDDEN_PATHS = ["/sign-in", "/sign-up", "/onboarding"];

// ─── BottomNavWrapper ───────────────────────────────────────────────────────────

export function BottomNavWrapper() {
  const pathname = usePathname();

  // Suppress on auth / onboarding pages — they own their full-screen layout.
  // startsWith covers sub-paths like /sign-in/sso-callback.
  if (HIDDEN_PATHS.some((prefix) => pathname.startsWith(prefix))) return null;

  return (
    <>
      <BottomNav />
      {/*
        FABMenu renders its own position:fixed FAB button (z-52), overlay
        (z-50), and fan buttons (z-51) — all floating above BottomNav's
        z-40 bar without being trapped in its stacking context.
      */}
      <FABMenu />
    </>
  );
}

export default BottomNavWrapper;
