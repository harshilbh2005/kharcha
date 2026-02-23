"use client";

// ============================================================
// KHARCHA — FilterBar
// Horizontal filter bar for the transactions page.
//
// Sections (top-to-bottom):
//   1. Month pills — scrollable, snap, auto-scrolls to current
//   2. Row 2       — Category dropdown pill + Type pills
//
// Props are fully controlled (no internal filter state).
// The parent (transactions/page.tsx) owns the filter state.
// ============================================================

import { useRef, useEffect, useState, useMemo } from "react";
import { ChevronDown } from "lucide-react";
import { format, subMonths } from "date-fns";
import { useCategories } from "@/hooks/useCategories";

// ─── Types ────────────────────────────────────────────────────────────────────

export type TxTypeFilter = "all" | "expense" | "income" | "pass_through";

export interface FilterBarProps {
  month: string; // YYYY-MM
  categoryId: string | null;
  type: TxTypeFilter;
  onMonthChange: (m: string) => void;
  onCategoryChange: (id: string | null) => void;
  onTypeChange: (t: TxTypeFilter) => void;
}

// ─── Constants ────────────────────────────────────────────────────────────────

const TYPE_PILLS: { label: string; value: TxTypeFilter }[] = [
  { label: "All", value: "all" },
  { label: "Expenses", value: "expense" },
  { label: "Income", value: "income" },
  { label: "Pass-through", value: "pass_through" },
];

/** 13 months: 12 past months + current */
function buildMonths(): { label: string; value: string }[] {
  const now = new Date();
  return Array.from({ length: 13 }, (_, i) => {
    const d = subMonths(now, 12 - i);
    return { label: format(d, "MMM yy"), value: format(d, "yyyy-MM") };
  });
}

// ─── Shared Pill button ───────────────────────────────────────────────────────

function Pill({
  selected,
  onClick,
  children,
}: {
  selected: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="flex-none inline-flex items-center gap-1 px-3 h-8 rounded-full text-sm font-medium whitespace-nowrap transition-colors"
      style={{
        background: selected ? "var(--color-accent)" : "var(--bg-surface)",
        color: selected ? "#fff" : "var(--text-primary)",
        border: selected
          ? "1.5px solid transparent"
          : "1.5px solid var(--border-default)",
      }}
    >
      {children}
    </button>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export function FilterBar({
  month,
  categoryId,
  type,
  onMonthChange,
  onCategoryChange,
  onTypeChange,
}: FilterBarProps) {
  const { data: categories = [] } = useCategories();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  // Build months inside the component to avoid module-level Date() hydration mismatches
  // eslint-disable-next-line react-hooks/exhaustive-deps
  const MONTHS = useMemo(() => buildMonths(), []);

  const monthsRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Auto-scroll selected month into view whenever it changes
  useEffect(() => {
    const container = monthsRef.current;
    if (!container) return;
    const idx = MONTHS.findIndex((m) => m.value === month);
    if (idx < 0) return;
    const pill = container.children[idx] as HTMLElement | undefined;
    pill?.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" });
  }, [month]);

  // Close category dropdown on outside click
  useEffect(() => {
    if (!dropdownOpen) return;
    const handle = (e: MouseEvent) => {
      if (!dropdownRef.current?.contains(e.target as Node)) {
        setDropdownOpen(false);
      }
    };
    document.addEventListener("mousedown", handle);
    return () => document.removeEventListener("mousedown", handle);
  }, [dropdownOpen]);

  const selectedCategory = categories.find((c) => c.id === categoryId);

  return (
    <div
      className="pb-3 space-y-2"
      style={{ background: "var(--bg-global)" }}
    >
      {/* ── Row 1: Month pills ──────────────────────────────────────────── */}
      <div
        ref={monthsRef}
        className="flex gap-2 px-4 overflow-x-auto"
        style={{
          scrollSnapType: "x mandatory",
          scrollbarWidth: "none",
          msOverflowStyle: "none",
        } as React.CSSProperties}
      >
        {MONTHS.map((m) => (
          <div key={m.value} style={{ scrollSnapAlign: "start" }}>
            <Pill selected={month === m.value} onClick={() => onMonthChange(m.value)}>
              {m.label}
            </Pill>
          </div>
        ))}
      </div>

      {/* ── Row 2: Category dropdown + Type pills ───────────────────────── */}
      <div
        className="flex gap-2 px-4 overflow-x-auto"
        style={{ scrollbarWidth: "none", msOverflowStyle: "none" } as React.CSSProperties}
      >
        {/* Category dropdown */}
        <div ref={dropdownRef} className="relative flex-none">
          <Pill
            selected={categoryId !== null}
            onClick={() => setDropdownOpen((o) => !o)}
          >
            <span className="max-w-[120px] truncate">
              {selectedCategory?.name ?? "All Categories"}
            </span>
            <ChevronDown
              size={13}
              className="flex-none transition-transform duration-150"
              style={{
                transform: dropdownOpen ? "rotate(180deg)" : "rotate(0deg)",
              }}
            />
          </Pill>

          {dropdownOpen && (
            <div
              className="absolute left-0 top-9 z-50 min-w-[168px] rounded-xl py-1 shadow-md"
              style={{
                background: "var(--bg-surface)",
                border: "1px solid var(--border-default)",
              }}
            >
              {/* All Categories option */}
              <button
                className="w-full text-left px-3.5 py-2 text-sm transition-colors"
                style={{
                  color:
                    categoryId === null
                      ? "var(--color-accent)"
                      : "var(--text-primary)",
                  fontWeight: categoryId === null ? 600 : 400,
                }}
                onClick={() => {
                  onCategoryChange(null);
                  setDropdownOpen(false);
                }}
              >
                All Categories
              </button>

              {categories.map((cat) => (
                <button
                  key={cat.id}
                  className="w-full text-left px-3.5 py-2 text-sm transition-colors"
                  style={{
                    color:
                      categoryId === cat.id
                        ? "var(--color-accent)"
                        : "var(--text-primary)",
                    fontWeight: categoryId === cat.id ? 600 : 400,
                  }}
                  onClick={() => {
                    onCategoryChange(cat.id);
                    setDropdownOpen(false);
                  }}
                >
                  {cat.name}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* Type pills */}
        {TYPE_PILLS.map((t) => (
          <Pill
            key={t.value}
            selected={type === t.value}
            onClick={() => onTypeChange(t.value)}
          >
            {t.label}
          </Pill>
        ))}
      </div>
    </div>
  );
}

export default FilterBar;
