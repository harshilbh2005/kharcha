"use client";

// ============================================================
// KHARCHA — TransactionList
//
// Animations:
//   • New item: drops from y:-60 → 0 (spring stiffness:300 damping:20)
//   • All existing items: layout prop → smoothly push down
//   • New item shimmer: gold border fades out after 0.8s
//   • Date headers: position:sticky + backdrop-blur
//   • Empty state: open-ledger SVG illustration with breathing
// ============================================================

import {
  AnimatePresence,
  motion,
  useMotionValue,
  useTransform,
} from "framer-motion";
import { format, isToday, isYesterday, parseISO } from "date-fns";
import { PenLine } from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
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
    const key = tx.date;
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
    const absolute = format(date, "MMM d");
    if (isToday(date))     return `Today · ${absolute}`;
    if (isYesterday(date)) return `Yesterday · ${absolute}`;
    return absolute;
  } catch {
    return dateStr;
  }
}

// ─── Pull-to-refresh config ───────────────────────────────────────────────────

const PTR_THRESHOLD   = 72;
const PTR_MAX_DRAG    = 100;
const PTR_NIB_SIZE    = 24;

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
//
// Open ledger/notebook illustration with a breathing scale animation.
// Message is split on "\n" → first line in font-display, second as subtitle.

function EmptyState({ message }: { message: string }) {
  const [title, subtitle] = message.split("\n");

  return (
    <motion.div
      className="flex flex-col items-center justify-center py-16 gap-5 px-6"
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: "spring", stiffness: 280, damping: 26 }}
    >
      {/* ── Breathing illustration ── */}
      <motion.div
        animate={{ scale: [1, 1.02, 1] }}
        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
        aria-hidden="true"
      >
        {/*
          Open ledger book: left page (ruled) + right page (blank) + spine.
          Pen rests diagonally across the right page.
          Small coin on the left page evokes currency without text glyphs.
          All fills use hex values matching the design token palette:
            #F2F0ED  = --bg-surface (Parchment)
            #D8D4CE  = --bg-navigation (Weathered Clay)
            #CDC9C2  = --border-default (Soft Linen)
            #8B7355  = --color-accent (Aged Bronze)
            #A38B6D  = lighter bronze
            #A37B6F  = --color-expense (Terracotta)
        */}
        <svg
          width="128"
          height="100"
          viewBox="0 0 128 100"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
        >
          {/* Left page */}
          <rect x="6" y="6" width="48" height="84" rx="4" fill="#F2F0ED" stroke="#CDC9C2" strokeWidth="1.5" />
          {/* Right page */}
          <rect x="68" y="6" width="48" height="84" rx="4" fill="#F2F0ED" stroke="#CDC9C2" strokeWidth="1.5" />
          {/* Spine */}
          <rect x="52" y="6" width="18" height="84" rx="3" fill="#D8D4CE" />

          {/* Left page — ruled lines */}
          <rect x="14" y="22" width="32" height="2" rx="1" fill="#CDC9C2" />
          <rect x="14" y="32" width="32" height="2" rx="1" fill="#CDC9C2" />
          <rect x="14" y="42" width="24" height="2" rx="1" fill="#CDC9C2" />
          <rect x="14" y="52" width="28" height="2" rx="1" fill="#CDC9C2" />
          <rect x="14" y="62" width="20" height="2" rx="1" fill="#CDC9C2" />
          <rect x="14" y="72" width="14" height="2" rx="1" fill="#CDC9C2" />

          {/* Right page — one partial line (rest is blank, waiting to be filled) */}
          <rect x="76" y="22" width="32" height="2" rx="1" fill="#CDC9C2" />

          {/* Pen — tilted across the right page */}
          <g transform="translate(99, 56) rotate(-38)">
            {/* Cap */}
            <rect x="-3.5" y="-30" width="7" height="10" rx="3" fill="#8B7355" opacity="0.55" />
            {/* Body */}
            <rect x="-3" y="-20" width="6" height="40" rx="2.5" fill="#A38B6D" opacity="0.5" />
            {/* Nib tip */}
            <polygon points="-3,20 3,20 0,30" fill="#8B7355" opacity="0.65" />
          </g>

          {/* Coin / rupee indicator on the left page */}
          <circle cx="38" cy="82" r="7" fill="#A37B6F" opacity="0.12" />
          <ellipse cx="38" cy="82" rx="3.5" ry="4.5" fill="none" stroke="#A37B6F" strokeWidth="1" opacity="0.3" />
        </svg>
      </motion.div>

      {/* ── Label ── */}
      <div className="flex flex-col items-center gap-1.5 text-center">
        <p
          className="font-display"
          style={{ fontSize: "1.15rem", color: "var(--text-primary)", lineHeight: 1.3 }}
        >
          {title}
        </p>
        {subtitle && (
          <p
            className="font-body"
            style={{ fontSize: 13, color: "var(--text-secondary)", lineHeight: 1.5 }}
          >
            {subtitle}
          </p>
        )}
      </div>
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

  // ── New-item detection ────────────────────────────────────────────────────
  //
  // Tracks which ID is "brand new" so it gets a special entrance and a brief
  // golden shimmer border.  Only triggers after the initial load (hasInitialized).
  const prevIdsRef     = useRef<Set<string>>(new Set());
  const hasInitialized = useRef(false);
  const [newId, setNewId] = useState<string | null>(null);

  useEffect(() => {
    if (transactions.length === 0) {
      prevIdsRef.current = new Set();
      hasInitialized.current = false;
      return;
    }

    const currentIds = new Set(transactions.map((t) => t.id));

    if (!hasInitialized.current) {
      // First data load — just snapshot IDs, no special animation
      hasInitialized.current = true;
      prevIdsRef.current = currentIds;
      return;
    }

    // Find IDs that appeared since last render
    const addedIds = transactions
      .filter((t) => !prevIdsRef.current.has(t.id))
      .map((t) => t.id);

    prevIdsRef.current = currentIds;

    // Only animate the single newest item (added at the top of the list)
    if (addedIds.length === 1) {
      const topId = transactions[0]?.id;
      if (topId && addedIds.includes(topId)) {
        setNewId(topId);
        const timer = setTimeout(() => setNewId(null), 2000);
        return () => clearTimeout(timer);
      }
    }
  }, [transactions]);

  // ── Pull-to-refresh ───────────────────────────────────────────────────────
  const pullY     = useMotionValue(0);
  const nibScaleY = useTransform(pullY, [0, PTR_MAX_DRAG], [1, 1.6]);
  const nibOpacity = useTransform(pullY, [0, PTR_THRESHOLD * 0.4, PTR_THRESHOLD], [0, 0.5, 1]);

  const touchStartY = useRef<number | null>(null);
  const pulling     = useRef(false);

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    const el = containerRef.current;
    if (!el) return;
    if (el.scrollTop > 0) return;
    touchStartY.current = e.touches[0].clientY;
    pulling.current = true;
  }, []);

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (!pulling.current || touchStartY.current === null) return;
      const delta = e.touches[0].clientY - touchStartY.current;
      if (delta <= 0) return;
      pullY.set(Math.min(delta * 0.55, PTR_MAX_DRAG));
    },
    [pullY],
  );

  const handleTouchEnd = useCallback(async () => {
    pulling.current = false;
    touchStartY.current = null;
    const currentPull = pullY.get();
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

  // ── Render: loading ───────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <div>
        {Array.from({ length: 5 }).map((_, i) => (
          <div
            key={i}
            className="px-4"
            style={{ borderBottom: i < 4 ? "1px solid var(--border-default)" : "none" }}
          >
            <TransactionSkeleton />
          </div>
        ))}
      </div>
    );
  }

  // ── Render: empty ─────────────────────────────────────────────────────────
  if (transactions.length === 0) {
    return <EmptyState message={emptyMessage} />;
  }

  const groups = groupByDate(transactions);

  // ── Render: list ──────────────────────────────────────────────────────────
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
        style={{ height: pullY, overflow: "hidden", pointerEvents: "none" }}
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
            layout
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            {/* ── Sticky date header ──────────────────────────────────────────
              position: sticky keeps the header visible as user scrolls through
              items in that date group.  Backdrop blur matches the app header.
            */}
            <motion.div
              className="px-4 pt-3 pb-1"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
              style={{
                position: "sticky",
                top: 0,
                zIndex: 20,
                backdropFilter: "blur(8px)",
                WebkitBackdropFilter: "blur(8px)",
                // --bg-global (#E5E2DD) at 88% opacity
                background: "rgba(229, 226, 221, 0.88)",
              }}
            >
              <span
                className="text-xs font-medium tracking-widest uppercase"
                style={{ color: "var(--text-secondary)" }}
              >
                {label}
              </span>
            </motion.div>

            {/* ── Items ─────────────────────────────────────────────────────── */}
            <div>
              <AnimatePresence>
                {items.map((tx, idx) => {
                  const isNew = tx.id === newId;
                  return (
                    <motion.div
                      key={tx.id}
                      layout
                      // New items drop from above; others slide in from left
                      initial={
                        isNew
                          ? { opacity: 0, y: -60 }
                          : { opacity: 0, x: -12 }
                      }
                      animate={{
                        opacity: 1,
                        y: 0,
                        x: 0,
                        transition: isNew
                          ? { type: "spring", stiffness: 300, damping: 20 }
                          : {
                              type: "spring",
                              stiffness: 340,
                              damping: 28,
                              delay: idx * 0.04,
                            },
                      }}
                      exit={{ opacity: 0, x: 20, transition: { duration: 0.18 } }}
                      style={{ position: "relative" }}
                    >
                      <TransactionItem
                        transaction={tx}
                        isLast={idx === items.length - 1}
                        onPress={() => onTransactionPress?.(tx.id)}
                        onDelete={() => onTransactionDelete?.(tx.id)}
                      />

                      {/* ── Golden shimmer border for newly added items ─────── */}
                      {/*
                        Fades from 0.85 → 0 over 0.6s after a 0.8s delay,
                        giving the user time to notice the entrance before it disappears.
                      */}
                      {isNew && (
                        <motion.div
                          initial={{ opacity: 0.85 }}
                          animate={{ opacity: 0 }}
                          transition={{ delay: 0.8, duration: 0.6 }}
                          style={{
                            position: "absolute",
                            inset: 0,
                            border: "1.5px solid var(--color-accent)",
                            pointerEvents: "none",
                            zIndex: 5,
                          }}
                          aria-hidden="true"
                        />
                      )}
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>
          </motion.div>
        ))}
      </AnimatePresence>
    </div>
  );
}

export default TransactionList;
