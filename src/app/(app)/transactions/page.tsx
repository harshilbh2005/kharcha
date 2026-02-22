import { Search, SlidersHorizontal } from "lucide-react";
import Header from "@/components/layout/Header";

// ─── Transactions ──────────────────────────────────────────────────────────────
//
// Phase 3 — Full transaction ledger.
// Will display:
//   • Search + filter bar (category, date range, amount range)
//   • Grouped list by date (Today, Yesterday, This week, …)
//   • Each row: category icon, merchant, time, amount (AmountDisplay)
//   • Swipe-to-delete with PaperCrumple animation
//   • Infinite scroll / pagination
//
// For now: placeholder shell with Header + "coming soon" copy.

export default function TransactionsPage() {
  return (
    <>
      {/* ── Sticky page header ───────────────────────────────────────────── */}
      <Header
        title="Transactions"
        rightElement={
          <div style={{ display: "flex", alignItems: "center" }}>
            {/* Search — will open a full-screen search overlay */}
            <button
              aria-label="Search transactions"
              style={{
                width:           40,
                height:          40,
                display:         "flex",
                alignItems:      "center",
                justifyContent:  "center",
                borderRadius:    "50%",
                border:          "none",
                background:      "transparent",
                cursor:          "pointer",
                color:           "var(--text-secondary)",
              }}
            >
              <Search size={19} strokeWidth={1.8} />
            </button>

            {/* Filter — will open a bottom sheet with filter options */}
            <button
              aria-label="Filter transactions"
              style={{
                width:           40,
                height:          40,
                display:         "flex",
                alignItems:      "center",
                justifyContent:  "center",
                borderRadius:    "50%",
                border:          "none",
                background:      "transparent",
                cursor:          "pointer",
                color:           "var(--text-secondary)",
              }}
            >
              <SlidersHorizontal size={18} strokeWidth={1.8} />
            </button>
          </div>
        }
      />

      {/* ── Placeholder body ─────────────────────────────────────────────── */}
      <div
        style={{
          display:        "flex",
          flexDirection:  "column",
          alignItems:     "center",
          justifyContent: "center",
          minHeight:      "calc(100vh - 56px - 64px)",
          padding:        "var(--space-8)",
          textAlign:      "center",
          gap:            "var(--space-4)",
        }}
      >
        {/* ── Icon ────────────────────────────────────────────────────────── */}
        <div
          style={{
            width:           72,
            height:          72,
            borderRadius:    "50%",
            backgroundColor: "var(--color-expense-bg)",
            display:         "flex",
            alignItems:      "center",
            justifyContent:  "center",
            marginBottom:    "var(--space-2)",
          }}
        >
          <svg
            width="32" height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--color-expense)"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            {/* Two arrows crossing — represents money flowing in/out */}
            <path d="M7 16l-4-4 4-4" />
            <path d="M3 12h14" />
            <path d="M17 8l4 4-4 4" />
            <path d="M21 12H7" />
          </svg>
        </div>

        {/* ── Tagline ─────────────────────────────────────────────────────── */}
        <h1
          className="font-display"
          style={{ fontSize: "1.75rem", color: "var(--text-primary)", margin: 0 }}
        >
          Every rupee, accounted for
        </h1>

        {/* ── Sub-copy ────────────────────────────────────────────────────── */}
        <p
          className="font-body"
          style={{
            color:      "var(--text-secondary)",
            fontSize:   "0.9375rem",
            maxWidth:   "22rem",
            lineHeight: 1.6,
            margin:     0,
          }}
        >
          AI-categorised entries with merchant detection, search, and smart filters.
        </p>

        {/* ── Phase badge ─────────────────────────────────────────────────── */}
        <div
          className="font-mono"
          style={{
            marginTop:       "var(--space-2)",
            fontSize:        "0.75rem",
            color:           "var(--color-accent)",
            backgroundColor: "var(--color-expense-bg)",
            border:          "1px solid var(--color-accent-light)",
            borderRadius:    "var(--radius-full)",
            padding:         "4px 14px",
            letterSpacing:   "0.04em",
          }}
        >
          Coming soon — Phase 3
        </div>
      </div>
    </>
  );
}
