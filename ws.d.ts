declare module "ws" {
  export class WebSocket {
    static OPEN: number;
    readyState: number;
    on(event: string, listener: (...args: any[]) => void): void;
    send(data: string): void;
  }

  export class WebSocketServer {
    constructor(options?: { server?: unknown; path?: string });
    on(event: string, listener: (...args: any[]) => void): void;
  }
}
