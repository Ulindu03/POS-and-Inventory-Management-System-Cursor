declare module 'socket.io' {
  export type Socket = any;
  export class Server<T = any> {
    constructor(httpServer: any, options?: any);
    on(event: string, handler: (...args: any[]) => void): void;
    emit(event: string, ...args: any[]): void;
  }
}
