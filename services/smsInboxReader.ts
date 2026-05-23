import SmsAndroid from 'react-native-get-sms-android';
import { Platform } from 'react-native';

export interface SMSMessage {
  id: string;
  address: string;
  body: string;
  date: number;
}

export interface GetSMSOptions {
  limit?: number;
  minDate?: number;
  maxDate?: number;
  address?: string;
}

const DEFAULT_SENDERS = ['telebirr', 'cbe', '127']; // Configurable

/**
 * Fetches historical SMS messages directly from the Android Inbox.
 * Returns normalized SMSMessage objects.
 * Completely isolated from state management or business logic.
 */
export const getInboxSMS = (options: GetSMSOptions = {}): Promise<SMSMessage[]> => {
  if (Platform.OS !== 'android') {
    return Promise.resolve([]); // Guard for iOS/Web
  }

  return new Promise((resolve, reject) => {
    const filter = {
      box: 'inbox',
      maxCount: options.limit || 1000,
      ...(options.minDate && { minDate: options.minDate }),
      ...(options.maxDate && { maxDate: options.maxDate }),
      ...(options.address && { address: options.address }),
    };

    SmsAndroid.list(
      JSON.stringify(filter),
      (fail: string) => reject(new Error(`Failed to read SMS: ${fail}`)),
      (count: number, smsList: string) => {
        try {
          const rawMessages = JSON.parse(smsList);
          const messages: SMSMessage[] = rawMessages.map((msg: any) => ({
            id: msg._id ? String(msg._id) : String(Date.now() + Math.random()),
            address: msg.address || '',
            body: msg.body || '',
            date: Number(msg.date) || Date.now(),
          }));
          resolve(messages);
        } catch (e) {
          reject(e);
        }
      }
    );
  });
};

/**
 * Convenience method to fetch SMS messages exclusively from configured bank senders.
 */
export const getRecentBankSMS = async (options: Omit<GetSMSOptions, 'address'> = {}, senders: string[] = DEFAULT_SENDERS): Promise<SMSMessage[]> => {
  const allMessages: SMSMessage[] = [];

  for (const sender of senders) {
    try {
      const msgs = await getInboxSMS({ ...options, address: sender });
      allMessages.push(...msgs);
    } catch (e) {
      console.error(`Failed to fetch SMS for sender ${sender}`, e);
    }
  }

  // Sort newest first
  return allMessages.sort((a, b) => b.date - a.date);
};
