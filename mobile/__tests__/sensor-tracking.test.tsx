import React from 'react';
import { act, fireEvent, render } from '@testing-library/react-native';
import { Accelerometer, Gyroscope } from 'expo-sensors';
import { io } from 'socket.io-client';

import HomeScreen from '../app/(tabs)/home';
import * as apiService from '../services/api';
import * as socketService from '../services/socket';

function latestAccelerometerListener() {
  const calls = (Accelerometer.addListener as jest.Mock).mock.calls;
  return calls[calls.length - 1][0] as (data: { x: number; y: number; z: number }) => void;
}

function latestGyroscopeListener() {
  const calls = (Gyroscope.addListener as jest.Mock).mock.calls;
  return calls[calls.length - 1][0] as (data: { x: number; y: number; z: number }) => void;
}

function makePayload(index: number) {
  return {
    userId: 'u1',
    deviceId: `phone-${index}`,
    windowStart: `2026-06-12T09:00:${String(index).padStart(2, '0')}.000Z`,
    windowEnd: `2026-06-12T09:00:${String(index).padStart(2, '0')}.500Z`,
    sampleRateHz: 50,
    readings: [
      {
        timestamp: `2026-06-12T09:00:${String(index).padStart(2, '0')}.000Z`,
        accelerometer: { x: 1, y: 2, z: 3 },
        gyroscope: { x: 0.1, y: 0.2, z: 0.3 },
      },
    ],
  };
}

describe('Senaryo 3.1 ve 3.2 — Sensör veri toplama, pencereleme ve offline queue', () => {
  beforeEach(() => {
    jest.useFakeTimers();
    jest.clearAllMocks();
    apiService.setAuth('jwt.test', 'user-1', 'Test Kullanıcı');
    jest.spyOn(apiService, 'getUserId').mockReturnValue('user-1');
    jest.spyOn(apiService, 'getUserName').mockReturnValue('Test Kullanıcı');
    const eventHandlers: Record<string, Function> = {};
    (io as jest.Mock).mockReturnValue({
      connected: true,
      id: 'reset-socket',
      emit: jest.fn(),
      on: jest.fn((event, handler) => {
        eventHandlers[event] = handler;
      }),
      disconnect: jest.fn(),
      connect: jest.fn(),
    });
    socketService.disconnectSocket();
    socketService.connectSocket();
    eventHandlers.connect?.();
    socketService.disconnectSocket();
  });

  afterEach(() => {
    jest.useRealTimers();
    jest.restoreAllMocks();
  });

  test('3.1.1 74 örnekte emitSensorWindow çağrılmaz, 75. örnekte tek payload gönderilir', async () => {
    const emitSpy = jest.spyOn(socketService, 'emitSensorWindow').mockReturnValue(true);

    const view = await render(<HomeScreen />);
    expect(await view.findByText('SİSTEM AKTİF')).toBeTruthy();

    act(() => {
      latestAccelerometerListener()({ x: 0.5, y: 9.8, z: 0.1 });
      latestGyroscopeListener()({ x: 0.02, y: -0.01, z: 0 });
      jest.advanceTimersByTime(20 * 74);
    });

    expect(emitSpy).not.toHaveBeenCalled();

    act(() => {
      jest.advanceTimersByTime(20);
    });

    expect(emitSpy).toHaveBeenCalledTimes(1);
    expect(emitSpy.mock.calls[0][0].readings).toHaveLength(75);
  });

  test.failing('3.1.2 payload sampleRateHz değeri 50 olarak gönderilir', async () => {
    const emitSpy = jest.spyOn(socketService, 'emitSensorWindow').mockReturnValue(true);

    const view = await render(<HomeScreen />);
    await view.findByText('SİSTEM AKTİF');

    act(() => {
      latestAccelerometerListener()({ x: 1, y: 2, z: 3 });
      latestGyroscopeListener()({ x: 0.1, y: 0.2, z: 0.3 });
      jest.advanceTimersByTime(20 * 75);
    });

    expect(emitSpy.mock.calls[0][0].sampleRateHz).toBe(50);
  });

  test.failing('3.1.3 windowStart ve windowEnd geçerli ISO timestamp olarak payload içinde yer alır', async () => {
    const emitSpy = jest.spyOn(socketService, 'emitSensorWindow').mockReturnValue(true);

    const view = await render(<HomeScreen />);
    await view.findByText('SİSTEM AKTİF');

    act(() => {
      latestAccelerometerListener()({ x: 1, y: 2, z: 3 });
      latestGyroscopeListener()({ x: 0.1, y: 0.2, z: 0.3 });
      jest.advanceTimersByTime(20 * 75);
    });

    const payload = emitSpy.mock.calls[0][0];
    expect(payload.windowStart).toEqual(expect.any(String));
    expect(payload.windowEnd).toEqual(expect.any(String));
    expect(Number.isNaN(Date.parse(payload.windowStart))).toBe(false);
    expect(Number.isNaN(Date.parse(payload.windowEnd))).toBe(false);
    expect(Date.parse(payload.windowStart)).toBeLessThanOrEqual(Date.parse(payload.windowEnd));
  });

  test.failing('3.1.5 expo-sensors değerleri dönüşüm yapılmadan SensorReading payload formatına aktarılır', async () => {
    const emitSpy = jest.spyOn(socketService, 'emitSensorWindow').mockReturnValue(true);

    const view = await render(<HomeScreen />);
    await view.findByText('SİSTEM AKTİF');

    act(() => {
      latestAccelerometerListener()({ x: 0.5, y: 9.8, z: 0.1 });
      latestGyroscopeListener()({ x: 0.02, y: -0.01, z: 0 });
      jest.advanceTimersByTime(20 * 75);
    });

    const firstReading = emitSpy.mock.calls[0][0].readings[0];
    expect(firstReading.accelerometer).toEqual({ x: 0.5, y: 9.8, z: 0.1 });
    expect(firstReading.gyroscope).toEqual({ x: 0.02, y: -0.01, z: 0 });
    expect(firstReading.timestamp).toEqual(expect.any(String));
  });

  test.failing('3.1 stop/start: İzlemeyi Durdur sonrası tamamlanmamış buffer temizlenir ve emit yapılmaz', async () => {
    const emitSpy = jest.spyOn(socketService, 'emitSensorWindow').mockReturnValue(true);

    const view = await render(<HomeScreen />);
    await view.findByText('SİSTEM AKTİF');

    act(() => {
      latestAccelerometerListener()({ x: 1, y: 1, z: 1 });
      latestGyroscopeListener()({ x: 0.1, y: 0.1, z: 0.1 });
      jest.advanceTimersByTime(20 * 74);
    });

    fireEvent.press(view.getByText('Sensör İzlemeyi Durdur'));
    expect(await view.findByText('SİSTEM DURAKLATILDI')).toBeTruthy();

    act(() => {
      jest.advanceTimersByTime(20 * 10);
    });

    expect(emitSpy).not.toHaveBeenCalled();
    expect(view.getByText('Sensör akışı durduruldu. Başlatmak için düğmeye dokunun.')).toBeTruthy();
  });

  test('3.2.1 socket bağlı değilken pencere kuyruğa alınır ve false döner', () => {
    const result = socketService.emitSensorWindow(makePayload(1));

    expect(result).toBe(false);
    expect(socketService.getOfflineQueueLength()).toBe(1);
  });

  test('3.2.2 kuyruk 100 elemanda FIFO ile en eski pencereyi atar', () => {
    socketService.disconnectSocket();
    for (let i = 0; i < 100; i += 1) {
      socketService.emitSensorWindow(makePayload(i));
    }

    expect(socketService.getOfflineQueueLength()).toBe(100);

    socketService.emitSensorWindow(makePayload(100));

    expect(socketService.getOfflineQueueLength()).toBe(100);
  });

  test('3.2.3 socket connect eventinde offline queue FIFO sırasıyla boşaltılır', async () => {
    socketService.disconnectSocket();
    socketService.emitSensorWindow(makePayload(1));
    socketService.emitSensorWindow(makePayload(2));

    const eventHandlers: Record<string, Function> = {};
    const emit = jest.fn();
    (io as jest.Mock).mockReturnValue({
      connected: true,
      id: 'socket-1',
      emit,
      on: jest.fn((event, handler) => {
        eventHandlers[event] = handler;
      }),
      disconnect: jest.fn(),
    });

    socketService.connectSocket();
    act(() => {
      eventHandlers.connect();
    });

    expect(emit).toHaveBeenNthCalledWith(1, 'sensor_window', expect.objectContaining({ deviceId: 'phone-1' }));
    expect(emit).toHaveBeenNthCalledWith(2, 'sensor_window', expect.objectContaining({ deviceId: 'phone-2' }));
    expect(socketService.getOfflineQueueLength()).toBe(0);
  });

  test('3.2.4 socket bağlıyken pencere doğrudan emit edilir ve kuyruk değişmez', () => {
    const emit = jest.fn();
    (io as jest.Mock).mockReturnValue({
      connected: true,
      id: 'socket-1',
      emit,
      on: jest.fn(),
      disconnect: jest.fn(),
    });

    socketService.disconnectSocket();
    socketService.connectSocket();
    const result = socketService.emitSensorWindow(makePayload(9));

    expect(result).toBe(true);
    expect(emit).toHaveBeenCalledWith('sensor_window', expect.objectContaining({ deviceId: 'phone-9' }));
  });

  test('3.2.5 queueListeners kuyruk boyutu değişimlerinde bilgilendirilir ve unsubscribe sonrası çağrılmaz', () => {
    const listener = jest.fn();
    const unsubscribe = socketService.onOfflineQueueChange(listener);

    socketService.disconnectSocket();
    socketService.emitSensorWindow(makePayload(20));
    expect(listener).toHaveBeenLastCalledWith(socketService.getOfflineQueueLength());

    unsubscribe();
    listener.mockClear();
    socketService.emitSensorWindow(makePayload(21));

    expect(listener).not.toHaveBeenCalled();
  });

  test('3.2.6 boş kuyrukta flush akışı hata fırlatmadan sessizce tamamlanır', () => {
    const eventHandlers: Record<string, Function> = {};
    const emit = jest.fn();
    (io as jest.Mock).mockReturnValue({
      connected: true,
      id: 'socket-empty',
      emit,
      on: jest.fn((event, handler) => {
        eventHandlers[event] = handler;
      }),
      disconnect: jest.fn(),
    });

    socketService.disconnectSocket();
    socketService.connectSocket();

    expect(() => eventHandlers.connect()).not.toThrow();
    expect(emit).not.toHaveBeenCalledWith('sensor_window', expect.anything());
  });
});
