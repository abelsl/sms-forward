
/**
 * Sync Slice — Sync engine state and metrics
 *
 * Tracks:
 *   - Whether the sync engine is currently running
 *   - Progress through the queue (current/total)
 *   - Number of failed sync attempts
 *   - Last successful sync timestamp
 *   - Overall live sync status
 */

import type { StateCreator } from 'zustand';
import type { LiveSyncStatus } from '../types';

// Storage Interface

export interface MMKVStorage {
  getString: (key: string) => string | null;
  set: (key: string, value: string) => void;
}

//  Slice State 

export interface SyncSlice {
  isSyncing: boolean;
  syncProgress: { current: number; total: number };
  failedSyncCount: number;
  lastSuccessfulSync: string | null;
  liveSyncStatus: LiveSyncStatus;

  setIsSyncing: (syncing: boolean) => void;
  setSyncProgress: (current: number, total: number) => void;
  incrementFailedSyncCount: () => void;
  resetFailedSyncCount: () => void;
  setLastSuccessfulSync: (timestamp: string) => void;
  setLiveSyncStatus: (status: LiveSyncStatus) => void;
}

//  MMKV Keys 

const LAST_SYNC_KEY = 'last_sync_time';
const FAILED_COUNT_KEY = 'failed_sync_count';

//  Slice Creator

export const createSyncSlice = (
  storage: MMKVStorage
): StateCreator<SyncSlice, [], [], SyncSlice> => (set, get) => ({
  isSyncing: false,
  syncProgress: { current: 0, total: 0 },
  failedSyncCount: parseInt(storage.getString(FAILED_COUNT_KEY) || '0', 10),
  lastSuccessfulSync: storage.getString(LAST_SYNC_KEY) || null,
  liveSyncStatus: 'idle' as LiveSyncStatus,

  setIsSyncing: (syncing: boolean) => set({ isSyncing: syncing }),

  setSyncProgress: (current: number, total: number) =>
    set({ syncProgress: { current, total } }),

  incrementFailedSyncCount: () => {
    const newCount = get().failedSyncCount + 1;
    set({ failedSyncCount: newCount });
    storage.set(FAILED_COUNT_KEY, String(newCount));
  },

  resetFailedSyncCount: () => {
    set({ failedSyncCount: 0 });
    storage.set(FAILED_COUNT_KEY, '0');
  },

  setLastSuccessfulSync: (timestamp: string) => {
    set({ lastSuccessfulSync: timestamp });
    storage.set(LAST_SYNC_KEY, timestamp);
  },

  setLiveSyncStatus: (status: LiveSyncStatus) => set({ liveSyncStatus: status }),
});
