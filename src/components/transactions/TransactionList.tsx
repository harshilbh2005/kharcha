"use client";

import {
  AnimatePresence,
  motion,
  useMotionValue,
  useTransform,
} from "framer-motion";
import { format, isToday, isYesterday, parseISO } from "date-fns";
import { PenLine } from "lucide-react";
import { useCallback, useRef, useState } from "react";
import Skeleton from "@/components/ui/Skeleton";
import { TransactionItem } from "./TransactionItem";
import type { TransactionDecrypted } from "@/types";

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** Group a flat list of transactions by their date string (YYYY-MM-DD). */
function groupByDate(
  transactions: TransactionDecrypted[],
): { label: string; date: string; items: TransactionDecrypted[] }[] {
  const map = new Map<string, TransactionDecrypted[]>();

  for (const tx of transactions) {
    const key = tx.date; // YYYY-MM-DD
    const existing = map.get(key);
    if (existing) {
      existing.push(tx);
    } else {
      map.set(key, [tx]);
    }
  }

  return Array.from(map.entries())
    .sort(([a], [b]) => b.localeCompare(a)) // newest first
    .map(([date, items]) => ({
      date,
      label: formatDateLabel(date),
      items,
    }));
}

function formatDateLabel(dateStr: string): string {
  try {
    const date = parseISO(dateStr);
    if (isToday(date))     return "Today";
    if (isYesterday(date)) return "Yesterday";
    return format(date, "MMM d"); // "Feb 20"
  } catch {
    return dateStr;
  }
}

// ─── Pull-to-refresh config ───────────────────────────────────────────────────

const PTR_THRESHOLD   = 72;  // px — how far to pull before triggering refresh
const PTR_MAX_DRAG    = 100; // px — maximum visual pull distance
const PTR_NIB_SIZE    = 24;  // px — pen nib icon size

// ─── Loading skeleton ─────────────────────────────────────────────────────────

function TransactionSkeleton() {
  return (
    <div className="flex items-center gap-3 py-3">
      <Skeleton.Circle width="40px" />
      <div className="flex-1 flex flex-col gap-2">
        <Skeleton.Line width="55%" height="14px" />
        <Skeleton.Line width="35%" height="12px" />
      </div>
      <div className="flex flex-col items-end gap-2">
        <Skeleton.Line width="60px" height="14px" />
        <Skeleton.Line width="40px" height="12px" />
      </div>
    </div>
  );
}

// ─── Empty state ──────────────────────────────────────────────────────────────

function EmptyState({ message }: { message: string }) {
  return (
    <motion.div
      className="flex flex-col items-center justify-center py-16 gap-4"
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 300, damping: 24 }}
    >
      {/* Ink-blot illustration */}
      <svg
        width="64"
        height="64"
        viewBox="0 0 64 64"
        fill="none"
        aria-hidden="true"
        style={{ opacity: 0.25 }}
      >
        <ellipse cx="32" cy="38" rx="18" ry="8" fill="var(--text-primary)" />
        <rect x="28" y="10" width="8" height="28" rx="4" fill="var(--text-primary)" />
        <ellipse cx="32" cy="10" rx="5" ry="5" fill="var(--text-primary)" />
      </svg>
      <p
        className="text-sm text-center"
        style={{ color: "var(--text-secondary)" }}
      >
        {message}
      </p>
    </motion.div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface TransactionListProps {
  transactions: TransactionDecrypted[];
  isLoading: boolean;
  emptyMessage?: string;
  onRefetch?: () => Promise<unknown> | void;
  onTransactionPress?: (id: string) => void;
  onTransactionDelete?: (id: string) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TransactionList({
  transactions,
  isLoading,
  emptyMessage = "No transactions yet.\nTap + to add one.",
  onRefetch,
  onTransactionPress,
  onTransactionDelete,
}: TransactionListProps) {
  const [refreshing, setRefreshing] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Motion value for pull distance (0 → PTR_MAX_DRAG)
  const pullY = useMotionValue(0);
  // Nib stretches vertically as you pull
  const nibScaleY = useTransform(pullY, [0, PTR_MAX_DRAG], [1, 1.6]);
  // Nib opacity fades in as you pull
  const nibOpacity = useTransform(pullY, [0, PTR_THRESHOLD * 0.4, PTR_THRESHOLD], [0, 0.5, 1]);

  // Track touch state for pull-to-refresh
  const touchStartY = useRef<number | null>(null);
  const pulling = useRef(false);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const el = containerRef.current;
    if (!el) return;
    // Only engage PTR when already scrolled to top
    if (el.scrollTop > 0) return;
    touchStartY.current = e.touches[0].clientY;
    pulling.current = true;
  }, []);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!pulling.current || touchStartY.current === null) return;
      const delta = e.touches[0].clientY - touchStartY.current;
      if (delta <= 0) return; // only downward pull
      // Clamp with rubber-band feel
      const clamped = Math.min(delta * 0.55, PTR_MAX_DRAG);
      pullY.set(clamped);
    },
    [pullY],
  );

  const handleTouchEnd = useCallback(async () => {
    pulling.current = false;
    touchStartY.current = null;

    const currentPull = pullY.get();
    // Animate indicator back to 0
    pullY.set(0);

    if (currentPull >= PTR_THRESHOLD && onRefetch && !refreshing) {
      setRefreshing(true);
      try {
        await onRefetch();
      } finally {
        setRefreshing(false);
      }
    }
  }, [pullY, onRefetch, refreshing]);

  // ── Render: loading ──────────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div className="px-4">
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            style={{
              borderBottom: i < 4 ? "1px solid var(--border-default)" : "none",
            }}
          >
            <TransactionSkeleton />
          </div>
        ))}
      </div>
    );
  }

  // ── Render: empty ────────────────────────────────────────────────────────────
  if (transactions.length === 0) {
    return <EmptyState message={emptyMessage} />;
  }

  const groups = groupByDate(transactions);

  // ── Render: list ─────────────────────────────────────────────────────────────
  return (
    <div
      ref={containerRef}
      className="overflow-y-auto"
      onTouchStart={handleTouchStart}
      onTouchMove={handleTouchMove}
      onTouchEnd={handleTouchEnd}
      style={{ WebkitOverflowScrolling: "touch", position: "relative" }}
    >
      {/* Pull-to-refresh indicator */}
      <motion.div
        className="flex items-center justify-center"
        style={{
          height: pullY,
          overflow: "hidden",
          pointerEvents: "none",
        }}
        aria-hidden="true"
      >
        <motion.div style={{ scaleY: nibScaleY, opacity: nibOpacity }}>
          <PenLine size={PTR_NIB_SIZE} style={{ color: "var(--color-accent)" }} />
        </motion.div>
      </motion.div>

      {/* Transaction groups */}
      <AnimatePresence initial={false}>
        {groups.map(({ label, date, items }) => (
          <motion.div
            key={date}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* Date header */}
            <div
              className="px-4 pt-4 pb-1"
            >
              <span
                className="text-xs font-medium tracking-widest uppercase"
                style={{ color: "var(--text-secondary)" }}
              >
                {label}
              </span>
            </div>

            {/* Items */}
            <div className="px-4">
              <AnimatePresence>
                {items.map((tx, idx) => (
                  <motion.div
                    key={tx.id}
                    initial={{ opacity: 0, x: -12 }}
                    animate={{
                      opacity: 1,
                      x: 0,
                      transition: {
                        type: "spring",
                        stiffness: 340,
                        damping: 28,
                        delay: idx * 0.04,
                      },
                    }}
                    exit={{ opacity: 0, x: 20, transition: { duration: 0.18 } }}
                  >
                    <TransactionItem
                      transaction={tx}
                      isLast={idx === items.length - 1}
                      onPress={() => onTransactionPress?.(tx.id)}
                      onDelete={() => onTransactionDelete?.(tx.id)}
                    />
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

export default TransactionList;
