"use client";

// ============================================================
// KHARCHA — Transactions Page (Phase 3)
//
// Layout:
//   • Header: "Transactions" + Search + Filter toggle icons
//   • Action row: Smart Paste pill + filter active indicator
//   • Collapsible search bar (AnimatePresence)
//   • Collapsible FilterBar (AnimatePresence)
//   • TransactionList (full scroll)
//   • Fixed "Log Income" button above bottom nav
//
// Modals owned here (separate from BottomNavWrapper's global one):
//   • SmartPasteInput  → on EditFirst: opens AddExpenseModal w/ prefill
//   • AddExpenseModal  → prefill-only instance (SmartPaste → Edit First flow)
//   • AddIncomeModal   → Log Income button
//
// Encryption: amounts fetched as encrypted strings, decrypted
//   client-side via useEncryption().decryptMany().
// ============================================================

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  SlidersHorizontal,
  ClipboardList,
  ArrowDown,
  X,
} from "lucide-react";
import { format } from "date-fns";

import Header from "@/components/layout/Header";
import { FilterBar, type TxTypeFilter } from "@/components/transactions/FilterBar";
import { TransactionList } from "@/components/transactions/TransactionList";
import { SmartPasteInput } from "@/components/transactions/SmartPasteInput";
import AddExpenseModal, {
  type AddExpenseModalPrefill,
} from "@/components/transactions/AddExpenseModal";
import AddIncomeModal from "@/components/transactions/AddIncomeModal";
import { useTransactions, useDeleteTransaction } from "@/hooks/useTransactions";
import { useIncome, useDeleteIncome } from "@/hooks/useIncome";
import { useEncryption } from "@/hooks/useEncryption";
import type { TransactionDecrypted, Transaction, IncomeEntry, IncomeType } from "@/types";
import type { TransactionFilters } from "@/app/actions/transactions";

// ─── Helpers ──────────────────────────────────────────────────────────────────

function todayMonth(): string {
  return format(new Date(), "yyyy-MM");
}

const INCOME_TYPE_LABELS: Record<IncomeType, string> = {
  allowance: "Allowance",
  emergency_fund: "Emergency Fund",
  festival_bonus: "Festival Bonus",
  pass_through: "Pass-through",
  vault_replenish: "Vault Replenish",
  other: "Other Income",
};

function mapIncomeToDecrypted(
  entry: IncomeEntry,
  amount: number,
): TransactionDecrypted {
  const label = INCOME_TYPE_LABELS[entry.type] ?? "Income";
  return {
    id: entry.id,
    profile_id: entry.profile_id,
    currency: entry.currency,
    category_id: null,
    category_name: label,
    subcategory: null,
    description: entry.description || label,
    merchant: null,
    is_pass_through: entry.type === "pass_through",
    linked_income_id: null,
    is_subscription: false,
    subscription_id: null,
    is_need: true,
    source: entry.source,
    raw_sms: entry.raw_sms,
    ai_categorized: false,
    ai_confidence: null,
    date: entry.date,
    time: null,
    month_year: entry.month_year,
    created_at: entry.created_at,
    updated_at: entry.updated_at,
    amount, // positive → displayed as income (sage green)
  };
}

function buildFilters(
  month: string,
  categoryId: string | null,
  txType: TxTypeFilter,
  search: string,
): TransactionFilters {
  return {
    month,
    ...(categoryId ? { category_id: categoryId } : {}),
    ...(txType !== "all" ? { type: txType } : {}),
    ...(search ? { search } : {}),
  };
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function TransactionsPage() {
  // ── Filter state ──────────────────────────────────────────────────────────
  const [month, setMonth] = useState(todayMonth);
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [txType, setTxType] = useState<TxTypeFilter>("all");

  // ── UI state ──────────────────────────────────────────────────────────────
  const [showFilters, setShowFilters] = useState(false);
  const [showSearch, setShowSearch] = useState(false);
  const [searchText, setSearchText] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const searchInputRef = useRef<HTMLInputElement>(null);

  // ── Modal state ───────────────────────────────────────────────────────────
  const [smartPasteOpen, setSmartPasteOpen] = useState(false);
  const [addIncomeOpen, setAddIncomeOpen] = useState(false);
  const [addExpenseOpen, setAddExpenseOpen] = useState(false);
  const [addExpensePrefill, setAddExpensePrefill] =
    useState<AddExpenseModalPrefill>({});
  // InkSpread origin for AddExpenseModal — set to center-bottom when opened
  // from the SmartPaste "Edit First" flow (no physical FAB to reference)
  const [addExpenseOrigin, setAddExpenseOrigin] = useState({ x: 0, y: 0 });

  // ── Data hooks ────────────────────────────────────────────────────────────
  const { decryptMany, isUnlocked } = useEncryption();
  const filters = buildFilters(month, categoryId, txType, debouncedSearch);
  const { data: rawTransactions, isLoading: txLoading, refetch: refetchTx } = useTransactions(filters);
  const { data: rawIncome, isLoading: incomeLoading, refetch: refetchIncome } = useIncome({ month });
  const { mutate: deleteTransaction } = useDeleteTransaction();
  const { mutate: deleteIncomeMutation } = useDeleteIncome();

  // Track which IDs are income entries (for delete routing)
  const incomeIdsRef = useRef(new Set<string>());

  // Whether to include income in the merged list
  const showIncome = txType === "all" || txType === "income";
  const showExpenses = txType !== "income";

  // ── Decrypted transactions ────────────────────────────────────────────────
  const [decryptedTransactions, setDecryptedTransactions] = useState<
    TransactionDecrypted[]
  >([]);

  useEffect(() => {
    const expenses = showExpenses ? (rawTransactions ?? []) : [];
    const income = showIncome ? (rawIncome ?? []) : [];

    if ((expenses.length === 0 && income.length === 0) || !isUnlocked) {
      setDecryptedTransactions([]);
      incomeIdsRef.current = new Set();
      return;
    }

    let cancelled = false;

    const allEncrypted = [
      ...expenses.map((t) => t.amount_encrypted),
      ...income.map((i) => i.amount_encrypted),
    ];

    decryptMany(allEncrypted)
      .then((amounts) => {
        if (cancelled) return;

        const decryptedExpenses = expenses.map((t: Transaction, i: number) => {
          // eslint-disable-next-line @typescript-eslint/no-unused-vars
          const { amount_encrypted, amount_hash, ...rest } = t;
          // Negate: transactions table holds expenses, display as negative
          return { ...rest, amount: -amounts[i] };
        });

        const decryptedIncome = income.map((entry: IncomeEntry, i: number) =>
          mapIncomeToDecrypted(entry, amounts[expenses.length + i]),
        );

        incomeIdsRef.current = new Set(income.map((i) => i.id));

        // Merge and sort by date desc, then created_at desc
        const merged = [...decryptedExpenses, ...decryptedIncome].sort(
          (a, b) => {
            const dateComp = b.date.localeCompare(a.date);
            if (dateComp !== 0) return dateComp;
            return b.created_at.localeCompare(a.created_at);
          },
        );

        setDecryptedTransactions(merged);
      })
      .catch(() => {
        if (!cancelled) {
          setDecryptedTransactions([]);
          incomeIdsRef.current = new Set();
        }
      });

    return () => {
      cancelled = true;
    };
  }, [rawTransactions, rawIncome, isUnlocked, decryptMany, showExpenses, showIncome]);

  // ── Debounce search ───────────────────────────────────────────────────────
  useEffect(() => {
    const timer = setTimeout(() => setDebouncedSearch(searchText), 400);
    return () => clearTimeout(timer);
  }, [searchText]);

  // ── Auto-focus search when shown ──────────────────────────────────────────
  useEffect(() => {
    if (showSearch) {
      const t = setTimeout(() => searchInputRef.current?.focus(), 80);
      return () => clearTimeout(t);
    }
  }, [showSearch]);

  // ── Handlers ──────────────────────────────────────────────────────────────

  const handleToggleSearch = useCallback(() => {
    setShowSearch((s) => {
      if (s) {
        // closing — clear search
        setSearchText("");
        setDebouncedSearch("");
      }
      return !s;
    });
  }, []);

  const handleTransactionDelete = useCallback(
    (id: string) => {
      if (incomeIdsRef.current.has(id)) {
        deleteIncomeMutation({ id });
      } else {
        deleteTransaction(id);
      }
    },
    [deleteTransaction, deleteIncomeMutation],
  );

  const handleTransactionPress = useCallback(
    (id: string) => {
      // Phase 4: router.push(`/transactions/${id}`)
      console.log("[TransactionsPage] tapped transaction", id);
    },
    [],
  );

  const handleSmartPasteEditFirst = useCallback(
    (prefill: AddExpenseModalPrefill) => {
      setAddExpensePrefill(prefill);
      // Use center-bottom of the viewport as the InkSpread origin
      setAddExpenseOrigin({
        x: typeof window !== "undefined" ? window.innerWidth / 2 : 200,
        y: typeof window !== "undefined" ? window.innerHeight : 700,
      });
      setAddExpenseOpen(true);
    },
    [],
  );

  const handleRefetch = useCallback(() => {
    refetchTx();
    refetchIncome();
  }, [refetchTx, refetchIncome]);

  // ── Derived ───────────────────────────────────────────────────────────────
  const filtersActive =
    categoryId !== null || txType !== "all" || month !== todayMonth();

  // ─────────────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── Sticky page header ──────────────────────────────────────────── */}
      <Header
        title="Transactions"
        rightElement={
          <div className="flex items-center">
            {/* Search toggle */}
            <button
              aria-label="Search transactions"
              onClick={handleToggleSearch}
              className="flex items-center justify-center rounded-full transition-colors"
              style={{
                width: 40,
                height: 40,
                color: showSearch
                  ? "var(--color-accent)"
                  : "var(--text-secondary)",
                background: showSearch ? "var(--color-accent)18" : "transparent",
              }}
            >
              {showSearch ? (
                <X size={18} strokeWidth={1.8} />
              ) : (
                <Search size={19} strokeWidth={1.8} />
              )}
            </button>

            {/* Filter toggle */}
            <button
              aria-label="Toggle filters"
              onClick={() => setShowFilters((f) => !f)}
              className="relative flex items-center justify-center rounded-full transition-colors"
              style={{
                width: 40,
                height: 40,
                color: showFilters
                  ? "var(--color-accent)"
                  : "var(--text-secondary)",
                background: showFilters
                  ? "var(--color-accent)18"
                  : "transparent",
              }}
            >
              <SlidersHorizontal size={18} strokeWidth={1.8} />
              {/* Dot: filters active but bar closed */}
              {filtersActive && !showFilters && (
                <span
                  className="absolute top-1.5 right-1.5 rounded-full"
                  style={{
                    width: 6,
                    height: 6,
                    background: "var(--color-accent)",
                  }}
                />
              )}
            </button>
          </div>
        }
      />

      {/* ── Action row ──────────────────────────────────────────────────── */}
      <div
        className="flex items-center gap-2 px-4 pt-3 pb-2"
        style={{ background: "var(--bg-global)" }}
      >
        {/* Smart Paste pill */}
        <button
          onClick={() => setSmartPasteOpen(true)}
          className="inline-flex items-center gap-1.5 px-3 h-8 rounded-full text-sm font-medium transition-colors"
          style={{
            background: "var(--bg-surface)",
            color: "var(--color-accent)",
            border: "1.5px solid var(--color-accent)40",
          }}
        >
          <ClipboardList size={14} />
          Smart Paste
        </button>
      </div>

      {/* ── Collapsible search bar ───────────────────────────────────────── */}
      <AnimatePresence initial={false}>
        {showSearch && (
          <motion.div
            key="searchbar"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 360, damping: 32 }}
            style={{ overflow: "hidden", background: "var(--bg-global)" }}
          >
            <div className="px-4 pb-3">
              <input
                ref={searchInputRef}
                value={searchText}
                onChange={(e) => setSearchText(e.target.value)}
                placeholder="Search transactions…"
                className="w-full rounded-xl text-sm outline-none"
                style={{
                  background: "var(--bg-input, var(--bg-navigation))",
                  color: "var(--text-primary)",
                  border: "1.5px solid var(--border-input, var(--border-default))",
                  padding: "10px 14px",
                  caretColor: "var(--color-accent)",
                }}
                aria-label="Search transactions"
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Collapsible FilterBar ────────────────────────────────────────── */}
      <AnimatePresence initial={false}>
        {showFilters && (
          <motion.div
            key="filterbar"
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ type: "spring", stiffness: 360, damping: 32 }}
            style={{ overflow: "hidden" }}
          >
            <FilterBar
              month={month}
              categoryId={categoryId}
              type={txType}
              onMonthChange={setMonth}
              onCategoryChange={setCategoryId}
              onTypeChange={setTxType}
            />
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── Transaction list ────────────────────────────────────────────── */}
      <TransactionList
        transactions={decryptedTransactions}
        isLoading={txLoading || incomeLoading}
        onRefetch={handleRefetch}
        onTransactionPress={handleTransactionPress}
        onTransactionDelete={handleTransactionDelete}
        emptyMessage={
          filtersActive || debouncedSearch
            ? "No transactions match your filters."
            : "No transactions yet.\nTap + to add your first one."
        }
      />

      {/* ── Fixed "Log Income" button ────────────────────────────────────── */}
      <button
        onClick={() => setAddIncomeOpen(true)}
        className="fixed flex items-center gap-1.5 rounded-full text-sm font-medium shadow-sm transition-colors"
        style={{
          right: 20,
          bottom: "calc(80px + env(safe-area-inset-bottom))",
          zIndex: 40,
          paddingLeft: 14,
          paddingRight: 16,
          height: 36,
          background: "var(--bg-surface)",
          color: "var(--color-income)",
          border: "1.5px solid var(--color-income)40",
        }}
        aria-label="Log income"
      >
        <ArrowDown size={14} />
        Log Income
      </button>

      {/* ── Modals ──────────────────────────────────────────────────────── */}

      {/* Smart Paste */}
      <SmartPasteInput
        isOpen={smartPasteOpen}
        onClose={() => setSmartPasteOpen(false)}
        onEditFirst={handleSmartPasteEditFirst}
      />

      {/* Add Expense — prefill-only instance for SmartPaste → Edit First */}
      <AddExpenseModal
        isOpen={addExpenseOpen}
        onClose={() => {
          setAddExpenseOpen(false);
          setAddExpensePrefill({});
        }}
        origin={addExpenseOrigin}
        prefill={addExpensePrefill}
      />

      {/* Log Income */}
      <AddIncomeModal
        isOpen={addIncomeOpen}
        onClose={() => setAddIncomeOpen(false)}
      />
    </>
  );
}
