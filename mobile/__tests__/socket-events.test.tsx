import React from 'react';
import { Alert, Vibration } from 'react-native';
import { act, fireEvent, render, waitFor } from '@testing-library/react-native';
import { io } from 'socket.io-client';

import RootLayout from '../app/_layout';
import AlarmScreen from '../app/alarm';
import { setAuth } from '../services/api';
import * as socketService from '../services/socket';

jest.mock('../services/permissions', () => ({
  requestInitialPermissions: jest.fn(() =>
    Promise.resolve({ granted: true, accelerometerAvailable: true, gyroscopeAvailable: true })
  ),
}));

jest.mock('../hooks/use-color-scheme', () => ({
  useColorScheme: () => 'light',
}));

const router = global.__getExpoRouter();

function createConnectedSocket() {
  const handlers: Record<string, Function> = {};
  const emit = jest.fn();
  const disconnect = jest.fn();
  (io as jest.Mock).mockReturnValue({
    connected: true,
    id: 'mobile-socket',
    emit,
    disconnect,
    connect: jest.fn(),
    on: jest.fn((event, handler) => {
      handlers[event] = handler;
    }),
  });
  socketService.disconnectSocket();
  socketService.connectSocket();
  return { handlers, emit, disconnect };
}

describe('Senaryo 3.3 — Socket.IO Alarm Event UI Testleri', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    socketService.disconnectSocket();
    setAuth('jwt.mobile', 'user-1', 'Test Kullanıcı');
    global.__setExpoRouterParams({});
    global.__setExpoRouterPathname('/(tabs)/home');
    global.fetch = jest.fn(() =>
      Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      })
    ) as jest.Mock;
    jest.spyOn(Alert, 'alert').mockImplementation(jest.fn());
    jest.spyOn(Vibration, 'vibrate').mockImplementation(jest.fn());
    jest.spyOn(Vibration, 'cancel').mockImplementation(jest.fn());
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  test('3.3.1 fall_detected event RootLayout üzerinden alarm ekranına replace eder', async () => {
    const { handlers } = createConnectedSocket();
    await render(<RootLayout />);

    await act(async () => undefined);
    act(() => {
      handlers.fall_detected({
        alarmId: 'abc',
        fallScore: 0.91,
        countdownSec: 10,
      });
    });

    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith({
        pathname: '/alarm',
        params: {
          alarmType: 'fall',
          alarmId: 'abc',
          fallScore: '0.91',
          countdownSec: '10',
        },
      });
    });
  });

  test.failing('3.3.1 fall alarm ekranı 10 saniyeden başlar ve İyiyim/Yardım butonlarını gösterir', async () => {
    global.__setExpoRouterParams({
      alarmType: 'fall',
      alarmId: 'abc',
      fallScore: '0.91',
      countdownSec: '10',
    });

    const view = await render(<AlarmScreen />);

    expect(view.getByText('DÜŞME TESPİT EDİLDİ!')).toBeTruthy();
    expect(view.getByText('10')).toBeTruthy();
    expect(view.getByText('İyiyim (İptal Et)')).toBeTruthy();
    expect(view.getByText('HEMEN YARDIM GÖNDER')).toBeTruthy();
  });

  test.failing('3.3.2 fall geri sayımı 0 olduğunda acil durum akışını tetikler', async () => {
    global.__setExpoRouterParams({
      alarmType: 'fall',
      alarmId: 'abc',
      countdownSec: '2',
    });

    await render(<AlarmScreen />);

    act(() => {
      jest.advanceTimersByTime(2_000);
    });

    expect(Alert.alert).toHaveBeenCalledWith(
      'Acil Durum Tetiklendi!',
      'Kişilere haber veriliyor...',
      expect.any(Array)
    );
  });

  test.failing('3.3.3 İyiyim butonu fall_cancel event gönderir ve home ekranına döner', async () => {
    const { emit } = createConnectedSocket();
    global.__setExpoRouterParams({
      alarmType: 'fall',
      alarmId: 'abc',
      countdownSec: '10',
    });

    const view = await render(<AlarmScreen />);
    fireEvent.press(view.getByText('İyiyim (İptal Et)'));

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/alarms/abc/resolve'),
        expect.objectContaining({ method: 'PATCH' })
      );
      expect(emit).toHaveBeenCalledWith('fall_cancel', { alarmId: 'abc' });
      expect(router.replace).toHaveBeenCalledWith('/(tabs)/home');
    });
  });

  test.failing('3.3.4 socket bağlı değilken İyiyim sessizce tamamlanır ve ekran kapanır', async () => {
    socketService.disconnectSocket();
    global.__setExpoRouterParams({
      alarmType: 'fall',
      alarmId: 'abc',
      countdownSec: '10',
    });

    const view = await render(<AlarmScreen />);
    fireEvent.press(view.getByText('İyiyim (İptal Et)'));

    await waitFor(() => {
      expect(router.replace).toHaveBeenCalledWith('/(tabs)/home');
    });
  });

  test('3.3.5 inactivity_pre_alarm event RootLayout üzerinden inactivity alarm ekranına push eder', async () => {
    const { handlers } = createConnectedSocket();
    await render(<RootLayout />);

    await act(async () => undefined);
    act(() => {
      handlers.inactivity_pre_alarm({ countdownSec: 60 });
    });

    await waitFor(() => {
      expect(router.push).toHaveBeenCalledWith({
        pathname: '/alarm',
        params: {
          alarmType: 'inactivity',
          countdownSec: '60',
        },
      });
    });
  });

  test.failing('3.3.6 Ben Buradayım butonu inactivity_cancel event gönderir ve ekranı kapatır', async () => {
    const { emit } = createConnectedSocket();
    global.__setExpoRouterParams({
      alarmType: 'inactivity',
      countdownSec: '60',
    });

    const view = await render(<AlarmScreen />);
    fireEvent.press(view.getByText('İyiyim, Ben Buradayım'));

    expect(emit).toHaveBeenCalledWith('inactivity_cancel');
    expect(router.replace).toHaveBeenCalledWith('/(tabs)/home');
  });

  test('3.3.7 inactivity_cancelled event listenerlara _cancelled bayrağıyla iletilir', () => {
    const { handlers } = createConnectedSocket();
    const listener = jest.fn();
    socketService.onInactivityPreAlarm(listener);

    act(() => {
      handlers.inactivity_cancelled();
    });

    expect(listener).toHaveBeenCalledWith({ countdownSec: 0, _cancelled: true });
  });

  test('3.3.8 emergency_alert inactivity confirmed ekranını gösterir', async () => {
    global.__setExpoRouterParams({
      alarmType: 'inactivity',
      countdownSec: '60',
    });
    await render(<AlarmScreen />);

    act(() => {
      socketService.onEmergencyAlert(() => undefined);
    });

    const { handlers } = createConnectedSocket();
    await render(<RootLayout />);
    await act(async () => undefined);
    act(() => {
      handlers.emergency_alert({ alarmId: 'xyz', type: 'inactivity' });
    });

    await waitFor(() => {
      expect(router.push).toHaveBeenCalledWith({
        pathname: '/alarm',
        params: {
          alarmType: 'inactivity',
          alarmId: 'xyz',
          countdownSec: '0',
        },
      });
    });
  });
});
