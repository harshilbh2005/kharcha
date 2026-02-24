"use client";

// ============================================================
// KHARCHA — PushNotificationToggle
//
// Handles the full Web Push subscription lifecycle:
//   1. Check browser support + current permission
//   2. On enable: request permission → subscribe → POST to API
//   3. On disable: unsubscribe → DELETE from API
//
// Renders as a simple Toggle-like UI consistent with SettingRow.
// ============================================================

import { useEffect, useState } from "react";
import { BellOff, BellRing, Loader2 } from "lucide-react";
import Toggle from "@/components/ui/Toggle";
import { useToast } from "@/components/ui/ToastProvider";

// ── VAPID public key (base64url → Uint8Array) ─────────────────────────────────

function urlBase64ToUint8Array(base64String: string): ArrayBuffer {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64  = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw     = window.atob(base64);
  const arr     = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) arr[i] = raw.charCodeAt(i);
  return arr.buffer;
}

// ── Status type ───────────────────────────────────────────────────────────────

type PushStatus = "checking" | "unsupported" | "denied" | "disabled" | "enabled" | "loading";

// ── Component ─────────────────────────────────────────────────────────────────

export function PushNotificationToggle() {
  const { toast } = useToast();
  const [status, setStatus] = useState<PushStatus>("checking");

  // Detect current subscription state on mount
  useEffect(() => {
    async function check() {
      if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
        setStatus("unsupported");
        return;
      }
      if (Notification.permission === "denied") {
        setStatus("denied");
        return;
      }
      try {
        const reg = await navigator.serviceWorker.ready;
        const existing = await reg.pushManager.getSubscription();
        setStatus(existing ? "enabled" : "disabled");
      } catch {
        setStatus("disabled");
      }
    }
    void check();
  }, []);

  // ── Enable push ─────────────────────────────────────────────────────────────

  async function enable() {
    if (!("serviceWorker" in navigator) || !("PushManager" in window)) return;
    setStatus("loading");

    try {
      // 1. Request permission
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setStatus(permission === "denied" ? "denied" : "disabled");
        toast({
          title: "Permission denied",
          description: "Enable notifications in your browser settings.",
          variant: "error",
        });
        return;
      }

      // 2. Subscribe
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.subscribe({
        userVisibleOnly:      true,
        applicationServerKey: urlBase64ToUint8Array(
          process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY!
        ),
      });

      const { endpoint, keys } = sub.toJSON() as {
        endpoint: string;
        keys: { p256dh: string; auth: string };
      };

      // 3. Save to server
      const res = await fetch("/api/push/subscribe", {
        method:  "POST",
        headers: { "Content-Type": "application/json" },
        body:    JSON.stringify({ endpoint, p256dh: keys.p256dh, auth: keys.auth }),
      });

      if (!res.ok) throw new Error("Failed to save subscription");

      setStatus("enabled");
      toast({ title: "Push notifications enabled", variant: "success" });
    } catch (err) {
      console.error("[PushToggle] enable:", err);
      setStatus("disabled");
      toast({ title: "Could not enable push notifications", variant: "error" });
    }
  }

  // ── Disable push ────────────────────────────────────────────────────────────

  async function disable() {
    setStatus("loading");

    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();

      if (sub) {
        const endpoint = sub.endpoint;
        await sub.unsubscribe();
        await fetch("/api/push/subscribe", {
          method:  "DELETE",
          headers: { "Content-Type": "application/json" },
          body:    JSON.stringify({ endpoint }),
        });
      }

      setStatus("disabled");
      toast({ title: "Push notifications disabled", variant: "success" });
    } catch (err) {
      console.error("[PushToggle] disable:", err);
      setStatus("disabled");
      toast({ title: "Could not disable push notifications", variant: "error" });
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  if (status === "checking") {
    return (
      <Loader2
        size={16}
        style={{ color: "var(--text-secondary)", animation: "spin 0.8s linear infinite" }}
      />
    );
  }

  if (status === "unsupported") {
    return (
      <span
        className="font-body"
        style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", display: "flex", alignItems: "center", gap: 4 }}
      >
        <BellOff size={13} />
        Not supported
      </span>
    );
  }

  if (status === "denied") {
    return (
      <span
        className="font-body"
        style={{ fontSize: "0.8125rem", color: "var(--color-expense)", display: "flex", alignItems: "center", gap: 4 }}
        title="Notifications blocked in browser settings"
      >
        <BellOff size={13} />
        Blocked
      </span>
    );
  }

  if (status === "loading") {
    return (
      <Loader2
        size={16}
        style={{ color: "var(--color-accent)", animation: "spin 0.8s linear infinite" }}
      />
    );
  }

  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
      {status === "enabled" && (
        <BellRing size={13} style={{ color: "var(--color-income)" }} />
      )}
      <Toggle
        enabled={status === "enabled"}
        onToggle={(v) => { void (v ? enable() : disable()); }}
      />
    </div>
  );
}

export default PushNotificationToggle;
