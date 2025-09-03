import type { Server as IOServer } from 'socket.io';

let ioInstance: IOServer | null = null;

export function setIO(io: IOServer) {
  ioInstance = io;
}

export function getIO(): IOServer | null {
  return ioInstance;
}

export function emit(event: string, payload: unknown) {
  if (ioInstance) {
    ioInstance.emit(event, payload);
  }
}
