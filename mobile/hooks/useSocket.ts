import { useEffect, useState } from 'react';
import { connectSocket, getSocket, onSocketConnectionChange } from '@/services/socket';

/** Uygulama genelinde Socket.io bağlantı durumunu sağlar. */
export function useSocket() {
  const [connected, setConnected] = useState(false);

  useEffect(() => {
    connectSocket();
    return onSocketConnectionChange(setConnected);
  }, []);

  return { connected, socket: getSocket() };
}
