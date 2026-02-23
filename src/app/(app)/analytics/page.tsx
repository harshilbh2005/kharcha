'use client';

// ============================================================
// KHARCHA — Analytics Page (Phase 8)
// Month-navigable analytics dashboard with 6 chart components:
//   1. CategoryPieChart    — spending breakdown donut
//   2. NeedsVsWants        — horizontal stacked bar
//   3. SpendingTrendLine   — 6-month line chart
//   4. CalendarHeatmap     — daily spending calendar
//   5. MonthComparison     — this vs last month bars
//   6. AISummary           — Claude-generated insights
// ============================================================

import { useState } from 'react';
import { format, addMonths, subMonths, parse } from 'date-fns';
import { ChevronLeft, ChevronRight, Info } from 'lucide-react';
import Header from '@/components/layout/Header';
import { useMonthlyAnalytics } from '@/hooks/useMonthlyAnalytics';
import { useSpendingTrend } from '@/hooks/useSpendingTrend';
import { CategoryPieChart } from '@/components/analytics/CategoryPieChart';
import { SpendingTrendLine } from '@/components/analytics/SpendingTrendLine';
import { CalendarHeatmap } from '@/components/analytics/CalendarHeatmap';
import { NeedsVsWants } from '@/components/analytics/NeedsVsWants';
import { MonthComparison } from '@/components/analytics/MonthComparison';
import { AISummary } from '@/components/analytics/AISummary';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatAmount(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(Math.round(amount));
}

function toMonthYear(date: Date): string {
  return format(date, 'yyyy-MM');
}

function parseMonthYear(ym: string): Date {
  return parse(ym, 'yyyy-MM', new Date());
}

function prevMonthYear(ym: string): string {
  return toMonthYear(subMonths(parseMonthYear(ym), 1));
}

// ─── Section wrapper ──────────────────────────────────────────────────────────

function Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        borderRadius: 12,
        padding: '16px',
      }}
    >
      <h3
        className="font-body"
        style={{
          fontSize: 12,
          color: 'var(--text-secondary)',
          margin: '0 0 14px',
          letterSpacing: '0.05em',
          textTransform: 'uppercase',
          fontWeight: 600,
        }}
      >
        {title}
      </h3>
      {children}
    </div>
  );
}

// ─── Summary Card ─────────────────────────────────────────────────────────────

function SummaryCard({
  label,
  amount,
  color,
}: {
  label: string;
  amount: number;
  color: string;
}) {
  return (
    <div
      className="flex-1 flex flex-col gap-1"
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid var(--border-default)',
        borderRadius: 12,
        padding: '14px 16px',
      }}
    >
      <span
        className="font-body"
        style={{ fontSize: 12, color: 'var(--text-secondary)', letterSpacing: '0.03em' }}
      >
        {label}
      </span>
      <span
        className="font-mono font-semibold tabular-nums"
        style={{ fontSize: '1.25rem', color }}
      >
        {formatAmount(amount)}
      </span>
    </div>
  );
}

// ─── Month Navigator ──────────────────────────────────────────────────────────

function MonthNavigator({
  monthYear,
  onChange,
}: {
  monthYear: string;
  onChange: (ym: string) => void;
}) {
  const current = parseMonthYear(monthYear);
  const now = new Date();
  const isCurrentMonth = toMonthYear(current) === toMonthYear(now);

  return (
    <div className="flex items-center justify-between" style={{ marginBottom: 'var(--space-4)' }}>
      <button
        onClick={() => onChange(toMonthYear(subMonths(current, 1)))}
        className="flex items-center justify-center rounded-full"
        style={{
          width: 36,
          height: 36,
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-default)',
          color: 'var(--text-secondary)',
          minWidth: 44,
          minHeight: 44,
          cursor: 'pointer',
        }}
        aria-label="Previous month"
      >
        <ChevronLeft size={18} />
      </button>

      <h2
        className="font-display text-center"
        style={{ fontSize: '1.25rem', color: 'var(--text-primary)', margin: 0 }}
      >
        {format(current, 'MMMM yyyy')}
      </h2>

      <button
        onClick={() => onChange(toMonthYear(addMonths(current, 1)))}
        disabled={isCurrentMonth}
        className="flex items-center justify-center rounded-full"
        style={{
          width: 36,
          height: 36,
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-default)',
          color: 'var(--text-secondary)',
          opacity: isCurrentMonth ? 0.35 : 1,
          minWidth: 44,
          minHeight: 44,
          cursor: isCurrentMonth ? 'not-allowed' : 'pointer',
        }}
        aria-label="Next month"
      >
        <ChevronRight size={18} />
      </button>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function AnalyticsSkeleton() {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      <div style={{ display: 'flex', gap: 12 }}>
        {[0, 1].map((i) => (
          <div
            key={i}
            className="flex-1"
            style={{ height: 72, borderRadius: 12, background: 'var(--border-default)', opacity: 0.5 }}
          />
        ))}
      </div>
      {[280, 120, 190, 200, 200, 100].map((h, i) => (
        <div
          key={i}
          style={{
            height: h,
            borderRadius: 12,
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-default)',
            opacity: 0.6,
          }}
        />
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [monthYear, setMonthYear] = useState(() => toMonthYear(new Date()));

  const prevMY = prevMonthYear(monthYear);
  const monthLabel = format(parseMonthYear(monthYear), 'MMMM');
  const prevLabel = format(parseMonthYear(prevMY), 'MMM yyyy');

  const { data, isLoading, error } = useMonthlyAnalytics(monthYear);
  const { data: prevData } = useMonthlyAnalytics(prevMY);
  const { data: trendData, isLoading: trendLoading } = useSpendingTrend(monthYear);

  // vs-last-month delta for AISummary
  const vsLastMonth =
    data && prevData
      ? {
          expensesDelta: prevData.totalSpent - data.totalSpent, // positive = spent less
          savingsDelta:
            data.totalReceived - data.totalSpent - (prevData.totalReceived - prevData.totalSpent),
        }
      : null;

  return (
    <>
      <Header title="Analytics" />

      <div style={{ paddingBottom: 96 }}>
        {/* ── Month navigator ───────────────────────────────── */}
        <div style={{ padding: 'var(--space-4) var(--space-4) 0' }}>
          <MonthNavigator monthYear={monthYear} onChange={setMonthYear} />
        </div>

        {isLoading ? (
          <div style={{ padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 16 }}>
            <AnalyticsSkeleton />
          </div>
        ) : error ? (
          <div style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--text-secondary)' }}>
            <p style={{ fontSize: 14 }}>Could not load analytics. Unlock the app first.</p>
          </div>
        ) : data ? (
          <div style={{ padding: '0 var(--space-4)', display: 'flex', flexDirection: 'column', gap: 16 }}>

            {/* ── Summary: received + spent ───────────────────── */}
            <div style={{ display: 'flex', gap: 12 }}>
              <SummaryCard
                label={`Received in ${monthLabel}`}
                amount={data.totalReceived}
                color="var(--color-income)"
              />
              <SummaryCard
                label={`Spent in ${monthLabel}`}
                amount={data.totalSpent}
                color="var(--color-expense)"
              />
            </div>

            {/* ── 1. Category Pie Chart ────────────────────────── */}
            {data.categoryBreakdown.length > 0 && (
              <Section title="Spending Breakdown">
                <CategoryPieChart data={data.categoryBreakdown} />
              </Section>
            )}

            {/* ── 2. Needs vs Wants ────────────────────────────── */}
            {data.totalSpent > 0 && (
              <Section title="Needs vs Wants">
                <NeedsVsWants
                  needs={data.needsTotal}
                  wants={data.wantsTotal}
                />
              </Section>
            )}

            {/* ── 3. 6-Month Trend ─────────────────────────────── */}
            <Section title="6-Month Spending Trend">
              <SpendingTrendLine
                data={trendData ?? []}
                isLoading={trendLoading}
              />
            </Section>

            {/* ── 4. Calendar Heatmap ──────────────────────────── */}
            <Section title="Daily Spending">
              <CalendarHeatmap
                data={data.dailyBreakdown}
                monthYear={monthYear}
              />
            </Section>

            {/* ── 5. Month Comparison ──────────────────────────── */}
            <Section title={`${monthLabel} vs ${prevLabel}`}>
              <MonthComparison
                current={data.categoryBreakdown}
                previous={prevData?.categoryBreakdown ?? []}
                currentLabel={monthLabel}
                previousLabel={prevLabel}
              />
            </Section>

            {/* ── 6. AI Summary ────────────────────────────────── */}
            <Section title="AI Insights">
              <AISummary
                monthYear={monthYear}
                totalIncome={data.totalReceived}
                totalExpenses={data.totalSpent}
                subscriptionTotal={data.subscriptionTotal}
                needsTotal={data.needsTotal}
                wantsTotal={data.wantsTotal}
                categoryBreakdown={data.categoryBreakdown}
                vsLastMonth={vsLastMonth}
              />
            </Section>

            {/* ── Cross-month income footnote ──────────────────── */}
            {data.crossMonthIncome.length > 0 && (
              <div
                style={{
                  background: 'var(--color-accent)' + '0D',
                  border: '1px solid ' + 'var(--color-accent)' + '30',
                  borderRadius: 10,
                  padding: '12px 14px',
                  display: 'flex',
                  gap: 10,
                  alignItems: 'flex-start',
                }}
              >
                <Info size={15} color="var(--color-accent)" style={{ flexShrink: 0, marginTop: 2 }} />
                <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
                  {data.crossMonthIncome.map((entry, i) => {
                    const targetLabel = format(parseMonthYear(entry.targetMonth), 'MMM yyyy');
                    return (
                      <p
                        key={i}
                        className="font-body"
                        style={{ fontSize: 13, color: 'var(--color-accent)', margin: 0, lineHeight: 1.5 }}
                      >
                        * {formatAmount(entry.amount)} received this month is allocated for{' '}
                        <strong>{targetLabel}</strong>&apos;s budget.
                      </p>
                    );
                  })}
                </div>
              </div>
            )}

          </div>
        ) : null}
      </div>
    </>
  );
}
