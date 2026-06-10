import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Alert } from 'react-native';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { initAuth, getToken } from '@/services/api';
import { requestInitialPermissions } from '@/services/permissions';
import { connectSocket, onFallDetected } from '@/services/socket';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();

  useEffect(() => {
    initAuth().then(() => {
      const token = getToken();
      if (token) {
        connectSocket();
      }
    });

    requestInitialPermissions().then((result) => {
      if (!result.granted) {
        Alert.alert(
          'Uyarı',
          'Sensör izni verilmediği için düşme tespiti özellikleri çalışmayacaktır.'
        );
      }
    });

    const unsubFall = onFallDetected((payload) => {
      router.push({
        pathname: '/alarm',
        params: {
          alarmId: payload.alarmId,
          fallScore: payload.fallScore,
          countdownSec: payload.countdownSec,
        }
      });
    });

    return () => {
      unsubFall();
    };
  }, []);

  return (
    <ThemeProvider value={colorScheme === 'dark' ? DarkTheme : DefaultTheme}>
      <Stack>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="register" options={{ headerShown: false }} />
        <Stack.Screen name="alarm" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen name="modal" options={{ presentation: 'modal', title: 'Modal' }} />
      </Stack>
      <StatusBar style="auto" />
    </ThemeProvider>
  );
}
