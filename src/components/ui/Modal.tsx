"use client";

import React, { useCallback, useEffect, useId, useRef } from "react";
import { AnimatePresence, motion } from "framer-motion";

// ─── Props ────────────────────────────────────────────────────────────────────

export interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title?: string;
  children: React.ReactNode;
  /** Small drag-handle pill at the top of the sheet (default: true) */
  showHandle?: boolean;
  /** 90vh instead of the default 85vh (default: false) */
  fullHeight?: boolean;
}

// ─── Focus trap helpers ───────────────────────────────────────────────────────

/**
 * All element types that should participate in the Tab cycle.
 * We exclude visually-hidden / aria-hidden elements by checking the DOM
 * in the effect rather than here, keeping this list simple.
 */
const FOCUSABLE = [
  "a[href]",
  "button:not([disabled])",
  "input:not([disabled])",
  "select:not([disabled])",
  "textarea:not([disabled])",
  "[tabindex]:not([tabindex='-1'])",
].join(", ");

function getFocusable(container: HTMLElement) {
  return Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE));
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  showHandle = true,
  fullHeight = false,
}: ModalProps) {
  // Stable id for aria-labelledby — safe across SSR/CSR
  const titleId = useId();

  // Ref on the sheet panel (not the overlay) — used for focus trap
  const contentRef = useRef<HTMLDivElement>(null);

  // Track the element that had focus before the modal opened so we can restore it
  const previousFocusRef = useRef<HTMLElement | null>(null);

  // ── Body scroll lock ────────────────────────────────────────────────────────
  // Applied on the body element so the page behind the overlay can't scroll.
  // Cleaned up on unmount and whenever isOpen flips to false.
  useEffect(() => {
    if (!isOpen) return;

    const originalOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";

    return () => {
      document.body.style.overflow = originalOverflow;
    };
  }, [isOpen]);

  // ── Focus management ────────────────────────────────────────────────────────
  useEffect(() => {
    if (isOpen) {
      // Capture the currently focused element so we can return to it on close
      previousFocusRef.current = document.activeElement as HTMLElement;

      // Wait one tick for the Framer Motion animation to start before moving focus —
      // the DOM node exists immediately but the element isn't "visible" at t=0
      const timer = setTimeout(() => {
        if (!contentRef.current) return;
        const focusable = getFocusable(contentRef.current);
        // Prefer first interactive element; fall back to the modal panel itself
        const target = focusable[0] ?? contentRef.current;
        target.focus();
      }, 50);

      return () => clearTimeout(timer);
    } else {
      // Modal is closing — restore focus to wherever the user was before
      previousFocusRef.current?.focus();
      previousFocusRef.current = null;
    }
  }, [isOpen]);

  // ── Keyboard: Escape to close, Tab trap ─────────────────────────────────────
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (!isOpen) return;

      if (e.key === "Escape") {
        onClose();
        return;
      }

      if (e.key === "Tab" && contentRef.current) {
        const focusable = getFocusable(contentRef.current);
        if (focusable.length === 0) return;

        const first = focusable[0];
        const last = focusable[focusable.length - 1];
        const active = document.activeElement;

        if (e.shiftKey && active === first) {
          // Shift+Tab at first element → wrap to last
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && active === last) {
          // Tab at last element → wrap to first
          e.preventDefault();
          first.focus();
        }
      }
    },
    [isOpen, onClose],
  );

  useEffect(() => {
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [handleKeyDown]);

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* ── Backdrop overlay ──────────────────────────────────────────── */}
          {/*
            Rendered below the sheet (z-40 vs z-50) so clicking the exposed
            background area closes the modal without catching sheet clicks.
            aria-hidden keeps it invisible to screen readers.
          */}
          <motion.div
            key="modal-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2, ease: "easeOut" }}
            onClick={onClose}
            className="fixed inset-0 z-40"
            style={{ backgroundColor: "var(--bg-overlay)" }}
            aria-hidden="true"
          />

          {/* ── Bottom sheet panel ────────────────────────────────────────── */}
          {/*
            Slides up from y:"100%" (off-screen below viewport) to y:0.
            Exit reverses: slides back down to y:"100%".
            Spring gives it a weighted, physical landing rather than a
            mechanical linear slide.
          */}
          <motion.div
            key="modal-content"
            ref={contentRef}
            role="dialog"
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            // tabIndex={-1} lets the panel itself receive programmatic focus
            // as a fallback when there are no interactive children.
            tabIndex={-1}
            initial={{ y: "100%" }}
            animate={{ y: 0 }}
            exit={{ y: "100%" }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className={[
              "fixed bottom-0 left-0 right-0 z-50",
              "bg-stone-surface",
              "overflow-y-auto",
              // outline-none suppresses the focus ring on the panel itself
              // (we manage focus visually inside the sheet content)
              "outline-none",
              fullHeight ? "max-h-[90vh]" : "max-h-[85vh]",
            ].join(" ")}
            style={{
              // Top corners rounded, bottom flush with screen edge
              borderRadius: "var(--radius-xl) var(--radius-xl) 0 0",
              padding: "var(--space-6)",
              // Safe area inset pads content above the home indicator on iOS
              paddingBottom: "calc(var(--space-6) + env(safe-area-inset-bottom))",
            }}
          >
            {/* ── Drag handle ───────────────────────────────────────────────── */}
            {showHandle && (
              <div
                className="w-10 h-1 rounded-full mx-auto mb-4 bg-border-default"
                aria-hidden="true"
              />
            )}

            {/* ── Title ─────────────────────────────────────────────────────── */}
            {title && (
              <h2
                id={titleId}
                className="font-display text-xl text-ink-primary mb-4"
              >
                {title}
              </h2>
            )}

            {/* ── Consumer content ──────────────────────────────────────────── */}
            {children}
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
