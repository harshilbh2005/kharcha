"use client";

// ============================================================
// KHARCHA — OfflineIndicator
//
// A slim banner that slides in beneath the header when the
// device is offline or when queued transactions are waiting
// to be synced after reconnection.
//
// States:
//   • Device offline          → terracotta bar "Offline — N transactions queued"
//   • Back online, syncing    → accent bar "Syncing N transactions…" + spinner
//   • All clear               → nothing rendered (AnimatePresence removes it)
// ============================================================

import { motion, AnimatePresence } from "framer-motion";
import { WifiOff, RefreshCw } from "lucide-react";
import { useOfflineQueue } from "@/hooks/useOfflineQueue";

export function OfflineIndicator() {
  const { isOffline, queueCount, isProcessing } = useOfflineQueue();

  // Show while offline, or while still draining the queue after reconnection
  const visible = isOffline || isProcessing || queueCount > 0;

  const bgColor = isOffline
    ? "var(--color-expense)"   // terracotta — indicates a problem
    : "var(--color-accent)";   // aged bronze — neutral / in-progress

  const label = isOffline
    ? queueCount > 0
      ? `Offline — ${queueCount} transaction${queueCount !== 1 ? "s" : ""} queued`
      : "You're offline"
    : `Syncing ${queueCount} transaction${queueCount !== 1 ? "s" : ""}…`;

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          key="offline-banner"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: "auto", opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.22, ease: "easeInOut" }}
          style={{ overflow: "hidden" }}
        >
          <div
            role="status"
            aria-live="polite"
            style={{
              display:        "flex",
              alignItems:     "center",
              justifyContent: "center",
              gap:            "var(--space-2)",
              padding:        "0.3125rem var(--space-4)",
              background:     bgColor,
              color:          "#fff",
              fontSize:       "0.75rem",
              fontFamily:     "Inter, sans-serif",
              fontWeight:     500,
              letterSpacing:  "0.01em",
            }}
          >
            {isOffline ? (
              <WifiOff size={12} aria-hidden="true" />
            ) : (
              // Spinning refresh icon while draining queue
              <motion.span
                animate={{ rotate: 360 }}
                transition={{
                  repeat:   Infinity,
                  duration: 0.9,
                  ease:     "linear",
                }}
                style={{ display: "flex", alignItems: "center" }}
              >
                <RefreshCw size={12} aria-hidden="true" />
              </motion.span>
            )}
            <span>{label}</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
