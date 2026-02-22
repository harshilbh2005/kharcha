"use client";

import OdometerValue from "@/components/animations/OdometerValue";

// ─── Constants ─────────────────────────────────────────────────────────────────

type Currency = "INR" | "USD";
type AmountType = "income" | "expense" | "neutral";
type AmountSize = "sm" | "md" | "lg";

const PREFIX: Record<Currency, string> = {
  INR: "₹",
  USD: "$",
};

// Unicode minus (−) for expense so it matches the odometer's minus glyph
const SIGN: Record<AmountType, string> = {
  income:  "+",
  expense: "−",
  neutral: "",
};

const COLOR: Record<AmountType, string> = {
  income:  "var(--color-income)",
  expense: "var(--color-expense)",
  neutral: "var(--text-primary)",
};

const SIZE_CLASS: Record<AmountSize, string> = {
  sm: "text-sm",
  md: "text-base",
  lg: "text-xl",
};

// OdometerValue only has sm/md/lg/xl — map AmountDisplay sizes up one step
// since OdometerValue sizes are inherently larger (font-display vs font-mono)
const ODOMETER_SIZE: Record<AmountSize, "sm" | "md" | "lg"> = {
  sm: "sm",
  md: "sm",
  lg: "md",
};

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface AmountDisplayProps {
  amount: number;
  /** "INR" uses Indian grouping (1,23,456). Default: "INR" */
  currency?: Currency;
  /** Controls sign and colour. Default: "neutral" */
  type?: AmountType;
  size?: AmountSize;
  /** Prepend +/− to the formatted amount. Default: true */
  showSign?: boolean;
  /** Use the rolling OdometerValue animation instead of static text.
   *  Best used with INR. USD falls back to static due to locale mismatch. */
  animated?: boolean;
  className?: string;
}

// ─── AmountDisplay ─────────────────────────────────────────────────────────────
//
// A formatting wrapper for monetary amounts used throughout transaction lists,
// summary cards, and budget rows. Always font-mono for static display.
//
// Examples:
//   <AmountDisplay amount={1500}  type="income"  />   →  +₹1,500  (sage)
//   <AmountDisplay amount={350}   type="expense" />   →  −₹350    (terracotta)
//   <AmountDisplay amount={8000}  type="neutral" />   →   ₹8,000  (charcoal)
//   <AmountDisplay amount={12345} animated       />   rolling digits (odometer)

export function AmountDisplay({
  amount,
  currency = "INR",
  type = "neutral",
  size = "md",
  showSign = true,
  animated = false,
  className = "",
}: AmountDisplayProps) {
  const prefix = PREFIX[currency];
  const color  = COLOR[type];

  // ── Animated variant ──────────────────────────────────────────────────────
  // Delegates to OdometerValue which owns its own font (DM Serif Display).
  // Sign is rendered separately since OdometerValue only shows the Unicode −
  // for negative numbers — it has no built-in + for positive.
  if (animated) {
    const odometerValue =
      type === "expense" ? -Math.abs(amount) : Math.abs(amount);

    return (
      <span
        className={`inline-flex items-end ${className}`}
        style={{ color }}
      >
        {showSign && type === "income" && (
          <span
            className="font-mono"
            style={{ fontSize: "0.75em", alignSelf: "flex-end", marginRight: "0.05em" }}
          >
            +
          </span>
        )}
        <OdometerValue
          value={odometerValue}
          prefix={prefix}
          size={ODOMETER_SIZE[size]}
          colored={type !== "neutral"}
        />
      </span>
    );
  }

  // ── Static variant ────────────────────────────────────────────────────────
  const locale    = currency === "INR" ? "en-IN" : "en-US";
  const formatted = new Intl.NumberFormat(locale, {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Math.abs(amount));

  const sign = showSign ? SIGN[type] : "";

  return (
    <span
      className={`font-mono ${SIZE_CLASS[size]} ${className}`}
      style={{ color }}
    >
      {sign}
      {prefix}
      {formatted}
    </span>
  );
}

export default AmountDisplay;
