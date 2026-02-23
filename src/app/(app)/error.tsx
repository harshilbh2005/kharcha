'use client';

// ============================================================
// KHARCHA — App-level Error Boundary
//
// Catches runtime errors in any (app) child page and renders
// a recovery UI in the design system's "Quiet Luxury" style.
// The user can retry without a full page reload.
// ============================================================

import { useEffect } from 'react';
import { AlertTriangle, RotateCcw } from 'lucide-react';

export default function AppError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('[Kharcha] App error:', error);
  }, [error]);

  return (
    <div
      className="flex flex-col items-center justify-center px-6"
      style={{
        minHeight: 'calc(100dvh - 140px)',
        background: 'var(--bg-global)',
      }}
    >
      {/* Illustration */}
      <div
        className="flex items-center justify-center rounded-full"
        style={{
          width: 72,
          height: 72,
          backgroundColor: 'var(--color-expense)1A',
          marginBottom: 'var(--space-4)',
        }}
      >
        <AlertTriangle size={32} strokeWidth={1.5} color="var(--color-expense)" />
      </div>

      <h2
        className="font-display text-xl text-center"
        style={{ color: 'var(--text-primary)', margin: 0 }}
      >
        Something went wrong
      </h2>

      <p
        className="font-body text-sm text-center mt-2"
        style={{
          color: 'var(--text-secondary)',
          maxWidth: 280,
          lineHeight: 1.5,
        }}
      >
        An unexpected error occurred. Your data is safe — try again or come back later.
      </p>

      {error.digest && (
        <p
          className="font-mono text-xs mt-3"
          style={{ color: 'var(--text-secondary)', opacity: 0.6 }}
        >
          Error ID: {error.digest}
        </p>
      )}

      <button
        onClick={reset}
        className="flex items-center gap-2 mt-6 px-5 rounded-full font-body text-sm font-medium transition-colors"
        style={{
          height: 44,
          background: 'var(--color-accent)',
          color: '#fff',
          border: 'none',
          cursor: 'pointer',
        }}
      >
        <RotateCcw size={16} />
        Try Again
      </button>
    </div>
  );
}
