import Link from "next/link";
import { SlidersHorizontal, RefreshCw, ChevronRight } from "lucide-react";
import Header from "@/components/layout/Header";

// ─── Settings ──────────────────────────────────────────────────────────────────
//
// Phase 9 — App configuration & personalisation.
// Will include:
//   • Allowance amount + reset day
//   • Notification preferences
//   • PIN change / biometric toggle
//   • AI categorisation confidence threshold
//   • Export (CSV / JSON)
//   • Data wipe / account deletion
//   • App appearance (paper texture intensity, font size)
//
// For now: placeholder shell with Header + "coming soon" copy.

export default function SettingsPage() {
  return (
    <>
      {/* ── Sticky page header ───────────────────────────────────────────── */}
      <Header
        title="Settings"
        rightElement={
          // Sliders icon — decorative, matches the "adjust" theme of settings
          <div
            aria-hidden="true"
            style={{
              width:          40,
              height:         40,
              display:        "flex",
              alignItems:     "center",
              justifyContent: "center",
              color:          "var(--text-secondary)",
            }}
          >
            <SlidersHorizontal size={18} strokeWidth={1.8} />
          </div>
        }
      />

      {/* ── Quick links (functional before Phase 9) ──────────────────────── */}
      <div
        style={{
          padding:    "var(--space-4) var(--space-5) 0",
          display:    "flex",
          flexDirection: "column",
          gap:        "1px",
          maxWidth:   "28rem",
          margin:     "0 auto",
          width:      "100%",
        }}
      >
        <Link
          href="/subscriptions"
          style={{
            display:         "flex",
            alignItems:      "center",
            justifyContent:  "space-between",
            padding:         "14px 16px",
            backgroundColor: "var(--bg-surface)",
            border:          "1px solid var(--border-default)",
            borderRadius:    "var(--radius-md)",
            textDecoration:  "none",
            color:           "var(--text-primary)",
            gap:             "var(--space-3)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-3)" }}>
            <RefreshCw size={18} strokeWidth={1.7} color="var(--color-accent)" />
            <span
              className="font-body text-sm"
              style={{ fontWeight: 500, color: "var(--text-primary)" }}
            >
              Manage Subscriptions
            </span>
          </div>
          <ChevronRight size={18} strokeWidth={1.7} color="var(--text-secondary)" />
        </Link>
      </div>

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
            backgroundColor: "rgba(107, 112, 124, 0.08)",
            display:         "flex",
            alignItems:      "center",
            justifyContent:  "center",
            marginBottom:    "var(--space-2)",
          }}
        >
          {/* Knobs / dials icon — fits the "make it yours" tone */}
          <svg
            width="32" height="32"
            viewBox="0 0 24 24"
            fill="none"
            stroke="var(--text-secondary)"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            {/* Three horizontal slider tracks */}
            <line x1="4"  y1="6"  x2="20" y2="6"  />
            <line x1="4"  y1="12" x2="20" y2="12" />
            <line x1="4"  y1="18" x2="20" y2="18" />
            {/* Three thumb circles at different positions */}
            <circle cx="8"  cy="6"  r="2" fill="var(--text-secondary)" stroke="none" />
            <circle cx="15" cy="12" r="2" fill="var(--text-secondary)" stroke="none" />
            <circle cx="10" cy="18" r="2" fill="var(--text-secondary)" stroke="none" />
          </svg>
        </div>

        {/* ── Tagline ─────────────────────────────────────────────────────── */}
        <h1
          className="font-display"
          style={{ fontSize: "1.75rem", color: "var(--text-primary)", margin: 0 }}
        >
          Make it yours
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
          Allowance, PIN, notifications, AI sensitivity, and data export — all tunable.
        </p>

        {/* ── Settings group preview (wireframe rows) ───────────────────── */}
        {/* Gives a visual hint of the list structure without real data */}
        <div
          aria-hidden="true"
          style={{
            display:   "flex",
            flexDirection: "column",
            gap:       "1px",
            width:     "100%",
            maxWidth:  "22rem",
            marginTop: "var(--space-3)",
            opacity:   0.35,
            borderRadius: "var(--radius-md)",
            overflow:  "hidden",
            border:    "1px solid var(--border-default)",
          }}
        >
          {[
            { label: "Monthly allowance",       w: "55%" },
            { label: "Change PIN",               w: "40%" },
            { label: "Notifications",            w: "48%" },
            { label: "Export data",              w: "38%" },
          ].map(({ label: _, w }, i) => (
            <div
              key={i}
              style={{
                display:         "flex",
                alignItems:      "center",
                justifyContent:  "space-between",
                padding:         "10px 14px",
                backgroundColor: "var(--bg-surface)",
                gap:             "var(--space-3)",
              }}
            >
              {/* Label placeholder */}
              <div
                style={{
                  height:          "10px",
                  width:           w,
                  backgroundColor: "var(--border-default)",
                  borderRadius:    "4px",
                }}
              />
              {/* Chevron placeholder */}
              <div
                style={{
                  height:          "10px",
                  width:           "14px",
                  backgroundColor: "var(--border-default)",
                  borderRadius:    "4px",
                }}
              />
            </div>
          ))}
        </div>

        {/* ── Phase badge ─────────────────────────────────────────────────── */}
        <div
          className="font-mono"
          style={{
            marginTop:       "var(--space-2)",
            fontSize:        "0.75rem",
            color:           "var(--text-secondary)",
            backgroundColor: "rgba(107, 112, 124, 0.08)",
            border:          "1px solid var(--border-default)",
            borderRadius:    "var(--radius-full)",
            padding:         "4px 14px",
            letterSpacing:   "0.04em",
          }}
        >
          Coming soon — Phase 9
        </div>
      </div>
    </>
  );
}
