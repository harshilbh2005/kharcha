"use client";

import React, { forwardRef } from "react";
import { motion } from "framer-motion";
import { Loader2 } from "lucide-react";

// ─── Props ────────────────────────────────────────────────────────────────────

/**
 * Omit the four event handlers that Framer Motion 12 re-declares with
 * incompatible signatures (Framer's drag/animation events vs React's DOM events).
 * All other standard button attributes are still available.
 */
export interface ButtonProps
  extends Omit<
    React.ButtonHTMLAttributes<HTMLButtonElement>,
    "onDrag" | "onDragStart" | "onDragEnd" | "onAnimationStart"
  > {
  variant?: "primary" | "secondary" | "ghost" | "danger";
  size?: "sm" | "md" | "lg";
  loading?: boolean;
  fullWidth?: boolean;
  children: React.ReactNode;
}

// ─── Static class maps ────────────────────────────────────────────────────────

/**
 * All colours reference CSS variables via Tailwind @theme tokens —
 * no raw hex values here.
 *
 * primary   → bg: --color-accent / --color-accent-hover
 * secondary → border: --border-default, text: --color-accent,  hover bg: --bg-surface-hover
 * ghost     → no border, text: --color-accent, hover bg: --bg-surface-hover
 * danger    → bg: --color-expense / --text-on-terracotta, hover: brightness filter
 *
 * `enabled:hover:` ensures hover styles never apply while the button is disabled,
 * even in browsers that still fire :hover on disabled elements.
 */
const variantClasses: Record<NonNullable<ButtonProps["variant"]>, string> = {
  primary:
    "bg-bronze text-ink-on-accent border-0 enabled:hover:bg-bronze-hover",
  secondary:
    "bg-transparent border border-border-default text-bronze enabled:hover:bg-stone-surface-hover",
  ghost:
    "bg-transparent border-0 text-bronze enabled:hover:bg-stone-surface-hover",
  danger:
    "bg-terracotta text-ink-on-terracotta border-0 enabled:hover:brightness-90",
};

/** h / px / text-size / rounded — matches the design spec exactly */
const sizeClasses: Record<NonNullable<ButtonProps["size"]>, string> = {
  sm: "h-8 px-3 text-sm rounded-md gap-1.5",
  md: "h-10 px-5 text-base rounded-lg gap-2",
  lg: "h-12 px-6 text-lg rounded-xl gap-2.5",
};

/** Loader2 pixel size per button size */
const spinnerSize: Record<NonNullable<ButtonProps["size"]>, number> = {
  sm: 14,
  md: 16,
  lg: 18,
};

// ─── Component ────────────────────────────────────────────────────────────────

const Button = forwardRef<HTMLButtonElement, ButtonProps>(
  (
    {
      variant = "primary",
      size = "md",
      loading = false,
      fullWidth = false,
      children,
      className = "",
      disabled,
      ...rest
    },
    ref,
  ) => {
    const isDisabled = disabled || loading;

    return (
      <motion.button
        ref={ref}
        // Physics-spring tap — suppressed when disabled/loading
        whileTap={!isDisabled ? { scale: 0.97 } : undefined}
        transition={{ type: "spring", stiffness: 400, damping: 20 }}
        // Native disabled so form engines + screen readers see it correctly
        disabled={isDisabled}
        aria-busy={loading}
        className={[
          // Layout
          "relative inline-flex items-center justify-center",
          // Typography — DM Serif Display is display-only; buttons use Inter
          "font-body font-medium leading-none",
          // Interaction
          "cursor-pointer select-none",
          // Smooth transition for bg, color, filter, opacity
          "transition duration-150",
          // Accessible focus ring using bronze accent
          "focus-visible:outline-none",
          "focus-visible:ring-2 focus-visible:ring-bronze focus-visible:ring-offset-2 focus-visible:ring-offset-stone-global",
          // Variant colours + hover
          variantClasses[variant],
          // Size: height, padding, font-size, radius, gap
          sizeClasses[size],
          // Optional full-width stretch
          fullWidth ? "w-full" : "",
          // Disabled visuals — opacity + cursor; hover already blocked via enabled:hover:*
          "disabled:opacity-50 disabled:cursor-not-allowed",
          // Consumer overrides last
          className,
        ]
          .filter(Boolean)
          .join(" ")}
        {...rest}
      >
        {loading && (
          <Loader2
            size={spinnerSize[size]}
            className="animate-spin shrink-0"
            aria-hidden="true"
          />
        )}

        {children}
      </motion.button>
    );
  },
);

Button.displayName = "Button";

export default Button;
