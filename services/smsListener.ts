// src/services/smsListener.ts

import {
  AppRegistry,
  PermissionsAndroid,
  Platform
} from "react-native";

import SmsListener from "react-native-android-sms-listener";

import { useGatewayStore } from "../store/gatewayStore";
import { parseSMS } from "./smsParser";
import { startSmsListenerServiceAsync } from "expo-sms-listener";


  // Allowed senders
  const allowedSenders = [
    "+251960411182",
    "CBE",
    "telebirr"
  ];
/**
 * THE REAL HARDWARE PERMISSION REQUESTOR
 */
export const requestSMSPermissions =
  async (): Promise<boolean> => {
    if (Platform.OS !== "android") return false;

    try {
      const granted =
        await PermissionsAndroid.requestMultiple([
         PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
         PermissionsAndroid.PERMISSIONS.READ_SMS,
         ]);
      // requestMultiple returns a map of permission -> status
      const receiveStatus = granted[PermissionsAndroid.PERMISSIONS.RECEIVE_SMS];
      const readStatus = granted[PermissionsAndroid.PERMISSIONS.READ_SMS];
      if (
        receiveStatus === PermissionsAndroid.RESULTS.GRANTED &&
        readStatus === PermissionsAndroid.RESULTS.GRANTED
      ) {
        console.log(
          "[Hardware] SMS Permission GRANTED by user."
        );
        

console.log("Permissions:", granted);
        return true;
      } else {
        console.warn(
          "[Hardware] SMS Permission DENIED by user."
        );

        return false;
      }
    } catch (err) {
      console.error(
        "[Hardware] Failed to request Android permissions:",
        err
      );

      return false;
    }
  };

/**
 * START LISTENING FOR REAL SMS EVENTS
 */
export const startSMSGatewayListener =
  async () => {
   
    console.log(
      "[Gateway] Starting real SMS listener..."
    );

    // AppRegistry.startHeadlessTask("sms-forward", () => ParseIncomingSMS);
    
    console.log()

    const subscription =
      SmsListener.addListener(
        async (message: any) => {
          try {
            console.log(
              "[Gateway] Incoming SMS:",
              message
            );

            const sender =
              message.originatingAddress.toString() ||
              "Unknown";

            const body =
              message.body || "";

            const parsedData = parseSMS(
              sender,
              body
            );
              console.log(
                "[Gateway] Parsed SMS data:",
                parsedData
              );
            if (parsedData) {
              useGatewayStore
                .getState()
                .addTransactionToQueue(
                  parsedData
                );

              console.log(
                "[Gateway] Transaction added to queue."
              );
            } else {
              console.log(
                "[Gateway] Parser rejected SMS."
              );
            }
          } catch (error) {
            console.log(
              "[Gateway] Listener error:",
              error
            );
          }
        }
      );

    console.log(
      "[Gateway] SMS listener ACTIVE."
    );

    return subscription;
  };

/**
 * MOCK INJECTION TOOL FOR DEV B
 */
// export const injectMockSMSToGateway = (
//   sender: string,
//   messageBody: string
// ) => {
//   const parsedData = parseSMS(
//     sender,
//     messageBody
//   );

//   if (parsedData) {
//     useGatewayStore
//       .getState()
//       .addTransactionToQueue(parsedData);
//   } else {
//     Alert.alert(
//       "Parser Dropped",
//       "The raw text body failed to match regex parameters."
//     );
//   }
// };
// // src/services/smsListener.ts
// import { Alert, PermissionsAndroid, Platform } from 'react-native';
// import { parseSMS } from './smsParser';
// import { useGatewayStore } from '../store/gatewayStore';
// const IS_EXPO_GO = true;
// /**
//  * THE REAL HARDWARE PERMISSION REQUESTOR
//  */
// export const requestSMSPermissions = async (): Promise<boolean> => {
//   // 1. Sandbox Bypass: If you are testing on iOS or a web browser, skip hardware checks
//   if (Platform.OS !== 'android'|| IS_EXPO_GO) {
//     console.log('[Sandbox] Bypassing permissions for non-Android environment.');
//     return true; 
//   }

//   try {
//     // 2. The Native Android Dialog Prompt
//     const granted = await PermissionsAndroid.request(
//       PermissionsAndroid.PERMISSIONS.RECEIVE_SMS,
//       {
//         title: 'Birr Gateway SMS Access',
//         message: 'To automatically sync transactions, Birr Gateway needs to read incoming Telebirr and CBE Birr text messages in real-time.',
//         buttonNeutral: 'Ask Me Later',
//         buttonNegative: 'Cancel',
//         buttonPositive: 'Allow',
//       }
//     );

//     if (granted === PermissionsAndroid.RESULTS.GRANTED) {
//       console.log('[Hardware] SMS Permission GRANTED by user.');
//       return true;
//     } else {
//       console.warn('[Hardware] SMS Permission DENIED by user.');
//       return false;
//     }
//   } catch (err) {
//     console.error('[Hardware] Failed to request Android permissions:', err);
//     return false;
//   }
// };

// /**
//  * START LISTENING FOR BACKGROUND EVENTS
//  */
// export const startSMSGatewayListener = async () => {
//   console.log('[Sandbox] UI Event listener ready. Waiting for Engine Activation.');
//   // Note for Dev A: This is where you will initialize the react-native-get-sms-android background hook!
// };

// /**
//  * MOCK INJECTION TOOL FOR DEV B
//  */
// export const injectMockSMSToGateway = (sender: string, messageBody: string) => {
//   const parsedData = parseSMS(sender, messageBody);
  
//   if (parsedData) {
//     useGatewayStore.getState().addTransactionToQueue(parsedData);
//   } else {
//     Alert.alert('Parser Dropped', 'The raw text body failed to match regex parameters.');
//   }
// };




// // src/services/smsListener.ts
// import { Alert } from 'react-native';
// import { parseSMS } from './smsParser';
// import { useGatewayStore } from '../store/gatewayStore';

// /**
//  * MOCK PERMISSIONS FOR DEVELOPER B (Frontend Sandbox Mode)
//  */
// export const requestSMSPermissions = async (): Promise<boolean> => {
//   console.log('[Sandbox] Bypassing Android hardware permission checks for UI development.');
//   return true;
// };

// /**
//  * INITIALIZE SANDBOX ENVIRONMENT
//  */
// export const startSMSGatewayListener = async () => {
//   console.log('[Sandbox] UI Event listener initialized. Use the injection tool to test fields.');
// };

// /**
//  * DEV B EXCLUSIVE: Inject a mock SMS string straight into your store 
//  * to test if your Regex Parser and Dashboard UI update perfectly!
//  */
// export const injectMockSMSToGateway = (sender: string, messageBody: string) => {
//   const parsedData = parseSMS(sender, messageBody);
  
//   if (parsedData) {
//     useGatewayStore.getState().addTransactionToQueue(parsedData);
//     Alert.alert('Parser Success', `Caught transaction: ${parsedData.transaction_id}`);
//   } else {
//     Alert.alert('Parser Dropped', 'The raw text body failed to match Telebirr or CBE Birr regex parameters.');
//   }
// };

