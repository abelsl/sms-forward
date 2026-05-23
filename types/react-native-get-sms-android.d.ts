declare module 'react-native-get-sms-android' {
  const SmsAndroid: {
    list: (
      filter: string,
      fail: (error: string) => void,
      success: (count: number, smsList: string) => void
    ) => void;
  };
  export default SmsAndroid;
}
