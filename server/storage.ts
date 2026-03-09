import {
  and,
  desc,
  eq,
  gt,
  sql,
} from "drizzle-orm";
import {
  authSessions,
  conversationParticipants,
  conversations,
  follows,
  lessonProgress,
  messages,
  moments,
  profiles,
  streaks,
  type Conversation,
  type ConversationParticipant,
  type InsertLessonProgress,
  type InsertMoment,
  type InsertUser,
  type LessonProgress,
  type Message,
  type Moment,
  type User,
  type UserProgress,
  userProgress,
  users,
} from "@shared/schema";
import { randomUUID } from "crypto";
import { db, hasDatabase } from "./db";

type AuthSessionRecord = {
  token: string;
  userId: string;
  expiresAt: Date;
};

type ConversationSummary = {
  conversation: Conversation;
  participant: ConversationParticipant;
  peerUser: User | null;
  lastMessage: Message | null;
};

type UserUpdate = Partial<User>;

function defined<T extends Record<string, unknown>>(value: T): T {
  return Object.fromEntries(Object.entries(value).filter(([, entry]) => entry !== undefined)) as T;
}

function buildUserInsert(insertUser: InsertUser) {
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
    lastSeenAt: null,
  };
}

function buildProfileInsert(userId: string, insertUser: InsertUser) {
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
    locationName: insertUser.locationName ?? null,
  };
}

function buildUserUpdate(updates: UserUpdate) {
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
    updatedAt: new Date(),
  });
}

function buildProfileUpdate(updates: UserUpdate) {
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
    updatedAt: new Date(),
  });
}

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: string, updates: Partial<User>): Promise<User | undefined>;
  listUsers(): Promise<User[]>;
  toggleFollowUser(currentUserId: string, targetUserId: string): Promise<{ currentUser: User; targetUser: User; isFollowing: boolean } | null>;
  listMoments(): Promise<Moment[]>;
  createMoment(moment: InsertMoment): Promise<Moment>;
  getUserProgress(userId: string): Promise<UserProgress>;
  updateUserProgress(userId: string, updates: Partial<UserProgress>): Promise<UserProgress>;
  listLessonProgress(userId: string): Promise<LessonProgress[]>;
  upsertLessonProgress(progress: InsertLessonProgress): Promise<LessonProgress>;
  createSession(userId: string): Promise<AuthSessionRecord>;
  getUserBySessionToken(token: string): Promise<User | undefined>;
  deleteSession(token: string): Promise<void>;
  listConversationSummaries(userId: string): Promise<ConversationSummary[]>;
  getOrCreateDirectConversation(currentUserId: string, targetUserId: string): Promise<ConversationSummary | null>;
  listMessages(conversationId: string, userId: string): Promise<Message[]>;
  createMessage(conversationId: string, senderId: string, content: string): Promise<Message | null>;
  listConversationParticipantUserIds(conversationId: string): Promise<string[]>;
}

export class MemStorage implements IStorage {
  private users: Map<string, User>;
  private sessions: Map<string, AuthSessionRecord>;
  private moments: Map<string, Moment>;
  private userProgress: Map<string, UserProgress>;
  private lessonProgress: Map<string, LessonProgress>;
  private conversations: Map<string, Conversation>;
  private conversationParticipants: Map<string, ConversationParticipant>;
  private messages: Map<string, Message>;

  constructor() {
    this.users = new Map();
    this.sessions = new Map();
    this.moments = new Map();
    this.userProgress = new Map();
    this.lessonProgress = new Map();
    this.conversations = new Map();
    this.conversationParticipants = new Map();
    this.messages = new Map();
  }

  async getUser(id: string): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find((user) => user.username === username);
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find((user) => user.email.toLowerCase() === email.toLowerCase());
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = randomUUID();
    const now = new Date();
    const user: User = {
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
      updatedAt: now,
    };
    this.users.set(id, user);
    this.userProgress.set(id, {
      id: randomUUID(),
      userId: id,
      streak: 0,
      totalXp: 0,
      selectedLanguages: insertUser.learningLanguages ?? [],
      updatedAt: new Date(),
    });
    return user;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const existing = this.users.get(id);
    if (!existing) {
      return undefined;
    }

    const nextUser: User = {
      ...existing,
      ...updates,
      id: existing.id,
      updatedAt: new Date(),
    };

    this.users.set(id, nextUser);
    return nextUser;
  }

  async listUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async toggleFollowUser(currentUserId: string, targetUserId: string): Promise<{ currentUser: User; targetUser: User; isFollowing: boolean } | null> {
    const currentUser = this.users.get(currentUserId);
    const targetUser = this.users.get(targetUserId);

    if (!currentUser || !targetUser || currentUserId === targetUserId) {
      return null;
    }

    const currentFollowing = Array.isArray(currentUser.followingUserIds) ? currentUser.followingUserIds : [];
    const isFollowing = currentFollowing.includes(targetUserId);
    const nextFollowingUserIds = isFollowing
      ? currentFollowing.filter((id) => id !== targetUserId)
      : [...currentFollowing, targetUserId];

    const nextCurrentUser: User = {
      ...currentUser,
      followingUserIds: nextFollowingUserIds,
      following: nextFollowingUserIds.length,
      updatedAt: new Date(),
    };

    const nextTargetUser: User = {
      ...targetUser,
      followers: Math.max(0, (targetUser.followers ?? 0) + (isFollowing ? -1 : 1)),
      updatedAt: new Date(),
    };

    this.users.set(currentUserId, nextCurrentUser);
    this.users.set(targetUserId, nextTargetUser);

    return {
      currentUser: nextCurrentUser,
      targetUser: nextTargetUser,
      isFollowing: !isFollowing,
    };
  }

  async listMoments(): Promise<Moment[]> {
    return Array.from(this.moments.values()).sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  async createMoment(insertMoment: InsertMoment): Promise<Moment> {
    const id = randomUUID();
    const moment: Moment = {
      id,
      userId: insertMoment.userId,
      text: insertMoment.text,
      lang: insertMoment.lang,
      langColor: insertMoment.langColor,
      likes: insertMoment.likes ?? 0,
      comments: insertMoment.comments ?? 0,
      correction: (insertMoment.correction as Moment["correction"]) ?? null,
      createdAt: new Date(),
    };
    this.moments.set(id, moment);

    const user = this.users.get(insertMoment.userId);
    if (user) {
      this.users.set(insertMoment.userId, {
        ...user,
        moments: (user.moments ?? 0) + 1,
        updatedAt: new Date(),
      });
    }

    return moment;
  }

  async getUserProgress(userId: string): Promise<UserProgress> {
    const existing = this.userProgress.get(userId);
    if (existing) {
      return existing;
    }

    const nextProgress: UserProgress = {
      id: randomUUID(),
      userId,
      streak: 0,
      totalXp: 0,
      selectedLanguages: [],
      updatedAt: new Date(),
    };
    this.userProgress.set(userId, nextProgress);
    return nextProgress;
  }

  async updateUserProgress(userId: string, updates: Partial<UserProgress>): Promise<UserProgress> {
    const existing = await this.getUserProgress(userId);
    const nextProgress: UserProgress = {
      ...existing,
      ...updates,
      id: existing.id,
      userId,
      updatedAt: new Date(),
    };
    this.userProgress.set(userId, nextProgress);
    return nextProgress;
  }

  async listLessonProgress(userId: string): Promise<LessonProgress[]> {
    return Array.from(this.lessonProgress.values()).filter((progress) => progress.userId === userId);
  }

  async upsertLessonProgress(progress: InsertLessonProgress): Promise<LessonProgress> {
    const existing = Array.from(this.lessonProgress.values()).find(
      (item) => item.userId === progress.userId && item.lessonId === progress.lessonId,
    );

    if (existing) {
      const nextProgress: LessonProgress = {
        ...existing,
        ...progress,
        id: existing.id,
        updatedAt: new Date(),
      };
      this.lessonProgress.set(existing.id, nextProgress);
      return nextProgress;
    }

    const nextProgress: LessonProgress = {
      id: randomUUID(),
      userId: progress.userId,
      lessonId: progress.lessonId,
      languageCode: progress.languageCode,
      completed: progress.completed ?? false,
      score: progress.score ?? null,
      completedAt: progress.completedAt ?? null,
      updatedAt: new Date(),
    };
    this.lessonProgress.set(nextProgress.id, nextProgress);
    return nextProgress;
  }

  async createSession(userId: string): Promise<AuthSessionRecord> {
    const token = randomUUID();
    const session: AuthSessionRecord = {
      token,
      userId,
      expiresAt: new Date(Date.now() + 1000 * 60 * 60 * 24 * 30),
    };
    this.sessions.set(token, session);
    return session;
  }

  async getUserBySessionToken(token: string): Promise<User | undefined> {
    const session = this.sessions.get(token);
    if (!session) {
      return undefined;
    }

    if (session.expiresAt.getTime() <= Date.now()) {
      this.sessions.delete(token);
      return undefined;
    }

    return this.users.get(session.userId);
  }

  async deleteSession(token: string): Promise<void> {
    this.sessions.delete(token);
  }

  async listConversationSummaries(userId: string): Promise<ConversationSummary[]> {
    const participations = Array.from(this.conversationParticipants.values())
      .filter((item) => item.userId === userId)
      .sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());

    return participations.map((participant) => {
      const conversation = this.conversations.get(participant.conversationId)!;
      const peerParticipant = Array.from(this.conversationParticipants.values()).find(
        (item) => item.conversationId === participant.conversationId && item.userId !== userId,
      );
      const peerUser = peerParticipant ? this.users.get(peerParticipant.userId) ?? null : null;
      const lastMessage = Array.from(this.messages.values())
        .filter((item) => item.conversationId === participant.conversationId)
        .sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime())[0] ?? null;

      return { conversation, participant, peerUser, lastMessage };
    });
  }

  async getOrCreateDirectConversation(currentUserId: string, targetUserId: string): Promise<ConversationSummary | null> {
    if (currentUserId === targetUserId) {
      return null;
    }

    const currentUser = this.users.get(currentUserId);
    const targetUser = this.users.get(targetUserId);
    if (!currentUser || !targetUser) {
      return null;
    }

    const existingConversation = Array.from(this.conversations.values()).find((conversation) => {
      if (conversation.type !== "direct") {
        return false;
      }

      const participants = Array.from(this.conversationParticipants.values())
        .filter((item) => item.conversationId === conversation.id)
        .map((item) => item.userId)
        .sort();

      return participants.length === 2
        && participants[0] === [currentUserId, targetUserId].sort()[0]
        && participants[1] === [currentUserId, targetUserId].sort()[1];
    });

    let conversation = existingConversation;
    if (!conversation) {
      const now = new Date();
      conversation = {
        id: randomUUID(),
        title: null,
        type: "direct",
        createdById: currentUserId,
        lastMessageAt: null,
        createdAt: now,
        updatedAt: now,
      };
      this.conversations.set(conversation.id, conversation);

      const baseParticipant = {
        role: "member" as const,
        lastReadAt: null,
        unreadCount: 0,
        isArchived: false,
        isMuted: false,
        joinedAt: now,
        updatedAt: now,
      };

      this.conversationParticipants.set(`${conversation.id}:${currentUserId}`, {
        id: randomUUID(),
        conversationId: conversation.id,
        userId: currentUserId,
        ...baseParticipant,
      });
      this.conversationParticipants.set(`${conversation.id}:${targetUserId}`, {
        id: randomUUID(),
        conversationId: conversation.id,
        userId: targetUserId,
        ...baseParticipant,
      });
    }

    const participant = this.conversationParticipants.get(`${conversation.id}:${currentUserId}`)!;
    return { conversation, participant, peerUser: targetUser, lastMessage: null };
  }

  async listMessages(conversationId: string, userId: string): Promise<Message[]> {
    const participant = this.conversationParticipants.get(`${conversationId}:${userId}`);
    if (!participant) {
      return [];
    }

    this.conversationParticipants.set(`${conversationId}:${userId}`, {
      ...participant,
      unreadCount: 0,
      lastReadAt: new Date(),
      updatedAt: new Date(),
    });

    return Array.from(this.messages.values())
      .filter((message) => message.conversationId === conversationId)
      .sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
  }

  async createMessage(conversationId: string, senderId: string, content: string): Promise<Message | null> {
    const conversation = this.conversations.get(conversationId);
    if (!conversation) {
      return null;
    }

    const now = new Date();
    const message: Message = {
      id: randomUUID(),
      conversationId,
      senderId,
      role: "user",
      content,
      messageType: "text",
      metadata: null,
      createdAt: now,
      updatedAt: now,
    };
    this.messages.set(message.id, message);
    this.conversations.set(conversationId, {
      ...conversation,
      lastMessageAt: now,
      updatedAt: now,
    });

    for (const [key, participant] of this.conversationParticipants.entries()) {
      if (participant.conversationId !== conversationId) {
        continue;
      }

      this.conversationParticipants.set(key, {
        ...participant,
        unreadCount: participant.userId === senderId ? 0 : participant.unreadCount + 1,
        lastReadAt: participant.userId === senderId ? now : participant.lastReadAt,
        updatedAt: now,
      });
    }

    return message;
  }

  async listConversationParticipantUserIds(conversationId: string): Promise<string[]> {
    return Array.from(this.conversationParticipants.values())
      .filter((item) => item.conversationId === conversationId)
      .map((item) => item.userId);
  }
}

class DatabaseStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const rows = await db!.select().from(users).where(eq(users.id, id)).limit(1);
    return rows[0];
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    const rows = await db!.select().from(users).where(eq(users.username, username)).limit(1);
    return rows[0];
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    const rows = await db!.select().from(users).where(eq(users.email, email.toLowerCase())).limit(1);
    return rows[0];
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const userValues = buildUserInsert(insertUser);
    const created = await db!.transaction(async (tx) => {
      const [createdUser] = await tx.insert(users).values(userValues).returning();
      await tx.insert(profiles).values(buildProfileInsert(createdUser.id, insertUser));
      await tx.insert(userProgress).values({
        userId: createdUser.id,
        streak: 0,
        totalXp: 0,
        selectedLanguages: insertUser.learningLanguages ?? [],
      });
      await tx.insert(streaks).values({
        userId: createdUser.id,
        currentStreak: 0,
        longestStreak: 0,
        freezeCount: 0,
        lastActivityDate: null,
      });
      return createdUser;
    });

    return created;
  }

  async updateUser(id: string, updates: Partial<User>): Promise<User | undefined> {
    const userUpdate = buildUserUpdate(updates);
    if (Object.keys(userUpdate).length === 0) {
      return this.getUser(id);
    }

    const updatedUser = await db!.transaction(async (tx) => {
      const [userRow] = await tx
        .update(users)
        .set(userUpdate)
        .where(eq(users.id, id))
        .returning();

      if (!userRow) {
        return undefined;
      }

      const profileUpdate = buildProfileUpdate(updates);
      if (Object.keys(profileUpdate).length > 0) {
        await tx
          .insert(profiles)
          .values({
            userId: id,
            ...buildProfileUpdate(updates),
          })
          .onConflictDoUpdate({
            target: profiles.userId,
            set: profileUpdate,
          });
      }

      return userRow;
    });

    return updatedUser;
  }

  async listUsers(): Promise<User[]> {
    return db!.select().from(users).orderBy(desc(users.createdAt));
  }

  async toggleFollowUser(currentUserId: string, targetUserId: string): Promise<{ currentUser: User; targetUser: User; isFollowing: boolean } | null> {
    if (currentUserId === targetUserId) {
      return null;
    }

    return db!.transaction(async (tx) => {
      const [currentUser, targetUser] = await Promise.all([
        tx.select().from(users).where(eq(users.id, currentUserId)).limit(1),
        tx.select().from(users).where(eq(users.id, targetUserId)).limit(1),
      ]);

      if (!currentUser[0] || !targetUser[0]) {
        return null;
      }

      const existingFollow = await tx
        .select()
        .from(follows)
        .where(and(eq(follows.followerId, currentUserId), eq(follows.followingId, targetUserId)))
        .limit(1);

      const isCurrentlyFollowing = Boolean(existingFollow[0]);

      if (isCurrentlyFollowing) {
        await tx
          .delete(follows)
          .where(and(eq(follows.followerId, currentUserId), eq(follows.followingId, targetUserId)));
      } else {
        await tx.insert(follows).values({
          followerId: currentUserId,
          followingId: targetUserId,
        });
      }

      const followingRows = await tx
        .select({ followingId: follows.followingId })
        .from(follows)
        .where(eq(follows.followerId, currentUserId));

      const followerCountRows = await tx
        .select({ count: sql<number>`count(*)::int` })
        .from(follows)
        .where(eq(follows.followingId, targetUserId));

      const currentUserCountRows = await tx
        .select({ count: sql<number>`count(*)::int` })
        .from(follows)
        .where(eq(follows.followerId, currentUserId));

      const followingUserIds = followingRows.map((row) => row.followingId);
      const followersCount = followerCountRows[0]?.count ?? 0;
      const followingCount = currentUserCountRows[0]?.count ?? 0;

      const [nextCurrentUser] = await tx
        .update(users)
        .set({
          following: followingCount,
          followingUserIds,
          updatedAt: new Date(),
        })
        .where(eq(users.id, currentUserId))
        .returning();

      const [nextTargetUser] = await tx
        .update(users)
        .set({
          followers: followersCount,
          updatedAt: new Date(),
        })
        .where(eq(users.id, targetUserId))
        .returning();

      if (!nextCurrentUser || !nextTargetUser) {
        return null;
      }

      return {
        currentUser: nextCurrentUser,
        targetUser: nextTargetUser,
        isFollowing: !isCurrentlyFollowing,
      };
    });
  }

  async listMoments(): Promise<Moment[]> {
    return db!.select().from(moments).orderBy(desc(moments.createdAt));
  }

  async createMoment(insertMoment: InsertMoment): Promise<Moment> {
    return db!.transaction(async (tx) => {
      const [createdMoment] = await tx
        .insert(moments)
        .values({
          userId: insertMoment.userId,
          text: insertMoment.text,
          lang: insertMoment.lang,
          langColor: insertMoment.langColor,
          likes: insertMoment.likes ?? 0,
          comments: insertMoment.comments ?? 0,
          correction: (insertMoment.correction as Moment["correction"]) ?? null,
        })
        .returning();

      await tx
        .update(users)
        .set({
          moments: sql`${users.moments} + 1`,
          updatedAt: new Date(),
        })
        .where(eq(users.id, insertMoment.userId));

      return createdMoment;
    });
  }

  async getUserProgress(userId: string): Promise<UserProgress> {
    const rows = await db!.select().from(userProgress).where(eq(userProgress.userId, userId)).limit(1);
    if (rows[0]) {
      return rows[0];
    }

    const [created] = await db!
      .insert(userProgress)
      .values({
        userId,
        streak: 0,
        totalXp: 0,
        selectedLanguages: [],
      })
      .returning();

    return created;
  }

  async updateUserProgress(userId: string, updates: Partial<UserProgress>): Promise<UserProgress> {
    const values = defined({
      streak: updates.streak,
      totalXp: updates.totalXp,
      selectedLanguages: updates.selectedLanguages,
      updatedAt: new Date(),
    });

    const [row] = await db!
      .insert(userProgress)
      .values({
        userId,
        streak: typeof updates.streak === "number" ? updates.streak : 0,
        totalXp: typeof updates.totalXp === "number" ? updates.totalXp : 0,
        selectedLanguages: Array.isArray(updates.selectedLanguages) ? updates.selectedLanguages : [],
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: userProgress.userId,
        set: values,
      })
      .returning();

    await db!
      .insert(streaks)
      .values({
        userId,
        currentStreak: typeof row.streak === "number" ? row.streak : 0,
        longestStreak: typeof row.streak === "number" ? row.streak : 0,
        lastActivityDate: new Date(),
        freezeCount: 0,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: streaks.userId,
        set: {
          currentStreak: typeof row.streak === "number" ? row.streak : 0,
          longestStreak: sql`GREATEST(${streaks.longestStreak}, ${typeof row.streak === "number" ? row.streak : 0})`,
          lastActivityDate: new Date(),
          updatedAt: new Date(),
        },
      });

    return row;
  }

  async listLessonProgress(userId: string): Promise<LessonProgress[]> {
    return db!.select().from(lessonProgress).where(eq(lessonProgress.userId, userId)).orderBy(desc(lessonProgress.updatedAt));
  }

  async upsertLessonProgress(progress: InsertLessonProgress): Promise<LessonProgress> {
    const [row] = await db!
      .insert(lessonProgress)
      .values({
        userId: progress.userId,
        lessonId: progress.lessonId,
        languageCode: progress.languageCode,
        completed: progress.completed ?? false,
        score: progress.score ?? null,
        completedAt: progress.completedAt ?? null,
        updatedAt: new Date(),
      })
      .onConflictDoUpdate({
        target: [lessonProgress.userId, lessonProgress.lessonId],
        set: {
          languageCode: progress.languageCode,
          completed: progress.completed ?? false,
          score: progress.score ?? null,
          completedAt: progress.completedAt ?? null,
          updatedAt: new Date(),
        },
      })
      .returning();

    return row;
  }

  async createSession(userId: string): Promise<AuthSessionRecord> {
    const token = randomUUID();
    const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 30);
    await db!.insert(authSessions).values({
      userId,
      token,
      expiresAt,
    });

    return { token, userId, expiresAt };
  }

  async getUserBySessionToken(token: string): Promise<User | undefined> {
    const sessionRows = await db!
      .select()
      .from(authSessions)
      .where(and(eq(authSessions.token, token), gt(authSessions.expiresAt, new Date())))
      .limit(1);

    if (!sessionRows[0]) {
      await db!.delete(authSessions).where(eq(authSessions.token, token));
      return undefined;
    }

    return this.getUser(sessionRows[0].userId);
  }

  async deleteSession(token: string): Promise<void> {
    await db!.delete(authSessions).where(eq(authSessions.token, token));
  }

  async listConversationSummaries(userId: string): Promise<ConversationSummary[]> {
    const participantRows = await db!
      .select()
      .from(conversationParticipants)
      .where(eq(conversationParticipants.userId, userId))
      .orderBy(desc(conversationParticipants.updatedAt));

    const summaries = await Promise.all(participantRows.map(async (participant) => {
      const [conversation] = await db!
        .select()
        .from(conversations)
        .where(eq(conversations.id, participant.conversationId))
        .limit(1);

      const [peerParticipant] = await db!
        .select()
        .from(conversationParticipants)
        .where(and(
          eq(conversationParticipants.conversationId, participant.conversationId),
          sql`${conversationParticipants.userId} <> ${userId}`,
        ))
        .limit(1);

      const peerUser = peerParticipant
        ? (await db!.select().from(users).where(eq(users.id, peerParticipant.userId)).limit(1))[0] ?? null
        : null;

      const [lastMessage] = await db!
        .select()
        .from(messages)
        .where(eq(messages.conversationId, participant.conversationId))
        .orderBy(desc(messages.createdAt))
        .limit(1);

      return {
        conversation,
        participant,
        peerUser,
        lastMessage: lastMessage ?? null,
      } satisfies ConversationSummary;
    }));

    return summaries.filter((item) => Boolean(item.conversation));
  }

  async getOrCreateDirectConversation(currentUserId: string, targetUserId: string): Promise<ConversationSummary | null> {
    if (currentUserId === targetUserId) {
      return null;
    }

    const [currentUser, targetUser] = await Promise.all([
      this.getUser(currentUserId),
      this.getUser(targetUserId),
    ]);

    if (!currentUser || !targetUser) {
      return null;
    }

    const currentParticipations = await db!
      .select()
      .from(conversationParticipants)
      .where(eq(conversationParticipants.userId, currentUserId));

    const targetParticipations = await db!
      .select()
      .from(conversationParticipants)
      .where(eq(conversationParticipants.userId, targetUserId));

    const targetConversationIds = new Set(targetParticipations.map((item) => item.conversationId));
    const sharedConversation = currentParticipations.find((item) => targetConversationIds.has(item.conversationId));

    if (sharedConversation) {
      const [conversation] = await db!
        .select()
        .from(conversations)
        .where(and(eq(conversations.id, sharedConversation.conversationId), eq(conversations.type, "direct")))
        .limit(1);

      if (conversation) {
        const [lastMessage] = await db!
          .select()
          .from(messages)
          .where(eq(messages.conversationId, conversation.id))
          .orderBy(desc(messages.createdAt))
          .limit(1);

        return {
          conversation,
          participant: sharedConversation,
          peerUser: targetUser,
          lastMessage: lastMessage ?? null,
        };
      }
    }

    return db!.transaction(async (tx) => {
      const now = new Date();
      const [conversation] = await tx
        .insert(conversations)
        .values({
          title: null,
          type: "direct",
          createdById: currentUserId,
          lastMessageAt: null,
          updatedAt: now,
        })
        .returning();

      const participantSeed = {
        role: "member" as const,
        lastReadAt: null,
        unreadCount: 0,
        isArchived: false,
        isMuted: false,
        joinedAt: now,
        updatedAt: now,
      };

      const [currentParticipant] = await tx
        .insert(conversationParticipants)
        .values([
          { conversationId: conversation.id, userId: currentUserId, ...participantSeed },
          { conversationId: conversation.id, userId: targetUserId, ...participantSeed },
        ])
        .returning();

      return {
        conversation,
        participant: currentParticipant,
        peerUser: targetUser,
        lastMessage: null,
      };
    });
  }

  async listMessages(conversationId: string, userId: string): Promise<Message[]> {
    const [participant] = await db!
      .select()
      .from(conversationParticipants)
      .where(and(eq(conversationParticipants.conversationId, conversationId), eq(conversationParticipants.userId, userId)))
      .limit(1);

    if (!participant) {
      return [];
    }

    await db!
      .update(conversationParticipants)
      .set({
        unreadCount: 0,
        lastReadAt: new Date(),
        updatedAt: new Date(),
      })
      .where(and(eq(conversationParticipants.conversationId, conversationId), eq(conversationParticipants.userId, userId)));

    return db!
      .select()
      .from(messages)
      .where(eq(messages.conversationId, conversationId))
      .orderBy(messages.createdAt);
  }

  async createMessage(conversationId: string, senderId: string, content: string): Promise<Message | null> {
    const [senderParticipant] = await db!
      .select()
      .from(conversationParticipants)
      .where(and(eq(conversationParticipants.conversationId, conversationId), eq(conversationParticipants.userId, senderId)))
      .limit(1);

    if (!senderParticipant) {
      return null;
    }

    return db!.transaction(async (tx) => {
      const now = new Date();
      const [message] = await tx
        .insert(messages)
        .values({
          conversationId,
          senderId,
          role: "user",
          content,
          messageType: "text",
          metadata: null,
          updatedAt: now,
        })
        .returning();

      await tx
        .update(conversations)
        .set({
          lastMessageAt: now,
          updatedAt: now,
        })
        .where(eq(conversations.id, conversationId));

      await tx
        .update(conversationParticipants)
        .set({
          unreadCount: sql`CASE WHEN ${conversationParticipants.userId} = ${senderId} THEN 0 ELSE ${conversationParticipants.unreadCount} + 1 END`,
          lastReadAt: sql`CASE WHEN ${conversationParticipants.userId} = ${senderId} THEN ${now} ELSE ${conversationParticipants.lastReadAt} END`,
          updatedAt: now,
        })
        .where(eq(conversationParticipants.conversationId, conversationId));

      return message;
    });
  }

  async listConversationParticipantUserIds(conversationId: string): Promise<string[]> {
    const rows = await db!
      .select({ userId: conversationParticipants.userId })
      .from(conversationParticipants)
      .where(eq(conversationParticipants.conversationId, conversationId));

    return rows.map((item) => item.userId);
  }
}

export const storage: IStorage = hasDatabase && db
  ? new DatabaseStorage()
  : new MemStorage();
