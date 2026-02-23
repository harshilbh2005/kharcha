'use client';

// ============================================================
// KHARCHA — DepositModal
// Bottom-sheet modal for depositing into the emergency vault.
//
// Subtitle: "Adding to your safety net"
// Amount input (large, centered)
// Reason input (optional for deposits)
// Submit: "Deposit" button with sage background
// ============================================================

import { useState, useRef, useEffect } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { useEncryption } from '@/hooks/useEncryption';
import { useVaultDeposit } from '@/hooks/useVault';
import { useToast } from '@/components/ui/ToastProvider';
import { amountSchema } from '@/lib/validations';

// ── Props ────────────────────────────────────────────────────────────────────

export interface DepositModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Current decrypted vault balance — needed to compute new balance */
  currentBalance: number;
}

// ── Component ────────────────────────────────────────────────────────────────

export function DepositModal({ isOpen, onClose, currentBalance }: DepositModalProps) {
  const [amountStr, setAmountStr] = useState('');
  const [reason, setReason] = useState('');
  const [amountError, setAmountError] = useState('');

  const amountInputRef = useRef<HTMLInputElement>(null);
  const { encrypt } = useEncryption();
  const { toast } = useToast();
  const mutation = useVaultDeposit();

  // Reset form on close
  useEffect(() => {
    if (isOpen) {
      // Focus amount input after modal animation (~100ms)
      const t = setTimeout(() => amountInputRef.current?.focus(), 100);
      return () => clearTimeout(t);
    }
    setAmountStr('');
    setReason('');
    setAmountError('');
  }, [isOpen]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleaned = e.target.value
      .replace(/[^0-9.]/g, '')
      .replace(/(\..*)\./g, '$1');
    setAmountStr(cleaned);
    if (amountError) setAmountError('');
  };

  const handleSubmit = async () => {
    const parsed = amountSchema.safeParse(amountStr);
    if (!parsed.success) {
      setAmountError(parsed.error.issues[0].message);
      return;
    }

    const amount = parseFloat(amountStr);

    try {
      // Encrypt the deposit amount
      const { encrypted, hash } = await encrypt(amount);

      // Compute new vault balance
      const newBalance = currentBalance + amount;
      const { encrypted: newBalEnc, hash: newBalHash } = await encrypt(newBalance);

      await mutation.mutateAsync({
        input: {
          type: 'deposit',
          amount_encrypted: encrypted,
          amount_hash: hash,
          reason: reason.trim() || 'Vault deposit',
        },
        balancePayload: {
          new_balance_encrypted: newBalEnc,
          new_balance_hash: newBalHash,
        },
      });

      onClose();
    } catch {
      // Hook's onError handles toast
    }
  };

  const isLoading = mutation.isPending;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Deposit to Vault">
      <div className="flex flex-col gap-5">
        {/* Subtitle */}
        <p
          className="font-body text-sm -mt-2"
          style={{ color: 'var(--text-secondary)' }}
        >
          Adding to your safety net
        </p>

        {/* Amount input */}
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
              aria-label="Deposit amount in rupees"
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

        {/* Reason input */}
        <div>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason (optional)"
            disabled={isLoading}
            maxLength={200}
            aria-label="Reason for deposit"
            className="w-full bg-transparent text-base text-center outline-none"
            style={{
              color: reason ? 'var(--text-primary)' : 'var(--text-secondary)',
              borderBottom: '1.5px solid var(--border-input)',
              paddingBottom: '0.5rem',
              fontFamily: 'var(--font-body)',
              caretColor: 'var(--color-accent)',
            }}
          />
        </div>

        {/* Submit */}
        <div className="pt-1">
          <Button
            onClick={handleSubmit}
            loading={isLoading}
            disabled={isLoading}
            fullWidth
            size="lg"
            className="!bg-[var(--color-income)] !text-white enabled:hover:!brightness-90"
          >
            Deposit
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default DepositModal;
