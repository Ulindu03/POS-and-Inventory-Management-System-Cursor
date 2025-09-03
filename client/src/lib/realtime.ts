import { io } from 'socket.io-client';

type ClientSocket = {
  on: (event: string, handler: (...args: any[]) => void) => void;
  off: (event: string, handler?: (...args: any[]) => void) => void;
  emit: (event: string, ...args: any[]) => void;
};

let socket: ClientSocket | null = null;

export function getSocket() {
  if (!socket) {
    const url = import.meta.env.VITE_API_URL?.replace(/\/api$/, '') || 'http://localhost:5000';
    socket = io(url, { withCredentials: true, transports: ['websocket', 'polling'], autoConnect: true, reconnection: true }) as unknown as ClientSocket;
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
