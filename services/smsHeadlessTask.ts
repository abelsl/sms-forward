// import { AppRegistry } from "react-native";
// import { useGatewayStore } from "@/store/gatewayStore";
// import { parseSMS } from "./smsParser";
// import SmsAndroid from "react-native-android-sms-listener";

// const allowedSenders = [
//   "+251960411182",
//   "CBE",
//   "cbe",
//   "127",
//   "telebirr",
// ];

// const LAST_SMS_KEY = "LAST_SMS_TIMESTAMP";

// /**
//  * CORE PROCESSOR (no arguments)
//  * Works for background fetch + headless + manual trigger
//  */
// export async function ParseIncomingSMS() {
//   try {
//     console.log("[SMS Processor] Scanning inbox...");

//     const lastTimestamp =
//       Number(
//         await import("@react-native-async-storage/async-storage").then(
//           (m) => m.default.getItem(LAST_SMS_KEY)
//         )
//       ) || 0;

//     const filter = {
//       box: "inbox",
//       minDate: lastTimestamp,
//       maxCount: 20,
//       indexFrom: 0,
//     };

//     const messages = await new Promise<any[]>((resolve) => {
//       (SmsAndroid as any).list(
//         JSON.stringify(filter),
//         () => resolve([]),
//         (_count: number, smsList: string) => {
//           try {
//             resolve(JSON.parse(smsList));
//           } catch {
//             resolve([]);
//           }
//         }
//       );
//     });

//     if (!messages.length) {
//       console.log("[SMS Processor] No new messages.");
//       return;
//     }

//     let latest = lastTimestamp;

//     for (const sms of messages) {
//       const sender = (sms.address || "").toLowerCase();
//       const body = sms.body || "";
//       const timestamp = Number(sms.date || 0);

//       const isAllowed = allowedSenders.some((s) =>
//         sender.includes(s.toLowerCase())
//       );

//       if (!isAllowed) continue;

//       const parsed = parseSMS(sender, body);

//       if (!parsed) continue;

//       // prevent duplicates
//       const queue = useGatewayStore.getState().queue;

//       const exists = queue.some(
//         (q) => q.payload.transaction_id === parsed.transaction_id
//       );

//       if (exists) continue;

//       useGatewayStore
//         .getState()
//         .addTransactionToQueue(parsed);

//       latest = Math.max(latest, timestamp);
//     }

//     // update last scan timestamp
//     if (latest > 0) {
//       const AsyncStorage = (await import("@react-native-async-storage/async-storage"))
//         .default;

//       await AsyncStorage.setItem(
//         LAST_SMS_KEY,
//         String(latest)
//       );
//     }

//     console.log("[SMS Processor] Done.");
//   } catch (error) {
//     console.error("[SMS Processor] Error:", error);
//   }
// }
import { AppRegistry } from "react-native";
import { useGatewayStore } from "@/store/gatewayStore";
import { parseSMS } from "./smsParser";

export interface SmsPayload {
  originatingAddress: string;
  body: string;
}

/**
 * Optional: whitelist (you can enforce filtering here if needed)
 */
const allowedSenders = [
  "+251960411182",
  "CBE",
  "cbe",
  '127',
  "telebirr",
];

/**
 * HEADLESS SMS PROCESSOR
 * Runs even when app is killed
 */
export async function ParseIncomingSMS(message: SmsPayload) {
  try {
    const sender = message.originatingAddress || "Unknown";
    const body = message.body || "";

    console.log("[Headless] Incoming SMS:", { sender, body });

    // Optional filter (disable if you want ALL SMS)
    const isAllowed =
      allowedSenders.length === 0 ||
      allowedSenders.some((s) =>
        sender.toLowerCase().includes(s.toLowerCase())
      );

    if (!isAllowed) {
      console.log("[Headless] Sender not allowed, skipping SMS.");
      return;
    }

    // Parse SMS using your shared parser
    const parsedData = parseSMS(sender, body);

    if (!parsedData) {
      console.log("[Headless] Parser rejected SMS.");
      return;
    }

    console.log("[Headless] Parsed transaction:", parsedData);

    // Push into Zustand queue (works in background)
    useGatewayStore.getState().addTransactionToQueue(parsedData);

    // Optional: notify UI when app is alive
    // return    Promise.resolve()
  } catch (error) {
    console.error("[Headless] SMS processing error:", error);
    // return true;
  }
  // return Promise.resolve();
}

// /**
//  * Register Headless Task
//  * MUST be at root level of JS bundle
//  */
// AppRegistry.registerHeadlessTask(
//   "sms-forward",
//   () => ParseIncomingSMS
// );
// import { AppRegistry } from "react-native";
// import { useGatewayStore } from "..gatewayStore";
// import { parseSMS } from "./smsParser";

// /**
//  * This runs even when app is closed (Android only)
//  */
// export async function ParseIncomingSMSTask({ sender, body }: any) {
//   try {
//     console.log("[Headless] SMS received:", sender, body)
//  const store = useGatewayStore.getState();
//     const parsedData = parseSMS(sender, body)

//     if (parsedData) {
//       useGatewayStore.getState().addTransactionToQueue(parsedData)

//       console.log("[Headless] Added to queue")

//     } else {
//       console.log("[Headless] SMS ignored by parser")
//     }
//     // Auto sync if enabled (your logic already supports this)
//     if (store.isListening) {
//       store.manualSyncQueue();
//     }
//   } catch (err) {
//     console.log("[Headless] Error:", err)
//   }
   

// }

// /**
//  * MUST be registered at root level
//  */
// // AppRegistry.registerHeadlessTask(
// //   "ParseIncomingSMS",
// //   () => ParseIncomingSMSTask
// // )