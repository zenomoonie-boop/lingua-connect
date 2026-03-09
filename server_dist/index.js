var __defProp = Object.defineProperty;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __esm = (fn, res) => function __init() {
  return fn && (res = (0, fn[__getOwnPropNames(fn)[0]])(fn = 0)), res;
};
var __export = (target, all) => {
  for (var name in all)
    __defProp(target, name, { get: all[name], enumerable: true });
};

// server/replit_integrations/chat/storage.ts
var conversations2, messages2, conversationIdCounter, messageIdCounter, chatStorage;
var init_storage = __esm({
  "server/replit_integrations/chat/storage.ts"() {
    "use strict";
    conversations2 = [];
    messages2 = [];
    conversationIdCounter = 1;
    messageIdCounter = 1;
    chatStorage = {
      async getConversation(id) {
        return conversations2.find((conversation) => conversation.id === id);
      },
      async getAllConversations() {
        return [...conversations2].sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
      },
      async createConversation(title) {
        const conversation = {
          id: conversationIdCounter++,
          title,
          createdAt: /* @__PURE__ */ new Date()
        };
        conversations2.push(conversation);
        return conversation;
      },
      async deleteConversation(id) {
        const conversationIndex = conversations2.findIndex((conversation) => conversation.id === id);
        if (conversationIndex >= 0) {
          conversations2.splice(conversationIndex, 1);
        }
        for (let index2 = messages2.length - 1; index2 >= 0; index2--) {
          if (messages2[index2].conversationId === id) {
            messages2.splice(index2, 1);
          }
        }
      },
      async getMessagesByConversation(conversationId) {
        return messages2.filter((message) => message.conversationId === conversationId).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
      },
      async createMessage(conversationId, role, content) {
        const message = {
          id: messageIdCounter++,
          conversationId,
          role,
          content,
          createdAt: /* @__PURE__ */ new Date()
        };
        messages2.push(message);
        return message;
      }
    };
  }
});

// server/replit_integrations/audio/client.ts
import OpenAI2, { toFile } from "openai";
import { spawn } from "child_process";
import { writeFile, unlink, readFile } from "fs/promises";
import { randomUUID as randomUUID2 } from "crypto";
import { tmpdir } from "os";
import { join } from "path";
import "dotenv/config";
function detectAudioFormat(buffer) {
  if (buffer.length < 12) return "unknown";
  if (buffer[0] === 82 && buffer[1] === 73 && buffer[2] === 70 && buffer[3] === 70) {
    return "wav";
  }
  if (buffer[0] === 26 && buffer[1] === 69 && buffer[2] === 223 && buffer[3] === 163) {
    return "webm";
  }
  if (buffer[0] === 255 && (buffer[1] === 251 || buffer[1] === 250 || buffer[1] === 243) || buffer[0] === 73 && buffer[1] === 68 && buffer[2] === 51) {
    return "mp3";
  }
  if (buffer[4] === 102 && buffer[5] === 116 && buffer[6] === 121 && buffer[7] === 112) {
    return "mp4";
  }
  if (buffer[0] === 79 && buffer[1] === 103 && buffer[2] === 103 && buffer[3] === 83) {
    return "ogg";
  }
  return "unknown";
}
async function convertToWav(audioBuffer) {
  const inputPath = join(tmpdir(), `input-${randomUUID2()}`);
  const outputPath = join(tmpdir(), `output-${randomUUID2()}.wav`);
  try {
    await writeFile(inputPath, audioBuffer);
    await new Promise((resolve2, reject) => {
      const ffmpeg = spawn("ffmpeg", [
        "-i",
        inputPath,
        "-vn",
        // Extract audio only (ignore video track)
        "-f",
        "wav",
        "-ar",
        "16000",
        // 16kHz sample rate (good for speech)
        "-ac",
        "1",
        // Mono
        "-acodec",
        "pcm_s16le",
        "-y",
        // Overwrite output
        outputPath
      ]);
      ffmpeg.stderr.on("data", () => {
      });
      ffmpeg.on("close", (code) => {
        if (code === 0) resolve2();
        else reject(new Error(`ffmpeg exited with code ${code}`));
      });
      ffmpeg.on("error", reject);
    });
    return await readFile(outputPath);
  } finally {
    await unlink(inputPath).catch(() => {
    });
    await unlink(outputPath).catch(() => {
    });
  }
}
async function ensureCompatibleFormat(audioBuffer) {
  const detected = detectAudioFormat(audioBuffer);
  if (detected === "wav") return { buffer: audioBuffer, format: "wav" };
  if (detected === "mp3") return { buffer: audioBuffer, format: "mp3" };
  const wavBuffer = await convertToWav(audioBuffer);
  return { buffer: wavBuffer, format: "wav" };
}
async function speechToText(audioBuffer, format = "wav") {
  const file = await toFile(audioBuffer, `audio.${format}`);
  const response = await openai.audio.transcriptions.create({
    file,
    model: "gpt-4o-mini-transcribe"
  });
  return response.text;
}
var openai;
var init_client = __esm({
  "server/replit_integrations/audio/client.ts"() {
    "use strict";
    openai = new OpenAI2({
      apiKey: process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
      baseURL: process.env.OPENAI_BASE_URL || process.env.AI_INTEGRATIONS_OPENAI_BASE_URL
    });
  }
});

// server/replit_integrations/audio/routes.ts
var routes_exports = {};
__export(routes_exports, {
  registerAudioRoutes: () => registerAudioRoutes
});
import express from "express";
function parseRouteId(idParam) {
  const value = Array.isArray(idParam) ? idParam[0] : idParam;
  const parsed = Number.parseInt(String(value), 10);
  return Number.isFinite(parsed) ? parsed : null;
}
function registerAudioRoutes(app2) {
  app2.get("/api/conversations", async (req, res) => {
    try {
      const conversations3 = await chatStorage.getAllConversations();
      res.json(conversations3);
    } catch (error) {
      console.error("Error fetching conversations:", error);
      res.status(500).json({ error: "Failed to fetch conversations" });
    }
  });
  app2.get("/api/conversations/:id", async (req, res) => {
    try {
      const id = parseRouteId(req.params.id);
      if (id === null) {
        return res.status(400).json({ error: "Invalid conversation id" });
      }
      const conversation = await chatStorage.getConversation(id);
      if (!conversation) {
        return res.status(404).json({ error: "Conversation not found" });
      }
      const messages3 = await chatStorage.getMessagesByConversation(id);
      res.json({ ...conversation, messages: messages3 });
    } catch (error) {
      console.error("Error fetching conversation:", error);
      res.status(500).json({ error: "Failed to fetch conversation" });
    }
  });
  app2.post("/api/conversations", async (req, res) => {
    try {
      const { title } = req.body;
      const conversation = await chatStorage.createConversation(title || "New Chat");
      res.status(201).json(conversation);
    } catch (error) {
      console.error("Error creating conversation:", error);
      res.status(500).json({ error: "Failed to create conversation" });
    }
  });
  app2.delete("/api/conversations/:id", async (req, res) => {
    try {
      const id = parseRouteId(req.params.id);
      if (id === null) {
        return res.status(400).json({ error: "Invalid conversation id" });
      }
      await chatStorage.deleteConversation(id);
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting conversation:", error);
      res.status(500).json({ error: "Failed to delete conversation" });
    }
  });
  app2.post("/api/conversations/:id/messages", audioBodyParser, async (req, res) => {
    try {
      const conversationId = parseRouteId(req.params.id);
      if (conversationId === null) {
        return res.status(400).json({ error: "Invalid conversation id" });
      }
      const { audio, voice = "alloy" } = req.body;
      if (!audio) {
        return res.status(400).json({ error: "Audio data (base64) is required" });
      }
      const rawBuffer = Buffer.from(audio, "base64");
      const { buffer: audioBuffer, format: inputFormat } = await ensureCompatibleFormat(rawBuffer);
      const userTranscript = await speechToText(audioBuffer, inputFormat);
      await chatStorage.createMessage(conversationId, "user", userTranscript);
      const existingMessages = await chatStorage.getMessagesByConversation(conversationId);
      const chatHistory = existingMessages.map((m) => ({
        role: m.role,
        content: m.content
      }));
      res.setHeader("Content-Type", "text/event-stream");
      res.setHeader("Cache-Control", "no-cache");
      res.setHeader("Connection", "keep-alive");
      res.write(`data: ${JSON.stringify({ type: "user_transcript", data: userTranscript })}

`);
      const stream = await openai.chat.completions.create({
        model: "gpt-audio",
        modalities: ["text", "audio"],
        audio: { voice, format: "pcm16" },
        messages: chatHistory,
        stream: true
      });
      let assistantTranscript = "";
      for await (const chunk of stream) {
        const delta = chunk.choices?.[0]?.delta;
        if (!delta) continue;
        if (delta?.audio?.transcript) {
          assistantTranscript += delta.audio.transcript;
          res.write(`data: ${JSON.stringify({ type: "transcript", data: delta.audio.transcript })}

`);
        }
        if (delta?.audio?.data) {
          res.write(`data: ${JSON.stringify({ type: "audio", data: delta.audio.data })}

`);
        }
      }
      await chatStorage.createMessage(conversationId, "assistant", assistantTranscript);
      res.write(`data: ${JSON.stringify({ type: "done", transcript: assistantTranscript })}

`);
      res.end();
    } catch (error) {
      console.error("Error processing voice message:", error);
      if (res.headersSent) {
        res.write(`data: ${JSON.stringify({ type: "error", error: "Failed to process voice message" })}

`);
        res.end();
      } else {
        res.status(500).json({ error: "Failed to process voice message" });
      }
    }
  });
}
var audioBodyParser;
var init_routes = __esm({
  "server/replit_integrations/audio/routes.ts"() {
    "use strict";
    init_storage();
    init_client();
    audioBodyParser = express.json({ limit: "50mb" });
  }
});

// server/index.ts
import express2 from "express";
import "dotenv/config";

// server/routes.ts
import { createServer } from "node:http";
import { createHash } from "node:crypto";
import OpenAI from "openai";
import "dotenv/config";

// server/messageRealtime.ts
import { WebSocket, WebSocketServer } from "ws";

// server/storage.ts
import {
  and,
  desc,
  eq,
  gt,
  sql as sql2
} from "drizzle-orm";

// shared/schema.ts
import { sql } from "drizzle-orm";
import {
  boolean,
  index,
  integer,
  jsonb,
  pgTable,
  text,
  timestamp,
  uniqueIndex,
  varchar
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
var users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  username: text("username").notNull().unique(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  displayName: text("display_name").notNull(),
  avatarUri: text("avatar_uri"),
  avatarColor: varchar("avatar_color", { length: 32 }),
  bio: text("bio"),
  gender: varchar("gender", { length: 24 }),
  age: integer("age"),
  countryCode: varchar("country_code", { length: 8 }),
  countryName: text("country_name"),
  flag: text("flag"),
  nativeLanguage: text("native_language"),
  learningLanguages: jsonb("learning_languages").$type().notNull().default(sql`'[]'::jsonb`),
  followers: integer("followers").notNull().default(0),
  following: integer("following").notNull().default(0),
  followingUserIds: jsonb("following_user_ids").$type().notNull().default(sql`'[]'::jsonb`),
  moments: integer("moments").notNull().default(0),
  latitude: text("latitude"),
  longitude: text("longitude"),
  locationName: text("location_name"),
  isActive: boolean("is_active").notNull().default(true),
  lastSeenAt: timestamp("last_seen_at"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull()
});
var profiles = pgTable(
  "profiles",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }).unique(),
    avatarUrl: text("avatar_url"),
    avatarColor: varchar("avatar_color", { length: 32 }),
    countryCode: varchar("country_code", { length: 8 }),
    countryName: text("country_name"),
    flag: text("flag"),
    nativeLanguage: text("native_language"),
    learningLanguages: jsonb("learning_languages").$type().notNull().default(sql`'[]'::jsonb`),
    age: integer("age"),
    gender: varchar("gender", { length: 24 }),
    bio: text("bio"),
    latitude: text("latitude"),
    longitude: text("longitude"),
    locationName: text("location_name"),
    createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
    updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull()
  }
);
var authSessions = pgTable(
  "auth_sessions",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull()
  },
  (table) => ({
    authSessionsUserIdx: index("auth_sessions_user_id_idx").on(table.userId)
  })
);
var follows = pgTable(
  "follows",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    followerId: varchar("follower_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    followingId: varchar("following_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull()
  },
  (table) => ({
    followerFollowingUnique: uniqueIndex("follows_follower_following_unique").on(table.followerId, table.followingId),
    followsFollowerIdx: index("follows_follower_id_idx").on(table.followerId),
    followsFollowingIdx: index("follows_following_id_idx").on(table.followingId)
  })
);
var moments = pgTable(
  "moments",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    text: text("text").notNull(),
    lang: text("lang").notNull(),
    langColor: varchar("lang_color", { length: 32 }).notNull(),
    likes: integer("likes").notNull().default(0),
    comments: integer("comments").notNull().default(0),
    correction: jsonb("correction").$type(),
    createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull()
  },
  (table) => ({
    momentsUserIdx: index("moments_user_id_idx").on(table.userId),
    momentsCreatedAtIdx: index("moments_created_at_idx").on(table.createdAt)
  })
);
var conversations = pgTable(
  "conversations",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    title: text("title"),
    type: varchar("type", { length: 24 }).notNull().default("direct"),
    createdById: varchar("created_by_id").references(() => users.id, { onDelete: "set null" }),
    lastMessageAt: timestamp("last_message_at"),
    createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
    updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull()
  },
  (table) => ({
    conversationsCreatedByIdx: index("conversations_created_by_id_idx").on(table.createdById),
    conversationsLastMessageIdx: index("conversations_last_message_at_idx").on(table.lastMessageAt)
  })
);
var conversationParticipants = pgTable(
  "conversation_participants",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    conversationId: varchar("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
    userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    role: varchar("role", { length: 24 }).notNull().default("member"),
    lastReadAt: timestamp("last_read_at"),
    unreadCount: integer("unread_count").notNull().default(0),
    isArchived: boolean("is_archived").notNull().default(false),
    isMuted: boolean("is_muted").notNull().default(false),
    joinedAt: timestamp("joined_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
    updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull()
  },
  (table) => ({
    conversationParticipantUnique: uniqueIndex("conversation_participants_unique").on(table.conversationId, table.userId),
    conversationParticipantsUserIdx: index("conversation_participants_user_id_idx").on(table.userId)
  })
);
var messages = pgTable(
  "messages",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    conversationId: varchar("conversation_id").notNull().references(() => conversations.id, { onDelete: "cascade" }),
    senderId: varchar("sender_id").references(() => users.id, { onDelete: "set null" }),
    role: varchar("role", { length: 24 }).notNull().default("user"),
    content: text("content").notNull(),
    messageType: varchar("message_type", { length: 24 }).notNull().default("text"),
    metadata: jsonb("metadata").$type(),
    createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
    updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull()
  },
  (table) => ({
    messagesConversationIdx: index("messages_conversation_id_idx").on(table.conversationId),
    messagesSenderIdx: index("messages_sender_id_idx").on(table.senderId),
    messagesCreatedAtIdx: index("messages_created_at_idx").on(table.createdAt)
  })
);
var voiceRooms = pgTable(
  "voice_rooms",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    hostId: varchar("host_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    topic: text("topic").notNull(),
    language: text("language").notNull(),
    languageCode: varchar("language_code", { length: 16 }).notNull(),
    description: text("description"),
    level: varchar("level", { length: 32 }).notNull().default("All Levels"),
    theme: varchar("theme", { length: 32 }).notNull().default("chat"),
    background: varchar("background", { length: 32 }).notNull().default("galaxy"),
    tags: jsonb("tags").$type().notNull().default(sql`'[]'::jsonb`),
    isActive: boolean("is_active").notNull().default(true),
    startedAt: timestamp("started_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
    lastHeartbeatAt: timestamp("last_heartbeat_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
    createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
    updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull()
  },
  (table) => ({
    voiceRoomsHostIdx: index("voice_rooms_host_id_idx").on(table.hostId),
    voiceRoomsLanguageIdx: index("voice_rooms_language_code_idx").on(table.languageCode),
    voiceRoomsActiveIdx: index("voice_rooms_is_active_idx").on(table.isActive)
  })
);
var voiceParticipants = pgTable(
  "voice_participants",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    roomId: varchar("room_id").notNull().references(() => voiceRooms.id, { onDelete: "cascade" }),
    userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    role: varchar("role", { length: 24 }).notNull().default("listener"),
    status: varchar("status", { length: 24 }).notNull().default("active"),
    joinedAt: timestamp("joined_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
    lastSeenAt: timestamp("last_seen_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
    leftAt: timestamp("left_at")
  },
  (table) => ({
    voiceParticipantUnique: uniqueIndex("voice_participants_room_user_unique").on(table.roomId, table.userId),
    voiceParticipantsUserIdx: index("voice_participants_user_id_idx").on(table.userId),
    voiceParticipantsStatusIdx: index("voice_participants_status_idx").on(table.status)
  })
);
var lessonProgress = pgTable(
  "lesson_progress",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    lessonId: text("lesson_id").notNull(),
    languageCode: varchar("language_code", { length: 16 }).notNull(),
    completed: boolean("completed").notNull().default(false),
    score: integer("score"),
    completedAt: timestamp("completed_at"),
    updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull()
  },
  (table) => ({
    lessonProgressUnique: uniqueIndex("lesson_progress_user_lesson_unique").on(table.userId, table.lessonId),
    lessonProgressLanguageIdx: index("lesson_progress_language_code_idx").on(table.languageCode)
  })
);
var quizResults = pgTable(
  "quiz_results",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
    quizId: text("quiz_id").notNull(),
    lessonId: text("lesson_id"),
    languageCode: varchar("language_code", { length: 16 }).notNull(),
    score: integer("score").notNull(),
    totalQuestions: integer("total_questions"),
    passed: boolean("passed").notNull().default(false),
    answers: jsonb("answers").$type().notNull().default(sql`'[]'::jsonb`),
    createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull()
  },
  (table) => ({
    quizResultsUserIdx: index("quiz_results_user_id_idx").on(table.userId),
    quizResultsQuizIdx: index("quiz_results_quiz_id_idx").on(table.quizId)
  })
);
var userProgress = pgTable("user_progress", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }).unique(),
  streak: integer("streak").notNull().default(0),
  totalXp: integer("total_xp").notNull().default(0),
  selectedLanguages: jsonb("selected_languages").$type().notNull().default(sql`'[]'::jsonb`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull()
});
var streaks = pgTable(
  "streaks",
  {
    id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
    userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }).unique(),
    currentStreak: integer("current_streak").notNull().default(0),
    longestStreak: integer("longest_streak").notNull().default(0),
    lastActivityDate: timestamp("last_activity_date"),
    freezeCount: integer("freeze_count").notNull().default(0),
    updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull()
  }
);
var insertUserSchema = createInsertSchema(users).pick({
  username: true,
  email: true,
  passwordHash: true,
  displayName: true,
  avatarUri: true,
  avatarColor: true,
  bio: true,
  gender: true,
  age: true,
  countryCode: true,
  countryName: true,
  flag: true,
  nativeLanguage: true,
  learningLanguages: true,
  followers: true,
  following: true,
  followingUserIds: true,
  moments: true,
  latitude: true,
  longitude: true,
  locationName: true
});
var insertProfileSchema = createInsertSchema(profiles).pick({
  userId: true,
  avatarUrl: true,
  avatarColor: true,
  countryCode: true,
  countryName: true,
  flag: true,
  nativeLanguage: true,
  learningLanguages: true,
  age: true,
  gender: true,
  bio: true,
  latitude: true,
  longitude: true,
  locationName: true
});
var insertAuthSessionSchema = createInsertSchema(authSessions).pick({
  userId: true,
  token: true,
  expiresAt: true
});
var insertFollowSchema = createInsertSchema(follows).pick({
  followerId: true,
  followingId: true
});
var insertMomentSchema = createInsertSchema(moments).pick({
  userId: true,
  text: true,
  lang: true,
  langColor: true,
  likes: true,
  comments: true,
  correction: true
});
var insertConversationSchema = createInsertSchema(conversations).pick({
  title: true,
  type: true,
  createdById: true,
  lastMessageAt: true
});
var insertConversationParticipantSchema = createInsertSchema(conversationParticipants).pick({
  conversationId: true,
  userId: true,
  role: true,
  lastReadAt: true,
  unreadCount: true,
  isArchived: true,
  isMuted: true
});
var insertMessageSchema = createInsertSchema(messages).pick({
  conversationId: true,
  senderId: true,
  role: true,
  content: true,
  messageType: true,
  metadata: true
});
var insertVoiceRoomSchema = createInsertSchema(voiceRooms).pick({
  hostId: true,
  topic: true,
  language: true,
  languageCode: true,
  description: true,
  level: true,
  theme: true,
  background: true,
  tags: true,
  isActive: true,
  startedAt: true,
  lastHeartbeatAt: true
});
var insertVoiceParticipantSchema = createInsertSchema(voiceParticipants).pick({
  roomId: true,
  userId: true,
  role: true,
  status: true,
  joinedAt: true,
  lastSeenAt: true,
  leftAt: true
});
var insertLessonProgressSchema = createInsertSchema(lessonProgress).pick({
  userId: true,
  lessonId: true,
  languageCode: true,
  completed: true,
  score: true,
  completedAt: true
});
var insertQuizResultSchema = createInsertSchema(quizResults).pick({
  userId: true,
  quizId: true,
  lessonId: true,
  languageCode: true,
  score: true,
  totalQuestions: true,
  passed: true,
  answers: true
});
var insertUserProgressSchema = createInsertSchema(userProgress).pick({
  userId: true,
  streak: true,
  totalXp: true,
  selectedLanguages: true
});
var insertStreakSchema = createInsertSchema(streaks).pick({
  userId: true,
  currentStreak: true,
  longestStreak: true,
  lastActivityDate: true,
  freezeCount: true
});

// server/storage.ts
import { randomUUID } from "crypto";

// server/db.ts
import "dotenv/config";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";
var connectionString = process.env.DATABASE_URL?.trim();
var hasDatabase = Boolean(connectionString);
var pool = connectionString ? new Pool({
  connectionString,
  ssl: process.env.NODE_ENV === "production" ? { rejectUnauthorized: false } : void 0
}) : null;
var db = pool ? drizzle(pool) : null;

// server/storage.ts
function defined(value) {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== void 0));
}
function buildUserInsert(insertUser) {
  return {
    username: insertUser.username,
    email: insertUser.email,
    passwordHash: insertUser.passwordHash,
    displayName: insertUser.displayName,
    avatarUri: insertUser.avatarUri ?? null,
    avatarColor: insertUser.avatarColor ?? null,
    bio: insertUser.bio ?? null,
    gender: insertUser.gender ?? null,
    age: insertUser.age ?? null,
    countryCode: insertUser.countryCode ?? null,
    countryName: insertUser.countryName ?? null,
    flag: insertUser.flag ?? null,
    nativeLanguage: insertUser.nativeLanguage ?? null,
    learningLanguages: insertUser.learningLanguages ?? [],
    followers: insertUser.followers ?? 0,
    following: insertUser.following ?? 0,
    followingUserIds: insertUser.followingUserIds ?? [],
    moments: insertUser.moments ?? 0,
    latitude: insertUser.latitude ?? null,
    longitude: insertUser.longitude ?? null,
    locationName: insertUser.locationName ?? null,
    isActive: true,
    lastSeenAt: null
  };
}
function buildProfileInsert(userId, insertUser) {
  return {
    userId,
    avatarUrl: insertUser.avatarUri ?? null,
    avatarColor: insertUser.avatarColor ?? null,
    countryCode: insertUser.countryCode ?? null,
    countryName: insertUser.countryName ?? null,
    flag: insertUser.flag ?? null,
    nativeLanguage: insertUser.nativeLanguage ?? null,
    learningLanguages: insertUser.learningLanguages ?? [],
    age: insertUser.age ?? null,
    gender: insertUser.gender ?? null,
    bio: insertUser.bio ?? null,
    latitude: insertUser.latitude ?? null,
    longitude: insertUser.longitude ?? null,
    locationName: insertUser.locationName ?? null
  };
}
function buildUserUpdate(updates) {
  return defined({
    username: updates.username,
    email: updates.email,
    passwordHash: updates.passwordHash,
    displayName: updates.displayName,
    avatarUri: updates.avatarUri,
    avatarColor: updates.avatarColor,
    bio: updates.bio,
    gender: updates.gender,
    age: updates.age,
    countryCode: updates.countryCode,
    countryName: updates.countryName,
    flag: updates.flag,
    nativeLanguage: updates.nativeLanguage,
    learningLanguages: updates.learningLanguages,
    followers: updates.followers,
    following: updates.following,
    followingUserIds: updates.followingUserIds,
    moments: updates.moments,
    latitude: updates.latitude,
    longitude: updates.longitude,
    locationName: updates.locationName,
    isActive: updates.isActive,
    lastSeenAt: updates.lastSeenAt,
    updatedAt: /* @__PURE__ */ new Date()
  });
}
function buildProfileUpdate(updates) {
  return defined({
    avatarUrl: updates.avatarUri,
    avatarColor: updates.avatarColor,
    countryCode: updates.countryCode,
    countryName: updates.countryName,
    flag: updates.flag,
    nativeLanguage: updates.nativeLanguage,
    learningLanguages: updates.learningLanguages,
    age: updates.age,
    gender: updates.gender,
    bio: updates.bio,
    latitude: updates.latitude,
    longitude: updates.longitude,
    locationName: updates.locationName,
    updatedAt: /* @__PURE__ */ new Date()
  });
}
var MemStorage = class {
  users;
  sessions;
  moments;
  userProgress;
  lessonProgress;
  conversations;
  conversationParticipants;
  messages;
  constructor() {
    this.users = /* @__PURE__ */ new Map();
    this.sessions = /* @__PURE__ */ new Map();
    this.moments = /* @__PURE__ */ new Map();
    this.userProgress = /* @__PURE__ */ new Map();
    this.lessonProgress = /* @__PURE__ */ new Map();
    this.conversations = /* @__PURE__ */ new Map();
    this.conversationParticipants = /* @__PURE__ */ new Map();
    this.messages = /* @__PURE__ */ new Map();
  }
  async getUser(id) {
    return this.users.get(id);
  }
  async getUserByUsername(username) {
    return Array.from(this.users.values()).find((user) => user.username === username);
  }
  async getUserByEmail(email) {
    return Array.from(this.users.values()).find((user) => user.email.toLowerCase() === email.toLowerCase());
  }
  async createUser(insertUser) {
    const id = randomUUID();
    const now = /* @__PURE__ */ new Date();
    const user = {
      id,
      username: insertUser.username,
      email: insertUser.email,
      passwordHash: insertUser.passwordHash,
      displayName: insertUser.displayName,
      avatarUri: insertUser.avatarUri ?? null,
      avatarColor: insertUser.avatarColor ?? null,
      bio: insertUser.bio ?? null,
      gender: insertUser.gender ?? null,
      age: insertUser.age ?? null,
      countryCode: insertUser.countryCode ?? null,
      countryName: insertUser.countryName ?? null,
      flag: insertUser.flag ?? null,
      nativeLanguage: insertUser.nativeLanguage ?? null,
      learningLanguages: insertUser.learningLanguages ?? [],
      followers: insertUser.followers ?? 0,
      following: insertUser.following ?? 0,
      followingUserIds: insertUser.followingUserIds ?? [],
      moments: insertUser.moments ?? 0,
      latitude: insertUser.latitude ?? null,
      longitude: insertUser.longitude ?? null,
      locationName: insertUser.locationName ?? null,
      isActive: true,
      lastSeenAt: null,
      createdAt: now,
      updatedAt: now
    };
    this.users.set(id, user);
    this.userProgress.set(id, {
      id: randomUUID(),
      userId: id,
      streak: 0,
      totalXp: 0,
      selectedLanguages: insertUser.learningLanguages ?? [],
      updatedAt: /* @__PURE__ */ new Date()
    });
    return user;
  }
  async updateUser(id, updates) {
    const existing = this.users.get(id);
    if (!existing) {
      return void 0;
    }
    const nextUser = {
      ...existing,
      ...updates,
      id: existing.id,
      updatedAt: /* @__PURE__ */ new Date()
    };
    this.users.set(id, nextUser);
    return nextUser;
  }
  async listUsers() {
    return Array.from(this.users.values());
  }
  async toggleFollowUser(currentUserId, targetUserId) {
    const currentUser = this.users.get(currentUserId);
    const targetUser = this.users.get(targetUserId);
    if (!currentUser || !targetUser || currentUserId === targetUserId) {
      return null;
    }
    const currentFollowing = Array.isArray(currentUser.followingUserIds) ? currentUser.followingUserIds : [];
    const isFollowing = currentFollowing.includes(targetUserId);
    const nextFollowingUserIds = isFollowing ? currentFollowing.filter((id) => id !== targetUserId) : [...currentFollowing, targetUserId];
    const nextCurrentUser = {
      ...currentUser,
      followingUserIds: nextFollowingUserIds,
      following: nextFollowingUserIds.length,
      updatedAt: /* @__PURE__ */ new Date()
    };
    const nextTargetUser = {
      ...targetUser,
      followers: Math.max(0, (targetUser.followers ?? 0) + (isFollowing ? -1 : 1)),
      updatedAt: /* @__PURE__ */ new Date()
    };
    this.users.set(currentUserId, nextCurrentUser);
    this.users.set(targetUserId, nextTargetUser);
    return {
      currentUser: nextCurrentUser,
      targetUser: nextTargetUser,
      isFollowing: !isFollowing
    };
  }
  async listMoments() {
    return Array.from(this.moments.values()).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }
  async createMoment(insertMoment) {
    const id = randomUUID();
    const moment = {
      id,
      userId: insertMoment.userId,
      text: insertMoment.text,
      lang: insertMoment.lang,
      langColor: insertMoment.langColor,
      likes: insertMoment.likes ?? 0,
      comments: insertMoment.comments ?? 0,
      correction: insertMoment.correction ?? null,
      createdAt: /* @__PURE__ */ new Date()
    };
    this.moments.set(id, moment);
    const user = this.users.get(insertMoment.userId);
    if (user) {
      this.users.set(insertMoment.userId, {
        ...user,
        moments: (user.moments ?? 0) + 1,
        updatedAt: /* @__PURE__ */ new Date()
      });
    }
    return moment;
  }
  async getUserProgress(userId) {
    const existing = this.userProgress.get(userId);
    if (existing) {
      return existing;
    }
    const nextProgress = {
      id: randomUUID(),
      userId,
      streak: 0,
      totalXp: 0,
      selectedLanguages: [],
      updatedAt: /* @__PURE__ */ new Date()
    };
    this.userProgress.set(userId, nextProgress);
    return nextProgress;
  }
  async updateUserProgress(userId, updates) {
    const existing = await this.getUserProgress(userId);
    const nextProgress = {
      ...existing,
      ...updates,
      id: existing.id,
      userId,
      updatedAt: /* @__PURE__ */ new Date()
    };
    this.userProgress.set(userId, nextProgress);
    return nextProgress;
  }
  async listLessonProgress(userId) {
    return Array.from(this.lessonProgress.values()).filter((progress) => progress.userId === userId);
  }
  async upsertLessonProgress(progress) {
    const existing = Array.from(this.lessonProgress.values()).find(
      (item) => item.userId === progress.userId && item.lessonId === progress.lessonId
    );
    if (existing) {
      const nextProgress2 = {
        ...existing,
        ...progress,
        id: existing.id,
        updatedAt: /* @__PURE__ */ new Date()
      };
      this.lessonProgress.set(existing.id, nextProgress2);
      return nextProgress2;
    }
    const nextProgress = {
      id: randomUUID(),
      userId: progress.userId,
      lessonId: progress.lessonId,
      languageCode: progress.languageCode,
      completed: progress.completed ?? false,
      score: progress.score ?? null,
      completedAt: progress.completedAt ?? null,
      updatedAt: /* @__PURE__ */ new Date()
    };
    this.lessonProgress.set(nextProgress.id, nextProgress);
    return nextProgress;
  }
  async createSession(userId) {
    const token = randomUUID();
    const session = {
      token,
      userId,
      expiresAt: new Date(Date.now() + 1e3 * 60 * 60 * 24 * 30)
    };
    this.sessions.set(token, session);
    return session;
  }
  async getUserBySessionToken(token) {
    const session = this.sessions.get(token);
    if (!session) {
      return void 0;
    }
    if (session.expiresAt.getTime() <= Date.now()) {
      this.sessions.delete(token);
      return void 0;
    }
    return this.users.get(session.userId);
  }
  async deleteSession(token) {
    this.sessions.delete(token);
  }
  async listConversationSummaries(userId) {
    const participations = Array.from(this.conversationParticipants.values()).filter((item) => item.userId === userId).sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
    return participations.map((participant) => {
      const conversation = this.conversations.get(participant.conversationId);
      const peerParticipant = Array.from(this.conversationParticipants.values()).find(
        (item) => item.conversationId === participant.conversationId && item.userId !== userId
      );
      const peerUser = peerParticipant ? this.users.get(peerParticipant.userId) ?? null : null;
      const lastMessage = Array.from(this.messages.values()).filter((item) => item.conversationId === participant.conversationId).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0] ?? null;
      return { conversation, participant, peerUser, lastMessage };
    });
  }
  async getOrCreateDirectConversation(currentUserId, targetUserId) {
    if (currentUserId === targetUserId) {
      return null;
    }
    const currentUser = this.users.get(currentUserId);
    const targetUser = this.users.get(targetUserId);
    if (!currentUser || !targetUser) {
      return null;
    }
    const existingConversation = Array.from(this.conversations.values()).find((conversation2) => {
      if (conversation2.type !== "direct") {
        return false;
      }
      const participants = Array.from(this.conversationParticipants.values()).filter((item) => item.conversationId === conversation2.id).map((item) => item.userId).sort();
      return participants.length === 2 && participants[0] === [currentUserId, targetUserId].sort()[0] && participants[1] === [currentUserId, targetUserId].sort()[1];
    });
    let conversation = existingConversation;
    if (!conversation) {
      const now = /* @__PURE__ */ new Date();
      conversation = {
        id: randomUUID(),
        title: null,
        type: "direct",
        createdById: currentUserId,
        lastMessageAt: null,
        createdAt: now,
        updatedAt: now
      };
      this.conversations.set(conversation.id, conversation);
      const baseParticipant = {
        role: "member",
        lastReadAt: null,
        unreadCount: 0,
        isArchived: false,
        isMuted: false,
        joinedAt: now,
        updatedAt: now
      };
      this.conversationParticipants.set(`${conversation.id}:${currentUserId}`, {
        id: randomUUID(),
        conversationId: conversation.id,
        userId: currentUserId,
        ...baseParticipant
      });
      this.conversationParticipants.set(`${conversation.id}:${targetUserId}`, {
        id: randomUUID(),
        conversationId: conversation.id,
        userId: targetUserId,
        ...baseParticipant
      });
    }
    const participant = this.conversationParticipants.get(`${conversation.id}:${currentUserId}`);
    return { conversation, participant, peerUser: targetUser, lastMessage: null };
  }
  async listMessages(conversationId, userId) {
    const participant = this.conversationParticipants.get(`${conversationId}:${userId}`);
    if (!participant) {
      return [];
    }
    this.conversationParticipants.set(`${conversationId}:${userId}`, {
      ...participant,
      unreadCount: 0,
      lastReadAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date()
    });
    return Array.from(this.messages.values()).filter((message) => message.conversationId === conversationId).sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }
  async createMessage(conversationId, senderId, content) {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) {
      return null;
    }
    const now = /* @__PURE__ */ new Date();
    const message = {
      id: randomUUID(),
      conversationId,
      senderId,
      role: "user",
      content,
      messageType: "text",
      metadata: null,
      createdAt: now,
      updatedAt: now
    };
    this.messages.set(message.id, message);
    this.conversations.set(conversationId, {
      ...conversation,
      lastMessageAt: now,
      updatedAt: now
    });
    for (const [key, participant] of this.conversationParticipants.entries()) {
      if (participant.conversationId !== conversationId) {
        continue;
      }
      this.conversationParticipants.set(key, {
        ...participant,
        unreadCount: participant.userId === senderId ? 0 : participant.unreadCount + 1,
        lastReadAt: participant.userId === senderId ? now : participant.lastReadAt,
        updatedAt: now
      });
    }
    return message;
  }
  async listConversationParticipantUserIds(conversationId) {
    return Array.from(this.conversationParticipants.values()).filter((item) => item.conversationId === conversationId).map((item) => item.userId);
  }
};
var DatabaseStorage = class {
  async getUser(id) {
    const rows = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return rows[0];
  }
  async getUserByUsername(username) {
    const rows = await db.select().from(users).where(eq(users.username, username)).limit(1);
    return rows[0];
  }
  async getUserByEmail(email) {
    const rows = await db.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
    return rows[0];
  }
  async createUser(insertUser) {
    const userValues = buildUserInsert(insertUser);
    const created = await db.transaction(async (tx) => {
      const [createdUser] = await tx.insert(users).values(userValues).returning();
      await tx.insert(profiles).values(buildProfileInsert(createdUser.id, insertUser));
      await tx.insert(userProgress).values({
        userId: createdUser.id,
        streak: 0,
        totalXp: 0,
        selectedLanguages: insertUser.learningLanguages ?? []
      });
      await tx.insert(streaks).values({
        userId: createdUser.id,
        currentStreak: 0,
        longestStreak: 0,
        freezeCount: 0,
        lastActivityDate: null
      });
      return createdUser;
    });
    return created;
  }
  async updateUser(id, updates) {
    const userUpdate = buildUserUpdate(updates);
    if (Object.keys(userUpdate).length === 0) {
      return this.getUser(id);
    }
    const updatedUser = await db.transaction(async (tx) => {
      const [userRow] = await tx.update(users).set(userUpdate).where(eq(users.id, id)).returning();
      if (!userRow) {
        return void 0;
      }
      const profileUpdate = buildProfileUpdate(updates);
      if (Object.keys(profileUpdate).length > 0) {
        await tx.insert(profiles).values({
          userId: id,
          ...buildProfileUpdate(updates)
        }).onConflictDoUpdate({
          target: profiles.userId,
          set: profileUpdate
        });
      }
      return userRow;
    });
    return updatedUser;
  }
  async listUsers() {
    return db.select().from(users).orderBy(desc(users.createdAt));
  }
  async toggleFollowUser(currentUserId, targetUserId) {
    if (currentUserId === targetUserId) {
      return null;
    }
    return db.transaction(async (tx) => {
      const [currentUser, targetUser] = await Promise.all([
        tx.select().from(users).where(eq(users.id, currentUserId)).limit(1),
        tx.select().from(users).where(eq(users.id, targetUserId)).limit(1)
      ]);
      if (!currentUser[0] || !targetUser[0]) {
        return null;
      }
      const existingFollow = await tx.select().from(follows).where(and(eq(follows.followerId, currentUserId), eq(follows.followingId, targetUserId))).limit(1);
      const isCurrentlyFollowing = Boolean(existingFollow[0]);
      if (isCurrentlyFollowing) {
        await tx.delete(follows).where(and(eq(follows.followerId, currentUserId), eq(follows.followingId, targetUserId)));
      } else {
        await tx.insert(follows).values({
          followerId: currentUserId,
          followingId: targetUserId
        });
      }
      const followingRows = await tx.select({ followingId: follows.followingId }).from(follows).where(eq(follows.followerId, currentUserId));
      const followerCountRows = await tx.select({ count: sql2`count(*)::int` }).from(follows).where(eq(follows.followingId, targetUserId));
      const currentUserCountRows = await tx.select({ count: sql2`count(*)::int` }).from(follows).where(eq(follows.followerId, currentUserId));
      const followingUserIds = followingRows.map((row) => row.followingId);
      const followersCount = followerCountRows[0]?.count ?? 0;
      const followingCount = currentUserCountRows[0]?.count ?? 0;
      const [nextCurrentUser] = await tx.update(users).set({
        following: followingCount,
        followingUserIds,
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq(users.id, currentUserId)).returning();
      const [nextTargetUser] = await tx.update(users).set({
        followers: followersCount,
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq(users.id, targetUserId)).returning();
      if (!nextCurrentUser || !nextTargetUser) {
        return null;
      }
      return {
        currentUser: nextCurrentUser,
        targetUser: nextTargetUser,
        isFollowing: !isCurrentlyFollowing
      };
    });
  }
  async listMoments() {
    return db.select().from(moments).orderBy(desc(moments.createdAt));
  }
  async createMoment(insertMoment) {
    return db.transaction(async (tx) => {
      const [createdMoment] = await tx.insert(moments).values({
        userId: insertMoment.userId,
        text: insertMoment.text,
        lang: insertMoment.lang,
        langColor: insertMoment.langColor,
        likes: insertMoment.likes ?? 0,
        comments: insertMoment.comments ?? 0,
        correction: insertMoment.correction ?? null
      }).returning();
      await tx.update(users).set({
        moments: sql2`${users.moments} + 1`,
        updatedAt: /* @__PURE__ */ new Date()
      }).where(eq(users.id, insertMoment.userId));
      return createdMoment;
    });
  }
  async getUserProgress(userId) {
    const rows = await db.select().from(userProgress).where(eq(userProgress.userId, userId)).limit(1);
    if (rows[0]) {
      return rows[0];
    }
    const [created] = await db.insert(userProgress).values({
      userId,
      streak: 0,
      totalXp: 0,
      selectedLanguages: []
    }).returning();
    return created;
  }
  async updateUserProgress(userId, updates) {
    const values = defined({
      streak: updates.streak,
      totalXp: updates.totalXp,
      selectedLanguages: updates.selectedLanguages,
      updatedAt: /* @__PURE__ */ new Date()
    });
    const [row] = await db.insert(userProgress).values({
      userId,
      streak: typeof updates.streak === "number" ? updates.streak : 0,
      totalXp: typeof updates.totalXp === "number" ? updates.totalXp : 0,
      selectedLanguages: Array.isArray(updates.selectedLanguages) ? updates.selectedLanguages : [],
      updatedAt: /* @__PURE__ */ new Date()
    }).onConflictDoUpdate({
      target: userProgress.userId,
      set: values
    }).returning();
    await db.insert(streaks).values({
      userId,
      currentStreak: typeof row.streak === "number" ? row.streak : 0,
      longestStreak: typeof row.streak === "number" ? row.streak : 0,
      lastActivityDate: /* @__PURE__ */ new Date(),
      freezeCount: 0,
      updatedAt: /* @__PURE__ */ new Date()
    }).onConflictDoUpdate({
      target: streaks.userId,
      set: {
        currentStreak: typeof row.streak === "number" ? row.streak : 0,
        longestStreak: sql2`GREATEST(${streaks.longestStreak}, ${typeof row.streak === "number" ? row.streak : 0})`,
        lastActivityDate: /* @__PURE__ */ new Date(),
        updatedAt: /* @__PURE__ */ new Date()
      }
    });
    return row;
  }
  async listLessonProgress(userId) {
    return db.select().from(lessonProgress).where(eq(lessonProgress.userId, userId)).orderBy(desc(lessonProgress.updatedAt));
  }
  async upsertLessonProgress(progress) {
    const [row] = await db.insert(lessonProgress).values({
      userId: progress.userId,
      lessonId: progress.lessonId,
      languageCode: progress.languageCode,
      completed: progress.completed ?? false,
      score: progress.score ?? null,
      completedAt: progress.completedAt ?? null,
      updatedAt: /* @__PURE__ */ new Date()
    }).onConflictDoUpdate({
      target: [lessonProgress.userId, lessonProgress.lessonId],
      set: {
        languageCode: progress.languageCode,
        completed: progress.completed ?? false,
        score: progress.score ?? null,
        completedAt: progress.completedAt ?? null,
        updatedAt: /* @__PURE__ */ new Date()
      }
    }).returning();
    return row;
  }
  async createSession(userId) {
    const token = randomUUID();
    const expiresAt = new Date(Date.now() + 1e3 * 60 * 60 * 24 * 30);
    await db.insert(authSessions).values({
      userId,
      token,
      expiresAt
    });
    return { token, userId, expiresAt };
  }
  async getUserBySessionToken(token) {
    const sessionRows = await db.select().from(authSessions).where(and(eq(authSessions.token, token), gt(authSessions.expiresAt, /* @__PURE__ */ new Date()))).limit(1);
    if (!sessionRows[0]) {
      await db.delete(authSessions).where(eq(authSessions.token, token));
      return void 0;
    }
    return this.getUser(sessionRows[0].userId);
  }
  async deleteSession(token) {
    await db.delete(authSessions).where(eq(authSessions.token, token));
  }
  async listConversationSummaries(userId) {
    const participantRows = await db.select().from(conversationParticipants).where(eq(conversationParticipants.userId, userId)).orderBy(desc(conversationParticipants.updatedAt));
    const summaries = await Promise.all(participantRows.map(async (participant) => {
      const [conversation] = await db.select().from(conversations).where(eq(conversations.id, participant.conversationId)).limit(1);
      const [peerParticipant] = await db.select().from(conversationParticipants).where(and(
        eq(conversationParticipants.conversationId, participant.conversationId),
        sql2`${conversationParticipants.userId} <> ${userId}`
      )).limit(1);
      const peerUser = peerParticipant ? (await db.select().from(users).where(eq(users.id, peerParticipant.userId)).limit(1))[0] ?? null : null;
      const [lastMessage] = await db.select().from(messages).where(eq(messages.conversationId, participant.conversationId)).orderBy(desc(messages.createdAt)).limit(1);
      return {
        conversation,
        participant,
        peerUser,
        lastMessage: lastMessage ?? null
      };
    }));
    return summaries.filter((item) => Boolean(item.conversation));
  }
  async getOrCreateDirectConversation(currentUserId, targetUserId) {
    if (currentUserId === targetUserId) {
      return null;
    }
    const [currentUser, targetUser] = await Promise.all([
      this.getUser(currentUserId),
      this.getUser(targetUserId)
    ]);
    if (!currentUser || !targetUser) {
      return null;
    }
    const currentParticipations = await db.select().from(conversationParticipants).where(eq(conversationParticipants.userId, currentUserId));
    const targetParticipations = await db.select().from(conversationParticipants).where(eq(conversationParticipants.userId, targetUserId));
    const targetConversationIds = new Set(targetParticipations.map((item) => item.conversationId));
    const sharedConversation = currentParticipations.find((item) => targetConversationIds.has(item.conversationId));
    if (sharedConversation) {
      const [conversation] = await db.select().from(conversations).where(and(eq(conversations.id, sharedConversation.conversationId), eq(conversations.type, "direct"))).limit(1);
      if (conversation) {
        const [lastMessage] = await db.select().from(messages).where(eq(messages.conversationId, conversation.id)).orderBy(desc(messages.createdAt)).limit(1);
        return {
          conversation,
          participant: sharedConversation,
          peerUser: targetUser,
          lastMessage: lastMessage ?? null
        };
      }
    }
    return db.transaction(async (tx) => {
      const now = /* @__PURE__ */ new Date();
      const [conversation] = await tx.insert(conversations).values({
        title: null,
        type: "direct",
        createdById: currentUserId,
        lastMessageAt: null,
        updatedAt: now
      }).returning();
      const participantSeed = {
        role: "member",
        lastReadAt: null,
        unreadCount: 0,
        isArchived: false,
        isMuted: false,
        joinedAt: now,
        updatedAt: now
      };
      const [currentParticipant] = await tx.insert(conversationParticipants).values([
        { conversationId: conversation.id, userId: currentUserId, ...participantSeed },
        { conversationId: conversation.id, userId: targetUserId, ...participantSeed }
      ]).returning();
      return {
        conversation,
        participant: currentParticipant,
        peerUser: targetUser,
        lastMessage: null
      };
    });
  }
  async listMessages(conversationId, userId) {
    const [participant] = await db.select().from(conversationParticipants).where(and(eq(conversationParticipants.conversationId, conversationId), eq(conversationParticipants.userId, userId))).limit(1);
    if (!participant) {
      return [];
    }
    await db.update(conversationParticipants).set({
      unreadCount: 0,
      lastReadAt: /* @__PURE__ */ new Date(),
      updatedAt: /* @__PURE__ */ new Date()
    }).where(and(eq(conversationParticipants.conversationId, conversationId), eq(conversationParticipants.userId, userId)));
    return db.select().from(messages).where(eq(messages.conversationId, conversationId)).orderBy(messages.createdAt);
  }
  async createMessage(conversationId, senderId, content) {
    const [senderParticipant] = await db.select().from(conversationParticipants).where(and(eq(conversationParticipants.conversationId, conversationId), eq(conversationParticipants.userId, senderId))).limit(1);
    if (!senderParticipant) {
      return null;
    }
    return db.transaction(async (tx) => {
      const now = /* @__PURE__ */ new Date();
      const [message] = await tx.insert(messages).values({
        conversationId,
        senderId,
        role: "user",
        content,
        messageType: "text",
        metadata: null,
        updatedAt: now
      }).returning();
      await tx.update(conversations).set({
        lastMessageAt: now,
        updatedAt: now
      }).where(eq(conversations.id, conversationId));
      await tx.update(conversationParticipants).set({
        unreadCount: sql2`CASE WHEN ${conversationParticipants.userId} = ${senderId} THEN 0 ELSE ${conversationParticipants.unreadCount} + 1 END`,
        lastReadAt: sql2`CASE WHEN ${conversationParticipants.userId} = ${senderId} THEN ${now} ELSE ${conversationParticipants.lastReadAt} END`,
        updatedAt: now
      }).where(eq(conversationParticipants.conversationId, conversationId));
      return message;
    });
  }
  async listConversationParticipantUserIds(conversationId) {
    const rows = await db.select({ userId: conversationParticipants.userId }).from(conversationParticipants).where(eq(conversationParticipants.conversationId, conversationId));
    return rows.map((item) => item.userId);
  }
};
var storage = hasDatabase && db ? new DatabaseStorage() : new MemStorage();

// server/messageRealtime.ts
var MessageRealtimeService = class {
  wss = null;
  clients = /* @__PURE__ */ new Map();
  attach(server) {
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
          userId: user.id
        });
        socket.on("close", () => {
          this.clients.delete(socket);
        });
        socket.on("error", () => {
          this.clients.delete(socket);
        });
        this.send(socket, {
          type: "connected",
          userId: user.id
        });
      } catch (error) {
        console.error("Message realtime connection error:", error);
        socket.close();
      }
    });
  }
  notifyConversationUpdated(userIds, conversationId, senderId) {
    const serialized = JSON.stringify({
      type: "message:new",
      conversationId,
      senderId
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
  send(socket, payload) {
    if (socket.readyState !== WebSocket.OPEN) {
      return;
    }
    socket.send(JSON.stringify(payload));
  }
};
var messageRealtime = new MessageRealtimeService();

// server/voiceRoomsStore.ts
import { promises as fs } from "node:fs";
import path from "node:path";
var seedRooms = [];
var legacyDemoRoomIds = /* @__PURE__ */ new Set(["r-1", "r-2", "r-3"]);
function isFakeRoom(room) {
  if (legacyDemoRoomIds.has(room.id)) {
    return true;
  }
  return !room.hostId || room.hostId === "me";
}
function sanitizeRooms(rooms) {
  if (!Array.isArray(rooms)) {
    return [];
  }
  return rooms.filter((room) => {
    if (!room || typeof room !== "object") return false;
    const candidate = room;
    return Boolean(candidate.id) && !isFakeRoom(candidate);
  });
}
var VoiceRoomsStore = class {
  filePath;
  writeQueue = Promise.resolve();
  constructor(filePath = path.resolve(process.cwd(), "server", "data", "voice-rooms.json")) {
    this.filePath = filePath;
  }
  async init() {
    await fs.mkdir(path.dirname(this.filePath), { recursive: true });
    try {
      await fs.access(this.filePath);
    } catch {
      await this.writeFile({ rooms: seedRooms });
    }
  }
  async listRooms() {
    const data = await this.readFile();
    return data.rooms;
  }
  async createRoom(room) {
    const data = await this.readFile();
    data.rooms = [room, ...data.rooms.filter((item) => item.id !== room.id)];
    await this.writeFile(data);
    return room;
  }
  async updateRoom(roomId, room) {
    const data = await this.readFile();
    const index2 = data.rooms.findIndex((item) => item.id === roomId);
    if (index2 === -1) {
      return null;
    }
    const updatedRoom = {
      ...data.rooms[index2],
      ...room,
      id: roomId
    };
    data.rooms[index2] = updatedRoom;
    await this.writeFile(data);
    return updatedRoom;
  }
  async deleteRoom(roomId) {
    const data = await this.readFile();
    const room = data.rooms.find((item) => item.id === roomId) || null;
    if (!room) {
      return null;
    }
    data.rooms = data.rooms.filter((item) => item.id !== roomId);
    await this.writeFile(data);
    return room;
  }
  async upsertParticipant(roomId, participant) {
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
  async removeParticipant(roomId, participantId) {
    const data = await this.readFile();
    const room = data.rooms.find((item) => item.id === roomId);
    if (!room) return null;
    room.participants = room.participants.filter((item) => item.id !== participantId);
    room.speakerRequests = (room.speakerRequests || []).filter((item) => item.userId !== participantId);
    await this.writeFile(data);
    return room;
  }
  async appendMessage(roomId, message) {
    const data = await this.readFile();
    const room = data.rooms.find((item) => item.id === roomId);
    if (!room) return null;
    room.messages = [...room.messages || [], message].slice(-40);
    await this.writeFile(data);
    return room;
  }
  async readFile() {
    await this.init();
    const raw = await fs.readFile(this.filePath, "utf-8");
    const parsed = JSON.parse(raw);
    const rooms = sanitizeRooms(parsed.rooms);
    return {
      rooms
    };
  }
  async writeFile(data) {
    this.writeQueue = this.writeQueue.then(
      () => fs.writeFile(this.filePath, `${JSON.stringify(data, null, 2)}
`, "utf-8")
    );
    await this.writeQueue;
  }
};
var voiceRoomsStore = new VoiceRoomsStore();

// server/voiceRealtime.ts
import { WebSocket as WebSocket2, WebSocketServer as WebSocketServer2 } from "ws";
var VoiceRealtimeService = class {
  wss = null;
  clients = /* @__PURE__ */ new Map();
  attach(server) {
    if (this.wss) return;
    this.wss = new WebSocketServer2({ server, path: "/api/voice-rooms/live" });
    this.wss.on("connection", (socket) => {
      this.clients.set(socket, { socket });
      socket.on("message", async (rawMessage) => {
        try {
          const message = JSON.parse(rawMessage.toString());
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
  broadcastRoomSnapshot(roomId, room) {
    this.broadcastToRoom(roomId, {
      type: "room:snapshot",
      room
    });
    void this.broadcastLobbySnapshot();
  }
  broadcastReaction(roomId, participantId, reaction) {
    this.broadcastToRoom(roomId, {
      type: "reaction",
      roomId,
      participantId,
      reaction
    });
  }
  broadcastRoomDeleted(roomId) {
    this.broadcastToRoom(roomId, {
      type: "room:deleted",
      roomId
    });
    void this.broadcastLobbySnapshot();
  }
  async handleMessage(socket, message) {
    if (message.type === "subscribe:lobby") {
      const nextState = this.clients.get(socket) || { socket };
      nextState.scope = "lobby";
      nextState.roomId = void 0;
      nextState.participantId = void 0;
      this.clients.set(socket, nextState);
      const rooms = await voiceRoomsStore.listRooms();
      if (socket.readyState === WebSocket2.OPEN) {
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
        message: message.message
      });
      this.broadcastRoomSnapshot(message.roomId, room);
      return;
    }
    if (message.type === "reaction") {
      this.broadcastReaction(message.roomId, message.participantId, message.reaction);
    }
  }
  broadcastToRoom(roomId, payload) {
    const serialized = JSON.stringify(payload);
    for (const [, client] of this.clients) {
      if (client.scope !== "room") continue;
      if (client.roomId !== roomId) continue;
      if (client.socket.readyState !== WebSocket2.OPEN) continue;
      client.socket.send(serialized);
    }
  }
  async broadcastLobbySnapshot() {
    const rooms = await voiceRoomsStore.listRooms();
    const serialized = JSON.stringify({
      type: "rooms:snapshot",
      rooms
    });
    for (const [, client] of this.clients) {
      if (client.scope !== "lobby") continue;
      if (client.socket.readyState !== WebSocket2.OPEN) continue;
      client.socket.send(serialized);
    }
  }
};
var voiceRealtime = new VoiceRealtimeService();

// server/routes.ts
function getOpenAIClient() {
  const apiKey = process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY;
  if (!apiKey) {
    return null;
  }
  return new OpenAI({ apiKey });
}
function hashPassword(password) {
  return createHash("sha256").update(password).digest("hex");
}
function toSafeUser(user) {
  if (!user) {
    return null;
  }
  const { passwordHash: _passwordHash, ...safeUser } = user;
  return safeUser;
}
function requireToken(headerValue) {
  return headerValue?.replace(/^Bearer\s+/i, "").trim() || null;
}
async function registerRoutes(app2) {
  await voiceRoomsStore.init();
  app2.post("/api/auth/register", async (req, res) => {
    const {
      email,
      password,
      displayName,
      gender,
      age,
      countryCode,
      countryName,
      flag,
      nativeLanguage,
      learningLanguages
    } = req.body ?? {};
    if (!email || !password || !displayName) {
      return res.status(400).json({ error: "email, password, and displayName are required" });
    }
    const existingUser = await storage.getUserByEmail(String(email));
    if (existingUser) {
      return res.status(409).json({ error: "An account with this email already exists" });
    }
    const username = String(email).split("@")[0].trim().toLowerCase() || `user-${Date.now()}`;
    const createdUser = await storage.createUser({
      username,
      email: String(email).trim().toLowerCase(),
      passwordHash: hashPassword(String(password)),
      displayName: String(displayName).trim(),
      gender: gender || null,
      age: typeof age === "number" ? age : null,
      countryCode: countryCode || null,
      countryName: countryName || null,
      flag: flag || null,
      nativeLanguage: nativeLanguage || null,
      learningLanguages: Array.isArray(learningLanguages) ? learningLanguages : [],
      bio: null,
      avatarUri: null,
      avatarColor: null,
      latitude: null,
      longitude: null,
      locationName: null
    });
    const session = await storage.createSession(createdUser.id);
    return res.status(201).json({
      token: session.token,
      user: toSafeUser(createdUser)
    });
  });
  app2.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body ?? {};
    if (!email || !password) {
      return res.status(400).json({ error: "email and password are required" });
    }
    const foundUser = await storage.getUserByEmail(String(email));
    if (!foundUser || foundUser.passwordHash !== hashPassword(String(password))) {
      return res.status(401).json({ error: "Invalid email or password" });
    }
    const session = await storage.createSession(foundUser.id);
    return res.json({
      token: session.token,
      user: toSafeUser(foundUser)
    });
  });
  app2.get("/api/auth/me", async (req, res) => {
    const token = req.header("authorization")?.replace(/^Bearer\s+/i, "").trim();
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const foundUser = await storage.getUserBySessionToken(token);
    if (!foundUser) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    return res.json({ user: toSafeUser(foundUser) });
  });
  app2.post("/api/auth/logout", async (req, res) => {
    const token = req.header("authorization")?.replace(/^Bearer\s+/i, "").trim();
    if (token) {
      await storage.deleteSession(token);
    }
    return res.status(204).send();
  });
  app2.put("/api/auth/profile", async (req, res) => {
    const token = req.header("authorization")?.replace(/^Bearer\s+/i, "").trim();
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const foundUser = await storage.getUserBySessionToken(token);
    if (!foundUser) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const nextUser = await storage.updateUser(foundUser.id, req.body ?? {});
    return res.json({ user: toSafeUser(nextUser) });
  });
  app2.get("/api/users/:id", async (req, res) => {
    const foundUser = await storage.getUser(req.params.id);
    if (!foundUser) {
      return res.status(404).json({ error: "User not found" });
    }
    return res.json({ user: toSafeUser(foundUser) });
  });
  app2.get("/api/users", async (req, res) => {
    const token = req.header("authorization")?.replace(/^Bearer\s+/i, "").trim();
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const currentUser = await storage.getUserBySessionToken(token);
    if (!currentUser) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const allUsers = await storage.listUsers();
    return res.json({
      users: allUsers.filter((candidate) => candidate.id !== currentUser.id).map((candidate) => toSafeUser(candidate))
    });
  });
  app2.post("/api/users/:id/follow", async (req, res) => {
    const token = req.header("authorization")?.replace(/^Bearer\s+/i, "").trim();
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const currentUser = await storage.getUserBySessionToken(token);
    if (!currentUser) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const result = await storage.toggleFollowUser(currentUser.id, req.params.id);
    if (!result) {
      return res.status(400).json({ error: "Unable to follow this user" });
    }
    return res.json({
      isFollowing: result.isFollowing,
      currentUser: toSafeUser(result.currentUser),
      targetUser: toSafeUser(result.targetUser)
    });
  });
  app2.get("/api/messages/conversations", async (req, res) => {
    const token = requireToken(req.header("authorization"));
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const currentUser = await storage.getUserBySessionToken(token);
    if (!currentUser) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const conversations3 = await storage.listConversationSummaries(currentUser.id);
    return res.json({
      conversations: conversations3.map((item) => ({
        id: item.conversation.id,
        userId: item.peerUser?.id ?? "",
        name: item.peerUser?.displayName ?? "User",
        avatarColor: item.peerUser?.avatarColor ?? "#4ECDC4",
        initials: (item.peerUser?.displayName || "User").split(" ").map((word) => word[0]).join("").slice(0, 2).toUpperCase(),
        nativeLanguage: item.peerUser?.nativeLanguage ?? null,
        learningLanguage: item.peerUser?.learningLanguages?.[0] ?? null,
        lastMessage: item.lastMessage?.content ?? "",
        lastTs: item.lastMessage?.createdAt ? item.lastMessage.createdAt.getTime() : 0,
        lastTime: item.lastMessage?.createdAt ? new Date(item.lastMessage.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "",
        unread: item.participant.unreadCount,
        isOnline: Boolean(item.peerUser?.isActive)
      }))
    });
  });
  app2.post("/api/messages/conversations/direct", async (req, res) => {
    const token = requireToken(req.header("authorization"));
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const currentUser = await storage.getUserBySessionToken(token);
    if (!currentUser) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const { targetUserId } = req.body ?? {};
    if (!targetUserId) {
      return res.status(400).json({ error: "targetUserId is required" });
    }
    const conversation = await storage.getOrCreateDirectConversation(currentUser.id, String(targetUserId));
    if (!conversation) {
      return res.status(400).json({ error: "Unable to create conversation" });
    }
    return res.status(201).json({
      conversation: {
        id: conversation.conversation.id,
        userId: conversation.peerUser?.id ?? "",
        name: conversation.peerUser?.displayName ?? "User",
        avatarColor: conversation.peerUser?.avatarColor ?? "#4ECDC4",
        initials: (conversation.peerUser?.displayName || "User").split(" ").map((word) => word[0]).join("").slice(0, 2).toUpperCase(),
        nativeLanguage: conversation.peerUser?.nativeLanguage ?? null,
        learningLanguage: conversation.peerUser?.learningLanguages?.[0] ?? null,
        lastMessage: conversation.lastMessage?.content ?? "",
        lastTs: conversation.lastMessage?.createdAt ? conversation.lastMessage.createdAt.getTime() : 0,
        lastTime: conversation.lastMessage?.createdAt ? new Date(conversation.lastMessage.createdAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }) : "",
        unread: conversation.participant.unreadCount,
        isOnline: Boolean(conversation.peerUser?.isActive)
      }
    });
  });
  app2.get("/api/messages/conversations/:id/messages", async (req, res) => {
    const token = requireToken(req.header("authorization"));
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const currentUser = await storage.getUserBySessionToken(token);
    if (!currentUser) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const messageRows = await storage.listMessages(req.params.id, currentUser.id);
    return res.json({
      messages: messageRows.map((item) => ({
        id: item.id,
        role: item.senderId === currentUser.id ? "user" : "them",
        content: item.content,
        ts: item.createdAt.getTime()
      }))
    });
  });
  app2.post("/api/messages/conversations/:id/messages", async (req, res) => {
    const token = requireToken(req.header("authorization"));
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const currentUser = await storage.getUserBySessionToken(token);
    if (!currentUser) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const { content } = req.body ?? {};
    if (!content || !String(content).trim()) {
      return res.status(400).json({ error: "content is required" });
    }
    const createdMessage = await storage.createMessage(req.params.id, currentUser.id, String(content).trim());
    if (!createdMessage) {
      return res.status(404).json({ error: "Conversation not found" });
    }
    const participantUserIds = await storage.listConversationParticipantUserIds(req.params.id);
    messageRealtime.notifyConversationUpdated(participantUserIds, req.params.id, currentUser.id);
    return res.status(201).json({
      message: {
        id: createdMessage.id,
        role: "user",
        content: createdMessage.content,
        ts: createdMessage.createdAt.getTime()
      }
    });
  });
  app2.get("/api/moments", async (_req, res) => {
    const allMoments = await storage.listMoments();
    const users2 = await storage.listUsers();
    const usersById = new Map(users2.map((user) => [user.id, user]));
    return res.json({
      moments: allMoments.map((moment) => {
        const owner = usersById.get(moment.userId);
        return {
          id: moment.id,
          userId: moment.userId,
          userName: owner?.displayName || "User",
          userInitials: (owner?.displayName || "User").split(" ").map((word) => word[0]).join("").slice(0, 2).toUpperCase(),
          userColor: owner?.avatarColor || "#4ECDC4",
          userAvatarUri: owner?.avatarUri || void 0,
          text: moment.text,
          lang: moment.lang,
          langColor: moment.langColor,
          likes: moment.likes,
          comments: moment.comments,
          createdAt: moment.createdAt.getTime(),
          timeLabel: "just now",
          correction: moment.correction
        };
      })
    });
  });
  app2.post("/api/moments", async (req, res) => {
    const token = req.header("authorization")?.replace(/^Bearer\s+/i, "").trim();
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const currentUser = await storage.getUserBySessionToken(token);
    if (!currentUser) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const { text: text2, lang, langColor, correction } = req.body ?? {};
    if (!text2 || !lang || !langColor) {
      return res.status(400).json({ error: "text, lang, and langColor are required" });
    }
    const createdMoment = await storage.createMoment({
      userId: currentUser.id,
      text: String(text2),
      lang: String(lang),
      langColor: String(langColor),
      likes: 0,
      comments: 0,
      correction: correction ?? null
    });
    const updatedUser = await storage.getUser(currentUser.id);
    return res.status(201).json({
      moment: {
        id: createdMoment.id,
        userId: createdMoment.userId,
        userName: currentUser.displayName,
        userInitials: currentUser.displayName.split(" ").map((word) => word[0]).join("").slice(0, 2).toUpperCase(),
        userColor: currentUser.avatarColor || "#4ECDC4",
        userAvatarUri: currentUser.avatarUri || void 0,
        text: createdMoment.text,
        lang: createdMoment.lang,
        langColor: createdMoment.langColor,
        likes: createdMoment.likes,
        comments: createdMoment.comments,
        createdAt: createdMoment.createdAt.getTime(),
        timeLabel: "just now",
        correction: createdMoment.correction
      },
      user: toSafeUser(updatedUser)
    });
  });
  app2.get("/api/progress", async (req, res) => {
    const token = req.header("authorization")?.replace(/^Bearer\s+/i, "").trim();
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const currentUser = await storage.getUserBySessionToken(token);
    if (!currentUser) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const progress = await storage.getUserProgress(currentUser.id);
    const completedLessons = await storage.listLessonProgress(currentUser.id);
    return res.json({
      progress,
      completedLessons
    });
  });
  app2.put("/api/progress", async (req, res) => {
    const token = req.header("authorization")?.replace(/^Bearer\s+/i, "").trim();
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const currentUser = await storage.getUserBySessionToken(token);
    if (!currentUser) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const { streak, totalXp, selectedLanguages } = req.body ?? {};
    const progress = await storage.updateUserProgress(currentUser.id, {
      streak: typeof streak === "number" ? streak : void 0,
      totalXp: typeof totalXp === "number" ? totalXp : void 0,
      selectedLanguages: Array.isArray(selectedLanguages) ? selectedLanguages : void 0
    });
    return res.json({ progress });
  });
  app2.post("/api/progress/lesson", async (req, res) => {
    const token = req.header("authorization")?.replace(/^Bearer\s+/i, "").trim();
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const currentUser = await storage.getUserBySessionToken(token);
    if (!currentUser) {
      return res.status(401).json({ error: "Unauthorized" });
    }
    const { lessonId, languageCode, completed, score, completedAt, xpEarned, streak, totalXp } = req.body ?? {};
    if (!lessonId || !languageCode) {
      return res.status(400).json({ error: "lessonId and languageCode are required" });
    }
    const lessonProgress2 = await storage.upsertLessonProgress({
      userId: currentUser.id,
      lessonId: String(lessonId),
      languageCode: String(languageCode),
      completed: Boolean(completed),
      score: typeof score === "number" ? score : null,
      completedAt: completedAt ? new Date(String(completedAt)) : null
    });
    const progress = await storage.updateUserProgress(currentUser.id, {
      streak: typeof streak === "number" ? streak : void 0,
      totalXp: typeof totalXp === "number" ? totalXp : void 0
    });
    return res.json({
      lessonProgress: {
        ...lessonProgress2,
        xpEarned: typeof xpEarned === "number" ? xpEarned : 0
      },
      progress
    });
  });
  app2.get("/api/voice-rooms", async (_req, res) => {
    res.json(await voiceRoomsStore.listRooms());
  });
  app2.post("/api/voice-rooms", async (req, res) => {
    const room = req.body;
    if (!room?.topic || !room?.languageCode || !room?.language) {
      return res.status(400).json({ error: "topic, language, and languageCode are required" });
    }
    const nextRoom = {
      id: room.id || `r-${Date.now()}`,
      topic: room.topic,
      language: room.language,
      languageCode: room.languageCode,
      description: room.description || "Join and start talking!",
      participants: Array.isArray(room.participants) ? room.participants : [],
      level: room.level || "All Levels",
      tags: Array.isArray(room.tags) ? room.tags : [],
      theme: room.theme || "chat",
      background: room.background || "galaxy",
      hostId: room.hostId,
      speakerRequests: Array.isArray(room.speakerRequests) ? room.speakerRequests : []
    };
    const createdRoom = await voiceRoomsStore.createRoom(nextRoom);
    voiceRealtime.broadcastRoomSnapshot(createdRoom.id, createdRoom);
    res.status(201).json(createdRoom);
  });
  app2.put("/api/voice-rooms/:id", async (req, res) => {
    const { id } = req.params;
    const room = req.body;
    const updatedRoom = await voiceRoomsStore.updateRoom(id, room);
    if (!updatedRoom) {
      return res.status(404).json({ error: "Room not found" });
    }
    voiceRealtime.broadcastRoomSnapshot(updatedRoom.id, updatedRoom);
    res.json(updatedRoom);
  });
  app2.delete("/api/voice-rooms/:id", async (req, res) => {
    const { id } = req.params;
    const deletedRoom = await voiceRoomsStore.deleteRoom(id);
    if (!deletedRoom) {
      return res.status(404).json({ error: "Room not found" });
    }
    voiceRealtime.broadcastRoomDeleted(id);
    res.status(204).send();
  });
  app2.post("/api/chat", async (req, res) => {
    const { messages: messages3, language, languageName } = req.body;
    if (!messages3 || !Array.isArray(messages3)) {
      return res.status(400).json({ error: "messages array required" });
    }
    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();
    const isEnglish = language === "en";
    const targetLanguage = languageName || "the target language";
    const systemPrompt = isEnglish ? `You are a friendly, encouraging English language tutor. Your job is to help the student practice and improve their English.

Your role:
- Always respond in clear, natural English
- Gently correct grammar, spelling, and vocabulary mistakes with explanations
- Handle slang, informal language, and mistakes naturally \u2014 never be harsh
- After correcting a mistake, show the correct form: e.g. "Great try! It should be 'I am going' not 'I going'"
- Keep conversations engaging and practical \u2014 talk about everyday topics
- Ask follow-up questions to keep the conversation flowing
- Give vocabulary tips, idioms, and pronunciation notes when relevant
- Celebrate progress and encourage the student
- Use short, clear sentences that are easy to understand` : `You are a friendly and encouraging language tutor helping a student practice ${targetLanguage}.

Your role:
- Respond naturally in ${targetLanguage} when the student writes in it
- If the student writes in English, gently encourage them to try in ${targetLanguage}
- Correct mistakes gently and explain why, without being condescending
- Handle spelling mistakes, slang, and informal language naturally
- Mix the target language with English explanations when helpful
- Keep conversations engaging, practical, and educational
- Praise good usage and progress
- Provide vocabulary tips, grammar hints, and cultural context when relevant
- Use short, clear sentences that are easy to understand
- Be flexible - if the student tries to communicate in any language, help them improve`;
    const chatMessages = [
      { role: "system", content: systemPrompt },
      ...messages3
    ];
    try {
      const openai2 = getOpenAIClient();
      if (!openai2) {
        return res.status(503).json({ error: "AI unavailable" });
      }
      const stream = await openai2.chat.completions.create({
        model: "gpt-4o",
        messages: chatMessages,
        stream: true,
        max_completion_tokens: 1024
      });
      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) {
          res.write(`data: ${JSON.stringify({ content })}

`);
        }
      }
      res.write("data: [DONE]\n\n");
      res.end();
    } catch (err) {
      console.error("Chat error:", err);
      res.write(`data: ${JSON.stringify({ error: "AI unavailable" })}

`);
      res.end();
    }
  });
  const httpServer = createServer(app2);
  return httpServer;
}

// server/index.ts
import * as fs2 from "fs";
import * as path2 from "path";
var app = express2();
var log = console.log;
function setupCors(app2) {
  app2.use((req, res, next) => {
    const origins = /* @__PURE__ */ new Set();
    if (process.env.REPLIT_DEV_DOMAIN) {
      origins.add(`https://${process.env.REPLIT_DEV_DOMAIN}`);
    }
    if (process.env.REPLIT_DOMAINS) {
      process.env.REPLIT_DOMAINS.split(",").forEach((d) => {
        origins.add(`https://${d.trim()}`);
      });
    }
    const origin = req.header("origin");
    const isLocalhost = origin?.startsWith("http://localhost:") || origin?.startsWith("http://127.0.0.1:");
    if (origin && (origins.has(origin) || isLocalhost)) {
      res.header("Access-Control-Allow-Origin", origin);
      res.header(
        "Access-Control-Allow-Methods",
        "GET, POST, PUT, DELETE, OPTIONS"
      );
      res.header("Access-Control-Allow-Headers", "Content-Type");
      res.header("Access-Control-Allow-Credentials", "true");
    }
    if (req.method === "OPTIONS") {
      return res.sendStatus(200);
    }
    next();
  });
}
function setupBodyParsing(app2) {
  app2.use(
    express2.json({
      verify: (req, _res, buf) => {
        req.rawBody = buf;
      }
    })
  );
  app2.use(express2.urlencoded({ extended: false }));
}
function setupRequestLogging(app2) {
  app2.use((req, res, next) => {
    const start = Date.now();
    const path3 = req.path;
    let capturedJsonResponse = void 0;
    const originalResJson = res.json;
    res.json = function(bodyJson, ...args) {
      capturedJsonResponse = bodyJson;
      return originalResJson.apply(res, [bodyJson, ...args]);
    };
    res.on("finish", () => {
      if (!path3.startsWith("/api")) return;
      const duration = Date.now() - start;
      let logLine = `${req.method} ${path3} ${res.statusCode} in ${duration}ms`;
      if (capturedJsonResponse) {
        logLine += ` :: ${JSON.stringify(capturedJsonResponse)}`;
      }
      if (logLine.length > 80) {
        logLine = logLine.slice(0, 79) + "\u2026";
      }
      log(logLine);
    });
    next();
  });
}
function getAppName() {
  try {
    const appJsonPath = path2.resolve(process.cwd(), "app.json");
    const appJsonContent = fs2.readFileSync(appJsonPath, "utf-8");
    const appJson = JSON.parse(appJsonContent);
    return appJson.expo?.name || "App Landing Page";
  } catch {
    return "App Landing Page";
  }
}
function serveExpoManifest(platform, res) {
  const manifestPath = path2.resolve(
    process.cwd(),
    "static-build",
    platform,
    "manifest.json"
  );
  if (!fs2.existsSync(manifestPath)) {
    return res.status(404).json({ error: `Manifest not found for platform: ${platform}` });
  }
  res.setHeader("expo-protocol-version", "1");
  res.setHeader("expo-sfv-version", "0");
  res.setHeader("content-type", "application/json");
  const manifest = fs2.readFileSync(manifestPath, "utf-8");
  res.send(manifest);
}
function serveLandingPage({
  req,
  res,
  landingPageTemplate,
  appName
}) {
  const forwardedProto = req.header("x-forwarded-proto");
  const protocol = forwardedProto || req.protocol || "https";
  const forwardedHost = req.header("x-forwarded-host");
  const host = forwardedHost || req.get("host");
  const baseUrl = `${protocol}://${host}`;
  const expsUrl = `${host}`;
  log(`baseUrl`, baseUrl);
  log(`expsUrl`, expsUrl);
  const html = landingPageTemplate.replace(/BASE_URL_PLACEHOLDER/g, baseUrl).replace(/EXPS_URL_PLACEHOLDER/g, expsUrl).replace(/APP_NAME_PLACEHOLDER/g, appName);
  res.setHeader("Content-Type", "text/html; charset=utf-8");
  res.status(200).send(html);
}
function configureExpoAndLanding(app2) {
  const templatePath = path2.resolve(
    process.cwd(),
    "server",
    "templates",
    "landing-page.html"
  );
  const landingPageTemplate = fs2.readFileSync(templatePath, "utf-8");
  const appName = getAppName();
  log("Serving static Expo files with dynamic manifest routing");
  app2.use((req, res, next) => {
    if (req.path.startsWith("/api")) {
      return next();
    }
    if (req.path !== "/" && req.path !== "/manifest") {
      return next();
    }
    const platform = req.header("expo-platform");
    if (platform && (platform === "ios" || platform === "android")) {
      return serveExpoManifest(platform, res);
    }
    if (req.path === "/") {
      return serveLandingPage({
        req,
        res,
        landingPageTemplate,
        appName
      });
    }
    next();
  });
  app2.use("/assets", express2.static(path2.resolve(process.cwd(), "assets")));
  app2.use(express2.static(path2.resolve(process.cwd(), "static-build")));
  log("Expo routing: Checking expo-platform header on / and /manifest");
}
function setupErrorHandler(app2) {
  app2.use((err, _req, res, next) => {
    const error = err;
    const status = error.status || error.statusCode || 500;
    const message = error.message || "Internal Server Error";
    console.error("Internal Server Error:", err);
    if (res.headersSent) {
      return next(err);
    }
    return res.status(status).json({ message });
  });
}
function shouldEnableAiIntegrations() {
  return Boolean(process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY);
}
(async () => {
  setupCors(app);
  setupBodyParsing(app);
  setupRequestLogging(app);
  configureExpoAndLanding(app);
  const server = await registerRoutes(app);
  voiceRealtime.attach(server);
  messageRealtime.attach(server);
  if (shouldEnableAiIntegrations()) {
    const { registerAudioRoutes: registerAudioRoutes2 } = await Promise.resolve().then(() => (init_routes(), routes_exports));
    registerAudioRoutes2(app);
  }
  setupErrorHandler(app);
  const port = parseInt(process.env.PORT || "5000", 10);
  server.listen(
    {
      port,
      host: "0.0.0.0"
    },
    () => {
      log(`express server serving on port ${port}`);
    }
  );
})();
