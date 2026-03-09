import type { Server } from "node:http";
import type { Buffer } from "node:buffer";
import { WebSocket, WebSocketServer } from "ws";
import {
  voiceRoomsStore,
  type VoiceRoom,
  type VoiceRoomMessage,
  type VoiceRoomParticipant,
} from "./voiceRoomsStore";

type ClientState = {
  socket: WebSocket;
  scope?: "lobby" | "room";
  roomId?: string;
  participantId?: string;
};

type IncomingRealtimeMessage =
  | {
      type: "subscribe:lobby";
    }
  | {
      type: "subscribe";
      roomId: string;
      participant?: VoiceRoomParticipant;
    }
  | {
      type: "unsubscribe";
      roomId: string;
      participantId?: string;
    }
  | {
      type: "chat";
      roomId: string;
      message: VoiceRoomMessage;
    }
  | {
      type: "reaction";
      roomId: string;
      participantId: string;
      reaction: { id: string; emoji: string };
    };

class VoiceRealtimeService {
  private wss: WebSocketServer | null = null;
  private clients = new Map<WebSocket, ClientState>();

  attach(server: Server) {
    if (this.wss) return;

    this.wss = new WebSocketServer({ server, path: "/api/voice-rooms/live" });

    this.wss.on("connection", (socket: WebSocket) => {
      this.clients.set(socket, { socket });

      socket.on("message", async (rawMessage: string | Buffer) => {
        try {
          const message = JSON.parse(rawMessage.toString()) as IncomingRealtimeMessage;
          await this.handleMessage(socket, message);
        } catch (error) {
          console.error("Voice realtime message error:", error);
        }
      });

      socket.on("close", async () => {
        const state = this.clients.get(socket);
        this.clients.delete(socket);

        if (state?.roomId && state.participantId) {
          const room = await voiceRoomsStore.removeParticipant(state.roomId, state.participantId);
          if (room) {
            this.broadcastRoomSnapshot(room.id, room);
          }
        }
      });
    });
  }

  broadcastRoomSnapshot(roomId: string, room: VoiceRoom) {
    this.broadcastToRoom(roomId, {
      type: "room:snapshot",
      room,
    });
    void this.broadcastLobbySnapshot();
  }

  broadcastReaction(roomId: string, participantId: string, reaction: { id: string; emoji: string }) {
    this.broadcastToRoom(roomId, {
      type: "reaction",
      roomId,
      participantId,
      reaction,
    });
  }

  broadcastRoomDeleted(roomId: string) {
    this.broadcastToRoom(roomId, {
      type: "room:deleted",
      roomId,
    });
    void this.broadcastLobbySnapshot();
  }

  private async handleMessage(socket: WebSocket, message: IncomingRealtimeMessage) {
    if (message.type === "subscribe:lobby") {
      const nextState = this.clients.get(socket) || { socket };
      nextState.scope = "lobby";
      nextState.roomId = undefined;
      nextState.participantId = undefined;
      this.clients.set(socket, nextState);

      const rooms = await voiceRoomsStore.listRooms();
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({ type: "rooms:snapshot", rooms }));
      }
      return;
    }

    if (message.type === "subscribe") {
      const nextState = this.clients.get(socket) || { socket };
      nextState.scope = "room";
      nextState.roomId = message.roomId;
      nextState.participantId = message.participant?.id;
      this.clients.set(socket, nextState);

      let room = (await voiceRoomsStore.listRooms()).find((item) => item.id === message.roomId) || null;

      if (room && message.participant) {
        room = await voiceRoomsStore.upsertParticipant(message.roomId, message.participant);
      }

      if (room) {
        this.broadcastRoomSnapshot(message.roomId, room);
      }
      return;
    }

    if (message.type === "unsubscribe") {
      if (message.participantId) {
        const room = await voiceRoomsStore.removeParticipant(message.roomId, message.participantId);
        if (room) {
          this.broadcastRoomSnapshot(message.roomId, room);
        }
      }
      return;
    }

    if (message.type === "chat") {
      const room = await voiceRoomsStore.appendMessage(message.roomId, message.message);
      if (!room) return;
      this.broadcastToRoom(message.roomId, {
        type: "chat",
        roomId: message.roomId,
        message: message.message,
      });
      this.broadcastRoomSnapshot(message.roomId, room);
      return;
    }

    if (message.type === "reaction") {
      this.broadcastReaction(message.roomId, message.participantId, message.reaction);
    }
  }

  private broadcastToRoom(roomId: string, payload: Record<string, unknown>) {
    const serialized = JSON.stringify(payload);

    for (const [, client] of this.clients) {
      if (client.scope !== "room") continue;
      if (client.roomId !== roomId) continue;
      if (client.socket.readyState !== WebSocket.OPEN) continue;
      client.socket.send(serialized);
    }
  }

  private async broadcastLobbySnapshot() {
    const rooms = await voiceRoomsStore.listRooms();
    const serialized = JSON.stringify({
      type: "rooms:snapshot",
      rooms,
    });

    for (const [, client] of this.clients) {
      if (client.scope !== "lobby") continue;
      if (client.socket.readyState !== WebSocket.OPEN) continue;
      client.socket.send(serialized);
    }
  }
}

export const voiceRealtime = new VoiceRealtimeService();
