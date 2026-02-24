'use client';

// ============================================================
// KHARCHA — CalendarHeatmap
// Monthly calendar grid coloured by daily spending intensity.
// Rows: weeks (Mon–Sun). Tap a day to see that day's total.
// Animation: rows reveal sequentially (120ms stagger), cells
// within each row appear together.
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
//   light       → #EDD0CB      (faint cognac)
//   medium      → #C4725E      (muted cognac)
//   heavy       → #963A2A      (full cognac red)

function heatColor(amount: number, max: number): string {
  if (amount <= 0 || max === 0) return 'var(--bg-surface)';
  const ratio = Math.min(amount / max, 1);
  if (ratio < 0.25) return '#EDD0CB';
  if (ratio < 0.6) return '#C4725E';
  return '#963A2A';
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

// ── Row-level variants ────────────────────────────────────────────────────────
//
// Container staggers rows at 120ms each.
// Each row slides up 8px + fades in over 300ms.
// Cells within a row have no individual variants — they all appear together.

const rowContainerVariants = {
  hidden: {},
  visible: { transition: { staggerChildren: 0.12 } },
};

const rowVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.3, ease: 'easeOut' as const },
  },
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

  // Group into rows of 7 for row-by-row animation
  const rows: (number | null)[][] = [];
  for (let i = 0; i < cells.length; i += 7) {
    rows.push(cells.slice(i, i + 7));
  }

  const today = new Date();
  const selectedAmount = selectedDate ? (dayMap.get(selectedDate) ?? 0) : null;

  return (
    <div>
      {/* ── Day-of-week header ─────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          gap: 4,
          marginBottom: 4,
        }}
      >
        {DAY_LABELS.map((d, i) => (
          <div
            key={i}
            className="font-body"
            style={{
              flex: 1,
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

      {/* ── Calendar grid — row-by-row reveal ──────────────── */}
      {/*
        key={monthYear}: changing month resets the animation so rows re-stagger in.
      */}
      <motion.div
        key={monthYear}
        variants={rowContainerVariants}
        initial="hidden"
        animate="visible"
        style={{ display: 'flex', flexDirection: 'column', gap: 4 }}
      >
        {rows.map((row, rowIndex) => (
          <motion.div
            key={rowIndex}
            variants={rowVariants}
            style={{ display: 'flex', gap: 4 }}
          >
            {row.map((day, colIndex) => {
              if (day === null) {
                return (
                  <div
                    key={`pad-${rowIndex}-${colIndex}`}
                    style={{ flex: 1, aspectRatio: '1' }}
                  />
                );
              }

              const dateStr = `${monthYear}-${String(day).padStart(2, '0')}`;
              const amount = dayMap.get(dateStr) ?? 0;
              const isToday = isSameDay(parseISO(dateStr), today);
              const isSelected = selectedDate === dateStr;
              const bg = heatColor(amount, maxAmount);

              return (
                <motion.button
                  key={dateStr}
                  onClick={() => setSelectedDate(isSelected ? null : dateStr)}
                  style={{
                    flex: 1,
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
        ))}
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
        {['var(--bg-surface)', '#EDD0CB', '#C4725E', '#963A2A'].map((c, i) => (
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
