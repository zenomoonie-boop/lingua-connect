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

const seedRooms: VoiceRoom[] = [
  {
    id: "seed-1",
    topic: "Daily English Conversation",
    language: "English",
    languageCode: "en",
    description: "Practice everyday English with fellow learners!",
    participants: [
      { id: "host-1", name: "Sarah", initials: "SA", color: "#FF6B35", role: "speaker", isMuted: false, isSpeaking: true, nativeLanguage: "English" },
      { id: "user-1", name: "Marco", initials: "MA", color: "#4ECDC4", role: "speaker", isMuted: true, isSpeaking: false, nativeLanguage: "Spanish" },
    ],
    level: "Intermediate",
    tags: ["English", "Intermediate", "chat"],
    theme: "chat",
    background: "galaxy",
    hostId: "host-1",
    hostName: "Sarah",
    hostInitials: "SA",
    hostColor: "#FF6B35",
    speakerRequests: [],
  },
  {
    id: "seed-2",
    topic: "Spanish Oral Practice",
    language: "Spanish",
    languageCode: "es",
    description: "¡Hablemos en español! All levels welcome.",
    participants: [
      { id: "host-2", name: "Carlos", initials: "CA", color: "#8B7CF6", role: "speaker", isMuted: false, isSpeaking: false, nativeLanguage: "Spanish" },
    ],
    level: "All Levels",
    tags: ["Spanish", "All Levels", "oral_practice"],
    theme: "oral_practice",
    background: "rose",
    hostId: "host-2",
    hostName: "Carlos",
    hostInitials: "CA",
    hostColor: "#8B7CF6",
    speakerRequests: [],
  },
  {
    id: "seed-3",
    topic: "Japanese Culture & Language",
    language: "Japanese",
    languageCode: "ja",
    description: "Learn Japanese through cultural discussions!",
    participants: [
      { id: "host-3", name: "Yuki", initials: "YU", color: "#F7C948", role: "speaker", isMuted: false, isSpeaking: true, nativeLanguage: "Japanese" },
      { id: "user-2", name: "Ken", initials: "KE", color: "#45B7D1", role: "listener", isMuted: true, isSpeaking: false, nativeLanguage: "English" },
      { id: "user-3", name: "Anna", initials: "AN", color: "#6BCB77", role: "listener", isMuted: true, isSpeaking: false, nativeLanguage: "German" },
    ],
    level: "Beginner",
    tags: ["Japanese", "Beginner", "culture"],
    theme: "culture",
    background: "spring",
    hostId: "host-3",
    hostName: "Yuki",
    hostInitials: "YU",
    hostColor: "#F7C948",
    speakerRequests: [],
  },
  {
    id: "seed-4",
    topic: "French Make Friends",
    language: "French",
    languageCode: "fr",
    description: "Meet new friends and practice French together!",
    participants: [
      { id: "host-4", name: "Marie", initials: "MA", color: "#FF6B9D", role: "speaker", isMuted: false, isSpeaking: false, nativeLanguage: "French" },
    ],
    level: "All Levels",
    tags: ["French", "All Levels", "make_friends"],
    theme: "make_friends",
    background: "summer",
    hostId: "host-4",
    hostName: "Marie",
    hostInitials: "MA",
    hostColor: "#FF6B9D",
    speakerRequests: [],
  },
  {
    id: "seed-5",
    topic: "K-Pop & Korean Learning",
    language: "Korean",
    languageCode: "ko",
    description: "Learn Korean through your favorite K-Pop songs!",
    participants: [
      { id: "host-5", name: "Ji-Yoon", initials: "JY", color: "#EF4444", role: "speaker", isMuted: false, isSpeaking: true, nativeLanguage: "Korean" },
      { id: "user-4", name: "Luna", initials: "LU", color: "#EC4899", role: "speaker", isMuted: true, isSpeaking: false, nativeLanguage: "English" },
      { id: "user-5", name: "Min-Jun", initials: "MJ", color: "#3B82F6", role: "listener", isMuted: true, isSpeaking: false, nativeLanguage: "Korean" },
    ],
    level: "Intermediate",
    tags: ["Korean", "Intermediate", "music"],
    theme: "music",
    background: "mario",
    hostId: "host-5",
    hostName: "Ji-Yoon",
    hostInitials: "JY",
    hostColor: "#EF4444",
    speakerRequests: [],
  },
];
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
      // Check if file is empty or has no valid rooms, then seed with defaults
      const raw = await fs.readFile(this.filePath, "utf-8");
      const parsed = JSON.parse(raw);
      if (!parsed.rooms || !Array.isArray(parsed.rooms) || parsed.rooms.length === 0) {
        await this.writeFile({ rooms: seedRooms });
      }
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
