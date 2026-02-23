'use client';

// ============================================================
// KHARCHA — AddExpenseModal
// Full-screen add-expense form, unveiled via InkSpread.
//
// Flow:
//   1. Amount input (large, centered, auto-focus)
//   2. Description  → debounce 500 ms → AI categorize
//   3. Category picker  (auto-selected by AI, overridable)
//   4. Need / Want toggle
//   5. Date (optional)
//   6. Save / Cancel
//
// AI suggestion:
//   • Calls POST /api/ai/categorize after 500 ms of inactivity
//   • Auto-selects matching category + ✦ AI suggested badge
//   • User tap on a different category clears the badge and
//     saves the correction to ai_learning on submit
// ============================================================

import { useState, useRef, useEffect } from 'react';
import { format } from 'date-fns';
import { InkSpread } from '@/components/animations/InkSpread';
import { CategoryPicker } from '@/components/transactions/CategoryPicker';
import { NeedWantToggle } from '@/components/transactions/NeedWantToggle';
import Button from '@/components/ui/Button';
import { useCategories } from '@/hooks/useCategories';
import { useCreateTransaction } from '@/hooks/useTransactions';
import { useBudget } from '@/hooks/useBudget';
import { useEncryption } from '@/hooks/useEncryption';
import { amountSchema } from '@/lib/validations';
import { saveAiLearningOverride } from '@/app/actions/ai';
import { extractMerchantKeyword } from '@/lib/ai/categorize';
import type { CategorizationResult } from '@/types';

// ── Helpers ───────────────────────────────────────────────────────────────────

function todayISO(): string {
  return format(new Date(), 'yyyy-MM-dd');
}

function formatDateDisplay(iso: string): string {
  return format(new Date(iso + 'T00:00:00'), 'EEE, d MMM');
}

function formatINR(amount: number): string {
  return '₹' + Math.round(Math.abs(amount)).toLocaleString('en-IN');
}

// ── Types ─────────────────────────────────────────────────────────────────────

export interface AddExpenseModalPrefill {
  amount?: number;
  description?: string;
  merchant?: string;
  date?: string;
}

export interface AddExpenseModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Center coordinates of the FAB button that opened this modal. */
  origin: { x: number; y: number };
  /** Pre-fill form fields — used by SmartPasteInput "Edit First" flow. */
  prefill?: AddExpenseModalPrefill;
}

// ── Section label ─────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-xs font-medium tracking-wider mb-3"
      style={{ color: 'var(--text-secondary)' }}
    >
      {children}
    </p>
  );
}

// ── AddExpenseModal ───────────────────────────────────────────────────────────

export function AddExpenseModal({ isOpen, onClose, origin, prefill }: AddExpenseModalProps) {
  // ── Form state ──────────────────────────────────────────────────────────────
  const [amountStr, setAmountStr]         = useState('');
  const [description, setDescription]     = useState('');
  const [categoryId, setCategoryId]       = useState<string | undefined>();
  const [isNeed, setIsNeed]               = useState(true);
  const [date, setDate]                   = useState(todayISO);
  const [showDateInput, setShowDateInput] = useState(false);

  // ── Validation errors ───────────────────────────────────────────────────────
  const [amountError, setAmountError] = useState('');
  const [descError, setDescError]     = useState('');

  // ── AI suggestion state ─────────────────────────────────────────────────────
  // aiSuggestion:          last successful response from /api/ai/categorize
  // aiSuggestedCategoryId: category ID that was auto-selected by the AI
  // aiLoading:             debounce timer is running or fetch is in-flight
  const [aiSuggestion, setAiSuggestion]                   = useState<CategorizationResult | null>(null);
  const [aiLoading, setAiLoading]                         = useState(false);
  const [aiSuggestedCategoryId, setAiSuggestedCategoryId] = useState<string | undefined>();

  // Ref instead of state so the debounce callback reads the latest value
  // without needing to be listed as a dependency (avoids infinite loops).
  const userManuallyPickedRef = useRef(false);
  const aiDebounceRef         = useRef<ReturnType<typeof setTimeout> | null>(null);
  const amountInputRef        = useRef<HTMLInputElement>(null);

  // ── Data / mutation hooks ───────────────────────────────────────────────────
  const { data: categories = [], isLoading: categoriesLoading } = useCategories();
  const { data: budget } = useBudget();
  const { encrypt }      = useEncryption();
  const mutation         = useCreateTransaction();

  // ── Auto-focus amount after ink spread finishes (~420 ms) ──────────────────
  useEffect(() => {
    if (!isOpen) return;
    const t = setTimeout(() => amountInputRef.current?.focus(), 420);
    return () => clearTimeout(t);
  }, [isOpen]);

  // ── Reset / prefill form when modal opens or closes ─────────────────────────
  useEffect(() => {
    // Always cancel any pending AI call when open state changes
    if (aiDebounceRef.current) {
      clearTimeout(aiDebounceRef.current);
      aiDebounceRef.current = null;
    }

    if (isOpen) {
      setAmountStr(prefill?.amount != null ? String(prefill.amount) : '');
      setDescription(prefill?.description ?? prefill?.merchant ?? '');
      setDate(prefill?.date ?? todayISO());
      setCategoryId(undefined);
      setIsNeed(true);
      setShowDateInput(false);
      setAmountError('');
      setDescError('');
      setAiSuggestion(null);
      setAiLoading(false);
      setAiSuggestedCategoryId(undefined);
      userManuallyPickedRef.current = false;
    } else {
      setAmountStr('');
      setDescription('');
      setCategoryId(undefined);
      setIsNeed(true);
      setDate(todayISO());
      setShowDateInput(false);
      setAmountError('');
      setDescError('');
      setAiSuggestion(null);
      setAiLoading(false);
      setAiSuggestedCategoryId(undefined);
      userManuallyPickedRef.current = false;
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen]);

  // ── Amount input handler ────────────────────────────────────────────────────
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleaned = e.target.value
      .replace(/[^0-9.]/g, '')
      .replace(/(\..*)\./g, '$1'); // drop extra dots
    setAmountStr(cleaned);
    if (amountError) setAmountError('');
  };

  // ── Description change → debounced AI categorization ───────────────────────
  const handleDescriptionChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setDescription(value);
    if (descError) setDescError('');

    // Cancel any pending debounce timer
    if (aiDebounceRef.current) {
      clearTimeout(aiDebounceRef.current);
      aiDebounceRef.current = null;
    }

    // Don't bother for very short inputs
    if (value.trim().length < 3) {
      setAiSuggestion(null);
      setAiSuggestedCategoryId(undefined);
      userManuallyPickedRef.current = false;
      return;
    }

    // Snapshot amount NOW so the closure captures the right value
    // (state may change in the 500 ms before the timer fires)
    const snapshotAmount = amountStr;

    aiDebounceRef.current = setTimeout(async () => {
      setAiLoading(true);
      try {
        const res = await fetch('/api/ai/categorize', {
          method:  'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            description: value.trim(),
            amount:      parseFloat(snapshotAmount) || 0,
            currency:    'INR',
          }),
        });

        if (!res.ok) return; // silently ignore rate-limit or server errors

        const result = (await res.json()) as CategorizationResult;
        setAiSuggestion(result);

        // Auto-select category only when the user hasn't manually picked one
        if (!userManuallyPickedRef.current) {
          const match = categories.find(
            (c) => c.name.toLowerCase() === result.category.toLowerCase(),
          );
          if (match) {
            setCategoryId(match.id);
            setAiSuggestedCategoryId(match.id);
            setIsNeed(result.is_need);
          }
        }
      } catch {
        // Network error — AI suggestion is just a hint, fail silently
      } finally {
        setAiLoading(false);
      }
    }, 500);
  };

  // ── Category selection handler ──────────────────────────────────────────────
  const handleCategorySelect = (id: string) => {
    setCategoryId(id);
    userManuallyPickedRef.current = true; // prevent AI from overriding back
  };

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    let valid = true;

    const parsedAmount = amountSchema.safeParse(amountStr);
    if (!parsedAmount.success) {
      setAmountError(parsedAmount.error.issues[0].message);
      valid = false;
    } else {
      setAmountError('');
    }

    if (!description.trim()) {
      setDescError('Description required');
      valid = false;
    } else {
      setDescError('');
    }

    if (!valid) return;

    // ── Persist AI learning override (fire-and-forget) ────────────────────────
    // Conditions: AI suggested something, user picked a DIFFERENT category,
    // and the original suggestion wasn't already a cache hit (Tier 1).
    if (
      aiSuggestion &&
      aiSuggestion.source !== 'cache' &&
      userManuallyPickedRef.current &&
      categoryId &&
      categoryId !== aiSuggestedCategoryId
    ) {
      const selectedCategory = categories.find((c) => c.id === categoryId);
      if (selectedCategory) {
        saveAiLearningOverride(
          extractMerchantKeyword(description.trim()),
          selectedCategory.name,
          null,  // subcategory not exposed in the picker UI
          isNeed,
          aiSuggestion.category,
        ).catch(() => {}); // non-blocking
      }
    }

    try {
      const { encrypted, hash } = await encrypt(parseFloat(amountStr));
      await mutation.mutateAsync({
        amount_encrypted: encrypted,
        amount_hash:      hash,
        currency:         'INR',
        description:      description.trim(),
        category_id:      categoryId,
        is_pass_through:  false,
        is_need:          isNeed,
        date,
      });
      onClose();
    } catch {
      // EncryptionError or network error — the hook's onError shows a toast
    }
  };

  // ── Daily limit hint ────────────────────────────────────────────────────────
  const dailyLimitHint = budget
    ? budget.dailyLimit > 0
      ? `${formatINR(budget.dailyLimit)} left today`
      : `${formatINR(budget.dailyLimit)} over today's limit`
    : null;

  const dailyLimitColor =
    budget && budget.dailyLimit <= 0
      ? 'var(--color-expense)'
      : 'var(--text-secondary)';

  const isLoading = mutation.isPending;

  // AI sparkle badge: visible when AI auto-selected the current category
  const showAiBadge =
    !!aiSuggestion &&
    !aiLoading &&
    !!categoryId &&
    categoryId === aiSuggestedCategoryId;

  // Override note: user manually picked something different from AI
  const showAiOverrideNote =
    !!aiSuggestion &&
    !aiLoading &&
    userManuallyPickedRef.current &&
    !!aiSuggestedCategoryId &&
    categoryId !== aiSuggestedCategoryId;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <InkSpread isOpen={isOpen} origin={origin} onClose={onClose}>
      <div
        className="flex flex-col px-6"
        style={{ paddingTop: '5rem', paddingBottom: '8rem', minHeight: '100dvh' }}
      >
        {/* ── 1. Amount ──────────────────────────────────────────────────────── */}
        <div className="flex flex-col items-center pb-8">
          <div className="flex items-baseline justify-center gap-1">
            {/* ₹ prefix */}
            <span
              className="font-display select-none"
              style={{
                fontSize: '2.5rem',
                lineHeight: 1,
                color: amountStr ? 'var(--color-expense)' : 'var(--text-secondary)',
                transition: 'color 0.2s ease',
              }}
            >
              ₹
            </span>

            {/* Amount input — grows with content via ch units */}
            <input
              ref={amountInputRef}
              type="text"
              inputMode="decimal"
              value={amountStr}
              onChange={handleAmountChange}
              placeholder="0"
              disabled={isLoading}
              aria-label="Amount in rupees"
              aria-invalid={!!amountError}
              className="font-display bg-transparent outline-none text-center"
              style={{
                fontSize: '3rem',
                lineHeight: 1,
                color: amountStr ? 'var(--text-primary)' : 'var(--text-secondary)',
                width: `${Math.max(1, (amountStr || '0').length) + 1}ch`,
                minWidth: '4rem',
                maxWidth: '14rem',
                caretColor: 'var(--color-expense)',
                transition: 'color 0.2s ease',
              }}
            />
          </div>

          {/* Validation error or budget hint */}
          {amountError ? (
            <p className="text-sm mt-2" style={{ color: 'var(--color-danger)' }}>
              {amountError}
            </p>
          ) : dailyLimitHint ? (
            <p className="text-sm mt-2" style={{ color: dailyLimitColor }}>
              {dailyLimitHint}
            </p>
          ) : null}
        </div>

        {/* ── 2. Description ─────────────────────────────────────────────────── */}
        <div className="mb-8">
          <input
            type="text"
            value={description}
            onChange={handleDescriptionChange}
            placeholder="What was it for?"
            disabled={isLoading}
            maxLength={200}
            aria-label="Description"
            aria-invalid={!!descError}
            className="w-full bg-transparent text-base text-center outline-none"
            style={{
              color: description ? 'var(--text-primary)' : 'var(--text-secondary)',
              borderBottom: `1.5px solid ${descError ? 'var(--color-danger)' : 'var(--border-input)'}`,
              paddingBottom: '0.5rem',
              fontFamily: 'var(--font-body)',
              caretColor: 'var(--color-accent)',
              transition: 'border-color 0.15s ease',
            }}
          />
          {descError && (
            <p className="text-sm mt-1 text-center" style={{ color: 'var(--color-danger)' }}>
              {descError}
            </p>
          )}
        </div>

        {/* ── 3. Category Picker ─────────────────────────────────────────────── */}
        {!categoriesLoading && categories.length > 0 && (
          <div className="mb-6">
            {/* Section header row — label + AI status */}
            <div className="flex items-center gap-2 mb-3">
              <p
                className="text-xs font-medium tracking-wider"
                style={{ color: 'var(--text-secondary)' }}
              >
                CATEGORY
              </p>

              {/* Pulsing indicator while AI is in-flight */}
              {aiLoading && (
                <span
                  className="text-xs"
                  style={{ color: 'var(--color-accent)', opacity: 0.65 }}
                >
                  ✦ detecting…
                </span>
              )}

              {/* Sparkle badge: AI auto-selected the current category */}
              {showAiBadge && (
                <span
                  className="text-xs font-medium"
                  style={{ color: 'var(--color-accent)' }}
                >
                  ✦ AI suggested
                </span>
              )}

              {/* Override note: user picked something different from AI */}
              {showAiOverrideNote && (
                <span
                  className="text-xs"
                  style={{ color: 'var(--text-secondary)', opacity: 0.55 }}
                >
                  AI: {aiSuggestion!.category}
                </span>
              )}
            </div>

            <CategoryPicker
              selected={categoryId}
              onSelect={handleCategorySelect}
              categories={categories}
            />
          </div>
        )}

        {/* ── 4. Need / Want Toggle ──────────────────────────────────────────── */}
        <div className="mb-6">
          <SectionLabel>TYPE</SectionLabel>
          <NeedWantToggle value={isNeed} onChange={setIsNeed} />
        </div>

        {/* ── 5. Date ────────────────────────────────────────────────────────── */}
        <div className="mb-8">
          <div className="flex items-center justify-between">
            <div>
              <SectionLabel>DATE</SectionLabel>
              <p className="text-sm -mt-1" style={{ color: 'var(--text-primary)' }}>
                {formatDateDisplay(date)}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setShowDateInput((v) => !v)}
              disabled={isLoading}
              className="text-sm focus-visible:outline-none"
              style={{ color: 'var(--color-accent)' }}
            >
              Change date
            </button>
          </div>

          {showDateInput && (
            <input
              type="date"
              value={date}
              onChange={(e) => {
                if (e.target.value) {
                  setDate(e.target.value);
                  setShowDateInput(false);
                }
              }}
              max={todayISO()}
              className="w-full mt-3 p-3 rounded-lg border text-sm"
              style={{
                borderColor:     'var(--border-input)',
                backgroundColor: 'var(--bg-surface)',
                color:           'var(--text-primary)',
              }}
            />
          )}
        </div>

        {/* ── 6. Actions ─────────────────────────────────────────────────────── */}
        <div className="flex flex-col gap-3 mt-auto">
          <Button
            onClick={handleSave}
            loading={isLoading}
            disabled={isLoading}
            fullWidth
            size="lg"
          >
            Save Expense
          </Button>

          <Button
            variant="ghost"
            onClick={onClose}
            disabled={isLoading}
            fullWidth
            size="md"
          >
            Cancel
          </Button>
        </div>
      </div>
    </InkSpread>
  );
}

export default AddExpenseModal;
