import AsyncStorage from '@react-native-async-storage/async-storage';
import { io } from 'socket.io-client';

import {
  authHeaders,
  clearAuth,
  getToken,
  getUserId,
  getUserName,
  initAuth,
  setAuth,
} from '../services/api';
import { connectSocket, disconnectSocket } from '../services/socket';

describe('Senaryo 3.4 — JWT ve AsyncStorage Testleri', () => {
  beforeEach(async () => {
    jest.clearAllMocks();
    disconnectSocket();
    clearAuth();
    await AsyncStorage.clear();
  });

  test('3.4.1 başarılı girişte token mevcut kodda @auth_data JSON kaydı olarak AsyncStorage içine yazılır', async () => {
    setAuth('jwt.abc.def', 'user-1', 'Ayşe Test');

    const raw = await AsyncStorage.getItem('@auth_data');

    expect(raw).not.toBeNull();
    expect(JSON.parse(raw as string)).toEqual({
      token: 'jwt.abc.def',
      userId: 'user-1',
      userName: 'Ayşe Test',
    });
    expect(getToken()).toBe('jwt.abc.def');
  });

  test('3.4.2 uygulama yeniden açıldığında initAuth @auth_data içinden oturumu restore eder', async () => {
    await AsyncStorage.setItem(
      '@auth_data',
      JSON.stringify({ token: 'jwt.restore', userId: 'user-2', userName: 'Restore User' })
    );

    await initAuth();

    expect(getToken()).toBe('jwt.restore');
    expect(getUserId()).toBe('user-2');
    expect(getUserName()).toBe('Restore User');
    expect(authHeaders()).toMatchObject({ Authorization: 'Bearer jwt.restore' });
  });

  test('3.4.3 çıkışta AsyncStorage temizlenir ve bellek içi auth state sıfırlanır', async () => {
    setAuth('jwt.logout', 'user-3', 'Logout User');
    expect(getToken()).toBe('jwt.logout');

    clearAuth();

    expect(getToken()).toBeNull();
    expect(getUserId()).toBeNull();
    expect(getUserName()).toBeNull();
    await expect(AsyncStorage.getItem('@auth_data')).resolves.toBeNull();
  });

  test('3.4.4 AsyncStorage bozuk JSON içerdiğinde initAuth çökmez ve token restore edilmez', async () => {
    await AsyncStorage.setItem('@auth_data', 'INVALID_TOKEN_###');

    await expect(initAuth()).resolves.toBeUndefined();

    expect(getToken()).toBeNull();
  });

  test('3.4.4 AsyncStorage null dönerse kullanıcı oturumu restore edilmez', async () => {
    await initAuth();

    expect(getToken()).toBeNull();
    expect(getUserId()).toBeNull();
  });

  test('3.4.5 connectSocket auth parametresine bellekteki token değerini aktarır', () => {
    const socketMock = {
      connected: true,
      on: jest.fn(),
      emit: jest.fn(),
      disconnect: jest.fn(),
    };
    (io as jest.Mock).mockReturnValue(socketMock);
    setAuth('jwt.socket', 'user-4', 'Socket User');

    connectSocket();

    expect(io).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        auth: { token: 'jwt.socket' },
        transports: ['websocket'],
      })
    );
  });

  test('3.4.5 token null ise mevcut kod socket bağlantısını auth.token=null ile dener', () => {
    const socketMock = {
      connected: true,
      on: jest.fn(),
      emit: jest.fn(),
      disconnect: jest.fn(),
    };
    (io as jest.Mock).mockReturnValue(socketMock);

    connectSocket();

    expect(io).toHaveBeenCalledWith(
      expect.any(String),
      expect.objectContaining({
        auth: { token: null },
      })
    );
  });
});
