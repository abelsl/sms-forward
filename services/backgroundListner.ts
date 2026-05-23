// import { useGatewayStore } from '@/store/gatewayStore';
// import SmsListener from 'react-native-android-sms-listener';
// import { parseSMS } from './smsParser';

// export const startBackgroundSmsListener = () => {
//   SmsListener.addListener((message: any) => {
//     const payload = parseSMS(message.sender,message.body);

//     // push into store queue immediately
//     useGatewayStore.getState().addToQueue({
//       id: Date.now().toString(),
//       status: 'pending',
//       attempts: 0,
//       payload,
//     });

//     // auto sync attempt
//     useGatewayStore.getState().manualSyncQueue();
//   });
// };
// src/services/startBackgroundSmsListener.ts

import { useGatewayStore } from '@/store/gatewayStore';
import SmsListener from 'react-native-android-sms-listener';
import { parseSMS } from './smsParser';


export const startBackgroundSmsListener = () => {
  const store = useGatewayStore.getState();

  SmsListener.addListener((message: any) => {
  


    const tx = parseSMS(message.originatingAddress.toString() , message.body);

    if (!tx) return;

    // 🚨 Prevent duplicates (extra safety)
    const exists = store.queue.some(
      (item) => item.payload.transaction_id === tx.transaction_id
    );

    if (exists) return;

    //  Add to queue using your store
    store.addTransactionToQueue(tx);

    console.log(' SMS added to queue:', tx.transaction_id);

    // Auto sync if enabled (your logic already supports this)
    if (store.isListening) {
      store.manualSyncQueue();
    }
  });
};