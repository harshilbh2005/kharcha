"use client";

import { useEffect } from "react";
import { motion } from "framer-motion";
import {
  AlertTriangle,
  CheckCircle,
  Info,
  X,
  XCircle,
} from "lucide-react";

// ─── Types (also exported for use in ToastProvider) ───────────────────────────

export type ToastVariant = "success" | "error" | "warning" | "info";

export interface ToastItem {
  id: string;
  title: string;
  description?: string;
  variant: ToastVariant;
  duration: number;
}

export interface ToastProps extends ToastItem {
  onDismiss: (id: string) => void;
}

// ─── Variant config ───────────────────────────────────────────────────────────

const VARIANT_CONFIG: Record<
  ToastVariant,
  {
    Icon: React.ElementType;
    accentColor: string;   // CSS variable — left border
    iconClass: string;     // Tailwind token class — icon colour
  }
> = {
  success: {
    Icon: CheckCircle,
    accentColor: "var(--color-income)",    // Sage Moss
    iconClass: "text-sage",
  },
  error: {
    Icon: XCircle,
    accentColor: "var(--color-expense)",   // Terracotta
    iconClass: "text-terracotta",
  },
  warning: {
    Icon: AlertTriangle,
    accentColor: "var(--color-warning)",   // Warm Amber
    iconClass: "text-warning",
  },
  info: {
    Icon: Info,
    accentColor: "var(--color-accent)",    // Aged Bronze
    iconClass: "text-bronze",
  },
};

// ─── Component ────────────────────────────────────────────────────────────────

export default function Toast({
  id,
  title,
  description,
  variant,
  duration,
  onDismiss,
}: ToastProps) {
  const { Icon, accentColor, iconClass } = VARIANT_CONFIG[variant];

  // ── Auto-dismiss timer ──────────────────────────────────────────────────────
  // Timer lives here (not in the Provider) so it naturally clears itself when
  // the component unmounts — whether from auto-dismiss OR the user tapping X.
  useEffect(() => {
    if (duration <= 0) return; // 0 = persist until manual dismiss
    const timer = setTimeout(() => onDismiss(id), duration);
    return () => clearTimeout(timer);
  }, [id, duration, onDismiss]);

  return (
    <motion.div
      // ── Layout animation: when a sibling is removed, this toast slides
      // smoothly into its new position instead of jumping.
      layout
      // ── Enter: slide in from right + fade ──────────────────────────────
      initial={{ x: 100, opacity: 0 }}
      animate={{ x: 0, opacity: 1 }}
      // ── Exit: slide back out right + fade ──────────────────────────────
      exit={{ x: 100, opacity: 0 }}
      transition={{
        x: { type: "spring", stiffness: 350, damping: 30 },
        opacity: { duration: 0.2 },
        layout: { type: "spring", stiffness: 300, damping: 28 },
      }}
      // pointer-events-auto re-enables clicks (parent container is pointer-events-none)
      className="pointer-events-auto"
      style={{
        // 3px left accent strip — colour driven by CSS variable per variant
        borderLeft: `3px solid ${accentColor}`,
      }}
      role="alert"
      aria-live="polite"
    >
      {/* Card surface */}
      <div
        className={[
          "flex items-start gap-3",
          "bg-stone-surface",
          "border border-border-default",
          "shadow-lg",
          "rounded-lg",       // subtle radius on the card itself
          "px-4 py-3",
          "w-full",
        ].join(" ")}
      >
        {/* Variant icon */}
        <span className={`shrink-0 mt-0.5 ${iconClass}`} aria-hidden="true">
          <Icon size={18} />
        </span>

        {/* Text */}
        <div className="flex-1 min-w-0">
          <p className="font-body font-medium text-ink-primary leading-snug">
            {title}
          </p>
          {description && (
            <p className="font-body text-sm text-ink-secondary mt-0.5 leading-snug">
              {description}
            </p>
          )}
        </div>

        {/* Close button */}
        <button
          onClick={() => onDismiss(id)}
          className={[
            "shrink-0 mt-0.5",
            "text-ink-tertiary hover:text-ink-secondary",
            "transition-colors duration-150",
            "focus-visible:outline-none focus-visible:ring-2",
            "focus-visible:ring-bronze focus-visible:ring-offset-1",
            "rounded",
          ].join(" ")}
          aria-label="Dismiss notification"
        >
          <X size={14} />
        </button>
      </div>
    </motion.div>
  );
}
