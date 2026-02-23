'use client';

// ============================================================
// KHARCHA — CalendarHeatmap
// Monthly calendar grid coloured by daily spending intensity.
// Rows: weeks (Mon–Sun). Tap a day to see that day's total.
// Animation: squares stagger in from top-left to bottom-right.
// ============================================================

import { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  getDaysInMonth,
  getDay,
  format,
  parse,
  isSameDay,
  parseISO,
  startOfMonth,
} from 'date-fns';
import type { DailySpending } from '@/hooks/useMonthlyAnalytics';

// ── Colour intensity thresholds ───────────────────────────────────────────────
//   0 spending  → bg-surface   (no heat)
//   light       → #EDD5CF      (faint terracotta)
//   medium      → #C49B8D      (muted terracotta)
//   heavy       → #A37B6F      (full terracotta)

function heatColor(amount: number, max: number): string {
  if (amount <= 0 || max === 0) return 'var(--bg-surface)';
  const ratio = Math.min(amount / max, 1);
  if (ratio < 0.25) return '#EDD5CF';
  if (ratio < 0.6) return '#C49B8D';
  return '#A37B6F';
}

// ── Helpers ───────────────────────────────────────────────────────────────────

const DAY_LABELS = ['M', 'T', 'W', 'T', 'F', 'S', 'S'];

function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(amount));
}

/** Map Monday=0 … Sunday=6 from JS's Sunday=0 … Saturday=6 */
function monFirst(jsDay: number) {
  return (jsDay + 6) % 7;
}

// ── Square variants ───────────────────────────────────────────────────────────

const squareVariants = {
  hidden: { opacity: 0, scale: 0.5 },
  visible: { opacity: 1, scale: 1 },
};

const containerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.012 } },
};

// ── Props ─────────────────────────────────────────────────────────────────────

export interface CalendarHeatmapProps {
  data: DailySpending[];
  monthYear: string; // "YYYY-MM"
}

// ── Component ─────────────────────────────────────────────────────────────────

export function CalendarHeatmap({ data, monthYear }: CalendarHeatmapProps) {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  // ── Build day → amount map ───────────────────────────────────
  const dayMap = useMemo(() => {
    const m = new Map<string, number>();
    data.forEach(({ date, amount }) => m.set(date, amount));
    return m;
  }, [data]);

  const maxAmount = useMemo(
    () => Math.max(0, ...data.map((d) => d.amount)),
    [data],
  );

  // ── Calendar grid construction ───────────────────────────────
  const monthDate = parse(monthYear, 'yyyy-MM', new Date());
  const totalDays = getDaysInMonth(monthDate);
  const firstDayOffset = monFirst(getDay(startOfMonth(monthDate))); // 0-6

  // Cells: null = empty padding cell, number = day-of-month (1-based)
  const cells: (number | null)[] = [
    ...Array(firstDayOffset).fill(null),
    ...Array.from({ length: totalDays }, (_, i) => i + 1),
  ];
  // Pad to complete the last row
  while (cells.length % 7 !== 0) cells.push(null);

  const today = new Date();
  const selectedAmount = selectedDate ? (dayMap.get(selectedDate) ?? 0) : null;

  return (
    <div>
      {/* ── Day-of-week header ─────────────────────────────── */}
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: 4,
          marginBottom: 4,
        }}
      >
        {DAY_LABELS.map((d, i) => (
          <div
            key={i}
            className="font-body"
            style={{
              fontSize: 11,
              color: 'var(--text-secondary)',
              textAlign: 'center',
              paddingBottom: 2,
            }}
          >
            {d}
          </div>
        ))}
      </div>

      {/* ── Calendar grid ─────────────────────────────────── */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="visible"
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(7, 1fr)',
          gap: 4,
        }}
      >
        {cells.map((day, i) => {
          if (day === null) {
            return <div key={`pad-${i}`} style={{ aspectRatio: '1' }} />;
          }

          const dateStr = `${monthYear}-${String(day).padStart(2, '0')}`;
          const amount = dayMap.get(dateStr) ?? 0;
          const isToday = isSameDay(parseISO(dateStr), today);
          const isSelected = selectedDate === dateStr;
          const bg = heatColor(amount, maxAmount);

          return (
            <motion.button
              key={dateStr}
              variants={squareVariants}
              transition={{ type: 'spring', stiffness: 380, damping: 28 }}
              onClick={() => setSelectedDate(isSelected ? null : dateStr)}
              style={{
                aspectRatio: '1',
                borderRadius: 6,
                background: bg,
                border: isSelected
                  ? '2px solid var(--color-accent)'
                  : isToday
                  ? '1.5px solid var(--color-expense)'
                  : '1px solid var(--border-default)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                minHeight: 36,
                position: 'relative',
              }}
              whileTap={{ scale: 0.88 }}
              aria-label={`${dateStr}: ${amount > 0 ? formatINR(amount) : 'no spending'}`}
            >
              <span
                className="font-mono"
                style={{
                  fontSize: 10,
                  color: amount > 0 ? '#FFFFFF' : 'var(--text-secondary)',
                  fontWeight: amount > 0 ? 600 : 400,
                  lineHeight: 1,
                }}
              >
                {day}
              </span>
            </motion.button>
          );
        })}
      </motion.div>

      {/* ── Selected day detail ────────────────────────────── */}
      <AnimatePresence>
        {selectedDate && (
          <motion.div
            key={selectedDate}
            initial={{ opacity: 0, height: 0, marginTop: 0 }}
            animate={{ opacity: 1, height: 'auto', marginTop: 10 }}
            exit={{ opacity: 0, height: 0, marginTop: 0 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            style={{ overflow: 'hidden' }}
          >
            <div
              style={{
                background: 'var(--bg-global)',
                border: '1px solid var(--border-default)',
                borderRadius: 10,
                padding: '10px 14px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
              }}
            >
              <span
                className="font-body"
                style={{ fontSize: 13, color: 'var(--text-secondary)' }}
              >
                {format(parseISO(selectedDate), 'EEE, d MMM')}
              </span>
              <span
                className="font-mono"
                style={{
                  fontSize: 15,
                  fontWeight: 700,
                  color: selectedAmount! > 0 ? 'var(--color-expense)' : 'var(--text-secondary)',
                }}
              >
                {selectedAmount! > 0 ? formatINR(selectedAmount!) : 'No spending'}
              </span>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Intensity legend ───────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          alignItems: 'center',
          gap: 6,
          marginTop: 12,
          justifyContent: 'flex-end',
        }}
      >
        <span
          className="font-body"
          style={{ fontSize: 11, color: 'var(--text-secondary)' }}
        >
          Less
        </span>
        {['var(--bg-surface)', '#EDD5CF', '#C49B8D', '#A37B6F'].map((c, i) => (
          <div
            key={i}
            style={{
              width: 14,
              height: 14,
              borderRadius: 3,
              background: c,
              border: '1px solid var(--border-default)',
            }}
          />
        ))}
        <span
          className="font-body"
          style={{ fontSize: 11, color: 'var(--text-secondary)' }}
        >
          More
        </span>
      </div>
    </div>
  );
}

export default CalendarHeatmap;
