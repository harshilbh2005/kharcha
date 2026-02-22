import { ShieldCheck } from "lucide-react";
import Header from "@/components/layout/Header";

// ─── Emergency Vault ───────────────────────────────────────────────────────────
//
// Phase 5 — Emergency Vault system.
// Will display:
//   • Vault balance with animated vault-door opening (GSAP)
//   • Funded-by-dad indicator (separate from allowance)
//   • Withdrawal / deposit history
//   • Repayment tracker for pass-through expenses
//   • Sub-vault allocations (Tuition, Medical, Travel, …)
//
// For now: placeholder shell with Header + "coming soon" copy.

export default function VaultPage() {
  return (
    <>
      {/* ── Sticky page header ───────────────────────────────────────────── */}
      <Header
        title="Emergency Vault"
        rightElement={
          // Vault status indicator — will show locked/unlocked state
          <div
            aria-label="Vault secured"
            style={{
              width:           40,
              height:          40,
              display:         "flex",
              alignItems:      "center",
              justifyContent:  "center",
              color:           "var(--color-vault)",
            }}
          >
            <ShieldCheck size={20} strokeWidth={1.8} />
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
        {/* ── Icon — stylised vault door ───────────────────────────────────── */}
        <div
          style={{
            width:           72,
            height:          72,
            borderRadius:    "var(--radius-md)",
            background:      "var(--gradient-vault)",
            display:         "flex",
            alignItems:      "center",
            justifyContent:  "center",
            marginBottom:    "var(--space-2)",
            boxShadow:       "0 4px 20px rgba(92, 107, 94, 0.30)",
          }}
        >
          {/* Vault icon rendered as SVG lines for crisp display */}
          <svg
            width="34" height="34"
            viewBox="0 0 24 24"
            fill="none"
            stroke="rgba(255,255,255,0.90)"
            strokeWidth="1.7"
            strokeLinecap="round"
            strokeLinejoin="round"
            aria-hidden="true"
          >
            {/* Outer rect */}
            <rect x="3" y="3" width="18" height="18" rx="2" />
            {/* Lock circle */}
            <circle cx="12" cy="12" r="3.5" />
            {/* Spoke lines suggesting a combination dial */}
            <line x1="12" y1="3"  x2="12" y2="8.5"  />
            <line x1="12" y1="15.5" x2="12" y2="21" />
            <line x1="3"  y1="12" x2="8.5"  y2="12" />
            <line x1="15.5" y1="12" x2="21" y2="12" />
          </svg>
        </div>

        {/* ── Tagline ─────────────────────────────────────────────────────── */}
        <h1
          className="font-display"
          style={{ fontSize: "1.75rem", color: "var(--text-primary)", margin: 0 }}
        >
          Your safety net
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
          Emergency funds, pass-through expenses, and repayment tracking — separate from your allowance.
        </p>

        {/* ── Phase badge ─────────────────────────────────────────────────── */}
        <div
          className="font-mono"
          style={{
            marginTop:       "var(--space-2)",
            fontSize:        "0.75rem",
            color:           "var(--color-vault)",
            backgroundColor: "var(--color-vault-bg)",
            border:          "1px solid var(--color-vault-light)",
            borderRadius:    "var(--radius-full)",
            padding:         "4px 14px",
            letterSpacing:   "0.04em",
          }}
        >
          Coming soon — Phase 5
        </div>
      </div>
    </>
  );
}
