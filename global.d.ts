declare module "react-native-android-sms-listener" {
  export type SmsMessage = {
    originatingAddress: string;
    body: string;
    timestamp: number;
  };

  const SmsListener: {
    addListener: (
      callback: (message: SmsMessage) => void
    ) => {
      remove: () => void;
    };
  };

  export default SmsListener;
}