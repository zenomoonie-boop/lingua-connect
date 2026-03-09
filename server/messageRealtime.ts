import type { Server } from "node:http";
import { WebSocket, WebSocketServer } from "ws";
import { storage } from "./storage";

type MessageRealtimeClient = {
  socket: WebSocket;
  userId: string;
};

class MessageRealtimeService {
  private wss: WebSocketServer | null = null;
  private clients = new Map<WebSocket, MessageRealtimeClient>();

  attach(server: Server) {
    if (this.wss) {
      return;
    }

    this.wss = new WebSocketServer({ server, path: "/api/messages/live" });
    this.wss.on("connection", async (socket, req) => {
      try {
        const requestUrl = new URL(req.url || "/api/messages/live", "http://localhost");
        const token = requestUrl.searchParams.get("token")?.trim();
        if (!token) {
          socket.close();
          return;
        }

        const user = await storage.getUserBySessionToken(token);
        if (!user) {
          socket.close();
          return;
        }

        this.clients.set(socket, {
          socket,
          userId: user.id,
        });

        socket.on("close", () => {
          this.clients.delete(socket);
        });

        socket.on("error", () => {
          this.clients.delete(socket);
        });

        this.send(socket, {
          type: "connected",
          userId: user.id,
        });
      } catch (error) {
        console.error("Message realtime connection error:", error);
        socket.close();
      }
    });
  }

  notifyConversationUpdated(userIds: string[], conversationId: string, senderId: string) {
    const serialized = JSON.stringify({
      type: "message:new",
      conversationId,
      senderId,
    });

    for (const [, client] of this.clients) {
      if (!userIds.includes(client.userId)) {
        continue;
      }
      if (client.socket.readyState !== WebSocket.OPEN) {
        continue;
      }
      client.socket.send(serialized);
    }
  }

  private send(socket: WebSocket, payload: Record<string, unknown>) {
    if (socket.readyState !== WebSocket.OPEN) {
      return;
    }
    socket.send(JSON.stringify(payload));
  }
}

export const messageRealtime = new MessageRealtimeService();
