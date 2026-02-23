"use client";

// ============================================================
// KHARCHA — NotificationBell
//
// A bell icon button with an unread-count badge.
// Tapping it opens a bottom-sheet drawer listing recent
// notifications fetched from /api/notifications.
//
// Features:
//   • Polls every 60 s while the drawer is closed
//   • Marks a single notification as read on tap
//   • "Mark all as read" button in the header
//   • Empty state illustration
//   • AnimatePresence transitions on badge + drawer
//
// Usage:
//   <NotificationBell />
//   (self-contained; place in any page's Header rightElement)
// ============================================================

import { useState, useEffect, useCallback, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Bell, X, Check, CheckCheck, AlertCircle, TrendingDown, Repeat2, Info } from "lucide-react";
import Modal from "@/components/ui/Modal";
import type { Notification, NotificationType } from "@/types";

// ── Notification type icon map ─────────────────────────────────────────────────

function NotifIcon({ type }: { type: NotificationType }) {
  const props = { size: 16, strokeWidth: 1.8 };
  switch (type) {
    case "subscription_reminder":   return <Repeat2   {...props} style={{ color: "var(--color-accent)" }} />;
    case "budget_warning":          return <TrendingDown {...props} style={{ color: "var(--color-expense)" }} />;
    case "vault_low":               return <AlertCircle {...props} style={{ color: "#C08840" }} />;
    case "anomaly_detected":        return <AlertCircle {...props} style={{ color: "var(--color-expense)" }} />;
    case "monthly_summary_ready":   return <Check       {...props} style={{ color: "var(--color-income)" }} />;
    case "vault_replenish_reminder":return <AlertCircle {...props} style={{ color: "#C08840" }} />;
    default:                        return <Info        {...props} style={{ color: "var(--text-secondary)" }} />;
  }
}

// ── Relative time helper ───────────────────────────────────────────────────────

function relativeTime(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60_000);
  if (m < 1)  return "just now";
  if (m < 60) return `${m}m ago`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

// ── Component ──────────────────────────────────────────────────────────────────

export function NotificationBell() {
  const [isOpen,        setIsOpen]        = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount,   setUnreadCount]   = useState(0);
  const [loading,       setLoading]       = useState(false);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // ── Fetch ───────────────────────────────────────────────────────────────────

  const fetchNotifs = useCallback(async (quiet = false) => {
    if (!quiet) setLoading(true);
    try {
      const res  = await fetch("/api/notifications?limit=50", { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json() as { notifications: Notification[]; unreadCount: number };
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch {
      // Network unavailable — ignore silently
    } finally {
      if (!quiet) setLoading(false);
    }
  }, []);

  // Initial fetch + 60-second polling (only when drawer closed)
  useEffect(() => {
    void fetchNotifs();

    pollingRef.current = setInterval(() => {
      if (!isOpen) void fetchNotifs(true);
    }, 60_000);

    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [fetchNotifs, isOpen]);

  // ── Mark as read ────────────────────────────────────────────────────────────

  async function markRead(id: string) {
    // Optimistic
    setNotifications((prev) =>
      prev.map((n) => (n.id === id ? { ...n, is_read: true } : n))
    );
    setUnreadCount((c) => Math.max(0, c - 1));

    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
  }

  async function markAllRead() {
    setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    setUnreadCount(0);

    await fetch("/api/notifications", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: "all" }),
    });
  }

  // Open drawer + mark all as read after a short delay
  function handleOpen() {
    setIsOpen(true);
    if (unreadCount > 0) {
      setTimeout(() => void markAllRead(), 1000);
    }
  }

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── Bell button ──────────────────────────────────────────────────── */}
      <motion.button
        type="button"
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
        onClick={handleOpen}
        whileTap={{ scale: 0.9 }}
        style={{
          position:       "relative",
          width:          44,
          height:         44,
          borderRadius:   "50%",
          display:        "flex",
          alignItems:     "center",
          justifyContent: "center",
          background:     "transparent",
          border:         "none",
          cursor:         "pointer",
          color:          "var(--text-secondary)",
        }}
      >
        <Bell size={20} strokeWidth={1.8} />

        {/* Unread badge */}
        <AnimatePresence>
          {unreadCount > 0 && (
            <motion.span
              key="badge"
              initial={{ scale: 0, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0, opacity: 0 }}
              transition={{ type: "spring", stiffness: 400, damping: 20 }}
              style={{
                position:       "absolute",
                top:            4,
                right:          4,
                minWidth:       16,
                height:         16,
                borderRadius:   "9999px",
                background:     "var(--color-expense)",
                color:          "#fff",
                fontSize:       "0.5625rem",
                fontFamily:     "IBM Plex Mono, monospace",
                fontWeight:     700,
                display:        "flex",
                alignItems:     "center",
                justifyContent: "center",
                paddingInline:  3,
                lineHeight:     1,
                border:         "1.5px solid var(--bg-global)",
              }}
            >
              {unreadCount > 99 ? "99+" : unreadCount}
            </motion.span>
          )}
        </AnimatePresence>
      </motion.button>

      {/* ── Notification drawer ───────────────────────────────────────────── */}
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Notifications"
        fullHeight
      >
        {/* Header bar */}
        <div
          style={{
            display:        "flex",
            alignItems:     "center",
            justifyContent: "space-between",
            padding:        "var(--space-3) var(--space-5)",
            borderBottom:   "1px solid var(--border-default)",
          }}
        >
          <span
            className="font-mono"
            style={{ fontSize: "0.75rem", color: "var(--text-secondary)", letterSpacing: "0.04em" }}
          >
            {unreadCount > 0 ? `${unreadCount} unread` : "All caught up"}
          </span>
          {unreadCount > 0 && (
            <button
              onClick={() => void markAllRead()}
              aria-label="Mark all notifications as read"
              style={{
                display:    "flex",
                alignItems: "center",
                gap:        "var(--space-1)",
                background: "none",
                border:     "none",
                cursor:     "pointer",
                fontSize:   "0.8125rem",
                color:      "var(--color-accent)",
                fontFamily: "Inter, sans-serif",
                minHeight:  44,
              }}
            >
              <CheckCheck size={14} />
              Mark all read
            </button>
          )}
        </div>

        {/* List */}
        <div style={{ overflowY: "auto", flex: 1 }}>
          {loading && notifications.length === 0 ? (
            // Loading skeleton
            <div style={{ padding: "var(--space-4) var(--space-5)", display: "flex", flexDirection: "column", gap: "var(--space-3)" }}>
              {[1, 2, 3].map((i) => (
                <div key={i} style={{ height: 56, background: "var(--bg-navigation)", borderRadius: "var(--radius-md)", opacity: 0.5 }} />
              ))}
            </div>
          ) : notifications.length === 0 ? (
            // Empty state
            <div
              style={{
                display:        "flex",
                flexDirection:  "column",
                alignItems:     "center",
                justifyContent: "center",
                minHeight:      220,
                gap:            "var(--space-3)",
                color:          "var(--text-secondary)",
                padding:        "var(--space-8)",
              }}
            >
              <Bell size={40} strokeWidth={1.2} style={{ opacity: 0.3 }} />
              <p className="font-body" style={{ fontSize: "0.9375rem", margin: 0, textAlign: "center" }}>
                No notifications yet
              </p>
              <p className="font-body" style={{ fontSize: "0.8125rem", margin: 0, textAlign: "center", maxWidth: "18rem", lineHeight: 1.5 }}>
                Budget alerts, subscription reminders, and anomaly warnings will appear here.
              </p>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {notifications.map((notif, idx) => (
                <motion.button
                  key={notif.id}
                  type="button"
                  initial={{ opacity: 0, x: 20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.03 }}
                  onClick={() => {
                    if (!notif.is_read) void markRead(notif.id);
                    if (notif.action_url) window.location.assign(notif.action_url);
                  }}
                  style={{
                    display:       "flex",
                    width:         "100%",
                    alignItems:    "flex-start",
                    gap:           "var(--space-3)",
                    padding:       "14px var(--space-5)",
                    background:    notif.is_read ? "transparent" : "rgba(139, 115, 85, 0.04)",
                    border:        "none",
                    borderBottom:  "1px solid var(--border-default)",
                    cursor:        "pointer",
                    textAlign:     "left",
                  }}
                >
                  {/* Icon bubble */}
                  <div
                    style={{
                      width:          36,
                      height:         36,
                      borderRadius:   "50%",
                      background:     "var(--bg-navigation)",
                      display:        "flex",
                      alignItems:     "center",
                      justifyContent: "center",
                      flexShrink:     0,
                      marginTop:      2,
                    }}
                  >
                    <NotifIcon type={notif.type} />
                  </div>

                  {/* Text */}
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", gap: "var(--space-2)" }}>
                      <p
                        className="font-body"
                        style={{
                          margin:     0,
                          fontSize:   "0.9375rem",
                          fontWeight: notif.is_read ? 400 : 600,
                          color:      "var(--text-primary)",
                          overflow:   "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {notif.title}
                      </p>
                      <span
                        className="font-mono"
                        style={{ fontSize: "0.6875rem", color: "var(--text-secondary)", flexShrink: 0 }}
                      >
                        {relativeTime(notif.created_at)}
                      </span>
                    </div>
                    <p
                      className="font-body"
                      style={{
                        margin:     "2px 0 0",
                        fontSize:   "0.8125rem",
                        color:      "var(--text-secondary)",
                        lineHeight: 1.4,
                        display:    "-webkit-box",
                        WebkitLineClamp: 2,
                        WebkitBoxOrient: "vertical" as const,
                        overflow:   "hidden",
                      }}
                    >
                      {notif.message}
                    </p>
                  </div>

                  {/* Unread dot */}
                  {!notif.is_read && (
                    <div
                      style={{
                        width:        8,
                        height:       8,
                        borderRadius: "50%",
                        background:   "var(--color-accent)",
                        flexShrink:   0,
                        marginTop:    6,
                      }}
                    />
                  )}
                </motion.button>
              ))}
            </AnimatePresence>
          )}
        </div>
      </Modal>
    </>
  );
}
