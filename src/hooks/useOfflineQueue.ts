'use client';

// ============================================================
// KHARCHA — useOfflineQueue
//
// Manages the offline transaction queue lifecycle:
//   • Tracks navigator.onLine state via window events
//   • Exposes `enqueue` for adding transactions when offline
//   • Automatically drains the queue when the device comes back
//     online by calling the createTransaction server action
//   • Provides `queueCount` for UI badge / banner
//   • Provides `isProcessing` for syncing spinner
//
// IndexedDB access is deferred until the first call to prevent
// SSR errors — this hook is always rendered client-side only.
// ============================================================

import { useState, useEffect, useCallback, useRef } from 'react';
import type { CreateTransactionInput } from '@/lib/validations';
import type { ProcessResult } from '@/lib/offline-queue';

// ── Types ─────────────────────────────────────────────────────────────────────

export interface OfflineQueueState {
  /** True when navigator.onLine is false */
  isOffline: boolean;
  /** Number of transactions waiting to be synced */
  queueCount: number;
  /** True while the queue is being drained after reconnection */
  isProcessing: boolean;
  /** Add a transaction to the queue (call when offline) */
  enqueue: (data: CreateTransactionInput) => Promise<string>;
}

// ── Hook ──────────────────────────────────────────────────────────────────────

export function useOfflineQueue(): OfflineQueueState {
  const [isOffline,    setIsOffline]    = useState(false);
  const [queueCount,   setQueueCount]   = useState(0);
  const [isProcessing, setIsProcessing] = useState(false);

  // Ref holds the lazily-loaded queue module so we don't import IndexedDB
  // code during SSR or on first render before hydration.
  const queueModRef = useRef<typeof import('@/lib/offline-queue') | null>(null);

  const loadQueue = useCallback(async () => {
    if (!queueModRef.current) {
      queueModRef.current = await import('@/lib/offline-queue');
    }
    return queueModRef.current;
  }, []);

  // ── Refresh badge count ─────────────────────────────────────────────────────

  const refreshCount = useCallback(async () => {
    try {
      const q     = await loadQueue();
      const count = await q.getQueueCount();
      setQueueCount(count);
    } catch {
      // IndexedDB unavailable (e.g. Safari private browsing strict mode)
    }
  }, [loadQueue]);

  // ── Enqueue ─────────────────────────────────────────────────────────────────

  const enqueue = useCallback(
    async (data: CreateTransactionInput): Promise<string> => {
      const q  = await loadQueue();
      const id = await q.enqueueTransaction(data);
      await refreshCount();
      return id;
    },
    [loadQueue, refreshCount],
  );

  // ── Flush queue (called on reconnection) ────────────────────────────────────

  const flushQueue = useCallback(async (): Promise<ProcessResult | null> => {
    const q     = await loadQueue();
    const count = await q.getQueueCount();
    if (count === 0) return null;

    setIsProcessing(true);
    try {
      // Dynamically import the server action to avoid bundling it in the
      // initial client chunk — it's only needed on reconnection.
      const { createTransaction } = await import('@/app/actions/transactions');

      return await q.processQueue(async (data) => {
        const result = await createTransaction(data);
        if ('error' in result) {
          throw new Error(result.error);
        }
      });
    } finally {
      setIsProcessing(false);
      await refreshCount();
    }
  }, [loadQueue, refreshCount]);

  // ── Event listeners ─────────────────────────────────────────────────────────

  useEffect(() => {
    if (typeof window === 'undefined') return;

    // Sync with actual browser state on mount
    setIsOffline(!navigator.onLine);
    void refreshCount();

    const handleOnline = () => {
      setIsOffline(false);
      void flushQueue();
    };

    const handleOffline = () => {
      setIsOffline(true);
    };

    window.addEventListener('online',  handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online',  handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [refreshCount, flushQueue]);

  return { isOffline, queueCount, enqueue, isProcessing };
}
