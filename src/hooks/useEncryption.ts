// ============================================================
// KHARCHA — useEncryption Hook
// Convenient encrypt/decrypt using the in-memory key store.
// ============================================================

import { useCallback } from 'react';
import { useEncryptionStore } from '@/stores/encryption-store';
import { encryptAndHash, decryptAmount } from '@/lib/crypto';

export class EncryptionError extends Error {
  constructor(
    public readonly code: 'NOT_UNLOCKED',
    message: string,
  ) {
    super(message);
    this.name = 'EncryptionError';
  }
}

export function useEncryption() {
  const isUnlocked = useEncryptionStore((s) => s.isUnlocked);
  const cryptoKey = useEncryptionStore((s) => s.cryptoKey);
  const updateActivity = useEncryptionStore((s) => s.updateActivity);

  const encrypt = useCallback(
    async (amount: number): Promise<{ encrypted: string; hash: string }> => {
      if (!cryptoKey) {
        throw new EncryptionError('NOT_UNLOCKED', 'App is locked — enter PIN to unlock');
      }
      updateActivity();
      const amountStr = amount.toFixed(2);
      return encryptAndHash(amountStr, cryptoKey);
    },
    [cryptoKey, updateActivity],
  );

  const decrypt = useCallback(
    async (encryptedBase64: string): Promise<number> => {
      if (!cryptoKey) {
        throw new EncryptionError('NOT_UNLOCKED', 'App is locked — enter PIN to unlock');
      }
      updateActivity();
      const plaintext = await decryptAmount(encryptedBase64, cryptoKey);
      return parseFloat(plaintext);
    },
    [cryptoKey, updateActivity],
  );

  const decryptMany = useCallback(
    async (encryptedValues: string[]): Promise<number[]> => {
      if (!cryptoKey) {
        throw new EncryptionError('NOT_UNLOCKED', 'App is locked — enter PIN to unlock');
      }
      updateActivity();
      return Promise.all(
        encryptedValues.map(async (val) => {
          const plaintext = await decryptAmount(val, cryptoKey);
          return parseFloat(plaintext);
        }),
      );
    },
    [cryptoKey, updateActivity],
  );

  return { isUnlocked, encrypt, decrypt, decryptMany };
}
