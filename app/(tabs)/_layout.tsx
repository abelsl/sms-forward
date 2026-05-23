import "@/services/smsHeadlessTask";
import { Stack } from 'expo-router';
import React from 'react';
// import "@/services/smsHeadlessTask";


import { useColorScheme } from '@/hooks/use-color-scheme';

export default function TabLayout() {
  const colorScheme = useColorScheme();

  
  return (
    <Stack screenOptions={{ headerShown: false }}>

    </Stack>
  );
}
