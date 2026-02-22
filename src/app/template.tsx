"use client";

import { AnimatePresence } from "framer-motion";
import { usePathname } from "next/navigation";
import { PageTransition } from "@/components/layout/PageTransition";

// ─── Template ──────────────────────────────────────────────────────────────────
//
// WHY template.tsx and NOT layout.tsx?
//
//   Next.js App Router layouts persist across navigations — they are never
//   unmounted unless the segment they belong to changes. AnimatePresence needs
//   to detect when a child mounts/unmounts, so it MUST live in a component that
//   actually re-renders (and provides a new `key`) on every navigation.
//
//   template.tsx is the App Router answer: Next.js creates a fresh instance of
//   this component on every navigation, giving AnimatePresence a clean slate to
//   run the exit animation of the leaving page before mounting the entering page.
//
// Pattern:
//   layout.tsx  → persists  → fonts, metadata, Providers, ToastProvider
//   template.tsx → re-mounts → AnimatePresence + PageTransition
//
// mode="wait":
//   Ensures the exit animation of the leaving page fully completes before the
//   entering page begins its enter animation. This prevents both pages from
//   being visible at the same time which would look glitchy on a narrow mobile
//   viewport where they'd overlap.
//
// key={pathname}:
//   Gives AnimatePresence a stable identity string that changes on every
//   navigation. Without a key, React may reuse the same DOM node and
//   AnimatePresence will not fire exit animations.

export default function Template({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <AnimatePresence mode="wait" initial={false}>
      <PageTransition key={pathname}>
        {children}
      </PageTransition>
    </AnimatePresence>
  );
}
