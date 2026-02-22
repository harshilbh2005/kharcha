"use client";

// ============================================================
// KHARCHA — SmartPasteInput
// Paste a bank SMS → automatic parsing → one-tap save.
//
// Flow:
//   idle      → user pastes SMS text
//   parsing   → parseSMS() runs; AI stub if confidence < 0.5
//   parsed    → result card shown (amount, type, merchant, date, category hint)
//   error     → regex + AI both failed
//
// "Confirm & Save" → encrypt → createTransaction → onClose
// "Edit First"     → closes sheet, calls onEditFirst(prefill)
// "Add Manually"   → closes sheet, calls onEditFirst({}) (empty prefill)
// ============================================================

import { motion, AnimatePresence } from "framer-motion";
import {
  Sparkles,
  ClipboardPaste,
  ArrowRight,
  CheckCircle,
  PenLine,
  AlertCircle,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { format, parseISO } from "date-fns";
import Modal from "@/components/ui/Modal";
import Badge from "@/components/ui/Badge";
import Button from "@/components/ui/Button";
import { parseSMS } from "@/lib/algorithms/sms-parser";
import { useEncryption } from "@/hooks/useEncryption";
import { useCreateTransaction } from "@/hooks/useTransactions";
import { useCategories } from "@/hooks/useCategories";
import type { ParsedSMS } from "@/types";
import type { AddExpenseModalPrefill } from "./AddExpenseModal";

// ─── AI stub (Phase 7) ────────────────────────────────────────────────────────

/**
 * Phase 7: Replace this stub with a real Claude API call.
 * Called when the regex parser returns confidence < 0.5.
 */
async function parseSMSWithAI(_smsText: string): Promise<ParsedSMS | null> {
  // TODO: POST to /api/ai/parse-sms in Phase 7
  return null;
}

// ─── Merchant → category name hints ──────────────────────────────────────────

const MERCHANT_CATEGORY_HINTS: [RegExp, string][] = [
  [/zomato|swiggy|blinkit|zepto|dunzo|bigbasket|grofer|instamart/i, "Food"],
  [/uber|ola|rapido|namma|meru|redbus|irctc|railway|metro/i, "Transport"],
  [/netflix|prime|hotstar|disney|spotify|youtube|apple|jiocinema/i, "Entertainment"],
  [/amazon|flipkart|myntra|ajio|meesho|nykaa|snapdeal|tata\s*cliq/i, "Shopping"],
  [/gym|cult\.fit|fitness|yoga|healthkart/i, "Health"],
  [/udemy|coursera|byju|unacademy|toppr|vedantu|coding\s*ninja/i, "Education"],
  [/hospital|clinic|pharmacy|medplus|apollo|netmeds|1mg/i, "Health"],
  [/electricity|water\s*board|gas|jio|airtel|bsnl|vi\b|vodafone|internet|broadband/i, "Utilities"],
  [/rent|landlord|housing|makemytrip|goibibo|oyo|airbnb/i, "Housing"],
  [/starbucks|cafe|ccd|barista|third\s*wave|blue\s*tokai/i, "Food"],
];

function suggestCategoryName(merchant: string | null): string | null {
  if (!merchant) return null;
  for (const [pattern, name] of MERCHANT_CATEGORY_HINTS) {
    if (pattern.test(merchant)) return name;
  }
  return null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatINR(amount: number): string {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(amount);
}

function formatDateDisplay(isoOrRaw: string): string {
  try {
    return format(parseISO(isoOrRaw), "dd MMM yyyy");
  } catch {
    return isoOrRaw;
  }
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function FieldRow({
  label,
  value,
}: {
  label: string;
  value: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between py-2">
      <span className="text-sm" style={{ color: "var(--text-secondary)" }}>
        {label}
      </span>
      <span
        className="text-sm font-medium"
        style={{ color: "var(--text-primary)" }}
      >
        {value}
      </span>
    </div>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface SmartPasteInputProps {
  isOpen: boolean;
  onClose: () => void;
  /**
   * Called when the user taps "Edit First".
   * Parent should open AddExpenseModal with these pre-fill values.
   */
  onEditFirst?: (prefill: AddExpenseModalPrefill) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

type UIState = "idle" | "parsing" | "parsed" | "error";

export function SmartPasteInput({
  isOpen,
  onClose,
  onEditFirst,
}: SmartPasteInputProps) {
  const [smsText, setSmsText] = useState("");
  const [uiState, setUiState] = useState<UIState>("idle");
  const [parsed, setParsed] = useState<ParsedSMS | null>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const { encrypt } = useEncryption();
  const { data: categories = [] } = useCategories();
  const mutation = useCreateTransaction();

  // Auto-focus textarea when modal opens
  useEffect(() => {
    if (!isOpen) return;
    // Reset state on each open
    setSmsText("");
    setUiState("idle");
    setParsed(null);
    const timer = setTimeout(() => textareaRef.current?.focus(), 120);
    return () => clearTimeout(timer);
  }, [isOpen]);

  // ── Clipboard paste ──────────────────────────────────────────────────────────
  const handleClipboardPaste = useCallback(async () => {
    try {
      const text = await navigator.clipboard.readText();
      if (text) {
        setSmsText(text);
        setUiState("idle");
        setParsed(null);
      }
    } catch {
      // Clipboard read denied — user can paste manually
    }
  }, []);

  // ── Parse ────────────────────────────────────────────────────────────────────
  const handleParse = useCallback(async () => {
    const trimmed = smsText.trim();
    if (!trimmed) return;

    setUiState("parsing");
    setParsed(null);

    // 1. Regex parser
    let result = parseSMS(trimmed);

    // 2. AI fallback if confidence too low
    if (result.confidence < 0.5) {
      const aiResult = await parseSMSWithAI(trimmed);
      if (aiResult) result = aiResult;
    }

    if (result.amount <= 0 || result.confidence < 0.5) {
      setUiState("error");
    } else {
      setParsed(result);
      setUiState("parsed");
    }
  }, [smsText]);

  // ── Confirm & Save ───────────────────────────────────────────────────────────
  const handleConfirmSave = useCallback(async () => {
    if (!parsed || parsed.amount <= 0) return;

    // Suggest a category ID from the merchant hint
    const suggestedName = suggestCategoryName(parsed.merchant);
    const matchedCategory = suggestedName
      ? categories.find((c) =>
          c.name.toLowerCase().includes(suggestedName.toLowerCase()),
        )
      : undefined;

    try {
      const { encrypted, hash } = await encrypt(parsed.amount);
      await mutation.mutateAsync({
        amount_encrypted: encrypted,
        amount_hash: hash,
        currency: "INR",
        description: parsed.merchant ?? "SMS Transaction",
        merchant: parsed.merchant ?? undefined,
        category_id: matchedCategory?.id,
        is_pass_through: false,
        is_need: true,
        date: parsed.date ?? undefined,
        time: undefined,
      });
      onClose();
    } catch {
      // useCreateTransaction already shows a toast on error
    }
  }, [parsed, categories, encrypt, mutation, onClose]);

  // ── Edit First ───────────────────────────────────────────────────────────────
  const handleEditFirst = useCallback(() => {
    if (!parsed) return;
    const prefill: AddExpenseModalPrefill = {
      amount: parsed.amount,
      description: parsed.merchant ?? undefined,
      merchant: parsed.merchant ?? undefined,
      date: parsed.date ?? undefined,
    };
    onClose();
    onEditFirst?.(prefill);
  }, [parsed, onClose, onEditFirst]);

  // ── Add Manually (from error state) ─────────────────────────────────────────
  const handleAddManually = useCallback(() => {
    onClose();
    onEditFirst?.({});
  }, [onClose, onEditFirst]);

  // ── Derived values ────────────────────────────────────────────────────────────
  const suggestedCategoryName = parsed ? suggestCategoryName(parsed.merchant) : null;
  const isSaving = mutation.isPending;

  // ─────────────────────────────────────────────────────────────────────────────

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      showHandle
      fullHeight={false}
    >
      {/* ── Header ──────────────────────────────────────────────────────────── */}
      <div className="flex items-start gap-3 mb-5">
        <div
          className="flex-none flex items-center justify-center rounded-xl"
          style={{
            width: 40,
            height: 40,
            background: "var(--color-accent)" + "18",
          }}
        >
          <Sparkles size={20} style={{ color: "var(--color-accent)" }} />
        </div>
        <div>
          <h2
            className="font-display text-lg leading-tight"
            style={{ color: "var(--text-primary)" }}
          >
            Smart Paste
          </h2>
          <p
            className="text-sm mt-0.5"
            style={{ color: "var(--text-secondary)" }}
          >
            Paste your bank SMS and we&apos;ll do the rest
          </p>
        </div>
      </div>

      {/* ── Textarea + clipboard button ─────────────────────────────────────── */}
      <div className="relative mb-3">
        <textarea
          ref={textareaRef}
          rows={4}
          value={smsText}
          onChange={(e) => {
            setSmsText(e.target.value);
            if (uiState !== "idle") {
              setUiState("idle");
              setParsed(null);
            }
          }}
          placeholder="Paste bank SMS here..."
          disabled={uiState === "parsing" || isSaving}
          className="w-full resize-none rounded-xl text-sm leading-relaxed outline-none"
          style={{
            background: "var(--bg-input, var(--bg-navigation))",
            color: "var(--text-primary)",
            border: "1.5px solid var(--border-input, var(--border-default))",
            padding: "12px 44px 12px 14px",
            fontFamily: "var(--font-mono)",
            caretColor: "var(--color-accent)",
            minHeight: 96,
          }}
          aria-label="Bank SMS text"
        />

        {/* Clipboard paste button */}
        <button
          onClick={handleClipboardPaste}
          title="Paste from clipboard"
          className="absolute top-2.5 right-2.5 flex items-center justify-center rounded-lg transition-colors"
          style={{
            width: 32,
            height: 32,
            color: "var(--text-secondary)",
            background: "var(--bg-surface)",
          }}
          aria-label="Paste from clipboard"
        >
          <ClipboardPaste size={15} />
        </button>
      </div>

      {/* ── Parse button ────────────────────────────────────────────────────── */}
      {(uiState === "idle" || uiState === "parsing") && (
        <Button
          onClick={handleParse}
          loading={uiState === "parsing"}
          disabled={!smsText.trim() || uiState === "parsing"}
          fullWidth
          size="md"
        >
          Parse
          {uiState !== "parsing" && <ArrowRight size={16} />}
        </Button>
      )}

      {/* ── Parsed result card ──────────────────────────────────────────────── */}
      <AnimatePresence>
        {uiState === "parsed" && parsed && (
          <motion.div
            key="result"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ type: "spring", stiffness: 320, damping: 26 }}
          >
            {/* Amount + type */}
            <div
              className="flex items-center justify-between mb-3 mt-4 pb-3"
              style={{ borderBottom: "1px solid var(--border-default)" }}
            >
              <span
                className="font-display tabular-nums"
                style={{
                  fontSize: "2rem",
                  lineHeight: 1.1,
                  color:
                    parsed.type === "credit"
                      ? "var(--color-income)"
                      : "var(--color-expense)",
                }}
              >
                {parsed.type === "credit" ? "+" : "−"}
                {formatINR(parsed.amount)}
              </span>
              <Badge
                variant={parsed.type === "credit" ? "income" : "expense"}
                size="md"
              >
                {parsed.type === "credit" ? "Credit" : "Debit"}
              </Badge>
            </div>

            {/* Detail rows */}
            <div
              className="rounded-xl px-3 mb-4"
              style={{ background: "var(--bg-navigation)" }}
            >
              {parsed.merchant && (
                <FieldRow label="Merchant" value={parsed.merchant} />
              )}
              {parsed.date && (
                <FieldRow
                  label="Date"
                  value={formatDateDisplay(parsed.date)}
                />
              )}
              {parsed.account_last4 && (
                <FieldRow
                  label="Account"
                  value={`····${parsed.account_last4}`}
                />
              )}
              {parsed.bank && (
                <FieldRow label="Bank" value={parsed.bank} />
              )}
              {suggestedCategoryName && (
                <div className="flex items-center justify-between py-2">
                  <span
                    className="text-sm"
                    style={{ color: "var(--text-secondary)" }}
                  >
                    Category
                  </span>
                  <div className="flex items-center gap-1.5">
                    <Sparkles size={11} style={{ color: "var(--color-accent)" }} />
                    <span
                      className="text-sm font-medium"
                      style={{ color: "var(--color-accent)" }}
                    >
                      {suggestedCategoryName}
                    </span>
                  </div>
                </div>
              )}
            </div>

            {/* Actions */}
            <div className="flex flex-col gap-2.5">
              <Button
                onClick={handleConfirmSave}
                loading={isSaving}
                disabled={isSaving}
                fullWidth
                size="md"
              >
                <CheckCircle size={16} />
                Confirm &amp; Save
              </Button>
              <Button
                variant="secondary"
                onClick={handleEditFirst}
                disabled={isSaving}
                fullWidth
                size="md"
              >
                <PenLine size={16} />
                Edit First
              </Button>
            </div>
          </motion.div>
        )}

        {/* ── Error state ────────────────────────────────────────────────────── */}
        {uiState === "error" && (
          <motion.div
            key="error"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ type: "spring", stiffness: 320, damping: 26 }}
            className="mt-4"
          >
            <div
              className="flex items-start gap-3 p-4 rounded-xl mb-4"
              style={{
                background: "var(--color-expense)" + "12",
                border: "1px solid var(--color-expense)" + "30",
              }}
            >
              <AlertCircle
                size={18}
                className="flex-none mt-0.5"
                style={{ color: "var(--color-expense)" }}
              />
              <div>
                <p
                  className="text-sm font-medium"
                  style={{ color: "var(--text-primary)" }}
                >
                  Couldn&apos;t parse this SMS.
                </p>
                <p
                  className="text-sm mt-0.5"
                  style={{ color: "var(--text-secondary)" }}
                >
                  Try adding it manually.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-2.5">
              <Button
                onClick={handleAddManually}
                fullWidth
                size="md"
              >
                Add Manually
              </Button>
              <Button
                variant="ghost"
                onClick={() => {
                  setUiState("idle");
                  setParsed(null);
                }}
                fullWidth
                size="md"
              >
                Try Again
              </Button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </Modal>
  );
}

export default SmartPasteInput;
