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

    console.log("[API Sync] Sending transaction:", payload.transaction_id);

    const response = await axios.post(
      currentApiUrl,
      payload,
      {
        headers: { "Content-Type": "application/json" },
      }
    );

    console.log("[API Sync] Server response:", response.status);
    return response.status >= 200 && response.status < 300;
  } catch (error: any) {
    console.log("[API Sync] Sync failed:", error?.message || error);
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