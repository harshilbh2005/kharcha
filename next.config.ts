import type { NextConfig } from "next";
import withSerwistInit from "@serwist/next";

const isDev = process.env.NODE_ENV === "development";

const securityHeaders = [
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // In dev, allow 'unsafe-eval' for Next.js HMR + Clerk's CDN scripts
      `script-src 'self' 'unsafe-inline'${isDev ? " 'unsafe-eval'" : ""} https://challenges.cloudflare.com https://*.clerk.accounts.dev`,
      "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
      "font-src 'self' https://fonts.gstatic.com",
      "img-src 'self' data: blob: https://img.clerk.com",
      `connect-src 'self' https://*.supabase.co https://api.anthropic.com https://api.clerk.com https://clerk-telemetry.com https://api.exchangerate-api.com https://*.clerk.accounts.dev https://img.clerk.com${isDev ? " ws://localhost:* http://localhost:*" : ""}`,
      "frame-src 'self' https://challenges.cloudflare.com",
      "worker-src 'self' blob:",
      "object-src 'none'",
      "base-uri 'self'",
      // Restrict form submissions to same origin (prevents form hijacking)
      "form-action 'self'",
      // Prevent the page from being embedded as a frame ancestor (backup for X-Frame-Options)
      isDev ? "frame-ancestors 'self'" : "frame-ancestors 'none'",
      // Force HTTPS in production (browser will auto-upgrade HTTP requests)
      ...(isDev ? [] : ["upgrade-insecure-requests"]),
    ].join("; "),
  },
  {
    // DENY in production, SAMEORIGIN in dev so the preview iframe works
    key: "X-Frame-Options",
    value: isDev ? "SAMEORIGIN" : "DENY",
  },
  {
    key: "X-Content-Type-Options",
    value: "nosniff",
  },
  {
    key: "Referrer-Policy",
    value: "strict-origin-when-cross-origin",
  },
  {
    key: "Permissions-Policy",
    // Restrict all sensitive browser APIs — PWA doesn't need camera/mic/geo
    value: "camera=(), microphone=(), geolocation=(), payment=(), usb=(), bluetooth=()",
  },
  {
    key: "Strict-Transport-Security",
    // 1 year, include subdomains, allow HSTS preload submission
    value: "max-age=31536000; includeSubDomains; preload",
  },
  {
    // Prevent browsers from doing MIME-type detection on downloads
    key: "X-DNS-Prefetch-Control",
    value: "off",
  },
  {
    // Prevent Adobe products from loading data from this domain
    key: "X-Permitted-Cross-Domain-Policies",
    value: "none",
  },
];

const baseConfig: NextConfig = {
  // Serwist uses a webpack plugin for building the service worker.
  // The SW is disabled in dev (disable: isDev) so Turbopack handles dev just fine.
  // An empty turbopack config silences Next.js 16's "webpack config present" warning.
  turbopack: {},
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: securityHeaders,
      },
    ];
  },
};

// Serwist wraps the base config to inject the service worker build pipeline.
// In development the service worker is disabled (disable: isDev) so that
// HMR / hot-reload works normally.
const withSerwist = withSerwistInit({
  swSrc: "src/sw.ts",           // TypeScript service worker source
  swDest: "public/sw.js",        // compiled output served from /sw.js
  reloadOnOnline: true,           // reload page when connection restored
  disable: isDev,                 // no SW in dev — prevents HMR interference
  cacheOnNavigation: true,        // precache pages visited during navigation
  additionalPrecacheEntries: [
    // Pre-cache the offline fallback so it always works without a network
    { url: "/~offline", revision: "1" },
  ],
});

export default withSerwist(baseConfig);
