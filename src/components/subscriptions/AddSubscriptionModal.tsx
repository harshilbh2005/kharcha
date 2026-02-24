'use client';

// ============================================================
// KHARCHA — AddSubscriptionModal (Phase 6)
// Bottom sheet form for creating/editing subscriptions.
// Pattern: AddIncomeModal.tsx (Modal + form fields)
// ============================================================

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { motion } from 'framer-motion';
import { Minus, Plus } from 'lucide-react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { useEncryption } from '@/hooks/useEncryption';
import { useCreateSubscription, useUpdateSubscription } from '@/hooks/useSubscriptions';
import { useCategories } from '@/hooks/useCategories';
import { amountSchema } from '@/lib/validations';
import type { SubscriptionDecrypted, Currency, BillingCycle } from '@/types';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function formatINR(amount: number): string {
  return new Intl.NumberFormat('en-IN', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
}

// ─── Section label (shared pattern from AddIncomeModal) ──────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p
      className="text-xs font-medium tracking-wider mb-2"
      style={{ color: 'var(--text-secondary)' }}
    >
      {children}
    </p>
  );
}

// ─── Props ────────────────────────────────────────────────────────────────────

export interface AddSubscriptionModalProps {
  isOpen: boolean;
  onClose: () => void;
  editSubscription?: SubscriptionDecrypted;
  exchangeRate: number;
}

// ─── Component ────────────────────────────────────────────────────────────────

export function AddSubscriptionModal({
  isOpen,
  onClose,
  editSubscription,
  exchangeRate,
}: AddSubscriptionModalProps) {
  const router = useRouter();
  const isEditing = Boolean(editSubscription);

  // ── Form state ──────────────────────────────────────────────────────────────
  const [name, setName] = useState('');
  const [amountStr, setAmountStr] = useState('');
  const [currency, setCurrency] = useState<Currency>('INR');
  const [billingDay, setBillingDay] = useState<number>(1);
  const [billingCycle, setBillingCycle] = useState<BillingCycle>('monthly');
  const [categoryId, setCategoryId] = useState<string | null>(null);
  const [keywords, setKeywords] = useState('');
  const [remindDays, setRemindDays] = useState(3);

  // ── Validation errors ───────────────────────────────────────────────────────
  const [nameError, setNameError] = useState('');
  const [amountError, setAmountError] = useState('');

  const nameInputRef = useRef<HTMLInputElement>(null);
  const billingDayRef = useRef<HTMLDivElement>(null);

  // ── Hooks ───────────────────────────────────────────────────────────────────
  const { encrypt } = useEncryption();
  const createMutation = useCreateSubscription();
  const updateMutation = useUpdateSubscription();
  const { data: categories } = useCategories();

  // ── Populate form when editing ──────────────────────────────────────────────
  useEffect(() => {
    if (!isOpen) return;

    if (editSubscription) {
      setName(editSubscription.name);
      setAmountStr(String(editSubscription.amount));
      setCurrency(editSubscription.currency);
      setBillingDay(editSubscription.billing_day ?? 1);
      setBillingCycle(editSubscription.billing_cycle);
      setCategoryId(editSubscription.category_id);
      setKeywords(editSubscription.auto_match_keywords?.join(', ') ?? '');
      setRemindDays(editSubscription.remind_days_before);
    } else {
      // Reset for new subscription
      setName('');
      setAmountStr('');
      setCurrency('INR');
      setBillingDay(1);
      setBillingCycle('monthly');
      setCategoryId(null);
      setKeywords('');
      setRemindDays(3);
    }
    setNameError('');
    setAmountError('');
  }, [isOpen, editSubscription]);

  // ── Scroll selected billing day into view ───────────────────────────────────
  useEffect(() => {
    if (!isOpen || !billingDayRef.current) return;
    const selected = billingDayRef.current.querySelector('[data-selected="true"]');
    if (selected) {
      selected.scrollIntoView({ behavior: 'smooth', block: 'nearest', inline: 'center' });
    }
  }, [isOpen, billingDay]);

  // ── Amount input handler ────────────────────────────────────────────────────
  const handleAmountChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const cleaned = e.target.value
      .replace(/[^0-9.]/g, '')
      .replace(/(\..*)\./g, '$1');
    setAmountStr(cleaned);
    if (amountError) setAmountError('');
  }, [amountError]);

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    let valid = true;

    if (!name.trim()) {
      setNameError('Name required');
      valid = false;
    } else {
      setNameError('');
    }

    const parsedAmount = amountSchema.safeParse(amountStr);
    if (!parsedAmount.success) {
      setAmountError(parsedAmount.error.issues[0].message);
      valid = false;
    } else {
      setAmountError('');
    }

    if (!valid) return;

    const amount = parseFloat(amountStr);

    try {
      const { encrypted } = await encrypt(amount);

      // If USD, also encrypt the INR equivalent
      let amountInrEncrypted: string | null = null;
      if (currency === 'USD') {
        const inrAmount = amount * exchangeRate;
        const { encrypted: inrEnc } = await encrypt(inrAmount);
        amountInrEncrypted = inrEnc;
      }

      const keywordArray = keywords
        .split(',')
        .map((k) => k.trim())
        .filter(Boolean);

      if (isEditing && editSubscription) {
        await updateMutation.mutateAsync({
          id: editSubscription.id,
          name: name.trim(),
          amount_encrypted: encrypted,
          amount_inr_encrypted: amountInrEncrypted,
          currency,
          billing_day: billingDay,
          billing_cycle: billingCycle,
          category_id: categoryId,
          auto_match_keywords: keywordArray.length > 0 ? keywordArray : null,
          remind_days_before: remindDays,
        });
      } else {
        await createMutation.mutateAsync({
          name: name.trim(),
          amount_encrypted: encrypted,
          amount_inr_encrypted: amountInrEncrypted,
          currency,
          billing_day: billingDay,
          billing_cycle: billingCycle,
          category_id: categoryId ?? undefined,
          auto_match_keywords: keywordArray.length > 0 ? keywordArray : undefined,
          remind_days_before: remindDays,
        });
      }

      onClose();
    } catch {
      // Hook's onError handles mutation errors via toast
    }
  };

  const isLoading = createMutation.isPending || updateMutation.isPending;
  const isUSD = currency === 'USD';
  const previewINR = isUSD && amountStr && !isNaN(parseFloat(amountStr))
    ? parseFloat(amountStr) * exchangeRate
    : null;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditing ? 'Edit Subscription' : 'Add Subscription'}
      fullHeight
    >
      {/*
        fullHeight modals have padding:0 on the shell so children control layout.
        This scrollable wrapper adds consistent horizontal padding (matching the
        Modal title's own 20px inset) and lets the sheet scroll when content
        overflows on shorter phones.
      */}
      <div
        className="flex flex-col gap-5 overflow-y-auto flex-1"
        style={{ padding: '4px 20px 20px' }}
      >
        {/* ── 1. Name ──────────────────────────────────────────────────── */}
        <div>
          <SectionLabel>NAME</SectionLabel>
          <input
            ref={nameInputRef}
            type="text"
            value={name}
            onChange={(e) => {
              setName(e.target.value);
              if (nameError) setNameError('');
            }}
            placeholder="e.g. YouTube Premium"
            disabled={isLoading}
            maxLength={100}
            aria-label="Subscription name"
            aria-invalid={!!nameError}
            className="w-full bg-transparent text-base outline-none"
            style={{
              color: name ? 'var(--text-primary)' : 'var(--text-secondary)',
              borderBottom: `1.5px solid ${nameError ? 'var(--color-danger)' : 'var(--border-input)'}`,
              paddingBottom: '0.5rem',
              fontFamily: 'var(--font-body)',
              caretColor: 'var(--color-accent)',
            }}
          />
          {nameError && (
            <p className="text-sm mt-1" style={{ color: 'var(--color-danger)' }}>
              {nameError}
            </p>
          )}
        </div>

        {/* ── 2. Amount + Currency toggle ──────────────────────────────── */}
        <div>
          <SectionLabel>AMOUNT</SectionLabel>
          <div className="flex items-center gap-3">
            {/* Currency pills */}
            <div
              className="flex rounded-lg overflow-hidden border"
              style={{ borderColor: 'var(--border-default)' }}
            >
              {(['INR', 'USD'] as Currency[]).map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setCurrency(c)}
                  disabled={isLoading}
                  className="px-3 py-1.5 text-sm font-medium transition-colors"
                  style={{
                    backgroundColor: currency === c ? 'var(--color-accent)' : 'transparent',
                    color: currency === c ? 'var(--text-on-accent)' : 'var(--text-secondary)',
                  }}
                >
                  {c === 'INR' ? '₹' : '$'}
                </button>
              ))}
            </div>

            {/* Amount input */}
            <div className="flex-1">
              <input
                type="text"
                inputMode="decimal"
                value={amountStr}
                onChange={handleAmountChange}
                placeholder="0"
                disabled={isLoading}
                aria-label={`Amount in ${currency}`}
                aria-invalid={!!amountError}
                className="w-full bg-transparent text-xl font-display outline-none"
                style={{
                  color: amountStr ? 'var(--text-primary)' : 'var(--text-secondary)',
                  caretColor: 'var(--color-accent)',
                }}
              />
            </div>
          </div>

          {amountError && (
            <p className="text-sm mt-1" style={{ color: 'var(--color-danger)' }}>
              {amountError}
            </p>
          )}

          {/* INR preview for USD subscriptions */}
          {previewINR !== null && (
            <p className="text-sm mt-1.5" style={{ color: 'var(--text-secondary)' }}>
              ≈ ₹{formatINR(previewINR)}
            </p>
          )}
        </div>

        {/* ── 3. Billing day picker (horizontal scroll 1-31) ──────────── */}
        {/*
          Bleeds edge-to-edge so the scroll rail spans the full sheet width
          while the label and content still align with the 20px inset.
          Negative margin + compensating padding is the standard pattern.
        */}
        <div>
          <SectionLabel>BILLING DAY</SectionLabel>
          <div
            ref={billingDayRef}
            className="flex gap-1.5 overflow-x-auto pb-1"
            style={{
              marginLeft: -20,
              marginRight: -20,
              paddingLeft: 20,
              paddingRight: 20,
              scrollbarWidth: 'none',
              msOverflowStyle: 'none',
            }}
          >
            {Array.from({ length: 31 }, (_, i) => i + 1).map((day) => {
              const isSelected = billingDay === day;
              return (
                <button
                  key={day}
                  type="button"
                  data-selected={isSelected}
                  onClick={() => setBillingDay(day)}
                  disabled={isLoading}
                  className="shrink-0 flex items-center justify-center rounded-full text-sm font-medium transition-colors"
                  style={{
                    width: 36,
                    height: 36,
                    minWidth: 36,
                    backgroundColor: isSelected ? 'var(--color-accent)' : 'transparent',
                    color: isSelected ? 'var(--text-on-accent)' : 'var(--text-secondary)',
                    border: isSelected ? 'none' : '1px solid var(--border-default)',
                  }}
                >
                  {day}
                </button>
              );
            })}
          </div>
        </div>

        {/* ── 4. Billing cycle ─────────────────────────────────────────── */}
        <div>
          <SectionLabel>BILLING CYCLE</SectionLabel>
          <div
            className="flex rounded-lg overflow-hidden border"
            style={{ borderColor: 'var(--border-default)' }}
          >
            {(['monthly', 'yearly'] as BillingCycle[]).map((cycle) => (
              <button
                key={cycle}
                type="button"
                onClick={() => setBillingCycle(cycle)}
                disabled={isLoading}
                className="flex-1 py-2 text-sm font-medium transition-colors capitalize"
                style={{
                  backgroundColor: billingCycle === cycle ? 'var(--color-accent)' : 'transparent',
                  color: billingCycle === cycle ? 'var(--text-on-accent)' : 'var(--text-secondary)',
                }}
              >
                {cycle}
              </button>
            ))}
          </div>
        </div>

        {/* ── 5. Category (simple select from existing categories) ──── */}
        {categories && categories.length > 0 && (
          <div>
            <SectionLabel>CATEGORY</SectionLabel>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setCategoryId(null)}
                disabled={isLoading}
                className="px-3 py-1.5 rounded-full text-sm transition-colors"
                style={{
                  backgroundColor: categoryId === null ? 'var(--color-accent)' : 'transparent',
                  color: categoryId === null ? 'var(--text-on-accent)' : 'var(--text-secondary)',
                  border: categoryId === null ? 'none' : '1px solid var(--border-default)',
                }}
              >
                None
              </button>
              {categories.map((cat) => (
                <button
                  key={cat.id}
                  type="button"
                  onClick={() => setCategoryId(cat.id)}
                  disabled={isLoading}
                  className="px-3 py-1.5 rounded-full text-sm transition-colors"
                  style={{
                    backgroundColor: categoryId === cat.id ? 'var(--color-accent)' : 'transparent',
                    color: categoryId === cat.id ? 'var(--text-on-accent)' : 'var(--text-secondary)',
                    border: categoryId === cat.id ? 'none' : '1px solid var(--border-default)',
                  }}
                >
                  {cat.icon} {cat.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* ── 6. Keywords (comma-separated) ────────────────────────────── */}
        <div>
          <SectionLabel>AUTO-MATCH KEYWORDS</SectionLabel>
          <input
            type="text"
            value={keywords}
            onChange={(e) => setKeywords(e.target.value)}
            placeholder="youtube, google, yt premium"
            disabled={isLoading}
            maxLength={300}
            aria-label="Auto-match keywords, comma separated"
            className="w-full bg-transparent text-sm outline-none"
            style={{
              color: keywords ? 'var(--text-primary)' : 'var(--text-secondary)',
              borderBottom: '1.5px solid var(--border-input)',
              paddingBottom: '0.5rem',
              fontFamily: 'var(--font-body)',
              caretColor: 'var(--color-accent)',
            }}
          />
          <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
            Comma-separated. Used to auto-match transactions.
          </p>
        </div>

        {/* ── 7. Remind days stepper ──────────────────────────────────── */}
        <div>
          <SectionLabel>REMIND BEFORE</SectionLabel>
          <div className="flex items-center gap-3">
            <motion.button
              type="button"
              whileTap={{ scale: 0.9 }}
              onClick={() => setRemindDays((d) => Math.max(0, d - 1))}
              disabled={isLoading || remindDays <= 0}
              className="flex items-center justify-center rounded-full disabled:opacity-40"
              style={{
                width: 36,
                height: 36,
                border: '1px solid var(--border-default)',
                backgroundColor: 'var(--bg-surface)',
              }}
            >
              <Minus size={16} color="var(--text-secondary)" />
            </motion.button>

            <span
              className="font-mono text-lg font-medium tabular-nums min-w-[3ch] text-center"
              style={{ color: 'var(--text-primary)' }}
            >
              {remindDays}
            </span>

            <motion.button
              type="button"
              whileTap={{ scale: 0.9 }}
              onClick={() => setRemindDays((d) => Math.min(14, d + 1))}
              disabled={isLoading || remindDays >= 14}
              className="flex items-center justify-center rounded-full disabled:opacity-40"
              style={{
                width: 36,
                height: 36,
                border: '1px solid var(--border-default)',
                backgroundColor: 'var(--bg-surface)',
              }}
            >
              <Plus size={16} color="var(--text-secondary)" />
            </motion.button>

            <span
              className="text-sm"
              style={{ color: 'var(--text-secondary)' }}
            >
              day{remindDays !== 1 ? 's' : ''} before renewal
            </span>
          </div>
        </div>

        {/* ── 8. Save button ──────────────────────────────────────────── */}
        <div className="pt-1">
          <Button
            onClick={handleSave}
            loading={isLoading}
            disabled={isLoading}
            fullWidth
            size="lg"
          >
            {isEditing ? 'Update Subscription' : 'Add Subscription'}
          </Button>
        </div>

        {/* ── 9. View all link (discover the full subscriptions page) ──── */}
        <button
          type="button"
          onClick={() => {
            onClose();
            setTimeout(() => router.push('/subscriptions'), 150);
          }}
          className="text-center text-sm font-body pt-1 pb-2"
          style={{ color: 'var(--color-accent)', background: 'none', border: 'none', cursor: 'pointer' }}
        >
          View all subscriptions →
        </button>
      </div>
    </Modal>
  );
}

export default AddSubscriptionModal;
