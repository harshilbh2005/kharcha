'use client';

// ============================================================
// KHARCHA — CategoryPieChart
// Animated donut pie chart showing category spending breakdown.
// • Scroll reveal: pie grows from centre only once in viewport.
// • activeShape: tapped segment pops outward (+10px radius).
// • Detail card fades in below with name, %, amount.
// ============================================================

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  PieChart,
  Pie,
  Cell,
  Sector,
  ResponsiveContainer,
  Tooltip,
  type TooltipContentProps,
  type PieLabelRenderProps,
} from 'recharts';
import { useScrollReveal } from '@/hooks/useScrollReveal';
import type { CategoryBreakdown } from '@/hooks/useMonthlyAnalytics';

// ── Chart colors (design-system hex values — CSS vars don't work in SVG fills) ─
const CHART_COLORS = [
  '#A37B6F', // Terracotta  (--color-expense)
  '#6B7D71', // Sage        (--color-income)
  '#8B7355', // Bronze      (--color-accent)
  '#5C6B5E', // Forest      (--color-vault)
  '#8BA090', // Muted Sage
  '#C49B8D', // Muted Terracotta
  '#A6956E', // Muted Bronze
  '#7B8FA0', // Steel Blue
  '#9B8BAA', // Muted Purple
  '#AA9B8B', // Warm Taupe
] as const;

// ── Helpers ──────────────────────────────────────────────────────────────────

function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(amount));
}

// ── Active shape — segment pops outward by 10px on tap ───────────────────────

function renderActiveShape(props: unknown) {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const { cx, cy, innerRadius, outerRadius, startAngle, endAngle, fill } = props as any;
  return (
    <Sector
      cx={cx}
      cy={cy}
      innerRadius={innerRadius}
      outerRadius={outerRadius + 10}
      startAngle={startAngle}
      endAngle={endAngle}
      fill={fill}
    />
  );
}

// ── Custom label rendered outside each segment ──────────────────────────────

function PieLabel(props: PieLabelRenderProps) {
  const { cx = 0, cy = 0, midAngle = 0, outerRadius = 0, name, percent = 0 } = props;
  if (percent < 0.04) return null; // skip tiny slices

  const RADIAN = Math.PI / 180;
  const radius = outerRadius + 32;
  const x = cx + radius * Math.cos(-midAngle * RADIAN);
  const y = cy + radius * Math.sin(-midAngle * RADIAN);
  const anchor = x > cx ? 'start' : 'end';
  const nameStr = typeof name === 'string' ? name : String(name ?? '');
  const shortName = nameStr.length > 10 ? nameStr.slice(0, 9) + '…' : nameStr;

  return (
    <text
      x={x}
      y={y}
      textAnchor={anchor}
      dominantBaseline="central"
      fontSize={10}
      fontFamily="Inter, sans-serif"
    >
      <tspan x={x} dy="-7" fill="#6B707C">
        {shortName}
      </tspan>
      <tspan x={x} dy="14" fill="#2A2D34" fontWeight="700">
        {(percent * 100).toFixed(0)}%
      </tspan>
    </text>
  );
}

// ── Custom tooltip ────────────────────────────────────────────────────────────

function CustomTooltip({ active, payload }: TooltipContentProps<number, string>) {
  if (!active || !payload?.length) return null;
  const item = payload[0];
  return (
    <div
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        borderRadius: 8,
        padding: '8px 12px',
        fontFamily: 'Inter, sans-serif',
        fontSize: 13,
        color: 'var(--text-primary)',
        boxShadow: '0 2px 8px rgba(42,45,52,0.08)',
      }}
    >
      <div style={{ fontWeight: 600 }}>{item.name}</div>
      <div style={{ color: 'var(--color-expense)', fontFamily: 'IBM Plex Mono, monospace', marginTop: 2 }}>
        {formatINR(item.value as number)}
      </div>
    </div>
  );
}

// ── Props ─────────────────────────────────────────────────────────────────────

export interface CategoryPieChartProps {
  data: CategoryBreakdown[];
}

// ── Component ─────────────────────────────────────────────────────────────────

export function CategoryPieChart({ data }: CategoryPieChartProps) {
  // selectedIndex: which segment is tapped (null = none)
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);

  // Scroll-reveal: animation only fires once when chart enters viewport
  const { ref, isVisible } = useScrollReveal();

  if (data.length === 0) {
    return (
      <p
        className="font-body"
        style={{ fontSize: 14, color: 'var(--text-secondary)', textAlign: 'center', padding: '24px 0' }}
      >
        No spending data for this month.
      </p>
    );
  }

  const activeItem = selectedIndex !== null ? data[selectedIndex] : null;

  return (
    <div ref={ref as React.RefObject<HTMLDivElement>}>
      {/* ── Pie chart grows from center when visible ─────────── */}
      <motion.div
        initial={{ scale: 0.6, opacity: 0 }}
        animate={isVisible ? { scale: 1, opacity: 1 } : { scale: 0.6, opacity: 0 }}
        transition={{ type: 'spring', stiffness: 180, damping: 22, delay: 0.1 }}
      >
        <ResponsiveContainer width="100%" height={260}>
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={52}
              outerRadius={88}
              paddingAngle={2}
              dataKey="amount"
              nameKey="name"
              isAnimationActive={isVisible}
              animationBegin={0}
              animationDuration={700}
              animationEasing="ease-out"
              labelLine={false}
              label={PieLabel}
              // Recharts activeIndex + activeShape drive the pop-outward effect on tap.
              // eslint-disable-next-line @typescript-eslint/no-explicit-any
              {...({ activeIndex: selectedIndex ?? undefined, activeShape: renderActiveShape } as any)}
              onClick={(_, index) => {
                setSelectedIndex(selectedIndex === index ? null : index);
              }}
              style={{ cursor: 'pointer', outline: 'none' }}
            >
              {data.map((_, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={CHART_COLORS[index % CHART_COLORS.length]}
                  opacity={selectedIndex === null || selectedIndex === index ? 1 : 0.35}
                />
              ))}
            </Pie>
            <Tooltip content={CustomTooltip} />
          </PieChart>
        </ResponsiveContainer>
      </motion.div>

      {/* ── Detail card slides in below on segment tap ────────── */}
      <AnimatePresence mode="wait">
        {activeItem && selectedIndex !== null && (
          <motion.div
            key={selectedIndex}
            initial={{ opacity: 0, y: 10, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 6, scale: 0.97 }}
            transition={{ type: 'spring', stiffness: 340, damping: 28 }}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              background: 'var(--bg-global)',
              border: '1px solid var(--border-default)',
              borderRadius: 10,
              padding: '12px 14px',
              marginTop: 4,
            }}
          >
            {/* Color swatch */}
            <div
              style={{
                width: 10,
                height: 10,
                borderRadius: '50%',
                background: CHART_COLORS[selectedIndex % CHART_COLORS.length],
                flexShrink: 0,
              }}
            />
            {/* Category info */}
            <div style={{ flex: 1, minWidth: 0 }}>
              <p
                className="font-body"
                style={{
                  fontSize: 14,
                  color: 'var(--text-primary)',
                  fontWeight: 500,
                  margin: 0,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {activeItem.name}
              </p>
              <p
                className="font-body"
                style={{ fontSize: 12, color: 'var(--text-secondary)', margin: '2px 0 0' }}
              >
                {activeItem.percentage.toFixed(1)}% of total spending
                {activeItem.isSubscription ? ' · subscription' : ''}
              </p>
            </div>
            {/* Amount */}
            <span
              className="font-mono"
              style={{ fontSize: 15, fontWeight: 700, color: 'var(--color-expense)', flexShrink: 0 }}
            >
              {formatINR(activeItem.amount)}
            </span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Category legend ──────────────────────────────────── */}
      <div
        style={{
          display: 'flex',
          flexWrap: 'wrap',
          gap: '8px 16px',
          marginTop: activeItem ? 12 : 8,
        }}
      >
        {data.slice(0, 8).map((item, index) => (
          <button
            key={item.name}
            onClick={() => setSelectedIndex(selectedIndex === index ? null : index)}
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 6,
              background: 'none',
              border: 'none',
              padding: 0,
              cursor: 'pointer',
              minHeight: 28,
            }}
          >
            <div
              style={{
                width: 8,
                height: 8,
                borderRadius: '50%',
                background: CHART_COLORS[index % CHART_COLORS.length],
                opacity: selectedIndex === null || selectedIndex === index ? 1 : 0.4,
                flexShrink: 0,
              }}
            />
            <span
              className="font-body"
              style={{
                fontSize: 12,
                color: 'var(--text-secondary)',
                opacity: selectedIndex === null || selectedIndex === index ? 1 : 0.5,
              }}
            >
              {item.name.length > 12 ? item.name.slice(0, 11) + '…' : item.name}
            </span>
          </button>
        ))}
      </div>
    </div>
  );
}

export default CategoryPieChart;
