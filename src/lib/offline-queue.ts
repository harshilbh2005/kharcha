// ============================================================
// KHARCHA — Offline Transaction Queue
//
// IndexedDB-backed queue that stores encrypted CreateTransactionInput
// objects when the device is offline.  When connectivity is restored
// the queue is drained by calling the createTransaction server action
// for each item in insertion order.
//
// Public API:
//   enqueueTransaction(data)  — add to queue; returns generated UUID
//   processQueue(processor)   — drain queue; returns { processed, failed }
//   getQueueCount()           — count pending items (non-destructive)
//   clearQueue()              — wipe entire queue (called on sign-out)
// ============================================================

import type { CreateTransactionInput } from '@/lib/validations';

const DB_NAME    = 'kharcha-offline';
const DB_VERSION = 1;
const STORE_NAME = 'transaction_queue';

// ── Data shape stored in IndexedDB ───────────────────────────────────────────

export interface QueuedTransaction {
  /** UUID generated client-side — primary key in the object store */
  id: string;
  /** Full validated + encrypted payload ready to pass to createTransaction */
  data: CreateTransactionInput;
  /** Epoch ms of when the item was enqueued */
  timestamp: number;
  /** Number of failed submission attempts so far */
  retryCount: number;
}

export interface ProcessResult {
  /** Items successfully submitted and removed from queue */
  processed: number;
  /** Items that failed (retry count incremented or discarded) */
  failed: number;
}

// ── IndexedDB singleton ───────────────────────────────────────────────────────

let dbPromise: Promise<IDBDatabase> | null = null;

function openDB(): Promise<IDBDatabase> {
  if (dbPromise) return dbPromise;

  dbPromise = new Promise<IDBDatabase>((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);

    req.onupgradeneeded = (event) => {
      const db = (event.target as IDBOpenDBRequest).result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        const store = db.createObjectStore(STORE_NAME, { keyPath: 'id' });
        // Index on timestamp so we can process oldest-first
        store.createIndex('by_timestamp', 'timestamp', { unique: false });
      }
    };

    req.onsuccess = () => resolve(req.result);
    req.onerror  = () => {
      // Reset so the next call can retry
      dbPromise = null;
      reject(req.error);
    };
  });

  return dbPromise;
}

// ── Internal helpers ──────────────────────────────────────────────────────────

async function getAllQueued(): Promise<QueuedTransaction[]> {
  const db = await openDB();
  return new Promise<QueuedTransaction[]>((resolve, reject) => {
    const tx    = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const index = store.index('by_timestamp');
    const req   = index.getAll();
    req.onsuccess = () => resolve(req.result as QueuedTransaction[]);
    req.onerror   = () => reject(req.error);
  });
}

async function dequeue(id: string): Promise<void> {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const tx    = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req   = store.delete(id);
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });
}

async function incrementRetry(item: QueuedTransaction): Promise<void> {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const tx      = db.transaction(STORE_NAME, 'readwrite');
    const store   = tx.objectStore(STORE_NAME);
    const updated = { ...item, retryCount: item.retryCount + 1 };
    const req     = store.put(updated);
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Add a transaction to the offline queue.
 * Call this from the AddExpenseModal when `navigator.onLine === false`.
 * Returns the generated UUID so the caller can track the item.
 */
export async function enqueueTransaction(
  data: CreateTransactionInput,
): Promise<string> {
  const db   = await openDB();
  const id   = crypto.randomUUID();
  const item: QueuedTransaction = {
    id,
    data,
    timestamp:  Date.now(),
    retryCount: 0,
  };

  return new Promise<string>((resolve, reject) => {
    const tx    = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req   = store.add(item);
    req.onsuccess = () => resolve(id);
    req.onerror   = () => reject(req.error);
  });
}

/**
 * Return the number of pending transactions in the queue.
 * Non-destructive — safe to call frequently for badge counts.
 */
export async function getQueueCount(): Promise<number> {
  const db = await openDB();
  return new Promise<number>((resolve, reject) => {
    const tx    = db.transaction(STORE_NAME, 'readonly');
    const store = tx.objectStore(STORE_NAME);
    const req   = store.count();
    req.onsuccess = () => resolve(req.result as number);
    req.onerror   = () => reject(req.error);
  });
}

// Max failed attempts before an item is silently discarded
const MAX_RETRIES = 3;

/**
 * Drain the queue oldest-first by calling `processor` on each item.
 *
 * - Success → item removed from queue
 * - Failure, retryCount < MAX_RETRIES → retry count incremented, stays in queue
 * - Failure, retryCount >= MAX_RETRIES → item discarded
 *
 * @param processor  Async function that submits a single transaction.
 *                   Should throw on failure so the queue can handle retries.
 */
export async function processQueue(
  processor: (data: CreateTransactionInput) => Promise<void>,
): Promise<ProcessResult> {
  const items = await getAllQueued();
  let processed = 0;
  let failed    = 0;

  for (const item of items) {
    if (item.retryCount >= MAX_RETRIES) {
      // Too many failures — discard silently to avoid an infinite loop
      await dequeue(item.id);
      failed++;
      continue;
    }

    try {
      await processor(item.data);
      await dequeue(item.id);
      processed++;
    } catch {
      await incrementRetry(item);
      failed++;
    }
  }

  return { processed, failed };
}

/**
 * Wipe the entire queue.
 * Call on sign-out so stale data doesn't persist across user sessions.
 */
export async function clearQueue(): Promise<void> {
  const db = await openDB();
  return new Promise<void>((resolve, reject) => {
    const tx    = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    const req   = store.clear();
    req.onsuccess = () => resolve();
    req.onerror   = () => reject(req.error);
  });
}
