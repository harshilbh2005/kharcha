"use client";

import { motion } from "framer-motion";
import { useMemo } from "react";
import React from "react";

// ─── Variants ──────────────────────────────────────────────────────────────────

// Item variants are constant — they don't depend on any props.
// Using "hidden" / "visible" so they match the container state names and
// Framer Motion can auto-propagate the animation to children.
const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: "spring" as const, stiffness: 300, damping: 25 },
  },
};

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface StaggerContainerProps {
  children: React.ReactNode;
  /** Seconds between each child's entrance (default: 0.08) */
  staggerDelay?: number;
  /** Delay before the very first child appears (default: 0.1) */
  initialDelay?: number;
  className?: string;
}

// ─── StaggerContainer ──────────────────────────────────────────────────────────
//
// Wraps each direct child in a motion.div that animates in sequentially.
// The container itself is invisible — it only orchestrates child timing via
// Framer Motion's staggerChildren / delayChildren mechanism.
//
// Usage:
//   <StaggerContainer>
//     <Card>One</Card>
//     <Card>Two</Card>
//     <Card>Three</Card>
//   </StaggerContainer>
//
// Replay tip: change the `key` prop on <StaggerContainer> to remount and
// re-trigger the entrance animation (e.g. after a data refresh).

export function StaggerContainer({
  children,
  staggerDelay = 0.08,
  initialDelay = 0.1,
  className = "",
}: StaggerContainerProps) {
  // Rebuild container variants only when timing props change
  const containerVariants = useMemo(
    () => ({
      hidden: {},
      visible: {
        transition: {
          staggerChildren: staggerDelay,
          delayChildren: initialDelay,
        },
      },
    }),
    [staggerDelay, initialDelay],
  );

  return (
    <motion.div
      className={className}
      variants={containerVariants}
      initial="hidden"
      animate="visible"
    >
      {React.Children.map(children, (child, i) =>
        child == null ? null : (
          <motion.div key={i} variants={itemVariants}>
            {child}
          </motion.div>
        ),
      )}
    </motion.div>
  );
}

export default StaggerContainer;
