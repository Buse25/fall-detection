/**
 * Merkezi API konfigürasyonu.
 * Backend sunucu adresini buradan değiştirin.
 *
 * - Fiziksel cihaz / gerçek ağ: cihazınızın LAN IP'si (ör. 10.233.90.122)
 * - Android emülatör: 10.0.2.2 (host loopback'e yönlenir)
 * - iOS simülatör: localhost veya 127.0.0.1
 */
export const BASE_URL = 'http://10.84.250.122:5000';

/** JWT token ve kullanıcı bilgisini bellekte tutan basit depo. */
let _token: string | null = null;
let _userId: string | null = null;
let _userName: string | null = null;

export function setAuth(token: string, userId: string, name: string): void {
  _token = token;
  _userId = userId;
  _userName = name;
}

export function clearAuth(): void {
  _token = null;
  _userId = null;
  _userName = null;
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
