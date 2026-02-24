"use client";

// ============================================================
// KHARCHA — Service Worker Registrar
//
// Registers /sw.js (built by Serwist) in the browser.
// Must be a Client Component — service worker APIs are browser-only.
//
// Serwist's withSerwistInit() only BUILDS the sw.js file.
// The actual browser registration must be done explicitly here.
// Runs once on first mount, no-ops in dev (SW is disabled in dev).
// ============================================================

import { useEffect } from "react";

export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (typeof window === "undefined" || !("serviceWorker" in navigator)) return;

    navigator.serviceWorker
      .register("/sw.js", { scope: "/" })
      .then((reg) => {
        console.log("[SW] Registered — scope:", reg.scope);
      })
      .catch((err: unknown) => {
        console.error("[SW] Registration failed:", err);
      });
  }, []);

  return null;
}
