'use client';

// ============================================================
// KHARCHA — WithdrawModal
// Bottom-sheet modal for withdrawing from the emergency vault.
//
// Subtitle: "Reason for withdrawal?"
// Amount input (large, centered)
// Reason input (REQUIRED for withdrawals)
// Client-side validation: amount <= current balance
// Submit: "Withdraw" button with terracotta background
// ============================================================

import { useState, useRef, useEffect } from 'react';
import Modal from '@/components/ui/Modal';
import Button from '@/components/ui/Button';
import { useEncryption } from '@/hooks/useEncryption';
import { useVaultWithdraw } from '@/hooks/useVault';
import { useToast } from '@/components/ui/ToastProvider';
import { amountSchema } from '@/lib/validations';

// ── Props ────────────────────────────────────────────────────────────────────

export interface WithdrawModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** Current decrypted vault balance — for validation and new balance computation */
  currentBalance: number;
}

// ── Component ────────────────────────────────────────────────────────────────

export function WithdrawModal({ isOpen, onClose, currentBalance }: WithdrawModalProps) {
  const [amountStr, setAmountStr] = useState('');
  const [reason, setReason] = useState('');
  const [amountError, setAmountError] = useState('');
  const [reasonError, setReasonError] = useState('');

  const amountInputRef = useRef<HTMLInputElement>(null);
  const { encrypt } = useEncryption();
  const { toast } = useToast();
  const mutation = useVaultWithdraw();

  // Reset form on close
  useEffect(() => {
    if (isOpen) {
      const t = setTimeout(() => amountInputRef.current?.focus(), 100);
      return () => clearTimeout(t);
    }
    setAmountStr('');
    setReason('');
    setAmountError('');
    setReasonError('');
  }, [isOpen]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const cleaned = e.target.value
      .replace(/[^0-9.]/g, '')
      .replace(/(\..*)\./g, '$1');
    setAmountStr(cleaned);
    if (amountError) setAmountError('');
  };

  const handleSubmit = async () => {
    let valid = true;

    // Validate amount
    const parsed = amountSchema.safeParse(amountStr);
    if (!parsed.success) {
      setAmountError(parsed.error.issues[0].message);
      valid = false;
    } else {
      const amount = parseFloat(amountStr);
      if (amount > currentBalance) {
        setAmountError(`Exceeds vault balance (₹${Math.round(currentBalance).toLocaleString('en-IN')})`);
        valid = false;
      } else {
        setAmountError('');
      }
    }

    // Validate reason (required)
    if (!reason.trim()) {
      setReasonError('Reason is required for withdrawals');
      valid = false;
    } else {
      setReasonError('');
    }

    if (!valid) return;

    const amount = parseFloat(amountStr);

    try {
      // Encrypt the withdrawal amount
      const { encrypted, hash } = await encrypt(amount);

      // Compute new vault balance
      const newBalance = currentBalance - amount;
      const { encrypted: newBalEnc, hash: newBalHash } = await encrypt(newBalance);

      await mutation.mutateAsync({
        input: {
          type: 'withdrawal',
          amount_encrypted: encrypted,
          amount_hash: hash,
          reason: reason.trim(),
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
    <Modal isOpen={isOpen} onClose={onClose} title="Withdraw from Vault">
      <div className="flex flex-col gap-5">
        {/* Subtitle */}
        <p
          className="font-body text-sm -mt-2"
          style={{ color: 'var(--text-secondary)' }}
        >
          Reason for withdrawal?
        </p>

        {/* Amount input */}
        <div className="flex flex-col items-center py-2">
          <div className="flex items-baseline justify-center gap-1">
            <span
              className="font-display select-none"
              style={{
                fontSize: '2rem',
                lineHeight: 1,
                color: amountStr ? 'var(--color-expense)' : 'var(--text-secondary)',
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
              aria-label="Withdrawal amount in rupees"
              aria-invalid={!!amountError}
              className="font-display bg-transparent outline-none text-center"
              style={{
                fontSize: '2.5rem',
                lineHeight: 1,
                color: amountStr ? 'var(--text-primary)' : 'var(--text-secondary)',
                width: `${Math.max(1, (amountStr || '0').length) + 1}ch`,
                minWidth: '3.5rem',
                maxWidth: '12rem',
                caretColor: 'var(--color-expense)',
                transition: 'color 0.2s ease',
              }}
            />
          </div>
          {amountError ? (
            <p className="text-sm mt-1.5" style={{ color: 'var(--color-danger)' }}>
              {amountError}
            </p>
          ) : (
            <p className="text-xs mt-1.5" style={{ color: 'var(--text-secondary)' }}>
              Available: ₹{Math.round(currentBalance).toLocaleString('en-IN')}
            </p>
          )}
        </div>

        {/* Reason input (required) */}
        <div>
          <input
            type="text"
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              if (reasonError) setReasonError('');
            }}
            placeholder="Why are you withdrawing?"
            disabled={isLoading}
            maxLength={200}
            aria-label="Reason for withdrawal"
            aria-invalid={!!reasonError}
            className="w-full bg-transparent text-base text-center outline-none"
            style={{
              color: reason ? 'var(--text-primary)' : 'var(--text-secondary)',
              borderBottom: `1.5px solid ${reasonError ? 'var(--color-danger)' : 'var(--border-input)'}`,
              paddingBottom: '0.5rem',
              fontFamily: 'var(--font-body)',
              caretColor: 'var(--color-accent)',
              transition: 'border-color 0.15s ease',
            }}
          />
          {reasonError && (
            <p className="text-sm mt-1 text-center" style={{ color: 'var(--color-danger)' }}>
              {reasonError}
            </p>
          )}
        </div>

        {/* Submit */}
        <div className="pt-1">
          <Button
            onClick={handleSubmit}
            loading={isLoading}
            disabled={isLoading}
            fullWidth
            size="lg"
            variant="danger"
          >
            Withdraw
          </Button>
        </div>
      </div>
    </Modal>
  );
}

export default WithdrawModal;
