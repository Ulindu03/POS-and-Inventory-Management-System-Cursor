//functions to manage real-time communication using Socket.IO
import { io } from 'socket.io-client';

type ClientSocket = {
  on: (event: string, handler: (...args: any[]) => void) => void;
  off: (event: string, handler?: (...args: any[]) => void) => void;
  emit: (event: string, ...args: any[]) => void;
};

let socket: ClientSocket | null = null;

export function getSocket() {
  if (!socket) {
    // In development, use the Vite dev server URL with proxy
    // In production, use the actual backend URL
    const url = import.meta.env.VITE_API_URL?.replace(/\/api$/, '') || window.location.origin;
    socket = io(url, {
      withCredentials: true,
      transports: ['websocket'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    }) as unknown as ClientSocket;
    if (import.meta.env.DEV) {
      const s = socket as ClientSocket & { on: any };
      s.on('connect_error', (err: any) => {
        console.warn('socket connect_error:', err?.message || err);
      });
      s.on('disconnect', (reason: any) => {
        console.warn('socket disconnect:', reason);
      });
      s.on('reconnect_attempt', (attempt: number) => {
        console.log('socket reconnect_attempt:', attempt);
      });
    }
  }
  return socket;
}
