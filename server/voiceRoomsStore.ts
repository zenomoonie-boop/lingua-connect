import { promises as fs } from "node:fs";
import path from "node:path";

export type VoiceRoomParticipant = {
  id: string;
  name: string;
  initials: string;
  color: string;
  avatarUri?: string;
  role: "speaker" | "listener";
  isMuted: boolean;
  isSpeaking: boolean;
  nativeLanguage: string;
  isModerator?: boolean;
};

export type VoiceRoomSpeakerRequest = {
  id: string;
  userId: string;
  name: string;
  initials: string;
  color: string;
  requestedAt: number;
};

export type VoiceRoom = {
  id: string;
  topic: string;
  language: string;
  languageCode: string;
  description: string;
  participants: VoiceRoomParticipant[];
  level: "All Levels" | "Beginner" | "Intermediate" | "Advanced";
  tags: string[];
  theme: "make_friends" | "chat" | "oral_practice" | "culture" | "music";
  background: string;
  hostId?: string;
  hostName?: string;
  hostInitials?: string;
  hostColor?: string;
  hostAvatarUri?: string;
  speakerRequests?: VoiceRoomSpeakerRequest[];
  messages?: VoiceRoomMessage[];
};

export type VoiceRoomMessage = {
  id: string;
  sender: string;
  initials: string;
  color: string;
  text: string;
  ts: number;
};

const seedRooms: VoiceRoom[] = [];
const legacyDemoRoomIds = new Set(["r-1", "r-2", "r-3"]);

function isFakeRoom(room: VoiceRoom): boolean {
  if (legacyDemoRoomIds.has(room.id)) {
    return true;
  }

  return !room.hostId || room.hostId === "me";
}

type VoiceRoomsFile = {
  rooms: VoiceRoom[];
};

function sanitizeRooms(rooms: unknown): VoiceRoom[] {
  if (!Array.isArray(rooms)) {
    return [];
  }

  return rooms.filter((room): room is VoiceRoom => {
    if (!room || typeof room !== "object") return false;
    const candidate = room as VoiceRoom;
    return Boolean(candidate.id) && !isFakeRoom(candidate);
  });
}

export class VoiceRoomsStore {
  private readonly filePath: string;
  private writeQueue: Promise<void> = Promise.resolve();

  constructor(filePath = path.resolve(process.cwd(), "server", "data", "voice-rooms.json")) {
    this.filePath = filePath;
  }

  async init(): Promise<void> {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });

    try {
      await fs.access(this.filePath);
    } catch {
      await this.writeFile({ rooms: seedRooms });
    }
  }

  async listRooms(): Promise<VoiceRoom[]> {
    const data = await this.readFile();
    return data.rooms;
  }

  async createRoom(room: VoiceRoom): Promise<VoiceRoom> {
    const data = await this.readFile();
    data.rooms = [room, ...data.rooms.filter((item) => item.id !== room.id)];
    await this.writeFile(data);
    return room;
  }

  async updateRoom(roomId: string, room: VoiceRoom): Promise<VoiceRoom | null> {
    const data = await this.readFile();
    const index = data.rooms.findIndex((item) => item.id === roomId);

    if (index === -1) {
      return null;
    }

    const updatedRoom = {
      ...data.rooms[index],
      ...room,
      id: roomId,
    };

    data.rooms[index] = updatedRoom;
    await this.writeFile(data);
    return updatedRoom;
  }

  async deleteRoom(roomId: string): Promise<VoiceRoom | null> {
    const data = await this.readFile();
    const room = data.rooms.find((item) => item.id === roomId) || null;

    if (!room) {
      return null;
    }

    data.rooms = data.rooms.filter((item) => item.id !== roomId);
    await this.writeFile(data);
    return room;
  }

  async upsertParticipant(roomId: string, participant: VoiceRoomParticipant): Promise<VoiceRoom | null> {
    const data = await this.readFile();
    const room = data.rooms.find((item) => item.id === roomId);
    if (!room) return null;

    const existingIndex = room.participants.findIndex((item) => item.id === participant.id);
    if (existingIndex >= 0) {
      room.participants[existingIndex] = { ...room.participants[existingIndex], ...participant };
    } else {
      room.participants.push(participant);
    }

    await this.writeFile(data);
    return room;
  }

  async removeParticipant(roomId: string, participantId: string): Promise<VoiceRoom | null> {
    const data = await this.readFile();
    const room = data.rooms.find((item) => item.id === roomId);
    if (!room) return null;

    room.participants = room.participants.filter((item) => item.id !== participantId);
    room.speakerRequests = (room.speakerRequests || []).filter((item) => item.userId !== participantId);

    await this.writeFile(data);
    return room;
  }

  async appendMessage(roomId: string, message: VoiceRoomMessage): Promise<VoiceRoom | null> {
    const data = await this.readFile();
    const room = data.rooms.find((item) => item.id === roomId);
    if (!room) return null;

    room.messages = [...(room.messages || []), message].slice(-40);
    await this.writeFile(data);
    return room;
  }

  private async readFile(): Promise<VoiceRoomsFile> {
    await this.init();
    const raw = await fs.readFile(this.filePath, "utf-8");
    const parsed = JSON.parse(raw) as Partial<VoiceRoomsFile>;
    const rooms = sanitizeRooms(parsed.rooms);

    return {
      rooms,
    };
  }

  private async writeFile(data: VoiceRoomsFile): Promise<void> {
    this.writeQueue = this.writeQueue.then(() =>
      fs.writeFile(this.filePath, `${JSON.stringify(data, null, 2)}\n`, "utf-8"),
    );

    await this.writeQueue;
  }
}

export const voiceRoomsStore = new VoiceRoomsStore();
