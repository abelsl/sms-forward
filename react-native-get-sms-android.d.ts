declare module 'react-native-get-sms-android' {
  export function list(
    filter: string,
    fail: (error: any) => void,
    success: (count: number, smsList: string) => void
  ): void;
}