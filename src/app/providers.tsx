"use client";

import { useState } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { ToastProvider } from "@/components/ui/ToastProvider";

// ─── QueryClient factory ────────────────────────────────────────────────────────
//
// Called once inside useState() so the same client is reused for the entire
// browser session. Creating it inside useState (not at module level) prevents
// the client from being shared across server requests in SSR.
//
// Default options chosen for a mobile PWA with encrypted local data:
//   staleTime  60 s  — most data is user-specific and changes infrequently
//   gcTime    5 min  — keep inactive queries in cache while the user navigates
//   retry       1   — fail fast on bad network rather than silently retrying
//   refetchOnWindowFocus false — not useful for a single-user encrypted store

function makeQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 60 * 1_000,      // 1 minute
        gcTime:    5  * 60 * 1_000, // 5 minutes
        retry:     1,
        refetchOnWindowFocus: false,
      },
      mutations: {
        // Mutations do not retry — failed writes surface immediately
        retry: 0,
      },
    },
  });
}

// ─── Providers ─────────────────────────────────────────────────────────────────
//
// Client-side provider tree that sits just inside <body> in layout.tsx.
//
// Order matters for context nesting:
//   QueryClientProvider   ← outermost — query hooks available everywhere
//     ToastProvider       ← toast context available to all children,
//                            including mutation callbacks that call toast()

export function Providers({ children }: { children: React.ReactNode }) {
  // useState ensures a stable client instance across re-renders;
  // the initialiser only runs once per component mount.
  const [queryClient] = useState(makeQueryClient);

  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        {children}
      </ToastProvider>
    </QueryClientProvider>
  );
}

export default Providers;
