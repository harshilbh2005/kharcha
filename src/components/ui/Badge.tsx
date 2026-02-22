import React from "react";

// ─── Props ────────────────────────────────────────────────────────────────────

export interface BadgeProps {
  variant?: "income" | "expense" | "vault" | "warning" | "neutral";
  size?: "sm" | "md";
  children: React.ReactNode;
}

// ─── Static class maps ────────────────────────────────────────────────────────

/**
 * All colours reference @theme tokens which resolve to CSS variables — no raw hex.
 *
 * income   → bg: --color-income-bg   text: --color-income   (sage)
 * expense  → bg: --color-expense-bg  text: --color-expense  (terracotta)
 * vault    → bg: --color-vault-bg    text: --color-vault    (deep forest)
 * warning  → bg: --color-warning-bg  text: --color-warning  (warm amber)
 * neutral  → bg: --bg-navigation     text: --text-secondary (muted blue-grey)
 */
const variantClasses: Record<NonNullable<BadgeProps["variant"]>, string> = {
  income:  "bg-sage-bg text-sage",
  expense: "bg-terracotta-bg text-terracotta",
  vault:   "bg-vault-bg text-vault",
  warning: "bg-warning-bg text-warning",
  neutral: "bg-stone-nav text-ink-secondary",
};

const sizeClasses: Record<NonNullable<BadgeProps["size"]>, string> = {
  sm: "px-2 py-0.5 text-xs rounded-full",
  md: "px-3 py-1 text-sm rounded-full",
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function Badge({
  variant = "neutral",
  size = "sm",
  children,
}: BadgeProps) {
  return (
    <span
      className={[
        "inline-flex items-center",
        "font-body font-medium leading-none",
        "whitespace-nowrap",
        variantClasses[variant],
        sizeClasses[size],
      ].join(" ")}
    >
      {children}
    </span>
  );
}
