import { getRecentBankSMS } from './smsInboxReader';
import { parseSMS } from './smsParser';
import { useGatewayStore } from '../store/gatewayStore';

// Safe wrapper for isolated MMKV usage
let storage: { getString: (k: string) => string | null; set: (k: string, v: string) => void };

try {
  const { createMMKV } = require('react-native-mmkv');
  storage = createMMKV();
} catch (e) {
  const sandboxMap = new Map<string, string>();
  storage = {
    getString: (key) => sandboxMap.get(key) || null,
    set: (key, value) => { sandboxMap.set(key, value); }
  };
}

export interface SyncProgress {
  totalScanned: number;
  totalParsed: number;
  totalQueued: number;
  duplicatesSkipped: number;
  failedParses: number;
  startedAt: string | null;
  completedAt: string | null;
  isRunning: boolean;
  isCancelled: boolean;
}

export interface HistoricalSyncOptions {
  batchSize?: number;
  delayMs?: number;
  minDate?: number;
  maxDate?: number;
  forceFullScan?: boolean;
}

const DEFAULT_PROGRESS: SyncProgress = {
  totalScanned: 0,
  totalParsed: 0,
  totalQueued: 0,
  duplicatesSkipped: 0,
  failedParses: 0,
  startedAt: null,
  completedAt: null,
  isRunning: false,
  isCancelled: false,
};

// Isolated Volatile State
let progress: SyncProgress = { ...DEFAULT_PROGRESS };
let cancelRequested = false;

export const getHistoricalSyncStatus = (): SyncProgress => {
  return { ...progress };
};

export const resetHistoricalSyncState = (): void => {
  if (progress.isRunning) {
    console.warn("Cannot reset state while sync is actively running.");
    return;
  }
  progress = { ...DEFAULT_PROGRESS };
  cancelRequested = false;
};

export const cancelHistoricalSync = (): void => {
  if (progress.isRunning) {
    cancelRequested = true;
  }
};

export const startHistoricalSmsSync = async (options: HistoricalSyncOptions = {}): Promise<void> => {
  if (progress.isRunning) {
    console.warn("Historical sync is already running. Aborting duplicate request.");
    return;
  }

  // Mutex Lock
  progress = {
    ...DEFAULT_PROGRESS,
    startedAt: new Date().toISOString(),
    isRunning: true,
  };
  cancelRequested = false;

  try {
    const scanStartTime = Date.now();
    const batchSize = options.batchSize || 50;
    const delayMs = options.delayMs || 50;

    // Determine the cursor
    let searchMinDate = options.minDate;
    if (!options.forceFullScan && !searchMinDate) {
      const lastScanRaw = storage.getString("last_historical_scan_timestamp");
      if (lastScanRaw) {
        searchMinDate = parseInt(lastScanRaw, 10);
      }
    }

    const fetchOptions = {
      ...(searchMinDate && { minDate: searchMinDate }),
      ...(options.maxDate && { maxDate: options.maxDate }),
    };

    console.log("Fetching historical SMS with bounds:", fetchOptions);
    const messages = await getRecentBankSMS(fetchOptions);
    
    // Process in batches
    for (let i = 0; i < messages.length; i += batchSize) {
      if (cancelRequested) {
        console.log("Historical sync cancelled by user.");
        progress.isCancelled = true;
        break;
      }

      const batch = messages.slice(i, i + batchSize);
      
      for (const sms of batch) {
        progress.totalScanned++;

        const txPayload = parseSMS(sms.address, sms.body);
        if (!txPayload) {
          progress.failedParses++;
          continue;
        }

        // We successfully parsed it
        progress.totalParsed++;

        // Add to queue and measure difference to track duplicates
        const gatewayState = useGatewayStore.getState();
        const initialQueueLength = gatewayState.queue.length;

        // Use the existing queue flow cleanly, skip immediate auto-sync
        await gatewayState.addTransactionToQueue(txPayload, true);

        const newQueueLength = useGatewayStore.getState().queue.length;

        if (newQueueLength > initialQueueLength) {
          progress.totalQueued++;
        } else {
          progress.duplicatesSkipped++;
        }
      }

      // Yield event loop to prevent UI freezing
      if (i + batchSize < messages.length) {
        await new Promise(resolve => setTimeout(resolve, delayMs));
      }
    }

    if (!cancelRequested) {
      // Manually trigger a controlled sync after the entire queueing process completes
      useGatewayStore.getState().manualSyncQueue();
      // Safely persist the new cursor
      storage.set("last_historical_scan_timestamp", scanStartTime.toString());
    }

  } catch (error) {
    console.error("Historical SMS sync failed:", error);
  } finally {
    // Release Lock
    progress.isRunning = false;
    progress.completedAt = new Date().toISOString();
  }
};
