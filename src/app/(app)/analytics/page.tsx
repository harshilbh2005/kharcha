'use client';

import { useState } from 'react';
import { format, addMonths, subMonths, parse } from 'date-fns';
import { ChevronLeft, ChevronRight, Info } from 'lucide-react';
import Header from '@/components/layout/Header';
import { useMonthlyAnalytics } from '@/hooks/useMonthlyAnalytics';

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

// ─── Month Navigator ─────────────────────────────────────────────────────────

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
    <div
      className="flex items-center justify-between"
      style={{ padding: '0 var(--space-4)', marginBottom: 'var(--space-4)' }}
    >
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
          color: isCurrentMonth ? 'var(--text-secondary)' : 'var(--text-secondary)',
          opacity: isCurrentMonth ? 0.35 : 1,
          minWidth: 44,
          minHeight: 44,
        }}
        aria-label="Next month"
      >
        <ChevronRight size={18} />
      </button>
    </div>
  );
}

// ─── Summary Cards ────────────────────────────────────────────────────────────

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

// ─── Category Row ─────────────────────────────────────────────────────────────

function CategoryRow({
  name,
  amount,
  percentage,
}: {
  name: string;
  amount: number;
  percentage: number;
}) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span
          className="font-body truncate"
          style={{ fontSize: 14, color: 'var(--text-primary)', maxWidth: '60%' }}
        >
          {name}
        </span>
        <div className="flex items-center gap-2">
          <span
            className="font-body"
            style={{ fontSize: 12, color: 'var(--text-secondary)' }}
          >
            {percentage.toFixed(0)}%
          </span>
          <span
            className="font-mono tabular-nums"
            style={{ fontSize: 14, color: 'var(--color-expense)' }}
          >
            {formatAmount(amount)}
          </span>
        </div>
      </div>
      {/* Progress bar */}
      <div
        className="w-full overflow-hidden"
        style={{ height: 4, borderRadius: 2, background: 'var(--border-default)' }}
      >
        <div
          style={{
            height: '100%',
            width: `${Math.min(percentage, 100)}%`,
            background: 'var(--color-expense)',
            borderRadius: 2,
            opacity: 0.65,
          }}
        />
      </div>
    </div>
  );
}

// ─── Skeleton ─────────────────────────────────────────────────────────────────

function AnalyticsSkeleton() {
  return (
    <div style={{ padding: 'var(--space-4)', display: 'flex', flexDirection: 'column', gap: 20 }}>
      {/* Summary row */}
      <div style={{ display: 'flex', gap: 12 }}>
        {[0, 1].map((i) => (
          <div
            key={i}
            className="flex-1"
            style={{
              height: 72,
              borderRadius: 12,
              background: 'var(--border-default)',
              opacity: 0.5,
            }}
          />
        ))}
      </div>
      {/* Category rows */}
      {[70, 50, 40, 30].map((w, i) => (
        <div key={i} style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between' }}>
            <div style={{ width: `${w}%`, height: 14, borderRadius: 4, background: 'var(--border-default)', opacity: 0.5 }} />
            <div style={{ width: 60, height: 14, borderRadius: 4, background: 'var(--border-default)', opacity: 0.5 }} />
          </div>
          <div style={{ height: 4, borderRadius: 2, background: 'var(--border-default)', opacity: 0.4 }} />
        </div>
      ))}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AnalyticsPage() {
  const [monthYear, setMonthYear] = useState(() => toMonthYear(new Date()));
  const { data, isLoading, error } = useMonthlyAnalytics(monthYear);

  const monthLabel = format(parseMonthYear(monthYear), 'MMMM');

  return (
    <>
      <Header title="Analytics" />

      <div style={{ paddingBottom: 96 }}>
        {/* ── Month navigator ─────────────────────────────────── */}
        <div style={{ padding: 'var(--space-4) var(--space-4) 0' }}>
          <MonthNavigator monthYear={monthYear} onChange={setMonthYear} />
        </div>

        {isLoading ? (
          <AnalyticsSkeleton />
        ) : error ? (
          <div
            style={{ padding: 'var(--space-8)', textAlign: 'center', color: 'var(--text-secondary)' }}
          >
            <p style={{ fontSize: 14 }}>Could not load analytics. Unlock the app first.</p>
          </div>
        ) : data ? (
          <div style={{ padding: '0 var(--space-4)', display: 'flex', flexDirection: 'column', gap: 20 }}>
            {/* ── Summary: received + spent ────────────────────── */}
            <div style={{ display: 'flex', gap: 12 }}>
              <SummaryCard
                label={`Total received in ${monthLabel}`}
                amount={data.totalReceived}
                color="var(--color-income)"
              />
              <SummaryCard
                label={`Total spent in ${monthLabel}`}
                amount={data.totalSpent}
                color="var(--color-expense)"
              />
            </div>

            {/* ── Category breakdown ───────────────────────────── */}
            {data.categoryBreakdown.length > 0 ? (
              <div
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 12,
                  padding: '16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 16,
                }}
              >
                <h3
                  className="font-body"
                  style={{ fontSize: 13, color: 'var(--text-secondary)', margin: 0, letterSpacing: '0.04em', textTransform: 'uppercase' }}
                >
                  Spending breakdown
                </h3>
                {data.categoryBreakdown.map((cat) => (
                  <CategoryRow
                    key={cat.name}
                    name={cat.name}
                    amount={cat.amount}
                    percentage={cat.percentage}
                  />
                ))}
              </div>
            ) : data.totalSpent === 0 ? (
              <div
                style={{
                  background: 'var(--bg-surface)',
                  border: '1px solid var(--border-default)',
                  borderRadius: 12,
                  padding: '24px 16px',
                  textAlign: 'center',
                }}
              >
                <p style={{ fontSize: 14, color: 'var(--text-secondary)', margin: 0 }}>
                  No expenses recorded in {monthLabel}.
                </p>
              </div>
            ) : null}

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
                <Info
                  size={15}
                  color="var(--color-accent)"
                  style={{ flexShrink: 0, marginTop: 2 }}
                />
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
