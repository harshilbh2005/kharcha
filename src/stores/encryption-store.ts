// ============================================================
// KHARCHA — Encryption Key Store (Zustand)
// Holds the derived AES-256-GCM key in RAM + sessionStorage.
// sessionStorage survives page refreshes but clears on tab close.
// ============================================================

import { create } from 'zustand';

// ── SessionStorage keys ──────────────────────────────────────
const SK_KEY = 'kharcha_ek';
const SK_SALT = 'kharcha_es';

// ── Session persistence helpers (fire-and-forget) ────────────

async function persistToSession(key: CryptoKey, salt: Uint8Array): Promise<void> {
  try {
    if (typeof sessionStorage === 'undefined') return;
    const raw = await crypto.subtle.exportKey('raw', key);
    sessionStorage.setItem(
      SK_KEY,
      btoa(String.fromCharCode(...new Uint8Array(raw))),
    );
    sessionStorage.setItem(
      SK_SALT,
      btoa(String.fromCharCode(...salt)),
    );
  } catch {
    // Silently fail — user will re-enter PIN
  }
}

function clearSession(): void {
  try {
    if (typeof sessionStorage === 'undefined') return;
    sessionStorage.removeItem(SK_KEY);
    sessionStorage.removeItem(SK_SALT);
  } catch {
    // Ignore
  }
}

/**
 * Attempts to restore the AES key from sessionStorage.
 * Returns null if nothing is stored or restoration fails.
 */
export async function restoreKeyFromSession(): Promise<{
  key: CryptoKey;
  salt: Uint8Array;
} | null> {
  try {
    if (typeof sessionStorage === 'undefined') return null;
    const keyB64 = sessionStorage.getItem(SK_KEY);
    const saltB64 = sessionStorage.getItem(SK_SALT);
    if (!keyB64 || !saltB64) return null;

    const keyBytes = Uint8Array.from(atob(keyB64), (c) => c.charCodeAt(0));
    const salt = Uint8Array.from(atob(saltB64), (c) => c.charCodeAt(0));

    const key = await crypto.subtle.importKey(
      'raw',
      keyBytes,
      { name: 'AES-GCM', length: 256 },
      true,
      ['encrypt', 'decrypt'],
    );

    return { key, salt };
  } catch {
    clearSession();
    return null;
  }
}

// ── Store ────────────────────────────────────────────────────

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

    setKey: (key, salt) => {
      set({ cryptoKey: key, salt, isUnlocked: true, lastActivity: Date.now() });
      // Persist to sessionStorage (async, fire-and-forget)
      persistToSession(key, salt);
    },

    clearKey: () => {
      set({ cryptoKey: null, salt: null, isUnlocked: false });
      clearSession();
    },

    updateActivity: () =>
      set({ lastActivity: Date.now() }),
  }),
);
