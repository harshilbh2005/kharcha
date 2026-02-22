import { Bell } from "lucide-react";
import Header from "@/components/layout/Header";

// ─── Dashboard ─────────────────────────────────────────────────────────────────
//
// Phase 4 — Financial command center.
// Will display:
//   • Monthly allowance card with burn-rate ring
//   • Quick-stats row (spent / remaining / vault)
//   • Recent transactions (last 5)
//   • Daily limit + safe/caution/danger indicator
//
// For now: placeholder shell with Header + "coming soon" copy.

export default function DashboardPage() {
  return (
    <>
      {/* ── Sticky page header ───────────────────────────────────────────── */}
      <Header
        title="Kharcha"
        rightElement={
          // Notification bell — will wire to a notification drawer in Phase 4
          <button
            aria-label="Notifications"
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
            <Bell size={20} strokeWidth={1.8} />
          </button>
        }
      />

      {/* ── Placeholder body ─────────────────────────────────────────────── */}
      {/* Fills the space between Header (56 px) and BottomNav (64 px).      */}
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
            backgroundColor: "var(--color-income-bg)",
            display:         "flex",
            alignItems:      "center",
            justifyContent:  "center",
            marginBottom:    "var(--space-2)",
          }}
        >
          {/* Rupee glyph as display text — no icon import needed */}
          <span
            className="font-display"
            style={{ fontSize: "2rem", color: "var(--color-income)", lineHeight: 1 }}
          >
            ₹
          </span>
        </div>

        {/* ── Tagline ─────────────────────────────────────────────────────── */}
        <h1
          className="font-display"
          style={{ fontSize: "1.75rem", color: "var(--text-primary)", margin: 0 }}
        >
          Your financial command center
        </h1>

        {/* ── Sub-copy ────────────────────────────────────────────────────── */}
        <p
          className="font-body"
          style={{
            color:     "var(--text-secondary)",
            fontSize:  "0.9375rem",
            maxWidth:  "22rem",
            lineHeight: 1.6,
            margin:    0,
          }}
        >
          Balance cards, burn rate, and recent transactions — all at a glance.
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
          Coming soon — Phase 4
        </div>
      </div>
    </>
  );
}
