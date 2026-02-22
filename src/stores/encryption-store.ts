// ============================================================
// KHARCHA — Encryption Key Store (Zustand, memory-only)
// Holds the derived AES-256-GCM key in RAM. Clears on tab close.
// NEVER persists to localStorage, sessionStorage, or IndexedDB.
// ============================================================

import { create } from 'zustand';

interface EncryptionState {
  cryptoKey: CryptoKey | null;
  salt: Uint8Array | null;
  isUnlocked: boolean;
  lastActivity: number;
}

interface EncryptionActions {
  setKey: (key: CryptoKey, salt: Uint8Array) => void;
  clearKey: () => void;
  updateActivity: () => void;
}

export const useEncryptionStore = create<EncryptionState & EncryptionActions>(
  (set) => ({
    cryptoKey: null,
    salt: null,
    isUnlocked: false,
    lastActivity: 0,

    setKey: (key, salt) =>
      set({ cryptoKey: key, salt, isUnlocked: true, lastActivity: Date.now() }),

    clearKey: () =>
      set({ cryptoKey: null, salt: null, isUnlocked: false }),

    updateActivity: () =>
      set({ lastActivity: Date.now() }),
  }),
);
