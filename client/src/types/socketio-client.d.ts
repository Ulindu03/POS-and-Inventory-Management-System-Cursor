declare module 'socket.io-client' {
  export type Socket = any;
  export function io(url: string, options?: any): Socket;
}
