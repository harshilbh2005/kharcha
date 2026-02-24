"use client";

import { motion, useMotionValue, useTransform, animate, type PanInfo } from "framer-motion";
import { ArrowRightLeft, Calendar, RefreshCw, Trash2 } from "lucide-react";
import { useRef, useState } from "react";
import { format, parse } from "date-fns";
import { getIcon } from "@/lib/icon-map";
import { PaperCrumple } from "@/components/animations/PaperCrumple";
import type { TransactionDecrypted } from "@/types";

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatAmount(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(amount);
}

/** Format "YYYY-MM" → "Mon YYYY" (e.g. "2026-03" → "Mar 2026") */
function formatTargetMonth(ym: string): string {
  const d = parse(ym, "yyyy-MM", new Date());
  return format(d, "MMM yyyy");
}

/** Derive the "YYYY-MM" of the transaction's own date */
function txMonth(dateStr: string): string {
  return dateStr.slice(0, 7); // "2026-02-23" → "2026-02"
}

function formatTime(time: string | null): string {
  if (!time) return "";
  const [hours, minutes] = time.split(":").map(Number);
  const h = hours % 12 || 12;
  const m = String(minutes).padStart(2, "0");
  const ampm = hours < 12 ? "am" : "pm";
  return `${h}:${m} ${ampm}`;
}

/** Extract a display time from a Supabase ISO timestamp (uses local timezone) */
function formatCreatedAtTime(createdAt: string): string {
  try {
    const d = new Date(createdAt);
    const hours = d.getHours();
    const minutes = d.getMinutes();
    const h = hours % 12 || 12;
    const m = String(minutes).padStart(2, "0");
    const ampm = hours < 12 ? "am" : "pm";
    return `${h}:${m} ${ampm}`;
  } catch {
    return "";
  }
}

// ─── Swipe-to-delete config ───────────────────────────────────────────────────
//
// DELETE_THRESHOLD: gesture distance (px left) that triggers auto-delete on release.
// REVEAL_WIDTH:     visual width of the red zone at max drag.
// HAPTIC_THRESHOLD: 40% of DELETE_THRESHOLD — where icon reaches full size + vibrate.

const DELETE_THRESHOLD = -80;
const REVEAL_WIDTH     = 72;
const HAPTIC_THRESHOLD = DELETE_THRESHOLD * 0.4; // -32px

// ─── Item variants (used in parent AnimatePresence lists) ─────────────────────

export const listItemVariants = {
  hidden:  { opacity: 0, x: -12 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { type: "spring" as const, stiffness: 340, damping: 28 },
  },
  exit:    { opacity: 0, x: 20, transition: { duration: 0.2 } },
};

// ─── Props ────────────────────────────────────────────────────────────────────

export interface TransactionItemProps {
  transaction: TransactionDecrypted;
  onPress: () => void;
  onDelete: () => void;
  isLast?: boolean;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function TransactionItem({
  transaction,
  onPress,
  onDelete,
  isLast = false,
}: TransactionItemProps) {
  const [crumpling, setCrumpling] = useState(false);
  const dragX = useMotionValue(0);
  const isDragging = useRef(false);
  const hapticFiredRef = useRef(false);

  // ── Red zone grows from the right as user drags left ──────────────────────
  const redZoneWidth = useTransform(dragX, [0, -REVEAL_WIDTH], [0, REVEAL_WIDTH]);

  // ── Trash icon scales up as drag increases ────────────────────────────────
  // 0px drag → 0.5 scale · HAPTIC_THRESHOLD (-32px) → 1.0 · REVEAL_WIDTH (-72px) → 1.15
  const trashIconScale = useTransform(
    dragX,
    [0, HAPTIC_THRESHOLD, -REVEAL_WIDTH],
    [0.5, 1, 1.15],
  );

  const Icon = getIcon(transaction.category_name ?? "MoreHorizontal");
  const categoryColor = "#8B7355"; // --color-accent default

  // ── Haptic + icon feedback as user drags ──────────────────────────────────
  function handleDrag() {
    const x = dragX.get();
    // Fire once as user crosses the 40% haptic threshold
    if (!hapticFiredRef.current && x <= HAPTIC_THRESHOLD) {
      hapticFiredRef.current = true;
      navigator.vibrate?.(50);
    }
    // Reset if user drags back so it can fire again on re-entry
    if (x > HAPTIC_THRESHOLD) {
      hapticFiredRef.current = false;
    }
  }

  function handleDragEnd(_: unknown, info: PanInfo) {
    isDragging.current = false;
    hapticFiredRef.current = false;

    if (info.offset.x < DELETE_THRESHOLD) {
      // Past full threshold on release → auto-delete: crumple immediately.
      // dragX snaps back to 0 quickly so the red zone collapses as the crumple begins.
      animate(dragX, 0, { duration: 0.12 }).then(() => setCrumpling(true));
    } else {
      // Before threshold → spring back to closed state
      animate(dragX, 0, { type: "spring", stiffness: 400, damping: 30 });
    }
  }

  function handleRowTap() {
    // If the row is mid-swipe, close it instead of navigating
    if (dragX.get() < -10) {
      animate(dragX, 0, { type: "spring", stiffness: 400, damping: 30 });
      return;
    }
    onPress();
  }

  const isIncome    = transaction.amount > 0;
  const amountColor = isIncome ? "var(--color-income)" : "var(--color-expense)";
  const amountStr   = (isIncome ? "+" : "−") + formatAmount(Math.abs(transaction.amount));

  const displayTime = transaction.time
    ? formatTime(transaction.time)
    : formatCreatedAtTime(transaction.created_at);

  const showTargetBadge =
    isIncome &&
    transaction.target_month &&
    transaction.target_month !== txMonth(transaction.date);

  const label = transaction.merchant || transaction.description;

  return (
    <PaperCrumple trigger={crumpling} onRemoved={onDelete}>
      <div className="relative overflow-hidden">

        {/* ── Red zone — grows from right as user drags left ── */}
        {/*
          Width is tied to dragX via useTransform:
          0px drag → 0px wide · -REVEAL_WIDTH drag → REVEAL_WIDTH wide.
          The Trash2 icon inside scales up via trashIconScale.
        */}
        <motion.div
          className="absolute right-0 top-0 bottom-0 flex items-center justify-center"
          style={{
            width: redZoneWidth,
            background: "var(--color-danger)",
            overflow: "hidden",
          }}
          aria-hidden="true"
        >
          <motion.div style={{ scale: trashIconScale, originX: "50%", originY: "50%" }}>
            <Trash2 size={20} color="#fff" />
          </motion.div>
        </motion.div>

        {/* ── Draggable row ── */}
        <motion.div
          drag="x"
          dragConstraints={{ left: -REVEAL_WIDTH, right: 0 }}
          dragElastic={0.1}
          onDragStart={() => { isDragging.current = true; }}
          onDrag={handleDrag}
          onDragEnd={handleDragEnd}
          onClick={handleRowTap}
          className="flex items-center gap-3 cursor-pointer select-none"
          style={{
            x: dragX,
            touchAction: "pan-y",
            paddingTop: 14,
            paddingBottom: 14,
            paddingLeft: 16,
            paddingRight: 16,
            backgroundColor: "var(--bg-surface)",
            borderBottom: isLast ? "none" : "1px solid var(--border-default)",
          }}
        >
          {/* Category icon */}
          <div
            className="flex-none flex items-center justify-center rounded-full"
            style={{
              width: 40,
              height: 40,
              backgroundColor: categoryColor + "1A",
            }}
          >
            <Icon size={18} color={categoryColor} />
          </div>

          {/* Middle: name + category */}
          <div className="flex-1 min-w-0">
            <p
              className="font-medium truncate leading-snug"
              style={{ color: "var(--text-primary)", fontSize: 15 }}
            >
              {label}
            </p>
            <p
              className="text-sm truncate leading-snug"
              style={{ color: "var(--text-secondary)" }}
            >
              {[transaction.category_name, transaction.subcategory]
                .filter(Boolean)
                .join(" · ")}
            </p>
          </div>

          {/* Right: amount + time + badges */}
          <div className="flex-none flex flex-col items-end gap-0.5">
            <div className="flex items-center gap-1">
              {transaction.is_pass_through && (
                <span
                  className="inline-flex items-center justify-center rounded"
                  style={{ width: 16, height: 16, background: "var(--color-accent)" + "20" }}
                  title="Pass-through"
                >
                  <ArrowRightLeft size={10} color="var(--color-accent)" />
                </span>
              )}
              {transaction.is_subscription && (
                <span
                  className="inline-flex items-center justify-center rounded"
                  style={{ width: 16, height: 16, background: "var(--color-vault)" + "20" }}
                  title="Subscription"
                >
                  <RefreshCw size={10} color="var(--color-vault)" />
                </span>
              )}
              <span
                className="font-mono text-sm font-medium tabular-nums"
                style={{ color: amountColor }}
              >
                {amountStr}
              </span>
            </div>
            {displayTime && (
              <span
                className="text-xs tabular-nums"
                style={{ color: "var(--text-secondary)" }}
              >
                {displayTime}
              </span>
            )}
            {showTargetBadge && (
              <span
                className="inline-flex items-center gap-0.5 text-xs px-1.5 py-0.5 rounded-full"
                style={{
                  background: "var(--color-accent)" + "15",
                  color: "var(--color-accent)",
                  fontSize: 10,
                  lineHeight: 1,
                }}
              >
                <Calendar size={9} />
                For {formatTargetMonth(transaction.target_month!)}
              </span>
            )}
          </div>
        </motion.div>
      </div>
    </PaperCrumple>
  );
}

export default TransactionItem;
