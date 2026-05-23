// src/types/index.ts

export interface TransactionPayload {
  source: 'telebirr' | 'cbe' | '127';
  transaction_id: string;
  amount: number;
  sender_name: string;
  timestamp: string; // Server standard: YYYY-MM-DD HH:MM:SS
  balance?: number;  // Provided by telebirr, optional for CBE
  raw_message: string;
}

export interface QueueItem {
  id: string;
  status: 'pending' | 'synced' | 'failed'| 'syncing';
  attempts: number;
  lastAttemptAt?: string;
  lastError?: string;
  payload: TransactionPayload;
}

export type SyncStatus = 'pending' | 'syncing' | 'synced' | 'failed';
export type LiveSyncStatus = 'idle' | 'syncing' | 'error' | 'offline';

export interface SyncMetrics {
  totalQueued: number;
  totalSynced: number;
  totalFailed: number;
  totalPending: number;
  lastSuccessfulSync: string | null;
}