'use client';

// ============================================================
// KHARCHA — SpendingTrendLine
// Line chart showing monthly spend over the last 6 months.
// Recharts draws the line from left to right natively.
// Current month dot is enlarged + accented.
// ============================================================

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

// ── Custom dot (larger + filled for current month) ────────────────────────────

interface CustomDotProps extends DotProps {
  payload?: TrendMonth;
}

function CustomDot(props: CustomDotProps) {
  const { cx, cy, payload } = props;
  if (cx == null || cy == null) return null;

  if (payload?.isCurrentMonth) {
    return (
      <g>
        {/* Outer pulse ring */}
        <circle cx={cx} cy={cy} r={9} fill="#A37B6F" opacity={0.18} />
        {/* Inner filled dot */}
        <circle cx={cx} cy={cy} r={5} fill="#A37B6F" stroke="#F2F0ED" strokeWidth={2} />
      </g>
    );
  }
  return (
    <circle cx={cx} cy={cy} r={3} fill="#A37B6F" stroke="#F2F0ED" strokeWidth={1.5} />
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
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
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
            dot={<CustomDot />}
            activeDot={{ r: 6, fill: '#A37B6F', stroke: '#F2F0ED', strokeWidth: 2 }}
            isAnimationActive
            animationDuration={900}
            animationEasing="ease-in-out"
          />
          {/* Highlight vertical line for current month */}
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
