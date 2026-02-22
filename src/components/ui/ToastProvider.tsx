"use client";

import React, {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
} from "react";
import { AnimatePresence } from "framer-motion";
import Toast, { type ToastItem, type ToastVariant } from "./Toast";

// ─── Public API types ─────────────────────────────────────────────────────────

export interface ToastOptions {
  title: string;
  description?: string;
  variant?: ToastVariant;
  /** Auto-dismiss delay in ms. Pass 0 to require manual dismiss. (default: 3000) */
  duration?: number;
}

interface ToastContextValue {
  toast: (options: ToastOptions) => void;
}

// ─── Context ──────────────────────────────────────────────────────────────────

const ToastContext = createContext<ToastContextValue | null>(null);

/** Returns { toast } — call toast() from anywhere inside ToastProvider. */
export function useToast(): ToastContextValue {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error("useToast() must be used inside <ToastProvider>.");
  }
  return ctx;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

const MAX_VISIBLE = 3;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  // ── dismiss ─────────────────────────────────────────────────────────────────
  // Stable reference — passed down to each Toast so it can dismiss itself.
  const dismiss = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  // ── toast ───────────────────────────────────────────────────────────────────
  // Stable reference — safe to put in dependency arrays at call sites.
  // Uses functional setState so it never needs `toasts` in its closure.
  const toast = useCallback((options: ToastOptions) => {
    const item: ToastItem = {
      id: crypto.randomUUID(),
      title: options.title,
      description: options.description,
      variant: options.variant ?? "info",
      duration: options.duration ?? 3000,
    };

    setToasts((prev) => {
      const next = [...prev, item];
      // If we'd exceed the cap, evict the oldest toast(s) from the front.
      // Their Toast components unmount → useEffect cleanup fires → timers clear.
      return next.length > MAX_VISIBLE ? next.slice(next.length - MAX_VISIBLE) : next;
    });
  }, []);

  // ── Memoised context value ───────────────────────────────────────────────────
  // `toast` is stable (useCallback + []) so this memo never re-creates,
  // meaning consumers only re-render when they explicitly depend on toasts state.
  const value = useMemo<ToastContextValue>(() => ({ toast }), [toast]);

  return (
    <ToastContext.Provider value={value}>
      {children}

      {/*
        Toast container — rendered at the end of the Provider's JSX so it
        sits above all page content in DOM order (z-[60] reinforces this).

        Mobile  : inset-x-4 top-4          → full width minus 16px gutters
        Desktop : sm:left-auto sm:right-4  → top-right corner, fixed width
      */}
      <div
        aria-live="polite"
        aria-label="Notifications"
        className={[
          "fixed top-4 inset-x-4",
          "sm:left-auto sm:right-4 sm:w-80",
          "z-60",
          "flex flex-col gap-2",
          // pointer-events-none on the container so transparent gaps between
          // toasts don't swallow clicks on the page behind them.
          // Individual Toast components re-enable pointer-events-auto.
          "pointer-events-none",
        ].join(" ")}
      >
        {/*
          AnimatePresence tracks mounting/unmounting of Toast children.

          - Each toast needs a stable `key` so FM can match enter ↔ exit.
          - `layout` on the Toast's motion.div animates sibling repositioning
            when a middle toast is dismissed.
          - No `mode` prop (default "sync") lets enter + exit overlap,
            so a new toast slides in while an old one slides out simultaneously.
        */}
        <AnimatePresence>
          {toasts.map((t) => (
            <Toast key={t.id} {...t} onDismiss={dismiss} />
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
}
