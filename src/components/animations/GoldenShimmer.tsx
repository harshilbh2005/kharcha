"use client";

import { motion, useAnimation } from "framer-motion";
import { useEffect, useRef } from "react";

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface GoldenShimmerProps {
  /** Set to true to play the shimmer once. Re-triggering after a false→true
   *  cycle plays the shimmer again. */
  trigger: boolean;
  children: React.ReactNode;
  /** Optional extra classes on the wrapper (e.g. "rounded-lg") */
  className?: string;
}

// ─── GoldenShimmer ─────────────────────────────────────────────────────────────
//
// Wraps its children with an absolutely-positioned gradient div that sweeps
// left-to-right on trigger. The gradient is a soft bronze/gold tint matching
// the project's --color-accent (#8B7355) at 12 % opacity.
//
// The shimmer div is 200% wide so its gradient band can enter from the far
// left and exit to the far right with a clean fade on both edges:
//
//   left: -200%  ──sweep──►  left: 200%
//           (0.0 s)          (1.0 s)
//
// Usage:
//   <GoldenShimmer trigger={saved}>
//     <Card>Balance: ₹12,345</Card>
//   </GoldenShimmer>

export function GoldenShimmer({ trigger, children, className = "" }: GoldenShimmerProps) {
  const controls = useAnimation();

  // Track previous trigger value so we only fire on false → true transitions,
  // not on every re-render while trigger stays true.
  const prevTrigger = useRef(false);

  useEffect(() => {
    if (trigger && !prevTrigger.current) {
      // 1. Snap shimmer back to start position (no animation)
      controls.set({ left: "-200%" });
      // 2. Sweep it across
      controls.start({
        left: "200%",
        transition: { duration: 1, ease: "easeInOut" },
      });
    }
    prevTrigger.current = trigger;
  }, [trigger, controls]);

  return (
    <div
      className={className}
      style={{ position: "relative", overflow: "hidden" }}
    >
      {/* ── Shimmer layer ──────────────────────────────────────────────────── */}
      {/* Sits above content (z-index 1) but pointer-events:none so clicks
          pass through to children. */}
      <motion.div
        initial={{ left: "-200%" }}
        animate={controls}
        aria-hidden="true"
        style={{
          position: "absolute",
          top: 0,
          width: "200%",
          height: "100%",
          // Deep Gold tint: matches --color-accent rgb(138,115,64) @ 12 %
          background:
            "linear-gradient(90deg, transparent 0%, rgba(138,115,64,0.12) 50%, transparent 100%)",
          pointerEvents: "none",
          zIndex: 1,
        }}
      />

      {children}
    </div>
  );
}

export default GoldenShimmer;
