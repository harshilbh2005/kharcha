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
  // time is stored as "HH:MM:SS" or "HH:MM" — format without new Date()
  const [hours, minutes] = time.split(":").map(Number);
  const h = hours % 12 || 12;
  const m = String(minutes).padStart(2, "0");
  const ampm = hours < 12 ? "am" : "pm";
  return `${h}:${m} ${ampm}`;
}

// ─── Swipe-to-delete threshold (px) ──────────────────────────────────────────

const DELETE_THRESHOLD = -80;
const REVEAL_WIDTH = 72;

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

  // Delete button opacity/scale: appears as user swipes left past ~20px
  const deleteOpacity = useTransform(dragX, [-REVEAL_WIDTH, -20, 0], [1, 0.6, 0]);
  const deleteScale   = useTransform(dragX, [-REVEAL_WIDTH, -20, 0], [1, 0.85, 0.75]);

  const Icon = getIcon(transaction.category_name ?? "MoreHorizontal");

  // Use a muted hex if no category color available
  const categoryColor = "#8B7355"; // --color-accent default

  function handleDragEnd(_: unknown, info: PanInfo) {
    isDragging.current = false;
    if (info.offset.x < DELETE_THRESHOLD) {
      // Snap open to reveal delete button
      animate(dragX, -REVEAL_WIDTH, { type: "spring", stiffness: 400, damping: 30 });
    } else {
      // Spring back
      animate(dragX, 0, { type: "spring", stiffness: 400, damping: 30 });
    }
  }

  function handleDeleteTap() {
    // Snap closed then trigger crumple
    animate(dragX, 0, { duration: 0.15 }).then(() => setCrumpling(true));
  }

  function handleRowTap() {
    // If delete panel is open, close it instead of navigating
    if (dragX.get() < -10) {
      animate(dragX, 0, { type: "spring", stiffness: 400, damping: 30 });
      return;
    }
    onPress();
  }

  const isIncome  = transaction.amount > 0;
  const amountColor = isIncome ? "var(--color-income)" : "var(--color-expense)";
  const amountStr   = (isIncome ? "+" : "−") + formatAmount(Math.abs(transaction.amount));

  // Show "For Mon YYYY" badge when income covers a different month than received
  const showTargetBadge =
    isIncome &&
    transaction.target_month &&
    transaction.target_month !== txMonth(transaction.date);

  const label = transaction.merchant || transaction.description;

  return (
    <PaperCrumple trigger={crumpling} onRemoved={onDelete}>
      <div className="relative overflow-hidden">
        {/* ── Delete button revealed behind ── */}
        <motion.div
          className="absolute right-0 top-0 bottom-0 flex items-center justify-center"
          style={{ width: REVEAL_WIDTH, opacity: deleteOpacity, scale: deleteScale }}
          aria-hidden="true"
        >
          <button
            onClick={handleDeleteTap}
            className="flex items-center justify-center w-10 h-10 rounded-full"
            style={{ background: "var(--color-expense)", minWidth: 44, minHeight: 44 }}
            aria-label="Delete transaction"
          >
            <Trash2 size={18} color="#fff" />
          </button>
        </motion.div>

        {/* ── Draggable row ── */}
        <motion.div
          drag="x"
          dragConstraints={{ left: -REVEAL_WIDTH, right: 0 }}
          dragElastic={0.08}
          onDragStart={() => { isDragging.current = true; }}
          onDragEnd={handleDragEnd}
          onClick={handleRowTap}
          className="flex items-center gap-3 cursor-pointer select-none"
          style={{
            x: dragX,
            touchAction: "pan-y",
            paddingTop: 12,
            paddingBottom: 12,
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
              backgroundColor: categoryColor + "1A", // 10% opacity
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
            {transaction.time && (
              <span
                className="text-xs tabular-nums"
                style={{ color: "var(--text-secondary)" }}
              >
                {formatTime(transaction.time)}
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
