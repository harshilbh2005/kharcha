'use client';

// ============================================================
// KHARCHA — MonthComparison
// Side-by-side grouped bar chart: current month vs last month.
// Each category gets two bars.  Bars grow from the bottom.
// ============================================================

import { motion } from 'framer-motion';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  type TooltipContentProps,
} from 'recharts';
import type { CategoryBreakdown } from '@/hooks/useMonthlyAnalytics';

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

// ── Custom tooltip ────────────────────────────────────────────────────────────

function CustomTooltip({
  active,
  payload,
  label,
}: TooltipContentProps<number, string>) {
  if (!active || !payload?.length) return null;

  return (
    <div
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        borderRadius: 8,
        padding: '8px 12px',
        boxShadow: '0 2px 8px rgba(42,45,52,0.08)',
        minWidth: 140,
      }}
    >
      <p
        className="font-body"
        style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '0 0 6px', fontWeight: 600 }}
      >
        {label}
      </p>
      {payload.map((entry: { name?: string; value?: number; color?: string }) => (
        <div
          key={entry.name}
          style={{ display: 'flex', justifyContent: 'space-between', gap: 16, marginTop: 2 }}
        >
          <span
            className="font-body"
            style={{ fontSize: 12, color: entry.color, display: 'flex', alignItems: 'center', gap: 4 }}
          >
            <span
              style={{
                display: 'inline-block',
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: entry.color,
              }}
            />
            {entry.name}
          </span>
          <span
            className="font-mono"
            style={{ fontSize: 12, color: 'var(--text-primary)', fontWeight: 600 }}
          >
            {fullINR(entry.value as number)}
          </span>
        </div>
      ))}
    </div>
  );
}

// ── Custom legend ─────────────────────────────────────────────────────────────

function CustomLegend({
  currentLabel,
  previousLabel,
}: {
  currentLabel: string;
  previousLabel: string;
}) {
  return (
    <div
      style={{
        display: 'flex',
        gap: 16,
        justifyContent: 'center',
        marginBottom: 4,
        fontFamily: 'Inter, sans-serif',
        fontSize: 12,
      }}
    >
      <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#6B707C' }}>
        <span
          style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 3, background: '#A37B6F' }}
        />
        {currentLabel}
      </span>
      <span style={{ display: 'flex', alignItems: 'center', gap: 6, color: '#6B707C' }}>
        <span
          style={{ display: 'inline-block', width: 12, height: 12, borderRadius: 3, background: '#D8D4CE' }}
        />
        {previousLabel}
      </span>
    </div>
  );
}

// ── Data merging helpers ──────────────────────────────────────────────────────

interface ChartRow {
  category: string;
  current: number;
  previous: number;
}

function buildChartData(
  current: CategoryBreakdown[],
  previous: CategoryBreakdown[],
  topN = 6,
): ChartRow[] {
  // Union of top-N categories by current month spend
  const topCats = current.slice(0, topN).map((c) => c.name);

  // Add any categories from previous that aren't in topCats
  previous.forEach((p) => {
    if (!topCats.includes(p.name) && topCats.length < topN + 2) {
      topCats.push(p.name);
    }
  });

  const prevMap = new Map(previous.map((p) => [p.name, p.amount]));
  const currMap = new Map(current.map((c) => [c.name, c.amount]));

  return topCats.map((cat) => ({
    category: cat.length > 10 ? cat.slice(0, 9) + '…' : cat,
    current: currMap.get(cat) ?? 0,
    previous: prevMap.get(cat) ?? 0,
  }));
}

// ── Props ─────────────────────────────────────────────────────────────────────

export interface MonthComparisonProps {
  current: CategoryBreakdown[];
  previous: CategoryBreakdown[];
  currentLabel: string;
  previousLabel: string;
}

// ── Component ─────────────────────────────────────────────────────────────────

export function MonthComparison({
  current,
  previous,
  currentLabel,
  previousLabel,
}: MonthComparisonProps) {
  const hasData = current.length > 0 || previous.length > 0;

  if (!hasData) {
    return (
      <p
        className="font-body"
        style={{ fontSize: 14, color: 'var(--text-secondary)', textAlign: 'center', padding: '24px 0' }}
      >
        No data to compare yet.
      </p>
    );
  }

  const chartData = buildChartData(current, previous);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ type: 'spring', stiffness: 180, damping: 24, delay: 0.05 }}
    >
      <CustomLegend currentLabel={currentLabel} previousLabel={previousLabel} />

      <ResponsiveContainer width="100%" height={200}>
        <BarChart
          data={chartData}
          margin={{ top: 4, right: 8, bottom: 0, left: -8 }}
          barGap={2}
          barCategoryGap="28%"
        >
          <CartesianGrid strokeDasharray="4 4" stroke="#D8D4CE" vertical={false} />
          <XAxis
            dataKey="category"
            tick={{ fontSize: 10, fontFamily: 'Inter, sans-serif', fill: '#6B707C' }}
            axisLine={false}
            tickLine={false}
            dy={4}
          />
          <YAxis
            tickFormatter={shortINR}
            tick={{ fontSize: 10, fontFamily: 'Inter, sans-serif', fill: '#6B707C' }}
            axisLine={false}
            tickLine={false}
            width={42}
          />
          <Tooltip content={CustomTooltip} />
          <Bar
            dataKey="current"
            name={currentLabel}
            fill="#A37B6F"
            radius={[3, 3, 0, 0]}
            isAnimationActive
            animationDuration={700}
            animationEasing="ease-out"
          />
          <Bar
            dataKey="previous"
            name={previousLabel}
            fill="#D8D4CE"
            radius={[3, 3, 0, 0]}
            isAnimationActive
            animationDuration={700}
            animationEasing="ease-out"
          />
          {/* Hidden legend — we render our own */}
          <Legend content={() => null} />
        </BarChart>
      </ResponsiveContainer>

      {/* ── Delta summary ─────────────────────────────────── */}
      {current.length > 0 && previous.length > 0 && (() => {
        const currTotal = current.reduce((s, c) => s + c.amount, 0);
        const prevTotal = previous.reduce((s, c) => s + c.amount, 0);
        const delta = currTotal - prevTotal;
        const pct = prevTotal > 0 ? Math.abs((delta / prevTotal) * 100).toFixed(0) : null;
        const improved = delta < 0;

        return (
          <p
            className="font-body"
            style={{
              fontSize: 12,
              color: improved ? 'var(--color-income)' : 'var(--color-expense)',
              marginTop: 10,
              marginBottom: 0,
              textAlign: 'center',
            }}
          >
            {improved ? '↓ ' : '↑ '}
            {pct ? `${pct}% ` : ''}
            {improved ? 'less' : 'more'} than {previousLabel}
            {pct ? '' : ' (no prior data)'}
          </p>
        );
      })()}
    </motion.div>
  );
}

export default MonthComparison;
