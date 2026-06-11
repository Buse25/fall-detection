import { io, Socket } from 'socket.io-client';
import { BASE_URL, getToken } from './api';

let socket: Socket | null = null;

/** Bağlantı kopukken biriken sensör pencereleri (bellek içi kuyruk). */
const offlineQueue: SensorWindowPayload[] = [];
const MAX_OFFLINE_QUEUE = 100;

type ConnectionListener = (connected: boolean) => void;
type QueueListener = (length: number) => void;

export interface FallDetectedPayload {
  alarmId: string;
  fallScore: number;
  countdownSec: number;
}
type FallListener = (payload: FallDetectedPayload) => void;

export interface InactivityPreAlarmPayload {
  countdownSec: number;
}
type InactivityPreAlarmListener = (payload: InactivityPreAlarmPayload) => void;

export interface EmergencyAlertPayload {
  alarmId: string;
  type: 'fall' | 'inactivity';
}
type EmergencyAlertListener = (payload: EmergencyAlertPayload) => void;

const connectionListeners = new Set<ConnectionListener>();
const queueListeners = new Set<QueueListener>();
const fallListeners = new Set<FallListener>();
const inactivityPreAlarmListeners = new Set<InactivityPreAlarmListener>();
const emergencyAlertListeners = new Set<EmergencyAlertListener>();

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

  socket.on('fall_detected', (payload: FallDetectedPayload) => {
    console.log('[Socket] Düşme tespit edildi (fall_detected):', payload);
    fallListeners.forEach(fn => fn(payload));
  });

  socket.on('inactivity_pre_alarm', (payload: InactivityPreAlarmPayload) => {
    console.log('[Socket] Hareketsizlik ön alarmı (inactivity_pre_alarm):', payload);
    inactivityPreAlarmListeners.forEach(fn => fn(payload));
  });

  socket.on('inactivity_cancelled', () => {
    console.log('[Socket] Hareketsizlik ön alarmı otomatik iptal edildi (inactivity_cancelled)');
    inactivityPreAlarmListeners.forEach(fn => fn({ countdownSec: 0, _cancelled: true } as any));
  });

  socket.on('emergency_alert', (payload: EmergencyAlertPayload) => {
    console.log('[Socket] Acil durum alarmı (emergency_alert):', payload);
    emergencyAlertListeners.forEach(fn => fn(payload));
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

/** Düşme tespiti event'lerini dinler. */
export function onFallDetected(fn: FallListener): () => void {
  fallListeners.add(fn);
  return () => fallListeners.delete(fn);
}

/** Hareketsizlik ön alarm event'lerini dinler (inactivity_pre_alarm + inactivity_cancelled). */
export function onInactivityPreAlarm(fn: InactivityPreAlarmListener): () => void {
  inactivityPreAlarmListeners.add(fn);
  return () => inactivityPreAlarmListeners.delete(fn);
}

/** Acil durum alarm event'lerini dinler (fall CONFIRMED veya inactivity CONFIRMED). */
export function onEmergencyAlert(fn: EmergencyAlertListener): () => void {
  emergencyAlertListeners.add(fn);
  return () => emergencyAlertListeners.delete(fn);
}

/** Backend'e hareketsizlik ön alarmını iptal ettirir. */
export function emitInactivityCancel(): void {
  const s = getSocket();
  if (s?.connected) {
    s.emit('inactivity_cancel');
  }
}

/** Backend'e düşme alarmının kullanıcı tarafından iptal edildiğini bildirir. */
export function emitFallCancel(alarmId?: string): void {
  const s = getSocket();
  if (s?.connected) {
    s.emit('fall_cancel', { alarmId });
  }
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
