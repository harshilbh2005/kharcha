// ============================================================
// KHARCHA — Service Worker (Serwist v9)
// Caching strategies:
//   App shell / navigation  → StaleWhileRevalidate  (fast load, bg update)
//   API routes              → NetworkFirst (3s timeout, fall to cache)
//   Google Fonts            → CacheFirst (365 days)
//   Static assets (JS/CSS)  → CacheFirst (30 days, versioned)
//   Images                  → CacheFirst (30 days)
//   Offline fallback        → /~offline served for all failed navigations
// ============================================================

import { defaultCache } from "@serwist/next/worker";
import {
  Serwist,
  NetworkFirst,
  StaleWhileRevalidate,
  CacheFirst,
  ExpirationPlugin,
  NetworkOnly,
} from "serwist";
import type { PrecacheEntry, SerwistGlobalConfig } from "serwist";

// ── TypeScript augmentation ──────────────────────────────────────────────────
// Tells TS about the global injected by Serwist at build time.

declare global {
  interface ServiceWorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

// ── Offline fallback URL ─────────────────────────────────────────────────────
const OFFLINE_URL = "/~offline";

// ── Runtime caching strategies ───────────────────────────────────────────────

const runtimeCaching = [
  // ── 1. Clerk auth scripts (must be NetworkOnly — auth state must be live) ──
  {
    matcher: /^https:\/\/.*\.clerk\.accounts\.dev\//,
    handler: new NetworkOnly(),
  },

  // ── 2. Supabase API — NetworkOnly (never stale auth/data) ───────────────
  {
    matcher: /^https:\/\/.*\.supabase\.co\//,
    handler: new NetworkOnly(),
  },

  // ── 3. Anthropic API — NetworkOnly (AI calls must be live) ──────────────
  {
    matcher: /^https:\/\/api\.anthropic\.com\//,
    handler: new NetworkOnly(),
  },

  // ── 4. Own API routes — NetworkFirst with 3 s timeout ───────────────────
  // Falls back to a cached response from a prior successful request.
  // Covers /api/budget/current, /api/analytics/*, /api/exchange-rate, etc.
  {
    matcher: /^\/api\//,
    handler: new NetworkFirst({
      networkTimeoutSeconds: 3,
      cacheName: "kharcha-api",
      plugins: [
        new ExpirationPlugin({
          maxEntries: 64,
          maxAgeSeconds: 60 * 60, // 1 hour
        }),
      ],
    }),
  },

  // ── 5. Google Fonts stylesheets — StaleWhileRevalidate ──────────────────
  {
    matcher: /^https:\/\/fonts\.googleapis\.com\//,
    handler: new StaleWhileRevalidate({
      cacheName: "kharcha-google-fonts-stylesheets",
      plugins: [
        new ExpirationPlugin({ maxEntries: 4, maxAgeSeconds: 7 * 24 * 60 * 60 }), // 1 week
      ],
    }),
  },

  // ── 6. Google Fonts files — CacheFirst (365 days, immutable) ────────────
  {
    matcher: /^https:\/\/fonts\.gstatic\.com\//,
    handler: new CacheFirst({
      cacheName: "kharcha-google-fonts-webfonts",
      plugins: [
        new ExpirationPlugin({
          maxEntries: 32,
          maxAgeSeconds: 365 * 24 * 60 * 60, // 1 year
        }),
      ],
    }),
  },

  // ── 7. Next.js static chunks (_next/static) — CacheFirst ────────────────
  // These are content-hashed so safe to cache forever (busted on deploy).
  {
    matcher: /\/_next\/static\//,
    handler: new CacheFirst({
      cacheName: "kharcha-next-static",
      plugins: [
        new ExpirationPlugin({
          maxEntries: 256,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
        }),
      ],
    }),
  },

  // ── 8. Next.js image optimisation — CacheFirst ──────────────────────────
  {
    matcher: /\/_next\/image/,
    handler: new CacheFirst({
      cacheName: "kharcha-next-image",
      plugins: [
        new ExpirationPlugin({
          maxEntries: 64,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
        }),
      ],
    }),
  },

  // ── 9. PWA icons & other public static files — CacheFirst ───────────────
  {
    matcher: /\/icons\//,
    handler: new CacheFirst({
      cacheName: "kharcha-static-assets",
      plugins: [
        new ExpirationPlugin({
          maxEntries: 32,
          maxAgeSeconds: 30 * 24 * 60 * 60, // 30 days
        }),
      ],
    }),
  },

  // ── 10. App shell (page navigations) — StaleWhileRevalidate ─────────────
  // Must come LAST — catches any remaining same-origin navigations.
  // Serves immediately from cache, updates in background.
  {
    matcher: ({ request }: { request: Request }) =>
      request.mode === "navigate",
    handler: new StaleWhileRevalidate({
      cacheName: "kharcha-pages",
      plugins: [
        new ExpirationPlugin({
          maxEntries: 32,
          maxAgeSeconds: 24 * 60 * 60, // 1 day
        }),
      ],
    }),
  },

  // ── defaultCache from @serwist/next — catches anything else ─────────────
  ...defaultCache,
];

// ── Serwist instance ─────────────────────────────────────────────────────────

const serwist = new Serwist({
  // Precache entries injected by Serwist at build time (app shell, pages, etc.)
  precacheEntries: self.__SW_MANIFEST,

  // Take control immediately — no waiting for existing tabs to close
  skipWaiting: true,
  clientsClaim: true,

  // Navigation preload: start network request while SW boots
  navigationPreload: true,

  // The offline fallback: served for any failed navigation
  fallbacks: {
    entries: [
      {
        url: OFFLINE_URL,
        matcher({ request }) {
          return request.destination === "document";
        },
      },
    ],
  },

  runtimeCaching,
});

serwist.addEventListeners();
