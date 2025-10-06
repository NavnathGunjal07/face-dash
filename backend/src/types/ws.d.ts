declare module 'ws' {
  export class WebSocketServer {
    constructor(options: { port: number });
    clients: Set<any>;
    on(event: string, callback: (...args: any[]) => void): void;
  }
}
