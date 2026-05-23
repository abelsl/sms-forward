// services/apiSync.ts
// services/apiSync.ts
import AsyncStorage from '@react-native-async-storage/async-storage';
import axios from "axios";
import { TransactionPayload } from "../types";

const STORAGE_KEY = '@birr_gateway_server_url';
let currentApiUrl = "";

/**
 * Updates the in-memory runtime API URL
 */
export const setServerUrl = (url: string) => {
  currentApiUrl = url;
};

/**
 * Sends real transaction payload to backend server.
 */
export const syncTransactionToServer = async (
  payload: TransactionPayload
): Promise<boolean> => {
  try {
    // Fallback check: if memory is wiped but storage has it, fetch it on the fly
    if (!currentApiUrl) {
      const savedUrl = await AsyncStorage.getItem(STORAGE_KEY);
      if (savedUrl) {
        currentApiUrl = savedUrl;
      } else {
        console.log("[API Sync] Aborted: No server URL configured.");
        return false;
      }
    }

    const response = await fetch(currentApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });
    // console.log("[API Sync] Server response tatus:", response);
    // 1. Safety Check: If the firewall blocks it with a 4xx/5xx, catch it immediately
    if (!response.ok) return false;
    // 2. The Core Fix: Verify the server actually sent back JSON
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      // console.error('Security wall interception! Received HTML instead of JSON.');
      return false; // Safely keeps the item in your offline queue
    }

    // 3. Parse and check your actual API response structure
    const data = await response.json();
    return data && data.success === true;
  
    
  } catch (error: any) {
    console.log("[API Sync] Sync failed:", error?.message || error);
    return false;
  }
};

// Batch sync function for multiple transactions at once
export const syncTransactionsToServer = async (
  payloads: TransactionPayload[]
): Promise<boolean> => {
  try {
    // Ensure API URL is available
    if (!currentApiUrl) {
      const savedUrl = await AsyncStorage.getItem(STORAGE_KEY);
      if (savedUrl) {
        currentApiUrl = savedUrl;
      } else {
        console.log("[API Sync] Aborted: No server URL configured.");
        return false;
      }
    }

    if (!payloads || payloads.length === 0) {
      console.log("[API Sync] No multiple transactions to sync.");
      return true;
    }

    console.log(
      `[API Sync] Sending batch of ${payloads.length} transactions`
    );

    const response = await fetch(currentApiUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payloads),
    });

    // console.log("[API Sync] Server response:", response.status);
     // 1. Safety Check: If the firewall blocks it with a 4xx/5xx, catch it immediately
    if (!response.ok) return false;
    // 2. The Core Fix: Verify the server actually sent back JSON
    const contentType = response.headers.get('content-type') || '';
    if (!contentType.includes('application/json')) {
      // console.error('Security wall interception! Received HTML instead of JSON.');
      return false; // Safely keeps the item in your offline queue
    }

    // 3. Parse and check your actual API response structure
    const data = await response.json();
    console.log("[API Sync] Batch sync response data:", data.success);
    return data && data.success === true;
  } catch (error: any) {
    console.log("[API Sync] Batch sync failed:", error?.message || error);
    return false;
  }
};






// import axios from "axios";
// import { TransactionPayload } from "../types";

// // Your backend API
// const api = process.env.BACKEND_API_URL ?? "";

// /**
//  * Sends real transaction payload to backend server.
//  * Returns true if request succeeded, false otherwise.
//  */
// export const syncTransactionToServer = async (
//   payload: TransactionPayload
// ): Promise<boolean> => {
//   try {
//     console.log(
//       "[API Sync] Sending transaction:",
//       payload.transaction_id
//     );

//     const response = await axios.post(
//       api,
//       payload,
//       {
//         headers: {
//           "Content-Type": "application/json",
//         },

//         // timeout: 10000,
//       }
//     );

//     console.log(
//       "[API Sync] Server response:",
//       response.status
//     );

//     return response.status >= 200 &&
//       response.status < 300;
//   } catch (error: any) {
//     console.log(
//       "[API Sync] Sync failed:",
//       error?.message || error
//     );

//     return false;
//   }
// };