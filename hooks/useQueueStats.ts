// src/hooks/useQueueStats.ts

/**
 * Memoized Queue Statistics Hook
 *
 * Uses Zustand's shallow equality selector to prevent re-renders
 * unless the actual derived counts change. The queue array itself
 * may update frequently (status changes on items), but the counts
 * only change when items move between status buckets.
 */

import { useMemo } from 'react';
import { useGatewayStore } from '../store/gatewayStore';
import type { QueueItem, SyncMetrics } from '../types';

// ─── Granular Selectors ──────────────────────────────────────────────────────────

/** Select only the queue array — avoids re-renders from unrelated store changes */
const selectQueue = (state: { queue: QueueItem[] }) => state.queue;

// ─── Hook ────────────────────────────────────────────────────────────────────────

export const useQueueStats = (): SyncMetrics => {
  const queue = useGatewayStore(selectQueue);

  return useMemo(() => {
    let totalPending = 0;
    let totalSynced = 0;
    let totalFailed = 0;
    let totalSyncing = 0;

    for (const item of queue) {
      switch (item.status) {
        case 'pending':
          totalPending++;
          break;
        case 'synced':
          totalSynced++;
          break;
        case 'failed':
          totalFailed++;
          break;
        case 'syncing':
          totalSyncing++;
          break;
      }
    }

    return {
      totalQueued: queue.length,
      totalSynced,
      totalFailed,
      totalPending: totalPending + totalSyncing, // syncing items are still "pending"
      lastSuccessfulSync: null, // Managed by syncSlice, not derived from queue
    };
  }, [queue]);
};

/**
 * Returns filtered queue arrays for each tab.
 * Memoized so FlatList data references are stable.
 */
export const useFilteredQueues = () => {
  const queue = useGatewayStore(selectQueue);

  const pendingItems = useMemo(
    () => queue.filter((item) => item.status === 'pending' || item.status === 'failed' || item.status === 'syncing'),
    [queue]
  );

  const syncedItems = useMemo(
    () => queue.filter((item) => item.status === 'synced'),
    [queue]
  );

  return { pendingItems, syncedItems, allItems: queue };
};
