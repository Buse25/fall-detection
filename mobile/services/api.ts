/**
 * Merkezi API konfigürasyonu.
 * Backend sunucu adresini buradan değiştirin.
 *
 * - Fiziksel cihaz / gerçek ağ: cihazınızın LAN IP'si (ör. 10.233.90.122)
 * - Android emülatör: 10.0.2.2 (host loopback'e yönlenir)
 * - iOS simülatör: localhost veya 127.0.0.1
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

export const BASE_URL = process.env.EXPO_PUBLIC_API_URL || 'http://localhost:5000';

/** JWT token ve kullanıcı bilgisini bellekte tutan basit depo. */
let _token: string | null = null;
let _userId: string | null = null;
let _userName: string | null = null;

export async function initAuth(): Promise<void> {
  try {
    const jsonValue = await AsyncStorage.getItem('@auth_data');
    if (jsonValue != null) {
      const data = JSON.parse(jsonValue);
      _token = data.token;
      _userId = data.userId;
      _userName = data.userName;
    }
  } catch (e) {
    console.error('Error reading auth data from AsyncStorage:', e);
  }
}

export function setAuth(token: string, userId: string, name: string): void {
  _token = token;
  _userId = userId;
  _userName = name;
  AsyncStorage.setItem('@auth_data', JSON.stringify({ token, userId, userName: name })).catch((e) => {
    console.error('Error saving auth data to AsyncStorage:', e);
  });
}

export function clearAuth(): void {
  _token = null;
  _userId = null;
  _userName = null;
  AsyncStorage.removeItem('@auth_data').catch((e) => {
    console.error('Error removing auth data from AsyncStorage:', e);
  });
}

export const getToken = (): string | null => _token;
export const getUserId = (): string | null => _userId;
export const getUserName = (): string | null => _userName;

/** Authorization başlığını dahil eden JSON header nesnesi döner. */
export function authHeaders(): Record<string, string> {
  return {
    'Content-Type': 'application/json',
    ...(_token ? { Authorization: `Bearer ${_token}` } : {}),
  };
}

/**
 * Cihaza özgü kalıcı bir kimlik döner.
 * - AsyncStorage'da `app_device_id` anahtarı varsa onu kullanır.
 * - Yoksa benzersiz bir ID üretir, AsyncStorage'a kaydeder ve döndürür.
 * - Bu sayede uygulama her yeniden başlatıldığında aynı ID korunur.
 */
export async function getOrCreateDeviceId(): Promise<string> {
  const STORAGE_KEY = 'app_device_id';
  try {
    const existing = await AsyncStorage.getItem(STORAGE_KEY);
    if (existing) return existing;

    const newId = `Device-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
    await AsyncStorage.setItem(STORAGE_KEY, newId);
    return newId;
  } catch (e) {
    console.error('Error managing device ID in AsyncStorage:', e);
    // Depolama başarısız olursa en azından oturum genelinde tutarlı bir ID üret.
    return `Device-fallback-${Date.now()}`;
  }
}
