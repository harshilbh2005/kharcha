"use client";

import { motion } from "framer-motion";
import { ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface HeaderProps {
  /** Page name displayed as the heading */
  title: string;
  /** Show a back-arrow on the left side (for detail / child pages) */
  showBack?: boolean;
  /** Override the default router.back() action */
  onBack?: () => void;
  /** Slot for icon-buttons on the right — bell, filter, kebab menu, etc. */
  rightElement?: React.ReactNode;
}

// ─── Header ────────────────────────────────────────────────────────────────────
//
// Sticky frosted-glass page header.
//
// • Sticks to the top of the viewport while scrolling — z-30 keeps it
//   below the BottomNav (z-40) and overlays/modals (z-50+).
//
// • Frosted glass: rgba(229,226,221,0.85) + backdrop-filter:blur(12px)
//   so underlying content shines through with a warm parchment tint.
//
// • iOS notch: total height expands with env(safe-area-inset-top) so the
//   title is always below the status bar on iPhones with a notch.
//
// Usage:
//   <Header title="Kharcha" rightElement={<NotificationBell />} />
//   <Header title="Transaction" showBack onBack={() => router.push('/')} />

export function Header({
  title,
  showBack = false,
  onBack,
  rightElement,
}: HeaderProps) {
  const router = useRouter();
  // Fall back to native browser/router back if no custom handler provided
  const handleBack = onBack ?? (() => router.back());

  return (
    <header
      style={{
        // ── Positioning ──────────────────────────────────────────────────────
        position: "sticky",
        top: 0,
        zIndex: 30,

        // ── Size — visible area is always 56 px; notch adds on top ────────
        height: "calc(56px + env(safe-area-inset-top))",
        paddingTop: "env(safe-area-inset-top)",
        paddingLeft:  "var(--space-5)",
        paddingRight: "var(--space-5)",

        // ── Frosted-glass surface ────────────────────────────────────────────
        // rgba is #E5E2DD (--bg-global) at 85 % opacity
        backgroundColor: "rgba(229, 226, 221, 0.85)",
        backdropFilter:       "blur(12px)",
        WebkitBackdropFilter: "blur(12px)",

        // ── Layout ────────────────────────────────────────────────────────────
        display:        "flex",
        alignItems:     "center",
        justifyContent: "space-between",
      }}
    >
      {/* ── Left slot: optional back-arrow + title ──────────────────────── */}
      <div
        style={{
          display:    "flex",
          alignItems: "center",
          gap:        "var(--space-1)",
          // Allow title to shrink if right element is wide
          minWidth: 0,
        }}
      >
        {showBack && (
          <motion.button
            onClick={handleBack}
            whileTap={{ scale: 0.90 }}
            aria-label="Go back"
            style={{
              // 40 px touch target, visually smaller
              width:  40,
              height: 40,
              borderRadius: "50%",
              display:        "flex",
              alignItems:     "center",
              justifyContent: "center",
              border:     "none",
              background: "transparent",
              cursor:     "pointer",
              color:      "var(--text-secondary)",
              flexShrink: 0,
              // Negative margin aligns the icon optically with the page edge
              marginLeft: "calc(0px - var(--space-2))",
            }}
          >
            <ArrowLeft size={20} strokeWidth={2} />
          </motion.button>
        )}

        <h1
          className="font-display text-2xl"
          style={{
            color:        "var(--text-primary)",
            margin:       0,
            // Truncate long titles gracefully
            overflow:     "hidden",
            textOverflow: "ellipsis",
            whiteSpace:   "nowrap",
          }}
        >
          {title}
        </h1>
      </div>

      {/* ── Right slot: action icons / buttons ──────────────────────────── */}
      {rightElement != null && (
        <div
          style={{
            display:    "flex",
            alignItems: "center",
            gap:        "var(--space-1)",
            flexShrink: 0,
            marginLeft: "var(--space-3)",
          }}
        >
          {rightElement}
        </div>
      )}
    </header>
  );
}

export default Header;
