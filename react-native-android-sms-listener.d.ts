declare module "react-native-android-sms-listener" {
  type SmsMessage = {
    originatingAddress: string;
    body: string;
    timestamp: number;
  };

  type ListenerCallback = (message: SmsMessage) => void;

  const SmsListener: {
    addListener: (callback: ListenerCallback) => {
      remove: () => void;
    };
  };

  export default SmsListener;
}