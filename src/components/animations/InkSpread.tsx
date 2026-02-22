"use client";

import { motion, AnimatePresence } from "framer-motion";
import { X } from "lucide-react";
import { useEffect, useRef } from "react";

// ─── Types ─────────────────────────────────────────────────────────────────────

export interface InkSpreadProps {
  isOpen: boolean;
  /** Center coordinates of the trigger element (e.g. FAB button) */
  origin: { x: number; y: number };
  onClose: () => void;
  children: React.ReactNode;
  /** Background colour of the ink. Default: var(--bg-surface) */
  color?: string;
}

// ─── InkSpread ─────────────────────────────────────────────────────────────────
//
// A full-screen overlay whose entrance is a circle expanding from `origin`.
// Think: a drop of ink spreading across paper.
//
// Two independent AnimatePresence instances handle the ink layer and content
// layer separately so each can have its own enter/exit timing.

export function InkSpread({
  isOpen,
  origin,
  onClose,
  children,
  color = "var(--bg-surface)",
}: InkSpreadProps) {
  const closeRef = useRef<HTMLButtonElement>(null);

  // Build clip-path strings — recomputed each render so origin changes are captured
  const clipClosed = `circle(0% at ${origin.x}px ${origin.y}px)`;
  const clipOpen   = `circle(150% at ${origin.x}px ${origin.y}px)`;

  // ── Escape key ────────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    const onKey = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  // ── Body scroll lock ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [isOpen]);

  // ── Focus management: move focus to close button after content appears ─────────
  useEffect(() => {
    if (!isOpen) return;
    // 350 ms ≈ ink-spread (500 ms) × 70% — close button is accessible as soon
    // as the content layer has faded in (delay 250 ms + 100 ms buffer)
    const t = setTimeout(() => closeRef.current?.focus(), 350);
    return () => clearTimeout(t);
  }, [isOpen]);

  return (
    <>
      {/* ── Ink spreading layer ──────────────────────────────────────────────── */}
      {/* clip-path animates a circle from 0 % at origin → 150 % (covers screen)  */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="ink"
            aria-hidden="true"
            initial={{ clipPath: clipClosed }}
            animate={{ clipPath: clipOpen  }}
            exit={{
              clipPath: clipClosed,
              transition: { duration: 0.35, ease: "easeIn" },
            }}
            transition={{
              duration: 0.5,
              // Cubic-bezier with slight overshoot → bouncy, inky feel
              ease: [0.34, 1.56, 0.64, 1],
            }}
            style={{
              position: "fixed",
              inset: 0,
              backgroundColor: color,
              zIndex: 50,
            }}
          />
        )}
      </AnimatePresence>

      {/* ── Content layer ────────────────────────────────────────────────────── */}
      {/* Fades in 250 ms after ink starts spreading (≈ 60 % through the ink    */}
      {/* animation). Fades out immediately when closing.                        */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            key="content"
            role="dialog"
            aria-modal="true"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{
              opacity: 0,
              y: 10,
              transition: { duration: 0.15, ease: "easeIn" },
            }}
            transition={{ delay: 0.25, duration: 0.3, ease: "easeOut" }}
            style={{
              position: "fixed",
              inset: 0,
              zIndex: 51,
              overflowY: "auto",
            }}
          >
            {/* ── Close button ─────────────────────────────────────────────── */}
            <button
              ref={closeRef}
              onClick={onClose}
              aria-label="Close"
              className="absolute top-4 right-4 flex items-center justify-center w-11 h-11 rounded-full text-ink-secondary transition-colors hover:text-ink-primary hover:bg-black/5 active:bg-black/10 focus:outline-none focus-visible:ring-2"
              style={{ "--tw-ring-color": "var(--color-accent)" } as React.CSSProperties}
            >
              <X size={20} strokeWidth={2} />
            </button>

            {children}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default InkSpread;
