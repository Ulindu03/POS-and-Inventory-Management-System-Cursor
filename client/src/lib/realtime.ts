//functions to manage real-time communication using Socket.IO
import { io } from 'socket.io-client';

type EventHandler = (...args: unknown[]) => void;
type ClientSocket = {
  on: (event: string, handler: EventHandler) => void;
  off: (event: string, handler?: EventHandler) => void;
  emit: (event: string, ...args: unknown[]) => void;
};

let socket: ClientSocket | null = null;

export function getSocket() {
  if (!socket) {
    // In development, use the Vite dev server URL with proxy
    // In production, use the actual backend URL
    const url = import.meta.env.VITE_API_URL?.replace(/\/api$/, '') || window.location.origin;
    socket = io(url, {
      withCredentials: true,
      transports: ['websocket', 'polling'], // Allow polling fallback for cross-origin
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: Infinity,
      reconnectionDelay: 1000,
      reconnectionDelayMax: 5000,
      timeout: 20000,
    }) as unknown as ClientSocket;
    if (import.meta.env.DEV) {
      // dev-only diagnostics
      // socket.io-client typings are complex; we keep handlers loosely typed for logs
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const anySocket = socket as unknown as { on: (e: string, h: (...a: any[]) => void) => void };
      anySocket.on('connect_error', (err: any) => {
        console.warn('socket connect_error:', (err && err.message) ? err.message : err);
      });
      anySocket.on('disconnect', (reason: any) => {
        console.warn('socket disconnect:', reason);
      });
      anySocket.on('reconnect_attempt', (attempt: number) => {
        console.log('socket reconnect_attempt:', attempt);
      });
    }
  }
  return socket;
}
