"use client";

import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface PaperCrumpleProps {
  children: React.ReactNode;
  /** Called after the crumple animation completes — remove the item here */
  onRemoved: () => void;
  /** Set to true to start the crumple animation */
  trigger: boolean;
}

// ─── PaperCrumple ──────────────────────────────────────────────────────────────
//
// Wraps an item so it "crumples like paper" when removed.
// The animation runs in three phases driven by `times: [0, 0.4, 1]`:
//
//   0 – 40 %  : subtle pre-crumple (scale 1→0.95, slight rotation, no fade)
//   40 – 100% : full crumple — crush to nothing, fade out, collapse height
//
// After the animation the `onRemoved` callback fires so the parent can drop
// the item from its list (which unmounts this component).
//
// Usage:
//   <PaperCrumple trigger={isDeleting} onRemoved={() => removeItem(id)}>
//     <TransactionRow ... />
//   </PaperCrumple>

export function PaperCrumple({ children, onRemoved, trigger }: PaperCrumpleProps) {
  const wrapperRef = useRef<HTMLDivElement>(null);
  // Measure the rendered pixel height so we can animate from a concrete value
  // to 0 (Framer Motion's 'auto' → 0 interpolation can be unreliable in
  // keyframe arrays, so we resolve it ourselves).
  const [naturalHeight, setNaturalHeight] = useState<number | "auto">("auto");

  useEffect(() => {
    if (wrapperRef.current) {
      setNaturalHeight(wrapperRef.current.offsetHeight);
    }
  }, []);

  return (
    <motion.div
      ref={wrapperRef}
      animate={
        trigger
          ? {
              // Visual crumple
              scale:   [1, 0.95, 0.80],
              opacity: [1, 0.80, 0],
              rotateZ: [0, -2,   5],

              // Layout collapse — height & margin shrink away AFTER the crumple
              // so the sibling items slide up smoothly
              height:       [naturalHeight as number, naturalHeight as number, 0],
              marginBottom: [0, 0, 0],
              paddingTop:   [0, 0, 0],
              paddingBottom:[0, 0, 0],

              transition: {
                duration: 0.5,
                times: [0, 0.4, 1],
                ease: "easeIn",
              },
            }
          : {}
      }
      onAnimationComplete={() => {
        // Guard: only fire when we triggered the crumple (not on idle mount)
        if (trigger) onRemoved();
      }}
      style={{
        overflow: "hidden",
        // Transform origin at vertical centre so the crumple looks centred
        transformOrigin: "50% 50%",
      }}
    >
      {children}
    </motion.div>
  );
}

export default PaperCrumple;
