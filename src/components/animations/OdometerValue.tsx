"use client";

import { motion, AnimatePresence } from "framer-motion";

// ─── Types ─────────────────────────────────────────────────────────────────────

type OdometerSize = "sm" | "md" | "lg" | "xl";

const SIZE_CLASSES: Record<OdometerSize, string> = {
  sm: "text-lg",
  md: "text-2xl",
  lg: "text-3xl",
  xl: "text-4xl",
};

export interface OdometerValueProps {
  /** The numeric value to display */
  value: number;
  /** Currency / unit prefix (default: "₹") */
  prefix?: string;
  /** Target duration in ms — controls spring stiffness (default: 800) */
  duration?: number;
  className?: string;
  size?: OdometerSize;
  /**
   * If true, positive values get sage (income) colour,
   * negative values get terracotta (expense) colour.
   */
  colored?: boolean;
}

// ─── DigitColumn ───────────────────────────────────────────────────────────────
// Renders a single scrolling digit — a column of 0–9 that translates on Y
// to reveal the correct digit through an overflow:hidden window.

interface DigitColumnProps {
  digit: number; // 0–9
  delay: number; // spring delay in seconds
  stiffness: number; // spring stiffness
}

function DigitColumn({ digit, delay, stiffness }: DigitColumnProps) {
  return (
    <span
      style={{
        display: "inline-block",
        overflow: "hidden",
        height: "1em",
        lineHeight: 1,
        verticalAlign: "bottom",
      }}
    >
      <motion.span
        animate={{ y: `${-digit}em` }}
        transition={{ type: "spring", stiffness, damping: 28, delay }}
        style={{
          display: "flex",
          flexDirection: "column",
          lineHeight: 1,
        }}
      >
        {[0, 1, 2, 3, 4, 5, 6, 7, 8, 9].map((d) => (
          <span
            key={d}
            style={{ height: "1em", lineHeight: 1, display: "block" }}
          >
            {d}
          </span>
        ))}
      </motion.span>
    </span>
  );
}

// ─── OdometerValue ─────────────────────────────────────────────────────────────

export function OdometerValue({
  value,
  prefix = "₹",
  duration = 800,
  className = "",
  size = "lg",
  colored = false,
}: OdometerValueProps) {
  const isNegative = value < 0;
  const absValue = Math.abs(value);

  // Map duration (ms) to spring stiffness — shorter duration = stiffer spring
  const stiffness = Math.round(160_000 / Math.max(duration, 100));

  // Format with Indian numbering system (e.g. 1,23,456)
  const hasDecimals = absValue % 1 !== 0;
  const formatted = new Intl.NumberFormat("en-IN", {
    minimumFractionDigits: hasDecimals ? 2 : 0,
    maximumFractionDigits: hasDecimals ? 2 : 0,
  }).format(absValue);

  const chars = formatted.split("");
  const totalLength = chars.length;

  // Count digit characters for delay cascade
  const totalDigits = chars.filter((c) => /\d/.test(c)).length;

  // Build per-character items.
  // Key is based on position-from-right so that when digit count changes:
  //   • stable positions update in-place (digit rolls)
  //   • new positions enter (fade in)
  //   • removed positions exit (fade out)
  let digitCounter = 0;
  const items = chars.map((char, i) => {
    const fromRight = totalLength - 1 - i;
    const isDigit = /\d/.test(char);
    let delay = 0;

    if (isDigit) {
      const digitIdx = digitCounter++;
      // Rightmost digit → delay 0; cascade left by 50 ms per column
      delay = (totalDigits - 1 - digitIdx) * 0.05;
    }

    return {
      char,
      isDigit,
      delay,
      // Commas and dots are keyed by their fixed offset from the right
      // (Indian format: first comma at fromRight=3, second at fromRight=6, etc.)
      key: isDigit ? `d-${fromRight}` : `s-${fromRight}`,
    };
  });

  const colorStyle: React.CSSProperties = colored
    ? {
        color:
          value >= 0 ? "var(--color-income)" : "var(--color-expense)",
      }
    : {};

  return (
    <span
      className={`font-display inline-flex items-end ${SIZE_CLASSES[size]} ${className}`}
      style={colorStyle}
    >
      {/* Accessible text for screen readers */}
      <span className="sr-only">
        {isNegative ? "−" : ""}
        {prefix}
        {formatted}
      </span>

      {/* Visual animated display */}
      <span aria-hidden="true" className="inline-flex items-end">
        {isNegative && (
          <span style={{ lineHeight: 1, marginRight: "0.05em" }}>−</span>
        )}

        {/* Prefix is static — not part of AnimatePresence */}
        <span
          style={{
            lineHeight: 1,
            marginRight: "0.06em",
          }}
        >
          {prefix}
        </span>

        {/* Digit strip + separators */}
        <AnimatePresence mode="popLayout" initial={false}>
          {items.map((item) => (
            <motion.span
              key={item.key}
              layout
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.18 }}
              style={{ display: "inline-flex", alignItems: "flex-end" }}
            >
              {item.isDigit ? (
                <DigitColumn
                  digit={parseInt(item.char, 10)}
                  delay={item.delay}
                  stiffness={stiffness}
                />
              ) : (
                /* comma or decimal point — static, just fades when appearing/disappearing */
                <span
                  style={{
                    lineHeight: 1,
                    display: "inline-block",
                    verticalAlign: "bottom",
                  }}
                >
                  {item.char}
                </span>
              )}
            </motion.span>
          ))}
        </AnimatePresence>
      </span>
    </span>
  );
}

export default OdometerValue;
