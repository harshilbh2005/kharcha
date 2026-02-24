'use client';

// ============================================================
// KHARCHA — SpendingTrendLine
// Line chart showing monthly spend over the last 6 months.
// • Scroll reveal: line draws itself only when in viewport.
// • animationDuration=1500 — deliberate left-to-right draw.
// • After line finishes: dots pop in via animated SVG r attr.
// ============================================================

import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  ReferenceDot,
  type DotProps,
  type TooltipContentProps,
} from 'recharts';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import type { TrendMonth } from '@/hooks/useSpendingTrend';

// ── Helpers ───────────────────────────────────────────────────────────────────

function shortINR(amount: number): string {
  if (amount >= 100_000) return `₹${(amount / 100_000).toFixed(1)}L`;
  if (amount >= 1_000) return `₹${(amount / 1_000).toFixed(1)}k`;
  return `₹${Math.round(amount)}`;
}

function fullINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(amount));
}

// ── Animated dot — pops in via SVG r attribute spring ─────────────────────────
//
// Uses motion.circle animating the SVG `r` attribute (not CSS transform) so
// it works without transform-origin issues in SVG coordinate space.
// Delay = index * 100ms — each dot appears sequentially after line draw.

interface AnimatedDotProps extends DotProps {
  payload?: TrendMonth;
  dotsVisible: boolean;
  /** Recharts passes index but it's not in DotProps typings */
  index?: number;
}

// Uses motion.g translated to (cx, cy) + scale 0→1 so transform-origin is always
// the dot centre — avoids SVG `r` attribute animation TypeScript issues.
function AnimatedDot(props: AnimatedDotProps) {
  const { cx, cy, payload, index = 0, dotsVisible } = props;
  if (cx == null || cy == null || !dotsVisible) return null;

  const delay = index * 0.1;

  if (payload?.isCurrentMonth) {
    return (
      <motion.g
        transform={`translate(${cx}, ${cy})`}
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ delay, duration: 0.45, ease: 'easeOut' as const }}
        style={{ transformOrigin: '0 0' }}
      >
        {/* Outer pulse ring */}
        <circle r={9} fill="#A37B6F" fillOpacity={0.18} />
        {/* Inner filled dot */}
        <circle r={5} fill="#A37B6F" stroke="#F2F0ED" strokeWidth={2} />
      </motion.g>
    );
  }

  return (
    <motion.g
      transform={`translate(${cx}, ${cy})`}
      initial={{ scale: 0 }}
      animate={{ scale: 1 }}
      transition={{ type: 'spring', stiffness: 420, damping: 22, delay }}
      style={{ transformOrigin: '0 0' }}
    >
      <circle r={3} fill="#A37B6F" stroke="#F2F0ED" strokeWidth={1.5} />
    </motion.g>
  );
}

// ── Custom tooltip ────────────────────────────────────────────────────────────

function CustomTooltip({ active, payload, label }: TooltipContentProps<number, string>) {
  if (!active || !payload?.length) return null;
  const amount = payload[0]?.value as number;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const isCurrentMonth = (payload[0]?.payload as any)?.isCurrentMonth as boolean | undefined;

  return (
    <div
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        borderRadius: 8,
        padding: '8px 12px',
        boxShadow: '0 2px 8px rgba(42,45,52,0.08)',
      }}
    >
      <p
        className="font-body"
        style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 2px' }}
      >
        {label}
        {isCurrentMonth && (
          <span style={{ marginLeft: 6, color: 'var(--color-accent)', fontWeight: 600 }}>
            ← now
          </span>
        )}
      </p>
      <p
        className="font-mono"
        style={{ fontSize: 15, color: 'var(--color-expense)', fontWeight: 700, margin: 0 }}
      >
        {fullINR(amount)}
      </p>
    </div>
  );
}

// ── Skeleton ──────────────────────────────────────────────────────────────────

function TrendSkeleton() {
  return (
    <div style={{ height: 180, display: 'flex', alignItems: 'flex-end', gap: 12, padding: '0 8px' }}>
      {[60, 80, 45, 90, 70, 100].map((h, i) => (
        <div
          key={i}
          style={{
            flex: 1,
            height: `${h}%`,
            borderRadius: 4,
            background: 'var(--border-default)',
            opacity: 0.4 + i * 0.06,
          }}
        />
      ))}
    </div>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────

export interface SpendingTrendLineProps {
  data: TrendMonth[];
  isLoading?: boolean;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function SpendingTrendLine({ data, isLoading }: SpendingTrendLineProps) {
  // After line finishes drawing (onAnimationEnd), dots pop in sequentially
  const [dotsVisible, setDotsVisible] = useState(false);

  // Scroll reveal — animation only starts when chart is in viewport
  const { ref, isVisible } = useScrollReveal();

  // Stable dot renderer closes over dotsVisible; recreated only when it changes.
  // `any` cast because Recharts DotType doesn't align with DotProps exactly.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const renderDot = useCallback(
    (props: any) => <AnimatedDot {...props} dotsVisible={dotsVisible} />,
    [dotsVisible],
  );

  if (isLoading) {
    return <TrendSkeleton />;
  }

  const allZero = data.every((d) => d.amount === 0);

  if (allZero) {
    return (
      <p
        className="font-body"
        style={{ fontSize: 14, color: 'var(--text-secondary)', textAlign: 'center', padding: '32px 0' }}
      >
        No spending history yet.
      </p>
    );
  }

  // Current-month data point for ReferenceDot
  const currentPoint = data.find((d) => d.isCurrentMonth);

  return (
    <motion.div
      ref={ref as React.RefObject<HTMLDivElement>}
      initial={{ opacity: 0, y: 12 }}
      animate={isVisible ? { opacity: 1, y: 0 } : { opacity: 0, y: 12 }}
      transition={{ type: 'spring', stiffness: 180, damping: 24, delay: 0.05 }}
    >
      <ResponsiveContainer width="100%" height={190}>
        <LineChart data={data} margin={{ top: 12, right: 16, bottom: 0, left: -8 }}>
          <CartesianGrid
            strokeDasharray="4 4"
            stroke="#D8D4CE"
            vertical={false}
          />
          <XAxis
            dataKey="label"
            tick={{ fontSize: 11, fontFamily: 'Inter, sans-serif', fill: '#6B707C' }}
            axisLine={false}
            tickLine={false}
            dy={6}
          />
          <YAxis
            tickFormatter={shortINR}
            tick={{ fontSize: 11, fontFamily: 'Inter, sans-serif', fill: '#6B707C' }}
            axisLine={false}
            tickLine={false}
            width={48}
          />
          <Tooltip content={CustomTooltip} />
          <Line
            type="monotone"
            dataKey="amount"
            stroke="#A37B6F"
            strokeWidth={2.5}
            dot={renderDot}
            activeDot={{ r: 6, fill: '#A37B6F', stroke: '#F2F0ED', strokeWidth: 2 }}
            isAnimationActive={isVisible}
            animationDuration={1500}
            animationEasing="ease-in-out"
            // Trigger dots pop-in after line finishes drawing
            onAnimationEnd={() => setDotsVisible(true)}
          />
          {/* Label for current month */}
          {currentPoint && (
            <ReferenceDot
              x={currentPoint.label}
              y={currentPoint.amount}
              r={0}
              label={{
                value: 'Today',
                position: 'top',
                fontSize: 10,
                fill: '#8B7355',
                fontFamily: 'Inter, sans-serif',
              }}
            />
          )}
        </LineChart>
      </ResponsiveContainer>
    </motion.div>
  );
}

export default SpendingTrendLine;
