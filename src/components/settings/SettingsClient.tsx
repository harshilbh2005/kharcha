"use client";

// ============================================================
// KHARCHA — Settings Client
//
// Fully interactive settings page.  Props are the initial values
// fetched server-side; all toggles update optimistically and call
// server actions in the background.
//
// Sections:
//   1. Security   — Change PIN · Biometric lock · Auto-lock timer
//   2. Budget     — Alert % · Daily limit · Weekend bonus
//   3. AI         — AI categorization · Tasker setup
//   4. Notifications — Push · Subscription alerts · Budget warnings · Anomaly alerts
//   5. Data       — Export CSV · Manage categories · About
// ============================================================

import {
  useState,
  useCallback,
  useTransition,
  useEffect,
  useRef,
} from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  Bell,
  Brain,
  Database,
  ChevronRight,
  Copy,
  RefreshCw,
  Check,
  Eye,
  EyeOff,
  Trash2,
  Pencil,
  Lock,
  Smartphone,
  Timer,
  Download,
  Tag,
  Info,
  Webhook,
  Plus,
  X,
} from "lucide-react";
import Toggle from "@/components/ui/Toggle";
import Button from "@/components/ui/Button";
import Input from "@/components/ui/Input";
import Modal from "@/components/ui/Modal";
import { useToast } from "@/components/ui/ToastProvider";
import type { Profile, AppSettings, Category } from "@/types";
import {
  updateProfileSettings,
  updateAppSettings,
  changePinAction,
  getTaskerWebhookSecret,
  regenerateTaskerSecret,
  exportTransactionsCSV,
} from "@/app/actions/settings";
import {
  getCategories,
  createCategory,
  updateCategory,
  deleteCategory,
} from "@/app/actions/categories";

// ── Shared layout primitives ──────────────────────────────────────────────────

function SectionHeader({
  icon: Icon,
  label,
}: {
  icon: React.ElementType;
  label: string;
}) {
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: "var(--space-2)",
        padding: "var(--space-6) var(--space-5) var(--space-2)",
      }}
    >
      <Icon
        size={14}
        strokeWidth={2}
        style={{ color: "var(--color-accent)", flexShrink: 0 }}
      />
      <span
        className="font-mono"
        style={{
          fontSize: "0.6875rem",
          letterSpacing: "0.1em",
          color: "var(--text-secondary)",
          textTransform: "uppercase",
          fontWeight: 600,
        }}
      >
        {label}
      </span>
    </div>
  );
}

interface SettingRowProps {
  label: string;
  description?: string;
  right: React.ReactNode;
  onClick?: () => void;
  /** render a subtle top divider (skip on first row of a group) */
  divider?: boolean;
}

function SettingRow({ label, description, right, onClick, divider = true }: SettingRowProps) {
  const sharedStyle: React.CSSProperties = {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    width: "100%",
    padding: "14px 20px",
    background: "var(--bg-surface)",
    border: "none",
    borderTop: divider ? "1px solid var(--border-default)" : "none",
    gap: "var(--space-4)",
    textAlign: "left",
    minHeight: 52,
  };

  const inner = (
    <>
      <div style={{ display: "flex", flexDirection: "column", gap: 2, minWidth: 0, flex: 1 }}>
        <span
          className="font-body"
          style={{ fontSize: "0.9375rem", color: "var(--text-primary)", fontWeight: 500 }}
        >
          {label}
        </span>
        {description && (
          <span
            className="font-body"
            style={{
              fontSize: "0.8125rem",
              color: "var(--text-secondary)",
              lineHeight: 1.4,
            }}
          >
            {description}
          </span>
        )}
      </div>
      <div style={{ flexShrink: 0 }}>{right}</div>
    </>
  );

  // Use <button> only for clickable rows — prevents invalid <button>-inside-<button>
  // nesting when `right` contains a Toggle or <select>.
  if (onClick) {
    return (
      <button type="button" onClick={onClick} style={{ ...sharedStyle, cursor: "pointer" }}>
        {inner}
      </button>
    );
  }

  return (
    <div style={{ ...sharedStyle, cursor: "default" }}>
      {inner}
    </div>
  );
}

function SettingGroup({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        marginInline: "var(--space-5)",
        borderRadius: "var(--radius-lg)",
        overflow: "hidden",
        border: "1px solid var(--border-default)",
        background: "var(--bg-surface)",
      }}
    >
      {children}
    </div>
  );
}

// ── Sub-components ────────────────────────────────────────────────────────────

// ─ ChangePinModal ─────────────────────────────────────────────────────────────

function ChangePinModal({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [oldPin, setOldPin]     = useState("");
  const [newPin, setNewPin]     = useState("");
  const [confirm, setConfirm]   = useState("");
  const [show, setShow]         = useState(false);
  const [isPending, startTrans] = useTransition();
  const [error, setError]       = useState<string | null>(null);

  const handleClose = useCallback(() => {
    setOldPin(""); setNewPin(""); setConfirm(""); setError(null);
    onClose();
  }, [onClose]);

  async function submit() {
    setError(null);
    if (newPin !== confirm) { setError("PINs don't match"); return; }
    if (!/^\d{4,6}$/.test(newPin)) { setError("PIN must be 4–6 digits"); return; }

    startTrans(async () => {
      const res = await changePinAction(oldPin, newPin);
      if (res.success) {
        toast({ title: "PIN changed", variant: "success" });
        handleClose();
      } else {
        setError(res.error);
      }
    });
  }

  return (
    <Modal isOpen={isOpen} onClose={handleClose} title="Change PIN">
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-4)", padding: "var(--space-4)" }}>
        <Input
          label="Current PIN"
          type={show ? "text" : "password"}
          inputMode="numeric"
          maxLength={6}
          value={oldPin}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setOldPin(e.target.value.replace(/\D/g, ""))}
          placeholder="Enter current PIN"
          rightElement={
            <button type="button" onClick={() => setShow((s) => !s)} style={{ color: "var(--text-secondary)", background: "none", border: "none", cursor: "pointer", padding: 0 }}>
              {show ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          }
        />
        <Input
          label="New PIN (4–6 digits)"
          type={show ? "text" : "password"}
          inputMode="numeric"
          maxLength={6}
          value={newPin}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewPin(e.target.value.replace(/\D/g, ""))}
          placeholder="Enter new PIN"
        />
        <Input
          label="Confirm new PIN"
          type={show ? "text" : "password"}
          inputMode="numeric"
          maxLength={6}
          value={confirm}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setConfirm(e.target.value.replace(/\D/g, ""))}
          placeholder="Repeat new PIN"
          error={error ?? undefined}
        />

        {error && !confirm && (
          <p style={{ fontSize: "0.8125rem", color: "var(--color-expense)", margin: 0 }}>{error}</p>
        )}

        <Button
          variant="primary"
          fullWidth
          loading={isPending}
          onClick={submit}
          disabled={!oldPin || !newPin || !confirm || isPending}
        >
          Change PIN
        </Button>
      </div>
    </Modal>
  );
}

// ─ TaskerSetupSheet ────────────────────────────────────────────────────────────

function TaskerSetupSheet({
  isOpen,
  onClose,
}: {
  isOpen: boolean;
  onClose: () => void;
}) {
  const { toast } = useToast();
  const [secret, setSecret]     = useState<string | null>(null);
  const [reveal, setReveal]     = useState(false);
  const [loading, setLoading]   = useState(false);
  const [regen, setRegen]       = useState(false);

  // Fetch secret lazily when sheet opens
  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    getTaskerWebhookSecret().then((res) => {
      if ("success" in res) setSecret(res.data);
      setLoading(false);
    });
  }, [isOpen]);

  const webhookUrl =
    typeof window !== "undefined"
      ? `${window.location.origin}/api/webhook/tasker`
      : "/api/webhook/tasker";

  function copy(text: string, label: string) {
    navigator.clipboard.writeText(text).then(() =>
      toast({ title: `${label} copied`, variant: "success", duration: 1800 })
    );
  }

  async function handleRegen() {
    setRegen(true);
    const res = await regenerateTaskerSecret();
    if ("success" in res) {
      setSecret(res.data);
      toast({ title: "New secret generated", variant: "success" });
    } else {
      toast({ title: res.error, variant: "error" });
    }
    setRegen(false);
  }

  const maskedSecret = secret ? `${secret.slice(0, 8)}${"•".repeat(24)}${secret.slice(-8)}` : null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Tasker Integration" fullHeight>
      <div style={{ display: "flex", flexDirection: "column", gap: "var(--space-5)", padding: "var(--space-4) var(--space-5)", overflowY: "auto" }}>

        {/* Webhook URL */}
        <div>
          <p className="font-body" style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", marginBottom: "var(--space-2)" }}>
            Webhook endpoint
          </p>
          <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", background: "var(--bg-navigation)", borderRadius: "var(--radius-md)", padding: "10px 14px" }}>
            <code className="font-mono" style={{ fontSize: "0.75rem", color: "var(--text-primary)", flex: 1, wordBreak: "break-all" }}>
              {webhookUrl}
            </code>
            <button onClick={() => copy(webhookUrl, "URL")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-accent)", padding: 2 }}>
              <Copy size={14} />
            </button>
          </div>
        </div>

        {/* Webhook Secret */}
        <div>
          <p className="font-body" style={{ fontSize: "0.8125rem", color: "var(--text-secondary)", marginBottom: "var(--space-2)" }}>
            Webhook secret (X-Tasker-Secret header)
          </p>
          {loading ? (
            <div style={{ height: 40, background: "var(--bg-navigation)", borderRadius: "var(--radius-md)", animation: "pulse 1.5s infinite" }} />
          ) : (
            <div style={{ display: "flex", alignItems: "center", gap: "var(--space-2)", background: "var(--bg-navigation)", borderRadius: "var(--radius-md)", padding: "10px 14px" }}>
              <code className="font-mono" style={{ fontSize: "0.75rem", color: "var(--text-primary)", flex: 1, wordBreak: "break-all" }}>
                {secret ? (reveal ? secret : maskedSecret) : "No secret — tap Generate"}
              </code>
              {secret && (
                <>
                  <button onClick={() => setReveal((r) => !r)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", padding: 2 }}>
                    {reveal ? <EyeOff size={14} /> : <Eye size={14} />}
                  </button>
                  <button onClick={() => copy(secret, "Secret")} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-accent)", padding: 2 }}>
                    <Copy size={14} />
                  </button>
                </>
              )}
            </div>
          )}
          <button
            onClick={handleRegen}
            disabled={regen}
            style={{ marginTop: "var(--space-2)", display: "flex", alignItems: "center", gap: "var(--space-1)", background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", fontSize: "0.8125rem", padding: 0 }}
          >
            <RefreshCw size={12} style={{ animation: regen ? "spin 0.8s linear infinite" : "none" }} />
            {regen ? "Generating…" : "Regenerate secret"}
          </button>
        </div>

        {/* Setup instructions */}
        <div style={{ borderTop: "1px solid var(--border-default)", paddingTop: "var(--space-4)" }}>
          <p className="font-body" style={{ fontSize: "0.875rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "var(--space-3)" }}>
            Tasker setup guide
          </p>
          {[
            "Install Tasker from the Play Store.",
            'Create a new Profile triggered by "Received Text" → filter your bank SMS sender.',
            'Add a task: HTTP Request → Method POST → URL (paste webhook endpoint above).',
            'Body: {"sms": "%SMSRB", "sender": "%SMSRF"}',
            'Add header: Key = X-Tasker-Secret, Value = (paste secret above).',
            'Test by manually receiving a bank SMS. Check the app — a parsed transaction should appear.',
          ].map((step, i) => (
            <div key={i} style={{ display: "flex", gap: "var(--space-3)", marginBottom: "var(--space-3)" }}>
              <span
                className="font-mono"
                style={{
                  width: 22, height: 22, borderRadius: "50%",
                  background: "var(--color-accent)", color: "#fff",
                  display: "flex", alignItems: "center", justifyContent: "center",
                  fontSize: "0.6875rem", fontWeight: 700, flexShrink: 0, marginTop: 1,
                }}
              >
                {i + 1}
              </span>
              <p className="font-body" style={{ fontSize: "0.875rem", color: "var(--text-secondary)", lineHeight: 1.5, margin: 0 }}>
                {step}
              </p>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}

// ─ CategoryManageSheet ─────────────────────────────────────────────────────────

const PRESET_ICONS  = ["🛍️","🍔","🚌","💊","📚","🎬","⚡","🏠","💰","🎮","✈️","🐾"];
const PRESET_COLORS = [
  "#8B7355","#6B7D71","#A37B6F","#5C6B5E","#7B7D8B","#9B8C6E",
  "#6B8080","#A09070","#7D6B8B","#8B6B6B","#6B7B8B","#8B8B6B",
];

function CategoryManageSheet({
  isOpen,
  onClose,
  initialCategories,
}: {
  isOpen: boolean;
  onClose: () => void;
  initialCategories: Category[];
}) {
  const { toast } = useToast();
  const [cats, setCats]             = useState(initialCategories);
  const [editingId, setEditingId]   = useState<string | null>(null);
  const [editName, setEditName]     = useState("");
  const [editIcon, setEditIcon]     = useState("");
  const [editColor, setEditColor]   = useState("");
  const [adding, setAdding]         = useState(false);
  const [newName, setNewName]       = useState("");
  const [newIcon, setNewIcon]       = useState("🛍️");
  const [newColor, setNewColor]     = useState(PRESET_COLORS[0]);
  const [isPending, startTrans]     = useTransition();

  // Reload categories each time sheet opens so it's always fresh
  useEffect(() => {
    if (isOpen) {
      getCategories().then((res) => {
        if ("success" in res) setCats(res.data);
      });
    }
  }, [isOpen]);

  function startEdit(cat: Category) {
    setEditingId(cat.id); setEditName(cat.name); setEditIcon(cat.icon); setEditColor(cat.color);
  }

  async function saveEdit() {
    if (!editingId || !editName.trim()) return;
    startTrans(async () => {
      const res = await updateCategory(editingId, { name: editName.trim(), icon: editIcon, color: editColor });
      if ("success" in res) {
        setCats((prev) => prev.map((c) => c.id === editingId ? res.data : c));
        setEditingId(null);
        toast({ title: "Category updated", variant: "success" });
      } else {
        toast({ title: res.error, variant: "error" });
      }
    });
  }

  async function handleDelete(id: string) {
    startTrans(async () => {
      const res = await deleteCategory(id);
      if ("success" in res) {
        setCats((prev) => prev.filter((c) => c.id !== id));
        toast({ title: "Category deleted", variant: "success" });
      } else {
        toast({ title: res.error, variant: "error" });
      }
    });
  }

  async function handleAdd() {
    if (!newName.trim()) return;
    startTrans(async () => {
      const res = await createCategory({ name: newName.trim(), icon: newIcon, color: newColor });
      if ("success" in res) {
        setCats((prev) => [...prev, res.data]);
        setNewName(""); setAdding(false);
        toast({ title: "Category created", variant: "success" });
      } else {
        toast({ title: res.error, variant: "error" });
      }
    });
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Manage Categories" fullHeight>
      <div style={{ display: "flex", flexDirection: "column", height: "100%", overflowY: "auto" }}>

        {/* Category list */}
        <div style={{ flex: 1, padding: "var(--space-2) 0" }}>
          {cats.map((cat) => (
            <div key={cat.id}>
              {editingId === cat.id ? (
                // ── Edit form ───────────────────────────────────────────────
                <div style={{ padding: "12px var(--space-5)", background: "rgba(139,115,85,0.04)", borderBottom: "1px solid var(--border-default)" }}>
                  <Input
                    value={editName}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setEditName(e.target.value)}
                    placeholder="Category name"
                    style={{ marginBottom: "var(--space-3)" } as React.CSSProperties}
                  />
                  {/* Icon picker */}
                  <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", margin: "0 0 8px" }}>Icon</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: "var(--space-3)" }}>
                    {PRESET_ICONS.map((ic) => (
                      <button
                        key={ic} type="button"
                        onClick={() => setEditIcon(ic)}
                        style={{ fontSize: 20, padding: 4, borderRadius: 6, border: editIcon === ic ? "2px solid var(--color-accent)" : "2px solid transparent", background: "none", cursor: "pointer" }}
                      >
                        {ic}
                      </button>
                    ))}
                  </div>
                  {/* Color picker */}
                  <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", margin: "0 0 8px" }}>Color</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: "var(--space-4)" }}>
                    {PRESET_COLORS.map((clr) => (
                      <button
                        key={clr} type="button"
                        onClick={() => setEditColor(clr)}
                        style={{ width: 24, height: 24, borderRadius: "50%", background: clr, border: editColor === clr ? "2px solid var(--text-primary)" : "2px solid transparent", cursor: "pointer" }}
                      />
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: "var(--space-2)" }}>
                    <Button variant="primary" size="sm" loading={isPending} onClick={saveEdit}>Save</Button>
                    <Button variant="ghost" size="sm" onClick={() => setEditingId(null)}>Cancel</Button>
                  </div>
                </div>
              ) : (
                // ── Display row ─────────────────────────────────────────────
                <div
                  style={{
                    display: "flex", alignItems: "center", gap: "var(--space-3)",
                    padding: "12px var(--space-5)",
                    borderBottom: "1px solid var(--border-default)",
                  }}
                >
                  {/* Colour dot + icon */}
                  <span
                    style={{ width: 36, height: 36, borderRadius: "50%", background: cat.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 18, flexShrink: 0 }}
                  >
                    {cat.icon}
                  </span>
                  <span className="font-body" style={{ flex: 1, fontSize: "0.9375rem", color: "var(--text-primary)" }}>
                    {cat.name}
                  </span>
                  {/* Default badge */}
                  {cat.is_default && (
                    <span className="font-mono" style={{ fontSize: "0.625rem", color: "var(--text-secondary)", background: "var(--bg-navigation)", borderRadius: 4, padding: "2px 6px" }}>
                      default
                    </span>
                  )}
                  {/* Actions — only for custom categories */}
                  {!cat.is_default && (
                    <div style={{ display: "flex", gap: "var(--space-1)" }}>
                      <button
                        onClick={() => startEdit(cat)}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--text-secondary)", padding: 6, borderRadius: 6 }}
                      >
                        <Pencil size={14} />
                      </button>
                      <button
                        onClick={() => handleDelete(cat.id)}
                        disabled={isPending}
                        style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-expense)", padding: 6, borderRadius: 6 }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>

        {/* Add new category */}
        <div style={{ padding: "var(--space-4) var(--space-5)", borderTop: "1px solid var(--border-default)", background: "var(--bg-global)" }}>
          <AnimatePresence>
            {adding ? (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                style={{ overflow: "hidden" }}
              >
                <div style={{ paddingBottom: "var(--space-3)" }}>
                  <Input
                    value={newName}
                    onChange={(e: React.ChangeEvent<HTMLInputElement>) => setNewName(e.target.value)}
                    placeholder="Category name"
                    autoFocus
                    style={{ marginBottom: "var(--space-3)" } as React.CSSProperties}
                  />
                  <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", margin: "0 0 8px" }}>Icon</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: "var(--space-3)" }}>
                    {PRESET_ICONS.map((ic) => (
                      <button
                        key={ic} type="button"
                        onClick={() => setNewIcon(ic)}
                        style={{ fontSize: 20, padding: 4, borderRadius: 6, border: newIcon === ic ? "2px solid var(--color-accent)" : "2px solid transparent", background: "none", cursor: "pointer" }}
                      >
                        {ic}
                      </button>
                    ))}
                  </div>
                  <p style={{ fontSize: "0.75rem", color: "var(--text-secondary)", margin: "0 0 8px" }}>Color</p>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginBottom: "var(--space-4)" }}>
                    {PRESET_COLORS.map((clr) => (
                      <button
                        key={clr} type="button"
                        onClick={() => setNewColor(clr)}
                        style={{ width: 24, height: 24, borderRadius: "50%", background: clr, border: newColor === clr ? "2px solid var(--text-primary)" : "2px solid transparent", cursor: "pointer" }}
                      />
                    ))}
                  </div>
                  <div style={{ display: "flex", gap: "var(--space-2)" }}>
                    <Button variant="primary" size="sm" fullWidth loading={isPending} onClick={handleAdd}>
                      Create
                    </Button>
                    <Button variant="ghost" size="sm" onClick={() => setAdding(false)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              </motion.div>
            ) : (
              <Button
                variant="secondary"
                fullWidth
                onClick={() => setAdding(true)}
              >
                <Plus size={15} style={{ marginRight: 6 }} />
                Add category
              </Button>
            )}
          </AnimatePresence>
        </div>
      </div>
    </Modal>
  );
}

// ─ AboutSheet ──────────────────────────────────────────────────────────────────

function AboutSheet({ isOpen, onClose }: { isOpen: boolean; onClose: () => void }) {
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="About Kharcha">
      <div style={{ padding: "var(--space-5)", display: "flex", flexDirection: "column", gap: "var(--space-5)", alignItems: "center", textAlign: "center" }}>
        {/* Logo */}
        <div style={{ width: 72, height: 72, borderRadius: "50%", background: "var(--color-accent)", display: "flex", alignItems: "center", justifyContent: "center" }}>
          <span className="font-display" style={{ fontSize: "1.75rem", color: "#fff" }}>₹</span>
        </div>
        <div>
          <h2 className="font-display" style={{ fontSize: "1.5rem", color: "var(--text-primary)", margin: "0 0 4px" }}>Kharcha</h2>
          <p className="font-mono" style={{ fontSize: "0.75rem", color: "var(--text-secondary)", margin: 0 }}>v0.1.0 — Phase 10 Complete</p>
        </div>
        <p className="font-body" style={{ fontSize: "0.875rem", color: "var(--text-secondary)", lineHeight: 1.6, maxWidth: "22rem", margin: 0 }}>
          A quiet luxury expense tracker for one — built for a college student in India who believes every rupee tells a story.
        </p>
        <div style={{ width: "100%", borderTop: "1px solid var(--border-default)", paddingTop: "var(--space-4)", display: "flex", flexDirection: "column", gap: "var(--space-2)" }}>
          {[
            ["Stack",    "Next.js 16 · Supabase · Clerk · Claude API"],
            ["Encrypt",  "AES-256-GCM · PBKDF2 key from PIN"],
            ["Design",   "Slate & Parchment — Quiet Luxury Stationery"],
          ].map(([k, v]) => (
            <div key={k} style={{ display: "flex", justifyContent: "space-between", fontSize: "0.8125rem" }}>
              <span className="font-mono" style={{ color: "var(--text-secondary)" }}>{k}</span>
              <span className="font-body" style={{ color: "var(--text-primary)", textAlign: "right", maxWidth: "60%" }}>{v}</span>
            </div>
          ))}
        </div>
      </div>
    </Modal>
  );
}

// ── Main SettingsClient ────────────────────────────────────────────────────────

export interface SettingsClientProps {
  profile:         Profile;
  appSettings:     AppSettings;
  categories:      Category[];
}

// localStorage key for preferences not stored in DB
const LS_KEY = "kharcha_prefs";
function loadPrefs(): Record<string, boolean | number> {
  if (typeof window === "undefined") return {};
  try { return JSON.parse(localStorage.getItem(LS_KEY) ?? "{}"); } catch { return {}; }
}
function savePrefs(prefs: Record<string, boolean | number>) {
  if (typeof window === "undefined") return;
  localStorage.setItem(LS_KEY, JSON.stringify(prefs));
}

export function SettingsClient({ profile, appSettings, categories }: SettingsClientProps) {
  const { toast } = useToast();

  // ── Server-persisted state ──────────────────────────────────────────────────
  const [prof,     setProf]     = useState(profile);
  const [appSet,   setAppSet]   = useState(appSettings);

  // ── Locally stored prefs (not in DB schema yet) ─────────────────────────────
  const [prefs, setPrefs] = useState<Record<string, boolean | number>>({});
  useEffect(() => { setPrefs(loadPrefs()); }, []);
  function pref<T extends boolean | number>(key: string, fallback: T): T {
    return (prefs[key] ?? fallback) as T;
  }
  function setPref(key: string, value: boolean | number) {
    const next = { ...prefs, [key]: value };
    setPrefs(next);
    savePrefs(next);
  }

  // ── Modal visibility ────────────────────────────────────────────────────────
  const [showChangePIN,   setShowChangePIN]   = useState(false);
  const [showTasker,      setShowTasker]      = useState(false);
  const [showCategories,  setShowCategories]  = useState(false);
  const [showAbout,       setShowAbout]       = useState(false);

  // ── Optimistic profile update ───────────────────────────────────────────────
  async function updateProf<K extends keyof typeof prof>(key: K, value: (typeof prof)[K]) {
    const prev = prof[key];
    setProf((p) => ({ ...p, [key]: value }));

    const res = await updateProfileSettings({ [key]: value } as Parameters<typeof updateProfileSettings>[0]);
    if ("error" in res) {
      setProf((p) => ({ ...p, [key]: prev }));
      toast({ title: res.error, variant: "error" });
    }
  }

  // ── Optimistic app settings update ─────────────────────────────────────────
  async function updateApp<K extends keyof AppSettings>(key: K, value: AppSettings[K]) {
    const prev = appSet[key];
    setAppSet((a) => ({ ...a, [key]: value }));

    const res = await updateAppSettings({ [key]: value } as Parameters<typeof updateAppSettings>[0]);
    if ("error" in res) {
      setAppSet((a) => ({ ...a, [key]: prev }));
      toast({ title: res.error, variant: "error" });
    }
  }

  // ── Auto-lock timer options ─────────────────────────────────────────────────
  const autoLockOptions: { label: string; value: number }[] = [
    { label: "Immediately", value: 0 },
    { label: "1 min",       value: 1 },
    { label: "5 min",       value: 5 },
    { label: "15 min",      value: 15 },
    { label: "1 hour",      value: 60 },
    { label: "Never",       value: -1 },
  ];
  const autoLockMins = pref("autoLockMins", 5);

  // ── Budget alert % options ──────────────────────────────────────────────────
  const alertOptions = [60, 70, 75, 80, 85, 90, 95];

  // ── Export CSV ──────────────────────────────────────────────────────────────
  const [exporting, setExporting] = useState(false);
  async function handleExport() {
    setExporting(true);
    const res = await exportTransactionsCSV();
    setExporting(false);
    if ("error" in res) {
      toast({ title: res.error, variant: "error" });
      return;
    }
    const blob = new Blob([res.data], { type: "text/csv;charset=utf-8;" });
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `kharcha-export-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
    toast({ title: "Export downloaded", variant: "success" });
  }

  // ── Select styling helper ───────────────────────────────────────────────────
  const selectStyle: React.CSSProperties = {
    background: "var(--bg-navigation)",
    border:     "1px solid var(--border-default)",
    borderRadius: "var(--radius-sm)",
    color:      "var(--text-primary)",
    fontSize:   "0.875rem",
    fontFamily: "Inter, sans-serif",
    padding:    "6px 10px",
    cursor:     "pointer",
    appearance: "none",
    WebkitAppearance: "none",
    paddingRight: 28,
  };

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <>
      {/* ── 1. SECURITY ───────────────────────────────────────────────────── */}
      <SectionHeader icon={Shield} label="Security" />
      <SettingGroup>
        <SettingRow
          divider={false}
          label="App PIN"
          description={prof.pin_enabled ? "Tap to change your PIN" : "PIN is disabled"}
          right={<ChevronRight size={16} color="var(--text-secondary)" />}
          onClick={() => setShowChangePIN(true)}
        />
        <SettingRow
          label="Biometric lock"
          description="Use Face ID or fingerprint"
          right={
            <Toggle
              enabled={prof.biometric_enabled}
              onToggle={(v) => updateProf("biometric_enabled", v)}
            />
          }
        />
        <SettingRow
          label="Auto-lock timer"
          description="Lock app after inactivity"
          right={
            <div style={{ position: "relative" }}>
              <select
                value={autoLockMins}
                onChange={(e) => setPref("autoLockMins", Number(e.target.value))}
                style={selectStyle}
                aria-label="Auto-lock timer"
              >
                {autoLockOptions.map((o) => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
              <ChevronRight size={12} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%) rotate(90deg)", color: "var(--text-secondary)", pointerEvents: "none" }} />
            </div>
          }
        />
      </SettingGroup>

      {/* ── 2. BUDGET ─────────────────────────────────────────────────────── */}
      <SectionHeader icon={Bell} label="Budget" />
      <SettingGroup>
        <SettingRow
          divider={false}
          label="Budget alert threshold"
          description="Warn when this % of budget is spent"
          right={
            <div style={{ position: "relative" }}>
              <select
                value={prof.monthly_budget_alert_pct}
                onChange={(e) => updateProf("monthly_budget_alert_pct", Number(e.target.value))}
                style={selectStyle}
                aria-label="Budget alert %"
              >
                {alertOptions.map((pct) => (
                  <option key={pct} value={pct}>{pct}%</option>
                ))}
              </select>
              <ChevronRight size={12} style={{ position: "absolute", right: 8, top: "50%", transform: "translateY(-50%) rotate(90deg)", color: "var(--text-secondary)", pointerEvents: "none" }} />
            </div>
          }
        />
        <SettingRow
          label="Daily spending limit"
          description="Calculates based on days remaining"
          right={
            <Toggle
              enabled={prof.daily_limit_enabled}
              onToggle={(v) => updateProf("daily_limit_enabled", v)}
            />
          }
        />
        <SettingRow
          label="Weekend bonus (1.3×)"
          description="Allow 30% more on Sat & Sun"
          right={
            <Toggle
              enabled={pref("weekendBonus", true)}
              onToggle={(v) => setPref("weekendBonus", v)}
            />
          }
        />
      </SettingGroup>

      {/* ── 3. AI & AUTOMATION ────────────────────────────────────────────── */}
      <SectionHeader icon={Brain} label="AI & Automation" />
      <SettingGroup>
        <SettingRow
          divider={false}
          label="AI categorization"
          description="Auto-tag expenses via Claude AI"
          right={
            <Toggle
              enabled={appSet.ai_categorization_enabled}
              onToggle={(v) => updateApp("ai_categorization_enabled", v)}
            />
          }
        />
        <SettingRow
          label="Tasker integration"
          description="Auto-parse bank SMS via Tasker"
          right={<ChevronRight size={16} color="var(--text-secondary)" />}
          onClick={() => setShowTasker(true)}
        />
        <SettingRow
          label="SMS bank patterns"
          description="Custom regex for your bank"
          right={
            <span className="font-body" style={{ fontSize: "0.8125rem", color: "var(--text-secondary)" }}>
              Coming soon
            </span>
          }
        />
      </SettingGroup>

      {/* ── 4. NOTIFICATIONS ──────────────────────────────────────────────── */}
      <SectionHeader icon={Bell} label="Notifications" />
      <SettingGroup>
        <SettingRow
          divider={false}
          label="Push notifications"
          description="Master toggle for all alerts"
          right={
            <Toggle
              enabled={prof.notification_enabled}
              onToggle={(v) => updateProf("notification_enabled", v)}
            />
          }
        />
        <SettingRow
          label="Subscription reminders"
          description="Alert 3 days before billing"
          right={
            <Toggle
              enabled={pref("subAlerts", true)}
              onToggle={(v) => setPref("subAlerts", v)}
              disabled={!prof.notification_enabled}
            />
          }
        />
        <SettingRow
          label="Budget warnings"
          description={`Alert at ${prof.monthly_budget_alert_pct}% spend`}
          right={
            <Toggle
              enabled={pref("budgetWarnings", true)}
              onToggle={(v) => setPref("budgetWarnings", v)}
              disabled={!prof.notification_enabled}
            />
          }
        />
        <SettingRow
          label="Anomaly alerts"
          description="Flag unusual spending patterns"
          right={
            <Toggle
              enabled={pref("anomalyAlerts", true)}
              onToggle={(v) => setPref("anomalyAlerts", v)}
              disabled={!prof.notification_enabled}
            />
          }
        />
      </SettingGroup>

      {/* ── 5. DATA ───────────────────────────────────────────────────────── */}
      <SectionHeader icon={Database} label="Data" />
      <SettingGroup>
        <SettingRow
          divider={false}
          label="Export all data"
          description="Download transactions as CSV"
          right={
            exporting
              ? <RefreshCw size={16} color="var(--color-accent)" style={{ animation: "spin 0.8s linear infinite" }} />
              : <Download size={16} color="var(--color-accent)" />
          }
          onClick={handleExport}
        />
        <SettingRow
          label="Manage categories"
          description={`${categories.length} categories`}
          right={<ChevronRight size={16} color="var(--text-secondary)" />}
          onClick={() => setShowCategories(true)}
        />
        <SettingRow
          label="Manage subscriptions"
          description="Active recurring payments"
          right={<ChevronRight size={16} color="var(--text-secondary)" />}
          onClick={() => window.location.assign("/subscriptions")}
        />
        <SettingRow
          label="About Kharcha"
          right={<ChevronRight size={16} color="var(--text-secondary)" />}
          onClick={() => setShowAbout(true)}
        />
      </SettingGroup>

      {/* Bottom padding for safe-area nav */}
      <div style={{ height: "var(--space-8)" }} />

      {/* ── Modals ────────────────────────────────────────────────────────── */}
      <ChangePinModal     isOpen={showChangePIN}  onClose={() => setShowChangePIN(false)} />
      <TaskerSetupSheet   isOpen={showTasker}     onClose={() => setShowTasker(false)} />
      <CategoryManageSheet
        isOpen={showCategories}
        onClose={() => setShowCategories(false)}
        initialCategories={categories}
      />
      <AboutSheet isOpen={showAbout} onClose={() => setShowAbout(false)} />
    </>
  );
}
