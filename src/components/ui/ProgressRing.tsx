"use client";

import { motion } from "framer-motion";

// ─── Props ────────────────────────────────────────────────────────────────────

export interface ProgressRingProps {
  /** 0–100. Values outside this range are clamped automatically. */
  progress: number;
  /** Outer diameter in px (default: 120) */
  size?: number;
  /** Stroke width of both arcs in px (default: 8) */
  strokeWidth?: number;
  /** Progress arc colour — pass a CSS variable e.g. 'var(--color-vault)' */
  color?: string;
  /** Background track colour (default: 'var(--border-default)') */
  bgColor?: string;
  /** Show "65%" in the centre (default: true) */
  showPercentage?: boolean;
  /** Optional label rendered below the percentage */
  label?: string;
  /** Animate stroke-dashoffset from 0 progress to target on mount (default: true) */
  animated?: boolean;
  /** Custom centre content — replaces the default percentage + label */
  children?: React.ReactNode;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function ProgressRing({
  progress,
  size = 120,
  strokeWidth = 8,
  color = "var(--color-vault)",
  bgColor = "var(--border-default)",
  showPercentage = true,
  label,
  animated = true,
  children,
}: ProgressRingProps) {
  // ── Circle geometry ─────────────────────────────────────────────────────────
  const clamped = Math.min(100, Math.max(0, progress));

  // Radius shrinks inward by half the strokeWidth so the arc doesn't clip
  const center = size / 2;
  const radius = (size - strokeWidth) / 2;

  // Full circumference of the circle
  const circumference = 2 * Math.PI * radius;

  // The dashoffset for the target progress:
  //   offset = 0           → full circle (100%)
  //   offset = circumference → no circle  (0%)
  const targetOffset = circumference * (1 - clamped / 100);

  // ── Responsive font sizes (scale with ring diameter) ────────────────────────
  // At size=120: percent=24px, labelPx=13px
  // At size=80:  percent=16px, labelPx=10px (minimum)
  const percentPx = Math.floor(size * 0.2);
  const labelPx   = Math.max(10, Math.floor(size * 0.11));

  return (
    <div
      role="progressbar"
      aria-valuenow={Math.round(clamped)}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-label={label ?? `Progress: ${Math.round(clamped)}%`}
      className="relative inline-flex items-center justify-center shrink-0"
      style={{ width: size, height: size }}
    >
      {/*
        SVG is rotated -90° so the arc begins at 12 o'clock (top).
        Default SVG circles start at 3 o'clock (east); -90° rotates the
        origin to the top without needing a coordinate transform on the circles.

        aria-hidden keeps it out of the accessibility tree — the div above
        with role="progressbar" carries all the semantic information.
      */}
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        style={{ transform: "rotate(-90deg)" }}
        aria-hidden="true"
      >
        {/* ── Background track (full circle, always visible) ───────────── */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={bgColor}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={0}
        />

        {/* ── Progress arc ─────────────────────────────────────────────── */}
        {/*
          stroke-dasharray = circumference  → one dash exactly as long as the circle
          stroke-dashoffset drives how much of that dash is hidden:
            • full circumference  → nothing shown  (0% progress)
            • 0                   → fully shown     (100% progress)

          When `animated=true`:
            initial: offset = circumference (no arc visible on mount)
            animate: offset = targetOffset  (animates to correct progress)
          When `animated=false`:
            initial: offset = targetOffset  (starts at correct value instantly)
          Either way, subsequent prop changes to `progress` animate to new offset.
        */}
        <motion.circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          strokeDasharray={circumference}
          initial={{ strokeDashoffset: animated ? circumference : targetOffset }}
          animate={{ strokeDashoffset: targetOffset }}
          transition={
            animated
              ? { duration: 1, ease: "easeOut", delay: 0.3 }
              : { duration: 0 }
          }
        />
      </svg>

      {/*
        Centre overlay — absolutely positioned over the SVG.
        Not inside the SVG so it remains upright (SVG is rotated -90°).
      */}
      <div className="absolute inset-0 flex flex-col items-center justify-center">
        {children ?? (
          <>
            {showPercentage && (
              <span
                className="font-display text-ink-primary leading-none"
                style={{ fontSize: percentPx }}
              >
                {Math.round(clamped)}%
              </span>
            )}
            {label && (
              <span
                className="font-body text-ink-secondary text-center leading-tight mt-1"
                style={{ fontSize: labelPx }}
              >
                {label}
              </span>
            )}
          </>
        )}
      </div>
    </div>
  );
}
