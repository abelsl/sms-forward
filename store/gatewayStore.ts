// src/store/gatewayStore.ts
import { create } from 'zustand';
import { syncTransactionsToServer, syncTransactionToServer } from '../services/apiSync';
import { QueueItem, TransactionPayload } from '../types';
// Safe wrapper: Uses real MMKV on Dev A's native build, or memory fallback in your Expo Go sandbox
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

interface GatewayState {
  isListening: boolean;
  isSyncing: boolean;
  queue: QueueItem[];
  lastSuccessfulSync: string | null;
  setListeningStatus: (status: boolean) => void;
  addTransactionToQueue: (tx: TransactionPayload) => void;
  manualSyncQueue: () => Promise<void>;
  clearSyncedHistory: () => void;
  retrySyncQueue: (itemId: string) => Promise<boolean>;
  // this doesn't call manualsunc queue or it done't auto sycn so do that manually for past sync history
  addMultipleTransactionsToQueue: (tx: TransactionPayload[]) =>  Promise<boolean>; 
  manualBatchSyncQueue: () =>  Promise<boolean>;
  addTransactionToQueueWithoutSync: (tx: TransactionPayload[]) => void;
}
const getStoredQueue = (): QueueItem[] => {
  // 1. MMKV gets strings instantly without waiting
  const raw = storage.getString("gateway_queue");
  // 2. Parse if it exists, otherwise return empty array
  return raw ? (JSON.parse(raw) as QueueItem[]) : [];
};

export const useGatewayStore = create<GatewayState>((set, get) => ({

  isListening: false,
  isSyncing: false,
  queue: getStoredQueue(),
  lastSuccessfulSync: storage.getString('last_sync_time') || null,

  setListeningStatus: (status) => set({ isListening: status }),
  // setListeningStatus: (status) => set({ isListening: true }),
  addTransactionToQueueWithoutSync: (txArray) => {
    const currentQueue = get().queue;
    const newItems: QueueItem[] = [];
    for (const tx of txArray) {
      if (!currentQueue.some(item => item.payload.transaction_id === tx.transaction_id)) {
        newItems.push({
          id: `${Date.now()}_${tx.transaction_id}`,
          status: 'pending',
          attempts: 0,
          payload: tx,
        });
      }
    }
    const updatedQueue = [...newItems, ...currentQueue];
    set({ queue: updatedQueue });
    storage.set('gateway_queue', JSON.stringify(updatedQueue));
    // set({isSyncing: false})
     
  },
  addMultipleTransactionsToQueue:  async (txArray) => {
    const currentQueue = get().queue;
    const newItems: QueueItem[] = [];
    for (const tx of txArray) {
      if (!currentQueue.some(item => item.payload.transaction_id === tx.transaction_id)) {
        newItems.push({
          id: `${Date.now()}_${tx.transaction_id}`,
          status: 'pending',
          attempts: 0,
          payload: tx,
        });
      }
    }
    const updatedQueue = [...newItems, ...currentQueue];
    set({ queue: updatedQueue });
    storage.set('gateway_queue', JSON.stringify(updatedQueue));
    set({isSyncing: false})
  
     // Get fresh function reference
  const manualBatchSyncQueue =  await get().manualBatchSyncQueue;
  console.log("isSyncing:", get().isSyncing);
  if (get().isListening && manualBatchSyncQueue) {
    return await manualBatchSyncQueue();
    // return success? true : false;
  } else {
    console.log("Not auto-syncing after adding multiple transactions. isListening:", get().isListening, "manualBatchSyncQueue exists:", !!manualBatchSyncQueue);
    return false;
  }
  },

  addTransactionToQueue: async (tx) => {
    const currentQueue = get().queue;

    if (currentQueue.some(item => item.payload.transaction_id === tx.transaction_id)) {
      return; // Prevent duplication
    }

    const newItem: QueueItem = {
      id: `${Date.now()}_${tx.transaction_id}`,
      status: 'pending',
      attempts: 0,
      payload: tx,
    };

    const updatedQueue = [newItem, ...currentQueue];
    set({ queue: updatedQueue });
    storage.set('gateway_queue', JSON.stringify(updatedQueue));

    if (get().isListening) {
      get().manualSyncQueue(); // Auto-sync attempt on new transaction if we're actively listening
    }
  },
  manualSyncQueue: async () => {
    if (get().isSyncing) return;

    set({ isSyncing: true });

    try {
      const currentQueue = get().queue;
      
      const updatedQueue: QueueItem[] = [];
      let syncTimestamp: string | null = null;

      for (const item of currentQueue) {
        // only sync pending or failed
        if (
          item.status !== 'pending' &&
          item.status !== 'failed'
        ) {
          console.log(`Skipping item ${item.id} with status ${item.status}`);
          continue;
        }

        const updatedItem: QueueItem = {
          ...item,
          attempts: item.attempts + 1,
        };

        const success = await syncTransactionToServer(
          updatedItem.payload
        );
        console.log("in manualSyncQueue",success)
        
        if (success) {
          syncTimestamp = new Date()
            .toISOString()
            .replace('T', ' ')
            .substring(0, 19);

          // DO NOT PUSH synced items
          // this removes them from queue automatically
        } else {
        if (currentQueue.some(item => item.payload.transaction_id === updatedItem.payload.transaction_id))  {
          return; // Prevent duplication
        } 
        console.log(`Sync failed for item ${item.id} on attempt ${updatedItem.id}`);
        updatedQueue.push({
          ...updatedItem,
          status: 'pending',
        
        })

        break;
      }
      }
      
      // keep only failed/pending items
      set({ queue: [ ...updatedQueue] });

      storage.set(
        'gateway_queue',
        JSON.stringify(updatedQueue)
      );

      if (syncTimestamp) {
        set({ lastSuccessfulSync: syncTimestamp });

        storage.set(
          'last_sync_time',
          syncTimestamp
        );
       
      }
    } finally {
      set({ isSyncing: false });
    }
  },
  manualBatchSyncQueue: async () => {
    if (get().isSyncing) {
      console.log("[Manual Batch Sync] Sync already in progress. Please wait.");
      return false;
    }

    set({ isSyncing: true });

    try{
      const currentQueue = [...get().queue];
      const pendingItems = currentQueue.filter(item => item.status === 'pending');  
      if(pendingItems.length === 0) {
        console.log("[Batch Sync] No pending transactions to sync.");
        return false;
      }
      const payloads = pendingItems.map(item => item.payload);

      const success = await syncTransactionsToServer(payloads);
      if(success) {
        const syncTimestamp = new Date()
          .toISOString()
          .replace('T', ' ')
          .substring(0, 19);
        set({ lastSuccessfulSync: syncTimestamp });

        storage.set(
          'last_sync_time',
          syncTimestamp
        );
        // Remove all successfully synced items from the queue
        const updatedQueue = currentQueue.filter(item => item.status !== 'pending');
        set({ queue: updatedQueue });
        storage.set(
          'gateway_queue',
          JSON.stringify(updatedQueue)
        );
        return true;
      } else {
        console.log("[Batch Sync] Batch sync failed. Retaining all pending transactions for retry.");
        return false;
      }
    }catch(e){
      console.log("Batch sync failed:", e);
      return false;
    }
    
  },
  retrySyncQueue: async (itemId: string): Promise<boolean> => {
    if (get().isSyncing) return false;

    set({ isSyncing: true });

    try {
      const currentQueue = [...get().queue];

      const item = currentQueue.find(
        (q) => q.id === itemId
      );

      if (!item) return false;

      const updatedItem: QueueItem = {
        ...item,
        attempts: item.attempts + 1,
      };

      const success = await syncTransactionToServer(
        updatedItem.payload
      );
      // console.log(success)
      if (success) {
        // remove item from queue on success
        const updatedQueue: QueueItem[] =
          currentQueue.filter((q) => q.id !== itemId);

        const syncTimestamp = new Date()
          .toISOString()
          .replace('T', ' ')
          .substring(0, 19);

        set({
          queue: [ ...updatedQueue],
          lastSuccessfulSync: syncTimestamp,
        });

        storage.set(
          'gateway_queue',
          JSON.stringify(updatedQueue)
        );

        storage.set(
          'last_sync_time',
          syncTimestamp
        );

        return true;
      }

      // mark as failed if retry fails
      const updatedQueue: QueueItem[] =
        currentQueue.map((q) =>
          q.id === itemId
            ? {
              ...updatedItem,
              status: 'pending' as const,
            }
            : q
        );

      set({ queue: [ ...updatedQueue] });

      storage.set(
        'gateway_queue',
        JSON.stringify(updatedQueue)
      );

      return false;
    } finally {
      set({ isSyncing: false });
    }
  },
  clearSyncedHistory: () => {
    const filteredQueue = get().queue.filter(item => item.status === 'pending');
    set({ queue: filteredQueue });
    storage.set('gateway_queue', JSON.stringify(filteredQueue));
  }
}));