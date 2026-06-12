import { DarkTheme, DefaultTheme, ThemeProvider } from '@react-navigation/native';
import { Stack, router, usePathname } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useEffect } from 'react';
import { Alert } from 'react-native';
import 'react-native-reanimated';

import { useColorScheme } from '@/hooks/use-color-scheme';
import { initAuth, getToken } from '@/services/api';
import { requestInitialPermissions } from '@/services/permissions';
import {
  connectSocket,
  onFallDetected,
  onInactivityPreAlarm,
  onEmergencyAlert,
} from '@/services/socket';

export const unstable_settings = {
  anchor: '(tabs)',
};

export default function RootLayout() {
  const colorScheme = useColorScheme();
  const pathname = usePathname();

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

    // fall_detected: her zaman replace — zaten alarm ekranındaysa üstüne yazar,
    // stack'e ikinci bir alarm ekranı birikmez. Fall en yüksek önceliklidir.
    const unsubFall = onFallDetected((payload) => {
      router.replace({
        pathname: '/alarm',
        params: {
          alarmType: 'fall',
          alarmId: String(payload.alarmId),
          fallScore: String(payload.fallScore),
          countdownSec: String(payload.countdownSec),
        },
      });
    });

    // inactivity_pre_alarm: yalnızca alarm ekranı kapalıyken push yapar.
    // Fall alarmı açıkken inactivity onu kesmez.
    const unsubInactivity = onInactivityPreAlarm((payload) => {
      const cancelled = (payload as any)._cancelled;
      if (cancelled) return; // inactivity_cancelled — _layout'ta işlem gerekmez, alarm.tsx yönetir

      if (pathname === '/alarm') return; // Zaten alarm ekranındaysa navigate etme
      router.push({
        pathname: '/alarm',
        params: {
          alarmType: 'inactivity',
          countdownSec: String(payload.countdownSec),
        },
      });
    });

    // emergency_alert: alarm ekranı açıksa in-place geçiş yapar (alarm.tsx halleder).
    // Ekran kapalıysa push ile aç.
    const unsubEmergency = onEmergencyAlert((payload) => {
      if (payload.type !== 'inactivity') return; // fall emergency ayrı akışta
      if (pathname === '/alarm') return; // alarm.tsx kendi onEmergencyAlert hook'uyla günceller
      router.push({
        pathname: '/alarm',
        params: {
          alarmType: 'inactivity',
          alarmId: String(payload.alarmId),
          countdownSec: '0',
        },
      });
    });

    return () => {
      unsubFall();
      unsubInactivity();
      unsubEmergency();
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
