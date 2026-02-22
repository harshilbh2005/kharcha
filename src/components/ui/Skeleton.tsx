// No "use client" needed — Skeleton is pure HTML/CSS with no interactivity.
// Can be rendered on the server and sent as static HTML.

import React from "react";

// ─── Props ────────────────────────────────────────────────────────────────────

export interface SkeletonProps {
  variant?: "line" | "circle" | "card" | "amount";
  /** Ignored for 'circle' — set size via width instead. (default: '100%') */
  width?: string;
  /** Override the default height for this variant. */
  height?: string;
  className?: string;
}

// ─── Per-variant defaults ─────────────────────────────────────────────────────

const DEFAULT_HEIGHT: Record<NonNullable<SkeletonProps["variant"]>, string> = {
  line:   "14px",
  circle: "40px",  // overridden by computed width so the circle stays round
  card:   "120px",
  amount: "32px",
};

const BORDER_RADIUS: Record<NonNullable<SkeletonProps["variant"]>, string> = {
  line:   "4px",
  circle: "9999px",
  card:   "var(--radius-md)",  // 12px — matches Card component
  amount: "4px",
};

// ─── Base component ───────────────────────────────────────────────────────────

function SkeletonBase({
  variant = "line",
  width,
  height,
  className = "",
}: SkeletonProps) {
  // ── Dimension resolution ────────────────────────────────────────────────────
  // Circles always use the same value for width and height (perfect square
  // cropped to full border-radius). The `width` prop controls their diameter;
  // height is derived automatically so callers only pass one value.
  const resolvedWidth  = variant === "circle" ? (width ?? "40px") : (width ?? "100%");
  const resolvedHeight = variant === "circle" ? resolvedWidth     : (height ?? DEFAULT_HEIGHT[variant]);

  return (
    <div
      // aria-hidden — skeletons are decorative; they convey no actual content
      // to screen readers. The actual loaded content replaces them.
      aria-hidden="true"
      className={["overflow-hidden shrink-0", className].filter(Boolean).join(" ")}
      style={{
        width:           resolvedWidth,
        height:          resolvedHeight,
        backgroundColor: "var(--bg-skeleton)",   // #DDD9D3 Warm Grey
        borderRadius:    BORDER_RADIUS[variant],

        // ── Pencil-stroke shimmer ─────────────────────────────────────────
        // A 105° gradient (slightly tilted off horizontal) sweeps left-to-right
        // via the `shimmer` keyframe in globals.css (background-position -200% → 200%).
        // The diagonal angle + asymmetric stops mimic the uneven way a pencil
        // stroke catches light as it moves across paper, giving an organic
        // "filling in" quality instead of a perfectly mechanical slide.
        //
        // Gradient breakdown:
        //   0–28%  → transparent  (blank skeleton, leading edge)
        //   28–44% → ramp up      (soft pencil edge meeting the light)
        //   44–56% → var(--bg-surface) peak  (the bright pencil stroke)
        //   56–72% → ramp down    (soft trailing edge)
        //   72–100%→ transparent  (blank skeleton, trailing)
        //
        // background-size: 200% 100% means the gradient is twice as wide as
        // the element; the keyframe slides it from fully-left to fully-right.
        backgroundImage: [
          "linear-gradient(",
            "105deg,",
            "transparent 0%,",
            "transparent 28%,",
            "var(--bg-surface) 44%,",   // warm parchment highlight
            "var(--bg-surface) 56%,",
            "transparent 72%,",
            "transparent 100%",
          ")",
        ].join(" "),
        backgroundSize:  "200% 100%",
        // References the @keyframes shimmer block in globals.css.
        // `linear` timing (not ease-in-out) ensures the stroke moves at
        // constant speed like an actual pencil rather than accelerating.
        animation:       "shimmer 2s linear infinite",
      }}
    />
  );
}

// ─── Compound component assembly ──────────────────────────────────────────────
// Object.assign lets us export one name (`Skeleton`) that carries sub-components
// as properties, enabling the Skeleton.Line / Skeleton.Card usage pattern.

type SubProps = Omit<SkeletonProps, "variant">;

/**
 * Usage:
 *   <Skeleton />                         — default line
 *   <Skeleton variant="card" />
 *   <Skeleton.Line width="60%" />
 *   <Skeleton.Circle width="48px" />
 *   <Skeleton.Card height="160px" />
 *   <Skeleton.Amount />
 */
const Skeleton = Object.assign(SkeletonBase, {
  Line:   (props: SubProps) => <SkeletonBase variant="line"   {...props} />,
  Circle: (props: SubProps) => <SkeletonBase variant="circle" {...props} />,
  Card:   (props: SubProps) => <SkeletonBase variant="card"   {...props} />,
  Amount: (props: SubProps) => <SkeletonBase variant="amount" {...props} />,
});

export default Skeleton;
