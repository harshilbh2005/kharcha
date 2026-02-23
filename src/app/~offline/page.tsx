'use client';

// ============================================================
// KHARCHA — Offline Fallback Page
// Served by the service worker when a navigation request fails
// (i.e. the user is offline and the page isn't cached yet).
// ============================================================

export default function OfflinePage() {
  return (
    <div
      style={{
        minHeight: "100dvh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        padding: "var(--space-6)",
        background: "var(--bg-global)",
        textAlign: "center",
        gap: "var(--space-4)",
      }}
    >
      {/* ── Fountain pen nib SVG ─────────────────────────────── */}
      <svg
        width="72"
        height="72"
        viewBox="0 0 72 72"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        aria-hidden="true"
        style={{ opacity: 0.4 }}
      >
        {/* Pen nib / ₹ composite mark */}
        <circle cx="36" cy="36" r="34" fill="var(--bg-surface)" stroke="var(--color-accent)" strokeWidth="2" />
        <text
          x="36"
          y="47"
          textAnchor="middle"
          fontFamily="DM Serif Display, serif"
          fontSize="36"
          fill="var(--color-accent)"
        >
          ₹
        </text>
        {/* Offline diagonal slash */}
        <line x1="14" y1="14" x2="58" y2="58" stroke="var(--color-expense)" strokeWidth="3" strokeLinecap="round" />
      </svg>

      {/* ── Heading ─────────────────────────────────────────── */}
      <h1
        className="font-display"
        style={{
          fontSize: "1.75rem",
          color: "var(--text-primary)",
          margin: 0,
        }}
      >
        You&apos;re offline
      </h1>

      {/* ── Body text ───────────────────────────────────────── */}
      <p
        style={{
          fontSize: "0.9375rem",
          color: "var(--text-secondary)",
          maxWidth: "22rem",
          lineHeight: 1.6,
          margin: 0,
        }}
      >
        No network connection found. Your previously visited pages are still
        available — transactions you add will be queued and synced automatically
        when you&apos;re back online.
      </p>

      {/* ── Reload button ───────────────────────────────────── */}
      <button
        onClick={() => window.location.reload()}
        style={{
          marginTop: "var(--space-2)",
          padding: "0.75rem 2rem",
          borderRadius: "999px",
          background: "var(--color-accent)",
          color: "#fff",
          fontFamily: "Inter, sans-serif",
          fontSize: "0.875rem",
          fontWeight: 500,
          border: "none",
          cursor: "pointer",
          minHeight: 44,
        }}
      >
        Try again
      </button>
    </div>
  );
}
