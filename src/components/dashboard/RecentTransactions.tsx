'use client';

import { useRouter } from 'next/navigation';
import { motion, AnimatePresence } from 'framer-motion';
import { ChevronRight } from 'lucide-react';
import { differenceInCalendarDays, format } from 'date-fns';
import Card from '@/components/ui/Card';
import { getIcon } from '@/lib/icon-map';
import type { TransactionDecrypted } from '@/types';

// ─── Props ────────────────────────────────────────────────────────────────────

export interface RecentTransactionsProps {
  /** Last 5 transactions (already decrypted and sorted by date desc) */
  transactions: TransactionDecrypted[];
  /** Callback when user taps a transaction row */
  onTransactionPress?: (transaction: TransactionDecrypted) => void;
  /** Stagger delay for card entrance animation */
  delay?: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatAmount(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 2,
  }).format(Math.abs(amount));
}

function formatRelativeDate(dateStr: string): string {
  const today = new Date();
  const date = new Date(dateStr + 'T00:00:00');
  const diffDays = differenceInCalendarDays(today, date);

  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays}d ago`;

  return format(date, 'd MMM');
}

// ─── Compact transaction row variants ─────────────────────────────────────────

const rowVariants = {
  hidden: { opacity: 0, y: 8 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { type: 'spring' as const, stiffness: 340, damping: 28 },
  },
};

// ─── Component ────────────────────────────────────────────────────────────────
//
// Shows the last 5 transactions in a compact format (smaller than the
// full TransactionItem) with a "View All →" footer link.
//
// Layout:
//   ┌──────────────────────────────────────────────┐
//   │  Recent Transactions                         │
//   │  ┌──┐ Zomato          ─₹350    Today        │
//   │  └──┘ Food & Dining                          │
//   │  ┌──┐ Amazon          ─₹1,200  Yesterday    │
//   │  └──┘ Shopping                               │
//   │  ...                                         │
//   │               View All →                     │
//   └──────────────────────────────────────────────┘

export function RecentTransactions({
  transactions,
  onTransactionPress,
  delay = 0,
}: RecentTransactionsProps) {
  const router = useRouter();
  const items = transactions.slice(0, 5);

  return (
    <Card animated delay={delay} className="!px-0">
      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div className="px-5 mb-2">
        <p
          className="font-body text-sm font-medium"
          style={{ color: 'var(--text-primary)' }}
        >
          Recent Transactions
        </p>
      </div>

      {/* ── Transaction rows ───────────────────────────────────────────────── */}
      {items.length === 0 ? (
        <div className="px-5 py-6 text-center">
          <p
            className="font-body text-sm"
            style={{ color: 'var(--text-tertiary)' }}
          >
            No transactions yet this month
          </p>
        </div>
      ) : (
        <AnimatePresence mode="popLayout">
          {items.map((txn, index) => (
            <CompactTransactionRow
              key={txn.id}
              transaction={txn}
              isLast={index === items.length - 1}
              onPress={() => onTransactionPress?.(txn)}
              index={index}
              parentDelay={delay}
            />
          ))}
        </AnimatePresence>
      )}

      {/* ── View All footer ────────────────────────────────────────────────── */}
      {items.length > 0 && (
        <motion.button
          onClick={() => router.push('/transactions')}
          className="w-full flex items-center justify-center gap-1 pt-3 pb-1 px-5 cursor-pointer select-none"
          style={{
            background: 'none',
            border: 'none',
            color: 'var(--color-accent)',
          }}
          whileTap={{ scale: 0.97 }}
        >
          <span className="font-body text-sm font-medium">View All</span>
          <ChevronRight size={14} />
        </motion.button>
      )}
    </Card>
  );
}

// ─── Compact row (smaller than full TransactionItem) ──────────────────────────

interface CompactTransactionRowProps {
  transaction: TransactionDecrypted;
  isLast: boolean;
  onPress: () => void;
  index: number;
  parentDelay: number;
}

function CompactTransactionRow({
  transaction,
  isLast,
  onPress,
  index,
  parentDelay,
}: CompactTransactionRowProps) {
  const Icon = getIcon(transaction.category_name ?? 'MoreHorizontal');
  const categoryColor = '#8B7355'; // --color-accent

  const isIncome = transaction.amount > 0;
  const amountColor = isIncome ? 'var(--color-income)' : 'var(--color-expense)';
  const sign = isIncome ? '+' : '−';
  const amountStr = `${sign}₹${formatAmount(transaction.amount)}`;
  const label = transaction.merchant || transaction.description;

  return (
    <motion.div
      variants={rowVariants}
      initial="hidden"
      animate="visible"
      transition={{ delay: parentDelay + 0.15 + index * 0.06 }}
      onClick={onPress}
      className="flex items-center gap-2.5 cursor-pointer select-none"
      style={{
        paddingTop: 8,
        paddingBottom: 8,
        paddingLeft: 20,
        paddingRight: 20,
        borderBottom: isLast ? 'none' : '1px solid var(--border-default)',
      }}
    >
      {/* Category icon — compact (32px circle) */}
      <div
        className="flex-none flex items-center justify-center rounded-full"
        style={{
          width: 32,
          height: 32,
          backgroundColor: categoryColor + '1A', // 10% opacity
        }}
      >
        <Icon size={14} color={categoryColor} />
      </div>

      {/* Label + category */}
      <div className="flex-1 min-w-0">
        <p
          className="font-body text-sm truncate leading-snug"
          style={{ color: 'var(--text-primary)' }}
        >
          {label}
        </p>
        {transaction.category_name && (
          <p
            className="text-xs truncate leading-snug"
            style={{ color: 'var(--text-secondary)' }}
          >
            {transaction.category_name}
          </p>
        )}
      </div>

      {/* Amount + date */}
      <div className="flex-none flex flex-col items-end gap-0.5">
        <span
          className="font-mono text-xs font-medium tabular-nums"
          style={{ color: amountColor }}
        >
          {amountStr}
        </span>
        <span
          className="text-[10px] tabular-nums"
          style={{ color: 'var(--text-tertiary)' }}
        >
          {formatRelativeDate(transaction.date)}
        </span>
      </div>
    </motion.div>
  );
}

export default RecentTransactions;
