'use client';

// ============================================================
// KHARCHA — Global Error Boundary
//
// Root-level fallback for errors outside the (app) layout.
// Minimal UI — does not depend on any app context providers.
// ============================================================

import { useEffect } from 'react';

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Kharcha] Global error:', error);
  }, [error]);

  return (
    <html lang="en">
      <body
        style={{
          fontFamily: 'Inter, system-ui, sans-serif',
          background: '#E5E2DD',
          color: '#2A2D34',
          margin: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          minHeight: '100dvh',
          padding: '24px',
        }}
      >
        <svg
          width="64"
          height="64"
          viewBox="0 0 64 64"
          fill="none"
          aria-hidden="true"
          style={{ opacity: 0.25, marginBottom: 16 }}
        >
          <circle cx="32" cy="32" r="28" stroke="#2A2D34" strokeWidth="2.5" />
          <line x1="32" y1="18" x2="32" y2="36" stroke="#2A2D34" strokeWidth="2.5" strokeLinecap="round" />
          <circle cx="32" cy="44" r="2" fill="#2A2D34" />
        </svg>

        <h1 style={{ fontSize: '1.25rem', fontWeight: 600, margin: '0 0 8px' }}>
          Something went wrong
        </h1>
        <p style={{ fontSize: '0.875rem', color: '#6B707C', textAlign: 'center', maxWidth: 280, lineHeight: 1.5, margin: '0 0 24px' }}>
          An unexpected error occurred. Please try again.
        </p>

        {error.digest && (
          <p style={{ fontSize: '0.75rem', color: '#6B707C', opacity: 0.6, fontFamily: 'monospace', margin: '0 0 16px' }}>
            Error ID: {error.digest}
          </p>
        )}

        <button
          onClick={reset}
          style={{
            height: 44,
            padding: '0 24px',
            borderRadius: 22,
            background: '#8B7355',
            color: '#fff',
            border: 'none',
            fontSize: '0.875rem',
            fontWeight: 500,
            cursor: 'pointer',
          }}
        >
          Try Again
        </button>
      </body>
    </html>
  );
}
