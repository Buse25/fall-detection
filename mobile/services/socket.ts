import { io, Socket } from 'socket.io-client';
import { BASE_URL, getToken } from './api';

let socket: Socket | null = null;

/** Bağlantı kopukken biriken sensör pencereleri (bellek içi kuyruk). */
const offlineQueue: SensorWindowPayload[] = [];
const MAX_OFFLINE_QUEUE = 100;

type ConnectionListener = (connected: boolean) => void;
type QueueListener = (length: number) => void;

const connectionListeners = new Set<ConnectionListener>();
const queueListeners = new Set<QueueListener>();

function notifyConnectionListeners(connected: boolean) {
  connectionListeners.forEach(fn => fn(connected));
}

function notifyQueueListeners() {
  queueListeners.forEach(fn => fn(offlineQueue.length));
}

function flushOfflineQueue(): void {
  const s = getSocket();
  if (!s?.connected || offlineQueue.length === 0) return;

  const pending = offlineQueue.splice(0, offlineQueue.length);
  notifyQueueListeners();

  for (const payload of pending) {
    s.emit('sensor_window', payload);
  }

  console.log(`[Socket] Çevrimdışı kuyruk boşaltıldı: ${pending.length} pencere`);
}

/** Uygulama açıldığında çağrılır; mevcut bağlantı varsa yeniden kullanır. */
export function connectSocket(): Socket {
  if (socket?.connected) return socket;

  if (socket) {
    socket.connect();
    return socket;
  }

  socket = io(BASE_URL, {
    transports: ['websocket'],
    autoConnect: true,
    auth: { token: getToken() },
  });

  socket.on('connect', () => {
    console.log('[Socket] Bağlandı:', socket?.id);
    notifyConnectionListeners(true);
    flushOfflineQueue();
  });

  socket.on('disconnect', reason => {
    console.log('[Socket] Bağlantı kesildi:', reason);
    notifyConnectionListeners(false);
  });

  socket.on('connect_error', err => {
    console.log('[Socket] Bağlantı hatası:', err.message);
    notifyConnectionListeners(false);
  });

  return socket;
}

export function disconnectSocket(): void {
  socket?.disconnect();
  socket = null;
  notifyConnectionListeners(false);
}

export function getSocket(): Socket | null {
  return socket;
}

export function isSocketConnected(): boolean {
  return socket?.connected ?? false;
}

export function getOfflineQueueLength(): number {
  return offlineQueue.length;
}

/** Bağlantı durumu değişikliklerini dinler. */
export function onSocketConnectionChange(fn: ConnectionListener): () => void {
  connectionListeners.add(fn);
  fn(isSocketConnected());
  return () => connectionListeners.delete(fn);
}

/** Çevrimdışı kuyruk boyutu değişikliklerini dinler. */
export function onOfflineQueueChange(fn: QueueListener): () => void {
  queueListeners.add(fn);
  fn(offlineQueue.length);
  return () => queueListeners.delete(fn);
}

export interface SensorReading {
  timestamp: string;
  accelerometer: { x: number; y: number; z: number };
  gyroscope: { x: number; y: number; z: number };
}

export interface SensorWindowPayload {
  userId: string;
  deviceId: string;
  windowStart: string;
  windowEnd: string;
  sampleRateHz: number;
  readings: SensorReading[];
}

/**
 * Dolu sensör penceresini gönderir.
 * Bağlantı yoksa kuyruğa ekler; reconnect sonrası otomatik boşaltılır.
 * @returns true = anında gönderildi, false = kuyruğa alındı veya kuyruk dolu
 */
export function emitSensorWindow(payload: SensorWindowPayload): boolean {
  const s = getSocket();

  if (!s?.connected) {
    if (offlineQueue.length >= MAX_OFFLINE_QUEUE) {
      console.warn('[Socket] Çevrimdışı kuyruk dolu — en eski pencere atılıyor');
      offlineQueue.shift();
    }
    offlineQueue.push(payload);
    notifyQueueListeners();
    console.log(`[Socket] Çevrimdışı kuyruğa eklendi (${offlineQueue.length}/${MAX_OFFLINE_QUEUE})`);
    return false;
  }

  s.emit('sensor_window', payload);
  return true;
}
