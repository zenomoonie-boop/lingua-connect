import React, { useState, useRef, useEffect, useMemo, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import {
  View, Text, FlatList, TextInput, Pressable,
  StyleSheet, useColorScheme, Platform, Modal,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { fetch } from "expo/fetch";
import * as Haptics from "expo-haptics";
import Colors from "@/constants/colors";
import { ScreenBackdrop } from "@/components/ScreenBackdrop";
import { useAuth } from "@/context/AuthContext";
import { useMessaging } from "@/context/MessagingContext";
import { getApiUrl } from "@/lib/query-client";

type ChatMessage = {
  id: string;
  role: "user" | "them";
  content: string;
  ts: number;
};

type Conversation = {
  id: string;
  userId: string;
  name: string;
  avatarColor: string;
  initials: string;
  nativeLanguage?: string;
  learningLanguage?: string;
  lastMessage: string;
  lastTs?: number;
  lastTime: string;
  unread: number;
  isOnline: boolean;
  messages: ChatMessage[];
};

type DiscoverUser = {
  id: string;
  displayName: string;
  avatarColor?: string;
  nativeLanguage?: string;
  learningLanguages?: string[];
  isActive?: boolean;
};

const SESSION_TOKEN_KEY = "lingua_session_token";

let msgId = 0;
function genId() { return `m-${++msgId}-${Date.now()}`; }

function makeInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0] || "")
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function formatLastTime(ts?: number) {
  if (!ts) return "";
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

async function getAuthToken() {
  return AsyncStorage.getItem(SESSION_TOKEN_KEY);
}

function sortConversations(items: Conversation[]) {
  return [...items].sort((a, b) => (b.lastTs ?? 0) - (a.lastTs ?? 0));
}

function Bubble({ msg, primaryColor, cardColor, textColor, borderColor }: {
  msg: ChatMessage; primaryColor: string; cardColor: string; textColor: string; borderColor: string;
}) {
  const isMe = msg.role === "user";
  const time = new Date(msg.ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  return (
    <View style={[bStyle.row, isMe ? bStyle.right : bStyle.left]}>
      <View style={[bStyle.bubble, isMe
        ? { backgroundColor: primaryColor }
        : { backgroundColor: cardColor, borderWidth: 1, borderColor }
      ]}>
        <Text style={[bStyle.text, { color: isMe ? "#fff" : textColor }]}>{msg.content}</Text>
        <Text style={[bStyle.time, { color: isMe ? "rgba(255,255,255,0.6)" : borderColor }]}>{time}</Text>
      </View>
    </View>
  );
}

const bStyle = StyleSheet.create({
  row: { paddingHorizontal: 14, marginBottom: 6 },
  right: { alignItems: "flex-end" },
  left: { alignItems: "flex-start" },
  bubble: { maxWidth: "80%", borderRadius: 18, paddingHorizontal: 14, paddingVertical: 9 },
  text: { fontSize: 15, fontFamily: "Nunito_400Regular", lineHeight: 22 },
  time: { fontSize: 10, fontFamily: "Nunito_400Regular", marginTop: 4, textAlign: "right" },
});

function FriendChatModal({ visible, conversation, onClose, onMessagesSync, colors, insets }: {
  visible: boolean;
  conversation: Conversation | null;
  onClose: (msgs: ChatMessage[]) => void;
  onMessagesSync: (conversationId: string, msgs: ChatMessage[]) => void;
  colors: typeof Colors.dark;
  insets: { bottom: number };
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(conversation?.messages || []);
  const [input, setInput] = useState("");
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (!conversation) {
      return;
    }

    let active = true;
    setMessages(conversation.messages);

    const loadMessages = async () => {
      const token = await getAuthToken();
      if (!token) {
        return;
      }

      const response = await fetch(new URL(`/api/messages/conversations/${conversation.id}/messages`, getApiUrl()).toString(), {
        headers: { Authorization: `Bearer ${token}` },
      });

      const payload = await response.json().catch(() => null);
      if (active && response.ok && Array.isArray(payload?.messages)) {
        const nextMessages = payload.messages as ChatMessage[];
        setMessages(nextMessages);
        onMessagesSync(conversation.id, nextMessages);
      }
    };

    void loadMessages();
    const intervalId = setInterval(() => {
      void loadMessages();
    }, 3000);

    return () => {
      active = false;
      clearInterval(intervalId);
    };
  }, [conversation, onMessagesSync]);

  if (!conversation) return null;

  const handleSend = async () => {
    const text = input.trim();
    if (!text) return;
    const token = await getAuthToken();
    if (!token) {
      return;
    }

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const response = await fetch(new URL(`/api/messages/conversations/${conversation.id}/messages`, getApiUrl()).toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ content: text }),
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.message) {
      return;
    }

    setInput("");
    setMessages((prev) => {
      const nextMessages = [...prev, payload.message as ChatMessage];
      onMessagesSync(conversation.id, nextMessages);
      return nextMessages;
    });
  };

  const reversed = [...messages].reverse();
  const topPad = Platform.OS === "web" ? 67 : 54;
  const botPad = Platform.OS === "web" ? 34 : Math.max(insets.bottom, 10);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <View style={[fcStyle.container, { backgroundColor: colors.background }]}>
        <View style={[fcStyle.header, { paddingTop: topPad, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
          <Pressable onPress={() => onClose(messages)} style={fcStyle.backBtn}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </Pressable>
          <View style={[fcStyle.avatar, { backgroundColor: conversation.avatarColor }]}>
            <Text style={fcStyle.initials}>{conversation.initials}</Text>
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[fcStyle.name, { color: colors.text }]}>{conversation.name}</Text>
            <Text style={[fcStyle.sub, { color: colors.muted }]}>
              {conversation.isOnline ? "Online" : "Offline"}
              {conversation.nativeLanguage ? ` · ${conversation.nativeLanguage} speaker` : ""}
            </Text>
          </View>
          <Pressable style={fcStyle.moreBtn}>
            <Ionicons name="ellipsis-horizontal" size={20} color={colors.muted} />
          </Pressable>
        </View>

        <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding" keyboardVerticalOffset={0}>
          <FlatList
            style={{ flex: 1 }}
            data={reversed}
            keyExtractor={(m) => m.id}
            inverted={messages.length > 0}
            renderItem={({ item }) => (
              <Bubble msg={item} primaryColor={colors.primary} cardColor={colors.card} textColor={colors.text} borderColor={colors.border} />
            )}
            contentContainerStyle={{ paddingVertical: 12, flexGrow: 1 }}
            keyboardDismissMode="interactive"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
            ListEmptyComponent={
              <View style={fcStyle.emptyWrap}>
                <Text style={[fcStyle.emptyText, { color: colors.muted }]}>Start your conversation here.</Text>
              </View>
            }
          />
          <View style={[fcStyle.inputBar, { backgroundColor: colors.background, borderTopColor: colors.border, paddingBottom: botPad }]}>
            <TextInput
              ref={inputRef}
              value={input}
              onChangeText={setInput}
              placeholder="Message..."
              placeholderTextColor={colors.muted}
              style={[fcStyle.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
              multiline
              maxLength={500}
            />
            <Pressable
              onPress={handleSend}
              disabled={!input.trim()}
              style={[fcStyle.sendBtn, { backgroundColor: input.trim() ? colors.primary : colors.border }]}
            >
              <Ionicons name="arrow-up" size={20} color="#fff" />
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const fcStyle = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1,
  },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  avatar: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  initials: { color: "#fff", fontSize: 14, fontFamily: "Nunito_700Bold" },
  name: { fontSize: 15, fontFamily: "Nunito_700Bold" },
  sub: { fontSize: 11, fontFamily: "Nunito_400Regular", marginTop: 1 },
  moreBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  emptyWrap: { flex: 1, alignItems: "center", justifyContent: "center", padding: 40 },
  emptyText: { fontSize: 14, fontFamily: "Nunito_400Regular", textAlign: "center" },
  inputBar: {
    flexDirection: "row", alignItems: "flex-end", gap: 10,
    paddingHorizontal: 14, paddingTop: 10, borderTopWidth: 1,
  },
  input: {
    flex: 1, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10,
    fontSize: 15, fontFamily: "Nunito_400Regular", maxHeight: 100, borderWidth: 1,
  },
  sendBtn: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
});

function ConvRow({ conv, onPress, colors }: { conv: Conversation; onPress: () => void; colors: typeof Colors.dark }) {
  return (
    <Pressable
      onPress={onPress}
      style={({ pressed }) => [
        rowStyle.row,
        { borderBottomColor: colors.border, backgroundColor: pressed ? colors.card + "80" : "transparent" },
      ]}
    >
      <View style={{ position: "relative" }}>
        <View style={[rowStyle.avatar, { backgroundColor: conv.avatarColor }]}>
          <Text style={rowStyle.initials}>{conv.initials}</Text>
        </View>
        {conv.isOnline && <View style={[rowStyle.online, { borderColor: colors.background }]} />}
      </View>
      <View style={{ flex: 1 }}>
        <View style={rowStyle.topLine}>
          <Text style={[rowStyle.name, { color: colors.text }]} numberOfLines={1}>{conv.name}</Text>
          <Text style={[rowStyle.time, { color: colors.muted }]}>{conv.lastTime}</Text>
        </View>
        <Text style={[rowStyle.last, { color: colors.muted }]} numberOfLines={1}>{conv.lastMessage || "No messages yet"}</Text>
      </View>
      {conv.unread > 0 && (
        <View style={[rowStyle.badge, { backgroundColor: colors.primary }]}>
          <Text style={rowStyle.badgeText}>{conv.unread}</Text>
        </View>
      )}
    </Pressable>
  );
}

const rowStyle = StyleSheet.create({
  row: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 16, paddingVertical: 13, borderBottomWidth: 0.5,
  },
  avatar: { width: 50, height: 50, borderRadius: 25, alignItems: "center", justifyContent: "center" },
  initials: { color: "#fff", fontSize: 16, fontFamily: "Nunito_700Bold" },
  online: {
    position: "absolute", bottom: 1, right: 1,
    width: 13, height: 13, borderRadius: 6.5,
    backgroundColor: "#6BCB77", borderWidth: 2,
  },
  topLine: { flexDirection: "row", justifyContent: "space-between", alignItems: "center", marginBottom: 3 },
  name: { fontSize: 15, fontFamily: "Nunito_700Bold", flex: 1 },
  time: { fontSize: 11, fontFamily: "Nunito_400Regular" },
  last: { fontSize: 13, fontFamily: "Nunito_400Regular" },
  badge: { minWidth: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center", paddingHorizontal: 5 },
  badgeText: { color: "#fff", fontSize: 11, fontFamily: "Nunito_700Bold" },
});

function AddUserModal({
  visible,
  colors,
  users,
  search,
  onSearchChange,
  onClose,
  onSelectUser,
  isLoading,
}: {
  visible: boolean;
  colors: typeof Colors.dark;
  users: DiscoverUser[];
  search: string;
  onSearchChange: (value: string) => void;
  onClose: () => void;
  onSelectUser: (user: DiscoverUser) => void;
  isLoading: boolean;
}) {
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="pageSheet" onRequestClose={onClose}>
      <View style={[addStyle.container, { backgroundColor: colors.background }]}>
        <View style={[addStyle.header, { borderBottomColor: colors.border }]}>
          <Text style={[addStyle.title, { color: colors.text }]}>Add User</Text>
          <Pressable onPress={onClose} style={addStyle.closeBtn}>
            <Ionicons name="close" size={22} color={colors.text} />
          </Pressable>
        </View>

        <View style={[addStyle.searchWrap, { backgroundColor: colors.card + "CC", borderColor: colors.border + "88" }]}>
          <Ionicons name="search" size={16} color={colors.muted} />
          <TextInput
            value={search}
            onChangeText={onSearchChange}
            placeholder="Search users..."
            placeholderTextColor={colors.muted}
            style={[addStyle.searchInput, { color: colors.text }]}
          />
        </View>

        <FlatList
          data={users}
          keyExtractor={(item) => item.id}
          renderItem={({ item }) => (
            <Pressable
              onPress={() => onSelectUser(item)}
              style={({ pressed }) => [
                addStyle.userRow,
                { borderBottomColor: colors.border, backgroundColor: pressed ? colors.card + "80" : "transparent" },
              ]}
            >
              <View style={[addStyle.avatar, { backgroundColor: item.avatarColor || colors.primary }]}>
                <Text style={addStyle.avatarText}>{makeInitials(item.displayName)}</Text>
              </View>
              <View style={{ flex: 1 }}>
                <Text style={[addStyle.userName, { color: colors.text }]}>{item.displayName}</Text>
                <Text style={[addStyle.userSub, { color: colors.muted }]}>
                  {item.nativeLanguage || "Learner"}
                  {item.learningLanguages?.[0] ? ` · learning ${item.learningLanguages[0]}` : ""}
                </Text>
              </View>
              <Ionicons name="add-circle-outline" size={22} color={colors.primary} />
            </Pressable>
          )}
          ListEmptyComponent={
            <View style={addStyle.emptyWrap}>
              <Ionicons name={isLoading ? "hourglass-outline" : "people-outline"} size={34} color={colors.muted} />
              <Text style={[addStyle.emptyText, { color: colors.muted }]}>
                {isLoading ? "Loading users..." : "No users found."}
              </Text>
            </View>
          }
        />
      </View>
    </Modal>
  );
}

const addStyle = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    paddingTop: Platform.OS === "web" ? 24 : 56,
    paddingBottom: 14,
    borderBottomWidth: 1,
  },
  title: { fontSize: 22, fontFamily: "Nunito_800ExtraBold" },
  closeBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  searchWrap: {
    flexDirection: "row", alignItems: "center", gap: 8,
    marginHorizontal: 16, marginTop: 14, marginBottom: 8, borderRadius: 12, borderWidth: 1,
    paddingHorizontal: 12, paddingVertical: 9,
  },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "Nunito_400Regular" },
  userRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    paddingHorizontal: 16,
    paddingVertical: 13,
    borderBottomWidth: 0.5,
  },
  avatar: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center" },
  avatarText: { color: "#fff", fontSize: 15, fontFamily: "Nunito_700Bold" },
  userName: { fontSize: 15, fontFamily: "Nunito_700Bold" },
  userSub: { fontSize: 12, fontFamily: "Nunito_400Regular", marginTop: 2 },
  emptyWrap: { paddingTop: 80, alignItems: "center", gap: 10 },
  emptyText: { fontSize: 14, fontFamily: "Nunito_400Regular" },
});

export default function MessagesScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { refreshTick, setActiveConversationId } = useMessaging();

  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [openConv, setOpenConv] = useState<Conversation | null>(null);
  const [search, setSearch] = useState("");
  const [showAddUser, setShowAddUser] = useState(false);
  const [discoverUsers, setDiscoverUsers] = useState<DiscoverUser[]>([]);
  const [discoverSearch, setDiscoverSearch] = useState("");
  const [isDiscoverLoading, setIsDiscoverLoading] = useState(false);

  const topInset = Platform.OS === "web" ? 67 : insets.top;

  const loadConversations = useCallback(async () => {
    const token = await getAuthToken();
    if (!token) {
      return;
    }

    const response = await fetch(new URL("/api/messages/conversations", getApiUrl()).toString(), {
      headers: { Authorization: `Bearer ${token}` },
    });

    const payload = await response.json().catch(() => null);
    if (response.ok && Array.isArray(payload?.conversations)) {
      setConversations((current) => {
        const messageCache = new Map(current.map((item) => [item.id, item.messages]));
        return sortConversations((payload.conversations as Conversation[]).map((item) => ({
          ...item,
          messages: messageCache.get(item.id) ?? [],
        })));
      });
    }
  }, []);

  useEffect(() => {
    if (!user) {
      setConversations([]);
      return;
    }

    let active = true;
    const refresh = async () => {
      if (!active) {
        return;
      }
      await loadConversations();
    };

    void refresh();
    const intervalId = setInterval(() => {
      void refresh();
    }, 4000);

    return () => {
      active = false;
      clearInterval(intervalId);
    };
  }, [loadConversations, user]);

  useEffect(() => {
    if (!user) {
      return;
    }
    void loadConversations();
  }, [loadConversations, refreshTick, user]);

  const filteredConversations = search
    ? sortConversations(conversations.filter((c) => c.name.toLowerCase().includes(search.toLowerCase())))
    : sortConversations(conversations);

  const filteredDiscoverUsers = useMemo(() => {
    const query = discoverSearch.trim().toLowerCase();
    if (!query) {
      return discoverUsers;
    }

    return discoverUsers.filter((candidate) =>
      candidate.displayName.toLowerCase().includes(query),
    );
  }, [discoverSearch, discoverUsers]);

  const loadDiscoverUsers = useCallback(async () => {
    setIsDiscoverLoading(true);
    try {
      const token = await AsyncStorage.getItem(SESSION_TOKEN_KEY);
      if (!token) {
        setDiscoverUsers([]);
        return;
      }

      const response = await fetch(new URL("/api/users", getApiUrl()).toString(), {
        headers: { Authorization: `Bearer ${token}` },
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok || !Array.isArray(payload?.users)) {
        setDiscoverUsers([]);
        return;
      }

      setDiscoverUsers(payload.users as DiscoverUser[]);
    } catch {
      setDiscoverUsers([]);
    } finally {
      setIsDiscoverLoading(false);
    }
  }, []);

  const handleOpenAddUser = useCallback(() => {
    setShowAddUser(true);
    void loadDiscoverUsers();
  }, [loadDiscoverUsers]);

  const handleClose = (msgs: ChatMessage[], conv: Conversation) => {
    setConversations((prev) => sortConversations(prev.map((c) => c.id === conv.id
      ? {
          ...c,
          messages: msgs,
          lastMessage: msgs[msgs.length - 1]?.content || c.lastMessage,
          lastTs: msgs[msgs.length - 1]?.ts ?? c.lastTs,
          unread: 0,
          lastTime: formatLastTime(msgs[msgs.length - 1]?.ts) || c.lastTime,
        }
      : c)));
    setOpenConv(null);
  };

  const handleMessagesSync = useCallback((conversationId: string, msgs: ChatMessage[]) => {
    setConversations((prev) => sortConversations(prev.map((item) => item.id === conversationId
      ? {
          ...item,
          messages: msgs,
          lastMessage: msgs[msgs.length - 1]?.content || item.lastMessage,
          lastTs: msgs[msgs.length - 1]?.ts ?? item.lastTs,
          unread: 0,
          lastTime: formatLastTime(msgs[msgs.length - 1]?.ts) || item.lastTime,
        }
      : item)));
  }, []);

  const handleSelectUser = (selectedUser: DiscoverUser) => {
    void (async () => {
      const existingConversation = conversations.find((conversation) => conversation.userId === selectedUser.id);
      if (existingConversation) {
        setShowAddUser(false);
        setDiscoverSearch("");
        setOpenConv(existingConversation);
        return;
      }

      const token = await getAuthToken();
      if (!token) {
        return;
      }

      const response = await fetch(new URL("/api/messages/conversations/direct", getApiUrl()).toString(), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ targetUserId: selectedUser.id }),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.conversation) {
        return;
      }

      const nextConversation: Conversation = {
        ...(payload.conversation as Conversation),
        messages: [],
      };

      setConversations((prev) => sortConversations([nextConversation, ...prev.filter((item) => item.id !== nextConversation.id)]));
      setShowAddUser(false);
      setDiscoverSearch("");
      setOpenConv(nextConversation);
    })();
  };

  useEffect(() => {
    if (!openConv) {
      setActiveConversationId(null);
      return;
    }

    setActiveConversationId(openConv.id);
    const latestConversation = conversations.find((item) => item.id === openConv.id);
    if (latestConversation) {
      setOpenConv(latestConversation);
    }
    return () => {
      setActiveConversationId(null);
    };
  }, [conversations, openConv, setActiveConversationId]);

  return (
    <View style={[mainStyle.container, { backgroundColor: colors.background }]}>
      <ScreenBackdrop
        primaryColor={colors.primary + "16"}
        secondaryColor={colors.gold + "12"}
      />

      <View style={[mainStyle.header, { paddingTop: topInset + 12 }]}>
        <Text style={[mainStyle.title, { color: colors.text }]}>Messages</Text>
        <Pressable
          onPress={handleOpenAddUser}
          style={[mainStyle.composeBtn, { backgroundColor: colors.card + "CC", borderColor: colors.border + "88" }]}
        >
          <Ionicons name="add" size={22} color={colors.text} />
        </Pressable>
      </View>

      <View style={[mainStyle.searchWrap, { backgroundColor: colors.card + "CC", borderColor: colors.border + "88" }]}>
        <Ionicons name="search" size={16} color={colors.muted} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search messages..."
          placeholderTextColor={colors.muted}
          style={[mainStyle.searchInput, { color: colors.text }]}
        />
      </View>

      <FlatList
        data={filteredConversations}
        keyExtractor={(c) => c.id}
        renderItem={({ item }) => (
          <ConvRow
            conv={item}
            colors={colors}
            onPress={() => {
              setConversations((prev) => prev.map((c) => c.id === item.id ? { ...c, unread: 0 } : c));
              setOpenConv(item);
            }}
          />
        )}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Platform.OS === "web" ? 34 : 80 }}
        ListEmptyComponent={
          <View style={mainStyle.empty}>
            <Ionicons name="chatbubbles-outline" size={40} color={colors.muted} />
            <Text style={[mainStyle.emptyText, { color: colors.muted }]}>
              {user ? "No conversations yet" : "Sign in first to start messaging"}
            </Text>
            {user && (
              <Pressable
                onPress={handleOpenAddUser}
                style={[mainStyle.emptyBtn, { backgroundColor: colors.card + "CC", borderColor: colors.border + "88" }]}
              >
                <Ionicons name="person-add-outline" size={16} color={colors.primary} />
                <Text style={[mainStyle.emptyBtnText, { color: colors.primary }]}>Add User</Text>
              </Pressable>
            )}
          </View>
        }
      />

      <AddUserModal
        visible={showAddUser}
        colors={colors}
        users={filteredDiscoverUsers}
        search={discoverSearch}
        onSearchChange={setDiscoverSearch}
        onClose={() => setShowAddUser(false)}
        onSelectUser={handleSelectUser}
        isLoading={isDiscoverLoading}
      />

      {openConv && (
        <FriendChatModal
          visible={!!openConv}
          conversation={openConv}
          onClose={(msgs) => handleClose(msgs, openConv)}
          onMessagesSync={handleMessagesSync}
          colors={colors}
          insets={{ bottom: insets.bottom }}
        />
      )}
    </View>
  );
}

const mainStyle = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 20, paddingBottom: 10,
  },
  title: { fontSize: 30, fontFamily: "Nunito_800ExtraBold", letterSpacing: 0.2 },
  composeBtn: {
    width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center",
    borderWidth: 1, shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.06, shadowRadius: 14, elevation: 3,
  },
  searchWrap: {
    flexDirection: "row", alignItems: "center", gap: 8,
    marginHorizontal: 16, marginBottom: 8, borderRadius: 12, borderWidth: 1,
    paddingHorizontal: 12, paddingVertical: 9,
    shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.04, shadowRadius: 12, elevation: 2,
  },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "Nunito_400Regular" },
  empty: { alignItems: "center", paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 14, fontFamily: "Nunito_400Regular" },
  emptyBtn: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  emptyBtnText: { fontSize: 13, fontFamily: "Nunito_700Bold" },
});
