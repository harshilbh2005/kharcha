'use client';

// ============================================================
// HardRedirect — Forces a full browser navigation.
//
// Used after syncing Clerk publicMetadata server-side so the
// browser fetches a fresh JWT that includes the updated claims.
// A Next.js redirect() alone won't work because Clerk's SDK
// may still serve the cached (stale) session token.
// ============================================================

import { useEffect } from 'react';

export default function HardRedirect({ to }: { to: string }) {
  useEffect(() => {
    window.location.href = to;
  }, [to]);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: '100dvh',
        color: 'var(--text-secondary)',
        fontFamily: 'var(--font-body)',
        fontSize: '0.9rem',
      }}
    >
      Redirecting…
    </div>
  );
}
