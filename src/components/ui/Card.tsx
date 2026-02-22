"use client";

import React, { forwardRef } from "react";
import { motion } from "framer-motion";

// ─── Props ────────────────────────────────────────────────────────────────────

export interface CardProps {
  children: React.ReactNode;
  className?: string;
  /** Enables the rise-from-paper entrance animation (default: true) */
  animated?: boolean;
  /** Stagger delay in seconds — pass increasing values for list animations (default: 0) */
  delay?: number;
  /** Shadow elevates on hover, signalling interactivity (default: false) */
  hoverable?: boolean;
  /** Providing onClick also applies cursor-pointer + select-none */
  onClick?: () => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

const Card = forwardRef<HTMLDivElement, CardProps>(
  (
    {
      children,
      className = "",
      animated = true,
      delay = 0,
      hoverable = false,
      onClick,
    },
    ref,
  ) => {
    const isClickable = Boolean(onClick);

    return (
      <motion.div
        ref={ref}
        // ── Entrance: rise from paper ──────────────────────────────────────
        // initial=false skips animation entirely (no flash of invisible content)
        initial={animated ? { opacity: 0, y: 20 } : false}
        animate={animated ? { opacity: 1, y: 0 } : undefined}
        transition={
          animated
            ? { type: "spring", stiffness: 200, damping: 25, delay }
            : undefined
        }
        onClick={onClick}
        // ── Hover shadow via CSS (separate from FM spring transition) ──────
        // Uses CSS variables so values stay in sync with the design token.
        // CSS :hover + box-shadow transition is independent of Framer Motion's
        // JS animation engine — they don't interfere with each other.
        style={
          hoverable
            ? {
                transition: `box-shadow var(--duration-normal) var(--ease-smooth)`,
              }
            : undefined
        }
        className={[
          // ── Surface ───────────────────────────────────────────────────
          "bg-stone-surface",           // var(--bg-surface)   #F2F0ED
          "border border-border-default", // var(--border-default) 1px
          "rounded-card",               // var(--radius-card) → var(--radius-md) = 12px
          "p-5",                        // var(--space-5) = 20px
          "shadow-card",                // var(--shadow-card)

          // ── Hoverable ─────────────────────────────────────────────────
          // CSS class applies target shadow; inline style above drives the transition.
          hoverable && "hover:shadow-card-hover",

          // ── Clickable ─────────────────────────────────────────────────
          isClickable && "cursor-pointer select-none",

          // ── Consumer overrides (always last) ──────────────────────────
          className,
        ]
          .filter(Boolean)
          .join(" ")}
      >
        {children}
      </motion.div>
    );
  },
);

Card.displayName = "Card";

export default Card;
