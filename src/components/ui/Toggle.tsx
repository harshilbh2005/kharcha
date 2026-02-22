"use client";

import { motion } from "framer-motion";

// ─── Props ────────────────────────────────────────────────────────────────────

export interface ToggleProps {
  enabled: boolean;
  onToggle: (value: boolean) => void;
  label?: string;
  disabled?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

/**
 * Dimensions:
 *   Track  → w-11 (44px) × h-6 (24px)
 *   Thumb  → w-5  (20px) × h-5 (20px) diameter, top-0.5 (2px) from top
 *   Off    → thumb translateX(2px)
 *   On     → thumb translateX(22px)   [ 44 - 20 - 2 = 22 ]
 */
export default function Toggle({
  enabled,
  onToggle,
  label,
  disabled = false,
}: ToggleProps) {
  return (
    <div
      className={[
        "flex items-center",
        label ? "justify-between gap-4 w-full" : "justify-start",
        disabled && "opacity-50",
      ]
        .filter(Boolean)
        .join(" ")}
    >
      {/* ── Label (left) ──────────────────────────────────────────────────── */}
      {label && (
        <span className="font-body text-base text-ink-primary select-none">
          {label}
        </span>
      )}

      {/* ── Switch (right) ────────────────────────────────────────────────── */}
      {/*
        Using a <button role="switch"> rather than a plain <div> so that:
          • Keyboard users can toggle with Space/Enter
          • Screen readers announce on/off state via aria-checked
          • Native disabled attribute blocks interaction without JS guards
      */}
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        aria-label={label ?? "Toggle"}
        disabled={disabled}
        onClick={() => onToggle(!enabled)}
        className={[
          "shrink-0 rounded-full",
          "focus-visible:outline-none",
          "focus-visible:ring-2 focus-visible:ring-bronze",
          "focus-visible:ring-offset-2 focus-visible:ring-offset-stone-global",
          disabled ? "cursor-not-allowed" : "cursor-pointer",
        ].join(" ")}
      >
        {/* Track — background colour animates between off/on states */}
        {/*
          `initial={false}` skips the Framer Motion mount animation so the track
          starts at the correct colour immediately (no fade-in on page load).
          Subsequent `enabled` changes do animate via the `transition` prop.
        */}
        <motion.div
          initial={false}
          className="relative w-11 h-6 rounded-full"
          animate={{
            backgroundColor: enabled
              ? "var(--color-accent)"     // Aged Bronze #8B7355
              : "var(--bg-navigation)",   // Weathered Clay #D8D4CE
          }}
          transition={{ duration: 0.2, ease: "easeInOut" }}
        >
          {/* Thumb — springs horizontally between off (x:2) and on (x:22) */}
          {/*
            The spring deliberately undershoots / slightly overshoots, giving
            the thumb a physical, weighted feel instead of a mechanical slide.
            top-0.5 (2px) centres the 20px thumb in the 24px track: (24-20)/2 = 2
          */}
          <motion.div
            initial={false}
            className="absolute top-0.5 w-5 h-5 rounded-full bg-white shadow-sm"
            animate={{ x: enabled ? 22 : 2 }}
            transition={{ type: "spring", stiffness: 500, damping: 30 }}
          />
        </motion.div>
      </button>
    </div>
  );
}
