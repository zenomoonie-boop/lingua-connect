import type { Express } from "express";
import { createServer, type Server } from "node:http";
import { createHash } from "node:crypto";
import OpenAI from "openai";
import "dotenv/config";
import { messageRealtime } from "./messageRealtime";
import { storage } from "./storage";
import { voiceRoomsStore, type VoiceRoom } from "./voiceRoomsStore";
import { voiceRealtime } from "./voiceRealtime";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || process.env.AI_INTEGRATIONS_OPENAI_API_KEY,
});

function hashPassword(password: string) {
  return createHash("sha256").update(password).digest("hex");
}

function toSafeUser(user: Awaited<ReturnType<typeof storage.getUser>>) {
  if (!user) {
    return null;
  }

  const { passwordHash: _passwordHash, ...safeUser } = user;
  return safeUser;
}

function requireToken(headerValue: string | undefined) {
  return headerValue?.replace(/^Bearer\s+/i, "").trim() || null;
}

export async function registerRoutes(app: Express): Promise<Server> {
  await voiceRoomsStore.init();

  app.post("/api/auth/register", async (req, res) => {
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
      learningLanguages,
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
      locationName: null,
    });

    const session = await storage.createSession(createdUser.id);
    return res.status(201).json({
      token: session.token,
      user: toSafeUser(createdUser),
    });
  });

  app.post("/api/auth/login", async (req, res) => {
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
      user: toSafeUser(foundUser),
    });
  });

  app.get("/api/auth/me", async (req, res) => {
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

  app.post("/api/auth/logout", async (req, res) => {
    const token = req.header("authorization")?.replace(/^Bearer\s+/i, "").trim();
    if (token) {
      await storage.deleteSession(token);
    }
    return res.status(204).send();
  });

  app.put("/api/auth/profile", async (req, res) => {
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

  app.get("/api/users/:id", async (req, res) => {
    const foundUser = await storage.getUser(req.params.id);
    if (!foundUser) {
      return res.status(404).json({ error: "User not found" });
    }

    return res.json({ user: toSafeUser(foundUser) });
  });

  app.get("/api/users", async (req, res) => {
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
      users: allUsers
        .filter((candidate) => candidate.id !== currentUser.id)
        .map((candidate) => toSafeUser(candidate)),
    });
  });

  app.post("/api/users/:id/follow", async (req, res) => {
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
      targetUser: toSafeUser(result.targetUser),
    });
  });

  app.get("/api/messages/conversations", async (req, res) => {
    const token = requireToken(req.header("authorization"));
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const currentUser = await storage.getUserBySessionToken(token);
    if (!currentUser) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const conversations = await storage.listConversationSummaries(currentUser.id);
    return res.json({
      conversations: conversations.map((item) => ({
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
        isOnline: Boolean(item.peerUser?.isActive),
      })),
    });
  });

  app.post("/api/messages/conversations/direct", async (req, res) => {
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
        isOnline: Boolean(conversation.peerUser?.isActive),
      },
    });
  });

  app.get("/api/messages/conversations/:id/messages", async (req, res) => {
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
        ts: item.createdAt.getTime(),
      })),
    });
  });

  app.post("/api/messages/conversations/:id/messages", async (req, res) => {
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
        ts: createdMessage.createdAt.getTime(),
      },
    });
  });

  app.get("/api/moments", async (_req, res) => {
    const allMoments = await storage.listMoments();
    const users = await storage.listUsers();
    const usersById = new Map(users.map((user) => [user.id, user]));

    return res.json({
      moments: allMoments.map((moment) => {
        const owner = usersById.get(moment.userId);
        return {
          id: moment.id,
          userId: moment.userId,
          userName: owner?.displayName || "User",
          userInitials: (owner?.displayName || "User").split(" ").map((word) => word[0]).join("").slice(0, 2).toUpperCase(),
          userColor: owner?.avatarColor || "#4ECDC4",
          userAvatarUri: owner?.avatarUri || undefined,
          text: moment.text,
          lang: moment.lang,
          langColor: moment.langColor,
          likes: moment.likes,
          comments: moment.comments,
          createdAt: moment.createdAt.getTime(),
          timeLabel: "just now",
          correction: moment.correction,
        };
      }),
    });
  });

  app.post("/api/moments", async (req, res) => {
    const token = req.header("authorization")?.replace(/^Bearer\s+/i, "").trim();
    if (!token) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const currentUser = await storage.getUserBySessionToken(token);
    if (!currentUser) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    const { text, lang, langColor, correction } = req.body ?? {};
    if (!text || !lang || !langColor) {
      return res.status(400).json({ error: "text, lang, and langColor are required" });
    }

    const createdMoment = await storage.createMoment({
      userId: currentUser.id,
      text: String(text),
      lang: String(lang),
      langColor: String(langColor),
      likes: 0,
      comments: 0,
      correction: correction ?? null,
    });

    const updatedUser = await storage.getUser(currentUser.id);
    return res.status(201).json({
      moment: {
        id: createdMoment.id,
        userId: createdMoment.userId,
        userName: currentUser.displayName,
        userInitials: currentUser.displayName.split(" ").map((word) => word[0]).join("").slice(0, 2).toUpperCase(),
        userColor: currentUser.avatarColor || "#4ECDC4",
        userAvatarUri: currentUser.avatarUri || undefined,
        text: createdMoment.text,
        lang: createdMoment.lang,
        langColor: createdMoment.langColor,
        likes: createdMoment.likes,
        comments: createdMoment.comments,
        createdAt: createdMoment.createdAt.getTime(),
        timeLabel: "just now",
        correction: createdMoment.correction,
      },
      user: toSafeUser(updatedUser),
    });
  });

  app.get("/api/progress", async (req, res) => {
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
      completedLessons,
    });
  });

  app.put("/api/progress", async (req, res) => {
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
      streak: typeof streak === "number" ? streak : undefined,
      totalXp: typeof totalXp === "number" ? totalXp : undefined,
      selectedLanguages: Array.isArray(selectedLanguages) ? selectedLanguages : undefined,
    });

    return res.json({ progress });
  });

  app.post("/api/progress/lesson", async (req, res) => {
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

    const lessonProgress = await storage.upsertLessonProgress({
      userId: currentUser.id,
      lessonId: String(lessonId),
      languageCode: String(languageCode),
      completed: Boolean(completed),
      score: typeof score === "number" ? score : null,
      completedAt: completedAt ? new Date(String(completedAt)) : null,
    });

    const progress = await storage.updateUserProgress(currentUser.id, {
      streak: typeof streak === "number" ? streak : undefined,
      totalXp: typeof totalXp === "number" ? totalXp : undefined,
    });

    return res.json({
      lessonProgress: {
        ...lessonProgress,
        xpEarned: typeof xpEarned === "number" ? xpEarned : 0,
      },
      progress,
    });
  });

  app.get("/api/voice-rooms", async (_req, res) => {
    res.json(await voiceRoomsStore.listRooms());
  });

  app.post("/api/voice-rooms", async (req, res) => {
    const room = req.body as Partial<VoiceRoom>;

    if (!room?.topic || !room?.languageCode || !room?.language) {
      return res.status(400).json({ error: "topic, language, and languageCode are required" });
    }

    const nextRoom: VoiceRoom = {
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
      speakerRequests: Array.isArray(room.speakerRequests) ? room.speakerRequests : [],
    };

    const createdRoom = await voiceRoomsStore.createRoom(nextRoom);
    voiceRealtime.broadcastRoomSnapshot(createdRoom.id, createdRoom);
    res.status(201).json(createdRoom);
  });

  app.put("/api/voice-rooms/:id", async (req, res) => {
    const { id } = req.params;
    const room = req.body as VoiceRoom;
    const updatedRoom = await voiceRoomsStore.updateRoom(id, room);

    if (!updatedRoom) {
      return res.status(404).json({ error: "Room not found" });
    }
    voiceRealtime.broadcastRoomSnapshot(updatedRoom.id, updatedRoom);
    res.json(updatedRoom);
  });

  app.delete("/api/voice-rooms/:id", async (req, res) => {
    const { id } = req.params;
    const deletedRoom = await voiceRoomsStore.deleteRoom(id);

    if (!deletedRoom) {
      return res.status(404).json({ error: "Room not found" });
    }

    voiceRealtime.broadcastRoomDeleted(id);
    res.status(204).send();
  });

  app.post("/api/chat", async (req, res) => {
    const { messages, language, languageName } = req.body;

    if (!messages || !Array.isArray(messages)) {
      return res.status(400).json({ error: "messages array required" });
    }

    res.setHeader("Content-Type", "text/event-stream");
    res.setHeader("Cache-Control", "no-cache, no-transform");
    res.setHeader("X-Accel-Buffering", "no");
    res.flushHeaders();

    const isEnglish = language === "en";
    const targetLanguage = languageName || "the target language";
    const systemPrompt = isEnglish
      ? `You are a friendly, encouraging English language tutor. Your job is to help the student practice and improve their English.

Your role:
- Always respond in clear, natural English
- Gently correct grammar, spelling, and vocabulary mistakes with explanations
- Handle slang, informal language, and mistakes naturally — never be harsh
- After correcting a mistake, show the correct form: e.g. "Great try! It should be 'I am going' not 'I going'"
- Keep conversations engaging and practical — talk about everyday topics
- Ask follow-up questions to keep the conversation flowing
- Give vocabulary tips, idioms, and pronunciation notes when relevant
- Celebrate progress and encourage the student
- Use short, clear sentences that are easy to understand`
      : `You are a friendly and encouraging language tutor helping a student practice ${targetLanguage}.

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

    const chatMessages: OpenAI.Chat.ChatCompletionMessageParam[] = [
      { role: "system", content: systemPrompt },
      ...messages,
    ];

    try {
      const stream = await openai.chat.completions.create({
        model: "gpt-4o",
        messages: chatMessages,
        stream: true,
        max_completion_tokens: 1024,
      });

      for await (const chunk of stream) {
        const content = chunk.choices[0]?.delta?.content || "";
        if (content) {
          res.write(`data: ${JSON.stringify({ content })}\n\n`);
        }
      }

      res.write("data: [DONE]\n\n");
      res.end();
    } catch (err) {
      console.error("Chat error:", err);
      res.write(`data: ${JSON.stringify({ error: "AI unavailable" })}\n\n`);
      res.end();
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
