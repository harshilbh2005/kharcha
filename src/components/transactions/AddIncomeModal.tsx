'use client';

// ============================================================
// KHARCHA — AddIncomeModal
// Bottom-sheet form for logging incoming money.
//
// Types: allowance, emergency_fund, festival_bonus,
//        pass_through, vault_replenish, other
//
// Emergency Fund flow:
//   1. Fetch current encrypted vault balance via getVaultBalance()
//   2. Decrypt → add income amount → re-encrypt
//   3. Pass VaultUpdatePayload to useCreateIncome mutation
// ============================================================

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Wallet, Shield, Gift, ArrowRightLeft,
  RefreshCw, MoreHorizontal,
} from 'lucide-react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { useCreateIncome } from '@/hooks/useIncome';
import { useEncryption } from '@/hooks/useEncryption';
import { useToast } from '@/components/ui/ToastProvider';
import { amountSchema } from '@/lib/validations';
import { getVault } from '@/app/actions/vault';
import type { IncomeType } from '@/types';
import type { VaultUpdatePayload } from '@/app/actions/income';

// ── Helpers ───────────────────────────────────────────────────────────────────

function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

function formatDateDisplay(iso: string): string {
  return new Date(iso + 'T00:00:00').toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

/** Convert hex color to rgba string for selected-state tints. */
function hexRgba(hex: string, alpha: number): string {
  const c = hex.replace('#', '');
  const r = parseInt(c.slice(0, 2), 16);
  const g = parseInt(c.slice(2, 4), 16);
  const b = parseInt(c.slice(4, 6), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

// ── Income type metadata ──────────────────────────────────────────────────────

/** Hex values matching the CSS design tokens in CLAUDE.md */
const TYPE_HEX: Record<IncomeType, string> = {
  allowance:      '#6B7D71', // --color-income (Sage Moss)
  emergency_fund: '#5C6B5E', // --color-vault  (Deep Forest)
  festival_bonus: '#8B7355', // --color-accent  (Aged Bronze)
  pass_through:   '#6B707C', // --text-secondary (Muted Blue-Grey)
  vault_replenish:'#5C6B5E', // --color-vault
  other:          '#6B707C', // --text-secondary
};

const TYPE_CSS_COLOR: Record<IncomeType, string> = {
  allowance:      'var(--color-income)',
  emergency_fund: 'var(--color-vault)',
  festival_bonus: 'var(--color-accent)',
  pass_through:   'var(--text-secondary)',
  vault_replenish:'var(--color-vault)',
  other:          'var(--text-secondary)',
};

interface IncomeTypeDef {
  type: IncomeType;
  label: string;
  Icon: React.ComponentType<{ size?: number; strokeWidth?: number; color?: string }>;
}

const INCOME_TYPE_DEFS: IncomeTypeDef[] = [
  { type: 'allowance',      label: 'Monthly Allowance', Icon: Wallet         },
  { type: 'emergency_fund', label: 'Emergency Fund',    Icon: Shield         },
  { type: 'festival_bonus', label: 'Festival Bonus',    Icon: Gift           },
  { type: 'pass_through',   label: 'Pass-Through',      Icon: ArrowRightLeft },
  { type: 'vault_replenish',label: 'Vault Replenish',   Icon: RefreshCw      },
  { type: 'other',          label: 'Other',             Icon: MoreHorizontal },
];

const DESCRIPTION_PLACEHOLDER: Record<IncomeType, string> = {
  allowance:      `${new Date().toLocaleString('en-IN', { month: 'long' })} allowance`,
  emergency_fund: 'Emergency fund deposit',
  festival_bonus: 'Diwali bonus',
  pass_through:   'College fees Q1',
  vault_replenish:'Vault replenishment',
  other:          'Additional income',
};

// ── TypeCard ──────────────────────────────────────────────────────────────────

interface TypeCardProps {
  def: IncomeTypeDef;
  isSelected: boolean;
  onSelect: (type: IncomeType) => void;
}

function TypeCard({ def, isSelected, onSelect }: TypeCardProps) {
  const [inkKey, setInkKey] = useState(0);
  const [isStamping, setIsStamping] = useState(false);

  const hex = TYPE_HEX[def.type];
  const cssColor = TYPE_CSS_COLOR[def.type];

  const handlePress = () => {
    onSelect(def.type);
    setInkKey((k) => k + 1);
    setIsStamping(true);
    setTimeout(() => setIsStamping(false), 400);
  };

  return (
    <button
      type="button"
      role="radio"
      aria-checked={isSelected}
      onClick={handlePress}
      className="relative flex items-center gap-2.5 p-3 rounded-xl w-full text-left overflow-hidden focus-visible:outline-none"
      style={{
        backgroundColor: isSelected ? hexRgba(hex, 0.08) : 'var(--bg-surface)',
        border: `${isSelected ? '1.5px' : '1px'} solid ${
          isSelected ? 'var(--color-accent)' : 'var(--border-default)'
        }`,
        transition: 'border-color 0.15s ease, background-color 0.15s ease',
        minHeight: 52,
      }}
    >
      {/* Ink ripple on select */}
      <AnimatePresence>
        {inkKey > 0 && (
          <motion.span
            key={inkKey}
            className="absolute inset-0 pointer-events-none"
            style={{ backgroundColor: 'var(--color-accent)' }}
            initial={{ scale: 0.5, opacity: 0.18 }}
            animate={{ scale: 2.5, opacity: 0 }}
            exit={{}}
            transition={{ duration: 0.4, ease: 'easeOut' }}
          />
        )}
      </AnimatePresence>

      {/* Icon badge */}
      <motion.span
        className="relative z-10 shrink-0 flex items-center justify-center rounded-lg"
        style={{
          width: 32,
          height: 32,
          backgroundColor: isSelected ? hexRgba(hex, 0.16) : 'var(--bg-navigation)',
          transition: 'background-color 0.15s ease',
        }}
        animate={isStamping ? { scale: [1, 1.22, 0.93, 1.0] } : { scale: 1 }}
        transition={
          isStamping
            ? { duration: 0.38, times: [0, 0.3, 0.7, 1] }
            : { type: 'spring', stiffness: 420, damping: 28 }
        }
      >
        <def.Icon
          size={15}
          color={cssColor}
          strokeWidth={isSelected ? 2 : 1.6}
        />
      </motion.span>

      {/* Label */}
      <span
        className="relative z-10 text-sm leading-tight"
        style={{
          color: isSelected ? 'var(--text-primary)' : 'var(--text-secondary)',
          fontWeight: isSelected ? 500 : 400,
          transition: 'color 0.15s ease',
        }}
      >
        {def.label}
      </span>
    </button>
  );
}

// ── Section label ─────────────────────────────────────────────────────────────

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-xs font-medium tracking-wider mb-2.5" style={{ color: 'var(--text-secondary)' }}>
      {children}
    </p>
  );
}

// ── AddIncomeModal ────────────────────────────────────────────────────────────

export interface AddIncomeModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function AddIncomeModal({ isOpen, onClose }: AddIncomeModalProps) {
  // ── Form state ──────────────────────────────────────────────────────────────
  const [incomeType, setIncomeType] = useState<IncomeType>('allowance');
  const [amountStr, setAmountStr] = useState('');
  const [description, setDescription] = useState('');
  const [passThroughFor, setPassThroughFor] = useState('');
  const [date, setDate] = useState(todayISO);
  const [showDateInput, setShowDateInput] = useState(false);

  // ── Validation errors ───────────────────────────────────────────────────────
  const [amountError, setAmountError] = useState('');
  const [descError, setDescError] = useState('');

  const amountInputRef = useRef<HTMLInputElement>(null);

  // ── Hooks ───────────────────────────────────────────────────────────────────
  const { encrypt, decrypt } = useEncryption();
  const { toast } = useToast();
  const mutation = useCreateIncome();

  // ── Reset form on close ─────────────────────────────────────────────────────
  useEffect(() => {
    if (isOpen) return;
    setIncomeType('allowance');
    setAmountStr('');
    setDescription('');
    setPassThroughFor('');
    setDate(todayISO());
    setShowDateInput(false);
    setAmountError('');
    setDescError('');
  }, [isOpen]);

  // ── Amount input handler ────────────────────────────────────────────────────
  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleaned = e.target.value
      .replace(/[^0-9.]/g, '')
      .replace(/(\..*)\./g, '$1');
    setAmountStr(cleaned);
    if (amountError) setAmountError('');
  };

  // ── Submit ──────────────────────────────────────────────────────────────────
  const handleSave = async () => {
    let valid = true;

    const parsed = amountSchema.safeParse(amountStr);
    if (!parsed.success) {
      setAmountError(parsed.error.issues[0].message);
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

    const amount = parseFloat(amountStr);

    try {
      // Encrypt the income amount
      const { encrypted, hash } = await encrypt(amount);

      // Build vault payload for emergency_fund (client must compute new balance)
      let vaultPayload: VaultUpdatePayload | undefined;
      if (incomeType === 'emergency_fund') {
        const vaultRes = await getVault();
        if ('error' in vaultRes) {
          toast({ title: 'Vault error', description: vaultRes.error, variant: 'error' });
          return;
        }
        const currentBalanceEnc = vaultRes.data.vault.current_balance_encrypted;
        const currentBalance = currentBalanceEnc === '0' ? 0 : await decrypt(currentBalanceEnc);
        const newBalance = currentBalance + amount;
        const { encrypted: newBalEnc, hash: newBalHash } = await encrypt(newBalance);
        vaultPayload = {
          new_balance_encrypted: newBalEnc,
          new_balance_hash: newBalHash,
        };
      }

      await mutation.mutateAsync({
        input: {
          amount_encrypted: encrypted,
          amount_hash: hash,
          currency: 'INR',
          type: incomeType,
          description: description.trim() || undefined,
          pass_through_for:
            incomeType === 'pass_through' && passThroughFor.trim()
              ? passThroughFor.trim()
              : undefined,
          date,
        },
        vaultPayload,
      });

      // mutateAsync resolves only on success
      onClose();
    } catch {
      // Encryption errors — the hook's onError handles mutation errors via toast.
    }
  };

  const isLoading = mutation.isPending;

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Log Income" fullHeight>
      <div className="flex flex-col gap-5">
        {/* ── 1. Type selector ─────────────────────────────────────────────── */}
        <div role="radiogroup" aria-label="Income type">
          <SectionLabel>TYPE</SectionLabel>
          <div className="grid grid-cols-2 gap-2">
            {INCOME_TYPE_DEFS.map((def) => (
              <TypeCard
                key={def.type}
                def={def}
                isSelected={incomeType === def.type}
                onSelect={(t) => {
                  setIncomeType(t);
                  setDescError('');
                }}
              />
            ))}
          </div>
        </div>

        {/* ── 2. Amount ─────────────────────────────────────────────────────── */}
        <div className="flex flex-col items-center py-2">
          <div className="flex items-baseline justify-center gap-1">
            <span
              className="font-display select-none"
              style={{
                fontSize: '2rem',
                lineHeight: 1,
                color: amountStr ? 'var(--color-income)' : 'var(--text-secondary)',
                transition: 'color 0.2s ease',
              }}
            >
              ₹
            </span>
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
                fontSize: '2.5rem',
                lineHeight: 1,
                color: amountStr ? 'var(--text-primary)' : 'var(--text-secondary)',
                width: `${Math.max(1, (amountStr || '0').length) + 1}ch`,
                minWidth: '3.5rem',
                maxWidth: '12rem',
                caretColor: 'var(--color-income)',
                transition: 'color 0.2s ease',
              }}
            />
          </div>
          {amountError && (
            <p className="text-sm mt-1.5" style={{ color: 'var(--color-danger)' }}>
              {amountError}
            </p>
          )}
        </div>

        {/* ── 3. Description ────────────────────────────────────────────────── */}
        <div>
          <input
            type="text"
            value={description}
            onChange={(e) => {
              setDescription(e.target.value);
              if (descError) setDescError('');
            }}
            placeholder={DESCRIPTION_PLACEHOLDER[incomeType]}
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

        {/* ── 4. Pass-through label (conditional) ─────────────────────────── */}
        <AnimatePresence>
          {incomeType === 'pass_through' && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              transition={{ duration: 0.2, ease: 'easeOut' }}
              style={{ overflow: 'hidden' }}
            >
              <SectionLabel>WHAT IS THIS FOR?</SectionLabel>
              <input
                type="text"
                value={passThroughFor}
                onChange={(e) => setPassThroughFor(e.target.value)}
                placeholder="Describe the bill this covers"
                disabled={isLoading}
                maxLength={200}
                aria-label="Pass-through purpose"
                className="w-full bg-transparent text-base outline-none"
                style={{
                  color: passThroughFor ? 'var(--text-primary)' : 'var(--text-secondary)',
                  borderBottom: '1.5px solid var(--border-input)',
                  paddingBottom: '0.5rem',
                  fontFamily: 'var(--font-body)',
                  caretColor: 'var(--color-accent)',
                }}
              />
            </motion.div>
          )}
        </AnimatePresence>

        {/* ── 5. Date ───────────────────────────────────────────────────────── */}
        <div>
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
              className="w-full mt-2.5 p-3 rounded-lg border text-sm"
              style={{
                borderColor: 'var(--border-input)',
                backgroundColor: 'var(--bg-surface)',
                color: 'var(--text-primary)',
              }}
            />
          )}
        </div>

        {/* ── 6. Save button ────────────────────────────────────────────────── */}
        <div className="pt-1">
          <Button
            onClick={handleSave}
            loading={isLoading}
            disabled={isLoading}
            fullWidth
            size="lg"
          >
            Save Income
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default AddIncomeModal;
