import { TrendingUp } from "lucide-react";
import Header from "@/components/layout/Header";

// ─── Analytics ─────────────────────────────────────────────────────────────────
//
// Phase 8 — Charts & Insights.
// Will display:
//   • Monthly spend area chart (Recharts)
//   • Category breakdown donut (top 5 + "Other")
//   • Burn-rate timeline bar chart
//   • Subscription cost trend
//   • Month-over-month comparison
//
// For now: placeholder shell with Header + "coming soon" copy.

export default function AnalyticsPage() {
  return (
    <>
      {/* ── Sticky page header ───────────────────────────────────────────── */}
      <Header title="Analytics" />

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
            backgroundColor: "rgba(139, 115, 85, 0.10)",
            display:         "flex",
            alignItems:      "center",
            justifyContent:  "center",
            marginBottom:    "var(--space-2)",
          }}
        >
          <TrendingUp size={32} strokeWidth={1.7} color="var(--color-accent)" aria-hidden="true" />
        </div>

        {/* ── Tagline ─────────────────────────────────────────────────────── */}
        <h1
          className="font-display"
          style={{ fontSize: "1.75rem", color: "var(--text-primary)", margin: 0 }}
        >
          Insights that matter
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
          Spend trends, category breakdowns, and burn-rate charts — all in one place.
        </p>

        {/* ── Minimal chart wireframe ──────────────────────────────────────── */}
        {/* Gives a visual hint of what's coming without real data */}
        <div
          aria-hidden="true"
          style={{
            display:         "flex",
            alignItems:      "flex-end",
            gap:             "6px",
            height:          "52px",
            marginTop:       "var(--space-2)",
            opacity:         0.3,
          }}
        >
          {[40, 65, 30, 80, 55, 70, 45, 90, 60, 75, 50, 85].map((h, i) => (
            <div
              key={i}
              style={{
                width:           "10px",
                height:          `${h}%`,
                backgroundColor: i === 11 ? "var(--color-accent)" : "var(--color-accent-light)",
                borderRadius:    "3px 3px 0 0",
              }}
            />
          ))}
        </div>

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
          Coming soon — Phase 8
        </div>
      </div>
    </>
  );
}
