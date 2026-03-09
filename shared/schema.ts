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
  varchar,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

export const users = pgTable("users", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
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
  learningLanguages: jsonb("learning_languages").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  followers: integer("followers").notNull().default(0),
  following: integer("following").notNull().default(0),
  followingUserIds: jsonb("following_user_ids").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  moments: integer("moments").notNull().default(0),
  latitude: text("latitude"),
  longitude: text("longitude"),
  locationName: text("location_name"),
  isActive: boolean("is_active").notNull().default(true),
  lastSeenAt: timestamp("last_seen_at"),
  createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const profiles = pgTable(
  "profiles",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" })
      .unique(),
    avatarUrl: text("avatar_url"),
    avatarColor: varchar("avatar_color", { length: 32 }),
    countryCode: varchar("country_code", { length: 8 }),
    countryName: text("country_name"),
    flag: text("flag"),
    nativeLanguage: text("native_language"),
    learningLanguages: jsonb("learning_languages").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    age: integer("age"),
    gender: varchar("gender", { length: 24 }),
    bio: text("bio"),
    latitude: text("latitude"),
    longitude: text("longitude"),
    locationName: text("location_name"),
    createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
    updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  },
);

export const authSessions = pgTable(
  "auth_sessions",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    token: text("token").notNull().unique(),
    expiresAt: timestamp("expires_at").notNull(),
    createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  },
  (table) => ({
    authSessionsUserIdx: index("auth_sessions_user_id_idx").on(table.userId),
  }),
);

export const follows = pgTable(
  "follows",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    followerId: varchar("follower_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    followingId: varchar("following_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  },
  (table) => ({
    followerFollowingUnique: uniqueIndex("follows_follower_following_unique").on(table.followerId, table.followingId),
    followsFollowerIdx: index("follows_follower_id_idx").on(table.followerId),
    followsFollowingIdx: index("follows_following_id_idx").on(table.followingId),
  }),
);

export const moments = pgTable(
  "moments",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    text: text("text").notNull(),
    lang: text("lang").notNull(),
    langColor: varchar("lang_color", { length: 32 }).notNull(),
    likes: integer("likes").notNull().default(0),
    comments: integer("comments").notNull().default(0),
    correction: jsonb("correction").$type<{
      original: string;
      corrected: string | null;
      note: string | null;
    } | null>(),
    createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  },
  (table) => ({
    momentsUserIdx: index("moments_user_id_idx").on(table.userId),
    momentsCreatedAtIdx: index("moments_created_at_idx").on(table.createdAt),
  }),
);

export const conversations = pgTable(
  "conversations",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    title: text("title"),
    type: varchar("type", { length: 24 }).notNull().default("direct"),
    createdById: varchar("created_by_id").references(() => users.id, { onDelete: "set null" }),
    lastMessageAt: timestamp("last_message_at"),
    createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
    updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  },
  (table) => ({
    conversationsCreatedByIdx: index("conversations_created_by_id_idx").on(table.createdById),
    conversationsLastMessageIdx: index("conversations_last_message_at_idx").on(table.lastMessageAt),
  }),
);

export const conversationParticipants = pgTable(
  "conversation_participants",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    conversationId: varchar("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: varchar("role", { length: 24 }).notNull().default("member"),
    lastReadAt: timestamp("last_read_at"),
    unreadCount: integer("unread_count").notNull().default(0),
    isArchived: boolean("is_archived").notNull().default(false),
    isMuted: boolean("is_muted").notNull().default(false),
    joinedAt: timestamp("joined_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
    updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  },
  (table) => ({
    conversationParticipantUnique: uniqueIndex("conversation_participants_unique").on(table.conversationId, table.userId),
    conversationParticipantsUserIdx: index("conversation_participants_user_id_idx").on(table.userId),
  }),
);

export const messages = pgTable(
  "messages",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    conversationId: varchar("conversation_id")
      .notNull()
      .references(() => conversations.id, { onDelete: "cascade" }),
    senderId: varchar("sender_id").references(() => users.id, { onDelete: "set null" }),
    role: varchar("role", { length: 24 }).notNull().default("user"),
    content: text("content").notNull(),
    messageType: varchar("message_type", { length: 24 }).notNull().default("text"),
    metadata: jsonb("metadata").$type<Record<string, unknown> | null>(),
    createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
    updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  },
  (table) => ({
    messagesConversationIdx: index("messages_conversation_id_idx").on(table.conversationId),
    messagesSenderIdx: index("messages_sender_id_idx").on(table.senderId),
    messagesCreatedAtIdx: index("messages_created_at_idx").on(table.createdAt),
  }),
);

export const voiceRooms = pgTable(
  "voice_rooms",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    hostId: varchar("host_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    topic: text("topic").notNull(),
    language: text("language").notNull(),
    languageCode: varchar("language_code", { length: 16 }).notNull(),
    description: text("description"),
    level: varchar("level", { length: 32 }).notNull().default("All Levels"),
    theme: varchar("theme", { length: 32 }).notNull().default("chat"),
    background: varchar("background", { length: 32 }).notNull().default("galaxy"),
    tags: jsonb("tags").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
    isActive: boolean("is_active").notNull().default(true),
    startedAt: timestamp("started_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
    lastHeartbeatAt: timestamp("last_heartbeat_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
    createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
    updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  },
  (table) => ({
    voiceRoomsHostIdx: index("voice_rooms_host_id_idx").on(table.hostId),
    voiceRoomsLanguageIdx: index("voice_rooms_language_code_idx").on(table.languageCode),
    voiceRoomsActiveIdx: index("voice_rooms_is_active_idx").on(table.isActive),
  }),
);

export const voiceParticipants = pgTable(
  "voice_participants",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    roomId: varchar("room_id")
      .notNull()
      .references(() => voiceRooms.id, { onDelete: "cascade" }),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: varchar("role", { length: 24 }).notNull().default("listener"),
    status: varchar("status", { length: 24 }).notNull().default("active"),
    joinedAt: timestamp("joined_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
    lastSeenAt: timestamp("last_seen_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
    leftAt: timestamp("left_at"),
  },
  (table) => ({
    voiceParticipantUnique: uniqueIndex("voice_participants_room_user_unique").on(table.roomId, table.userId),
    voiceParticipantsUserIdx: index("voice_participants_user_id_idx").on(table.userId),
    voiceParticipantsStatusIdx: index("voice_participants_status_idx").on(table.status),
  }),
);

export const lessonProgress = pgTable(
  "lesson_progress",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    lessonId: text("lesson_id").notNull(),
    languageCode: varchar("language_code", { length: 16 }).notNull(),
    completed: boolean("completed").notNull().default(false),
    score: integer("score"),
    completedAt: timestamp("completed_at"),
    updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  },
  (table) => ({
    lessonProgressUnique: uniqueIndex("lesson_progress_user_lesson_unique").on(table.userId, table.lessonId),
    lessonProgressLanguageIdx: index("lesson_progress_language_code_idx").on(table.languageCode),
  }),
);

export const quizResults = pgTable(
  "quiz_results",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    quizId: text("quiz_id").notNull(),
    lessonId: text("lesson_id"),
    languageCode: varchar("language_code", { length: 16 }).notNull(),
    score: integer("score").notNull(),
    totalQuestions: integer("total_questions"),
    passed: boolean("passed").notNull().default(false),
    answers: jsonb("answers").$type<Array<Record<string, unknown>>>().notNull().default(sql`'[]'::jsonb`),
    createdAt: timestamp("created_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  },
  (table) => ({
    quizResultsUserIdx: index("quiz_results_user_id_idx").on(table.userId),
    quizResultsQuizIdx: index("quiz_results_quiz_id_idx").on(table.quizId),
  }),
);

export const userProgress = pgTable("user_progress", {
  id: varchar("id")
    .primaryKey()
    .default(sql`gen_random_uuid()`),
  userId: varchar("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" })
    .unique(),
  streak: integer("streak").notNull().default(0),
  totalXp: integer("total_xp").notNull().default(0),
  selectedLanguages: jsonb("selected_languages").$type<string[]>().notNull().default(sql`'[]'::jsonb`),
  updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
});

export const streaks = pgTable(
  "streaks",
  {
    id: varchar("id")
      .primaryKey()
      .default(sql`gen_random_uuid()`),
    userId: varchar("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" })
      .unique(),
    currentStreak: integer("current_streak").notNull().default(0),
    longestStreak: integer("longest_streak").notNull().default(0),
    lastActivityDate: timestamp("last_activity_date"),
    freezeCount: integer("freeze_count").notNull().default(0),
    updatedAt: timestamp("updated_at").default(sql`CURRENT_TIMESTAMP`).notNull(),
  },
);

export const insertUserSchema = createInsertSchema(users).pick({
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
  locationName: true,
});

export const insertProfileSchema = createInsertSchema(profiles).pick({
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
  locationName: true,
});

export const insertAuthSessionSchema = createInsertSchema(authSessions).pick({
  userId: true,
  token: true,
  expiresAt: true,
});

export const insertFollowSchema = createInsertSchema(follows).pick({
  followerId: true,
  followingId: true,
});

export const insertMomentSchema = createInsertSchema(moments).pick({
  userId: true,
  text: true,
  lang: true,
  langColor: true,
  likes: true,
  comments: true,
  correction: true,
});

export const insertConversationSchema = createInsertSchema(conversations).pick({
  title: true,
  type: true,
  createdById: true,
  lastMessageAt: true,
});

export const insertConversationParticipantSchema = createInsertSchema(conversationParticipants).pick({
  conversationId: true,
  userId: true,
  role: true,
  lastReadAt: true,
  unreadCount: true,
  isArchived: true,
  isMuted: true,
});

export const insertMessageSchema = createInsertSchema(messages).pick({
  conversationId: true,
  senderId: true,
  role: true,
  content: true,
  messageType: true,
  metadata: true,
});

export const insertVoiceRoomSchema = createInsertSchema(voiceRooms).pick({
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
  lastHeartbeatAt: true,
});

export const insertVoiceParticipantSchema = createInsertSchema(voiceParticipants).pick({
  roomId: true,
  userId: true,
  role: true,
  status: true,
  joinedAt: true,
  lastSeenAt: true,
  leftAt: true,
});

export const insertLessonProgressSchema = createInsertSchema(lessonProgress).pick({
  userId: true,
  lessonId: true,
  languageCode: true,
  completed: true,
  score: true,
  completedAt: true,
});

export const insertQuizResultSchema = createInsertSchema(quizResults).pick({
  userId: true,
  quizId: true,
  lessonId: true,
  languageCode: true,
  score: true,
  totalQuestions: true,
  passed: true,
  answers: true,
});

export const insertUserProgressSchema = createInsertSchema(userProgress).pick({
  userId: true,
  streak: true,
  totalXp: true,
  selectedLanguages: true,
});

export const insertStreakSchema = createInsertSchema(streaks).pick({
  userId: true,
  currentStreak: true,
  longestStreak: true,
  lastActivityDate: true,
  freezeCount: true,
});

export const quizAttempts = quizResults;
export const insertQuizAttemptSchema = insertQuizResultSchema;

export type InsertUser = z.infer<typeof insertUserSchema>;
export type InsertProfile = z.infer<typeof insertProfileSchema>;
export type InsertAuthSession = z.infer<typeof insertAuthSessionSchema>;
export type InsertFollow = z.infer<typeof insertFollowSchema>;
export type InsertMoment = z.infer<typeof insertMomentSchema>;
export type InsertConversation = z.infer<typeof insertConversationSchema>;
export type InsertConversationParticipant = z.infer<typeof insertConversationParticipantSchema>;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type InsertVoiceRoom = z.infer<typeof insertVoiceRoomSchema>;
export type InsertVoiceParticipant = z.infer<typeof insertVoiceParticipantSchema>;
export type InsertLessonProgress = z.infer<typeof insertLessonProgressSchema>;
export type InsertQuizResult = z.infer<typeof insertQuizResultSchema>;
export type InsertQuizAttempt = z.infer<typeof insertQuizAttemptSchema>;
export type InsertUserProgress = z.infer<typeof insertUserProgressSchema>;
export type InsertStreak = z.infer<typeof insertStreakSchema>;
export type User = typeof users.$inferSelect;
export type Profile = typeof profiles.$inferSelect;
export type AuthSession = typeof authSessions.$inferSelect;
export type Follow = typeof follows.$inferSelect;
export type Moment = typeof moments.$inferSelect;
export type Conversation = typeof conversations.$inferSelect;
export type ConversationParticipant = typeof conversationParticipants.$inferSelect;
export type Message = typeof messages.$inferSelect;
export type VoiceRoom = typeof voiceRooms.$inferSelect;
export type VoiceParticipant = typeof voiceParticipants.$inferSelect;
export type LessonProgress = typeof lessonProgress.$inferSelect;
export type QuizResult = typeof quizResults.$inferSelect;
export type QuizAttempt = QuizResult;
export type UserProgress = typeof userProgress.$inferSelect;
export type Streak = typeof streaks.$inferSelect;
