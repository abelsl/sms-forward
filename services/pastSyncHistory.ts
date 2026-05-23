import SmsAndroid from 'react-native-get-sms-android';
import { parseSMS } from './smsParser';
import { syncTransactionToServer } from './apiSync';
import { useGatewayStore } from '@/store/gatewayStore';
import { TransactionPayload } from '@/types';
import { DO_NOT_USE_OR_YOU_WILL_BE_FIRED_EXPERIMENTAL_FORM_ACTIONS } from 'react';
export interface SmsMessage {
  _id: string;
  address: string;
  body: string;
  date: string;
  type: number;
}

function getPreviousDayToNowTimestamps() {
  const now = new Date();

  // Start of today (00:00:00)
  const startOfToday = new Date(now);
  startOfToday.setHours(0, 0, 0, 0);

  // Start of previous day (yesterday 00:00:00)
  const startOfYesterday = new Date(startOfToday);
  startOfYesterday.setDate(startOfToday.getDate() - 1);

  return  startOfYesterday.getTime() // yesterday 00:00
  
}

export const readLast24HoursSms = async (): Promise<SmsMessage[]> => {
  return new Promise((resolve, reject) => {
    // Current time
    const now = Date.now();

    // yesterday 00:00
    const yesterday = getPreviousDayToNowTimestamps();

    const filter = {
      box: 'inbox',

      // Only messages newer than yesterday 00:00
      minDate: yesterday,

      maxCount: 1000,
    };

    // const allowedSenders :'127'| 'telebirr'| 'cbe'| 'cbebirr'| 'CBEBirr' | null = DO_NOT_USE_OR_YOU_WILL_BE_FIRED_EXPERIMENTAL_FORM_ACTIONS;
    // let allMessages;
    SmsAndroid.list(
      JSON.stringify(filter),

      (fail: any) => {
        console.log('SMS Read Failed:', fail);
        reject(fail);
      },

      (_count: number, smsList: string) => {
        // console.log(`Raw SMS fetched from device: ${smsList.length} characters`);
        try {
          const messages = JSON.parse(smsList);
          // console.log(messages[0])
          //  ONLY FILTER BY SENDER
          const filtered = messages.filter((sms : any) => {
            // if (sms.length === 0) return true;

            const sender = (sms.address || '').toLowerCase();
            // console.log("[SMSReader]Checking sender:", sender);
            if (sender.includes('127') || sender.includes('telebirr') || sender.includes('cbe') || sender.includes('cbebirr') || sender.includes('CBEBirr') ) {
              return sms;
            }
          });
          // console.log(`Fetched ${messages.length} SMS messages, ${filtered.length} after sender filter.`);
          // allMessages = filtered;
          return resolve(filtered);


        } catch (err) {
          return reject(err);
        }
      }
    );
  });

};

export const get24hrsSmsCount = async () => {
  try {
    const messages = await readLast24HoursSms();
    return messages.length;
  } catch (error) {
    console.error('Error occurred while fetching SMS count:', error);
    return 0;
  }
};

export const syncPast24HoursSms = async (): Promise<void> => {
  try {
    const messages = await readLast24HoursSms();
    console.log(`Found ${messages.length} SMS messages from the last 24 hours.`); 
    const totalMessages : TransactionPayload[] = [];
    for (const sms of messages) {
      // console.log('Processing SMS:', sms);
      // Here you would parse the SMS and sync it to your server
      // For example:
      const transaction = parseSMS(sms.address, sms.body);
      if (transaction) {
        totalMessages.push(transaction);
      }
    }
    console.log(`Parsed ${totalMessages.length} valid transactions from the last 24 hours of SMS messages.`);
    useGatewayStore.getState().addTransactionToQueueWithoutSync(totalMessages);
    // useGatewayStore.getState().manualBatchSyncQueue();
    console.log('[SyncHistory]Transaction length :', messages.length);
  } catch (error) {
    console.error('Error occurred while syncing past 24 hours of SMS messages:', error);
  }
};