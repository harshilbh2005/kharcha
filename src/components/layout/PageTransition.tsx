"use client";

import { motion } from "framer-motion";

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface PageTransitionProps {
  children: React.ReactNode;
  /** Extra classes forwarded to the motion wrapper (e.g. "bg-surface") */
  className?: string;
}

// ─── Variants ──────────────────────────────────────────────────────────────────
//
// "Page turn" metaphor:
//   enter  — slides in from the right with a faint 2° rotateY tilt
//   exit   — slides out to the left with the mirrored tilt
//
// rotateY is subtle (2°) so it reads as a paper lift rather than a 3-D flip.
// perspective on the wrapper (1 200 px) gives just enough depth without
// making the effect feel like a PowerPoint slide.

const pageVariants = {
  initial: {
    opacity: 0,
    x: 30,
    rotateY: 2,
  },
  animate: {
    opacity: 1,
    x: 0,
    rotateY: 0,
  },
  exit: {
    opacity: 0,
    x: -30,
    rotateY: -2,
  },
};

// Spring keeps the enter snappy and physical.
// Exit uses a short tween so the leaving page doesn't linger.
const pageTransition = {
  type: "spring" as const,
  stiffness: 260,
  damping: 30,
};

// ─── PageTransition ─────────────────────────────────────────────────────────────
//
// Wraps page-level content with a Framer Motion enter/exit animation.
//
// Sizing:
//   • min-height: calc(100vh − 64 px)  — subtracts the BottomNav height so the
//     page fills the remaining viewport without a scrollbar.
//   • padding-bottom: 80 px            — keeps content clear of the BottomNav
//     on very short pages.
//   • overflow-x: hidden               — prevents the slide animation from
//     temporarily widening the page and triggering a horizontal scrollbar.
//
// Perspective:
//   • Applied on the wrapper div (not motion.div) because Framer Motion overrides
//     the transform property; setting perspective on a parent div is the idiomatic
//     way to give motion children a 3-D context.
//
// Usage (inside src/app/template.tsx):
//   <AnimatePresence mode="wait">
//     <PageTransition key={pathname}>{children}</PageTransition>
//   </AnimatePresence>

export function PageTransition({ children, className = "" }: PageTransitionProps) {
  return (
    <motion.div
      variants={pageVariants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={pageTransition}
      className={className}
      style={{
        // ── Size ──────────────────────────────────────────────────────────
        // 64 px = BottomNav visible height (not including safe-area padding)
        minHeight: "calc(100vh - 64px)",
        paddingBottom: "80px",

        // ── Clip horizontal overflow during slide ──────────────────────
        // IMPORTANT: Use "clip" not "hidden".  overflow:hidden creates a new
        // scroll container which breaks position:sticky on child elements
        // (e.g. the Header component). overflow:clip clips visually without
        // establishing a scroll container, so sticky headers work correctly.
        overflowX: "clip",

        // ── Transform origin for rotateY ──────────────────────────────
        // Center origin keeps the tilt symmetric around the page centre
        transformOrigin: "center center",
      }}
    >
      {children}
    </motion.div>
  );
}

export default PageTransition;
