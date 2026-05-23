// src/store/queueSlice.ts

/**
 * Queue Slice — MMKV-backed transaction queue state
 *
 * Extracted from the original gatewayStore.ts.
 * Preserves all existing behavior:
 *   - MMKV persistence for queue
 *   - Deduplication via transaction_id check
 *   - Queue item ordering (newest-first in array)
 *   - clearSyncedHistory for local cache cleanup
 *
 * New additions:
 *   - updateQueueItem() for granular sync status tracking
 *   - Support for 'syncing' and 'failed' statuses
 */

import type { StateCreator } from 'zustand';
import type { TransactionPayload, QueueItem, SyncStatus } from '../types';

// ─── Storage Interface ───────────────────────────────────────────────────────────

export interface MMKVStorage {
  getString: (key: string) => string | null;
  set: (key: string, value: string) => void;
}

// ─── Slice State ─────────────────────────────────────────────────────────────────

export interface QueueSlice {
  queue: QueueItem[];
  addTransactionToQueue: (tx: TransactionPayload) => void;
  updateQueueItem: (id: string, updates: Partial<QueueItem>) => void;
  clearSyncedHistory: () => void;
  resetFailedToRetry: () => void;
}

// ─── MMKV Helpers ────────────────────────────────────────────────────────────────

const QUEUE_KEY = 'gateway_queue';

const persistQueue = (storage: MMKVStorage, queue: QueueItem[]): void => {
  storage.set(QUEUE_KEY, JSON.stringify(queue));
};

export const getStoredQueue = (storage: MMKVStorage): QueueItem[] => {
  const raw = storage.getString(QUEUE_KEY);
  return raw ? JSON.parse(raw) : [];
};

// ─── Slice Creator ───────────────────────────────────────────────────────────────

export const createQueueSlice = (
  storage: MMKVStorage
): StateCreator<QueueSlice, [], [], QueueSlice> => (set, get) => ({
  queue: getStoredQueue(storage),

  addTransactionToQueue: (tx: TransactionPayload) => {
    const currentQueue = get().queue;

    // Deduplication check — same as original gatewayStore.ts:47
    if (currentQueue.some((item) => item.payload.transaction_id === tx.transaction_id)) {
      return;
    }

    const newItem: QueueItem = {
      id: `${Date.now()}_${tx.transaction_id}`,
      status: 'pending',
      attempts: 0,
      payload: tx,
    };

    // Newest-first ordering — same as original gatewayStore.ts:58
    const updatedQueue = [newItem, ...currentQueue];
    set({ queue: updatedQueue });
    persistQueue(storage, updatedQueue);
  },

  updateQueueItem: (id: string, updates: Partial<QueueItem>) => {
    const updatedQueue = get().queue.map((item) =>
      item.id === id ? { ...item, ...updates } : item
    );
    set({ queue: updatedQueue });
    persistQueue(storage, updatedQueue);
  },

  clearSyncedHistory: () => {
    // Same as original gatewayStore.ts:103-106
    const filteredQueue = get().queue.filter((item) => item.status !== 'synced');
    set({ queue: filteredQueue });
    persistQueue(storage, filteredQueue);
  },

  resetFailedToRetry: () => {
    const updatedQueue = get().queue.map((item) =>
      item.status === 'failed' ? { ...item, status: 'pending' as SyncStatus } : item
    );
    set({ queue: updatedQueue });
    persistQueue(storage, updatedQueue);
  },
});
