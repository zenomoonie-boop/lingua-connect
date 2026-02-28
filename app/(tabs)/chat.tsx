import React, { useState, useRef, useCallback, useEffect } from "react";
import {
  View, Text, FlatList, TextInput, Pressable,
  StyleSheet, useColorScheme, Platform, Modal, Image,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { LANGUAGES } from "@/data/lessons";
import { useAuth } from "@/context/AuthContext";
import { fetch } from "expo/fetch";
import { getApiUrl } from "@/lib/query-client";
import * as Haptics from "expo-haptics";

// ─── Types ────────────────────────────────────────────────────────────────────

type ChatMessage = {
  id: string;
  role: "user" | "assistant" | "them";
  content: string;
  ts: number;
};

type Conversation = {
  id: string;
  name: string;
  avatarColor: string;
  initials: string;
  isAI: boolean;
  nativeLanguage?: string;
  learningLanguage?: string;
  lastMessage: string;
  lastTime: string;
  unread: number;
  isOnline: boolean;
  messages: ChatMessage[];
};

let msgId = 0;
function genId() { return `m-${++msgId}-${Date.now()}`; }

const FRIEND_REPLIES: Record<string, string[]> = {
  maria: [
    "Haha yes! I know what you mean.",
    "That's so interesting! I never thought about it that way.",
    "Can you help me with this sentence? 'I am very excited for tomorrow'",
    "I practiced speaking with my teacher today. It felt great!",
    "Your English is improving so fast!",
  ],
  jun: [
    "Same here! 😊 Let's study together sometime.",
    "Have you tried the voice rooms? They really help.",
    "I made a mistake earlier saying 'I am agree' — should be 'I agree' haha",
    "Which lesson are you on now?",
    "Let's do a voice room session this weekend!",
  ],
  sofia: [
    "Yes! I use HelloTalk and LinguaConnect every day now.",
    "My English teacher corrected me too. So embarrassing but helpful!",
    "What's your native language?",
    "I'm from Brazil. Portuguese is my first language.",
    "The AI chat here is amazing for practice.",
  ],
};

const INITIAL_CONVERSATIONS: Conversation[] = [
  {
    id: "ai",
    name: "AI English Tutor",
    avatarColor: "#FF6B35",
    initials: "AI",
    isAI: true,
    lastMessage: "Hello! I'm your AI language tutor. Let's practice!",
    lastTime: "now",
    unread: 1,
    isOnline: true,
    messages: [
      { id: "ai-0", role: "assistant", content: "Hello! I'm your AI English tutor. I'm here to help you practice speaking and writing naturally. What would you like to work on today?", ts: Date.now() - 60000 },
    ],
  },
  {
    id: "maria",
    name: "Maria Santos",
    avatarColor: "#4ECDC4",
    initials: "MS",
    isAI: false,
    nativeLanguage: "Filipino",
    learningLanguage: "English",
    lastMessage: "Your English is improving so fast!",
    lastTime: "2m",
    unread: 2,
    isOnline: true,
    messages: [
      { id: "m1", role: "them", content: "Hi! I saw your moment post. Really good English!", ts: Date.now() - 300000 },
      { id: "m2", role: "user", content: "Thank you! I practiced a lot this week.", ts: Date.now() - 280000 },
      { id: "m3", role: "them", content: "Your English is improving so fast!", ts: Date.now() - 120000 },
    ],
  },
  {
    id: "jun",
    name: "Park Jun",
    avatarColor: "#8B7CF6",
    initials: "PJ",
    isAI: false,
    nativeLanguage: "Korean",
    learningLanguage: "English",
    lastMessage: "Let's do a voice room session this weekend!",
    lastTime: "1h",
    unread: 0,
    isOnline: true,
    messages: [
      { id: "j1", role: "them", content: "Hey! Are you joining the voice room today?", ts: Date.now() - 3600000 },
      { id: "j2", role: "user", content: "Yes! See you there at 8pm.", ts: Date.now() - 3500000 },
      { id: "j3", role: "them", content: "Let's do a voice room session this weekend!", ts: Date.now() - 3400000 },
    ],
  },
  {
    id: "sofia",
    name: "Sofia Lima",
    avatarColor: "#F7C948",
    initials: "SL",
    isAI: false,
    nativeLanguage: "Portuguese",
    learningLanguage: "English",
    lastMessage: "The AI chat here is amazing for practice.",
    lastTime: "3h",
    unread: 0,
    isOnline: false,
    messages: [
      { id: "s1", role: "them", content: "Hi! I'm also learning English. Can we be language partners?", ts: Date.now() - 10800000 },
      { id: "s2", role: "user", content: "Of course! I'd love that.", ts: Date.now() - 10700000 },
      { id: "s3", role: "them", content: "The AI chat here is amazing for practice.", ts: Date.now() - 10600000 },
    ],
  },
];

// ─── Bubble ───────────────────────────────────────────────────────────────────

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

// ─── AI Chat Screen ───────────────────────────────────────────────────────────

function AIChatModal({ visible, onClose, colors, insets }: {
  visible: boolean; onClose: (msgs: ChatMessage[]) => void; colors: typeof Colors.dark; insets: { bottom: number };
}) {
  const [messages, setMessages] = useState<ChatMessage[]>([
    { id: "ai-0", role: "assistant", content: "Hello! I'm your AI English tutor. I'm here to help you practice speaking and writing naturally. What would you like to work on today?", ts: Date.now() - 60000 },
  ]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [showTyping, setShowTyping] = useState(false);
  const [selectedLang, setSelectedLang] = useState("en");
  const [showLangPicker, setShowLangPicker] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const lang = LANGUAGES.find(l => l.code === selectedLang) || LANGUAGES[0];

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isStreaming) return;
    setInput("");
    setShowLangPicker(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const snap = [...messages];
    const userMsg: ChatMessage = { id: genId(), role: "user", content: text, ts: Date.now() };
    setMessages(prev => [...prev, userMsg]);
    setIsStreaming(true);
    setShowTyping(true);

    try {
      const baseUrl = getApiUrl();
      const history = [
        ...snap.map(m => ({ role: m.role === "them" ? "user" : m.role, content: m.content })),
        { role: "user", content: text },
      ];

      const response = await fetch(`${baseUrl}api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
        body: JSON.stringify({ messages: history, language: selectedLang, languageName: lang.name }),
      });

      if (!response.ok) throw new Error("Failed");
      const reader = response.body?.getReader();
      if (!reader) throw new Error("No body");

      const decoder = new TextDecoder();
      let full = "";
      let buffer = "";
      let added = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          if (data === "[DONE]") continue;
          try {
            const parsed = JSON.parse(data);
            if (parsed.content) {
              full += parsed.content;
              if (!added) {
                setShowTyping(false);
                setMessages(prev => [...prev, { id: genId(), role: "assistant", content: full, ts: Date.now() }]);
                added = true;
              } else {
                setMessages(prev => {
                  const u = [...prev];
                  u[u.length - 1] = { ...u[u.length - 1], content: full };
                  return u;
                });
              }
            }
          } catch {}
        }
      }
    } catch {
      setShowTyping(false);
      setMessages(prev => [...prev, {
        id: genId(), role: "assistant",
        content: "Sorry, I had trouble connecting. Please try again.",
        ts: Date.now(),
      }]);
    } finally {
      setIsStreaming(false);
      setShowTyping(false);
    }
  }, [input, isStreaming, messages, selectedLang, lang]);

  const reversed = [...messages].reverse();
  const topPad = Platform.OS === "web" ? 67 : 54;
  const botPad = Platform.OS === "web" ? 34 : Math.max(insets.bottom, 10);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <View style={[aiStyle.container, { backgroundColor: colors.background }]}>
        {/* Header */}
        <View style={[aiStyle.header, { paddingTop: topPad, backgroundColor: colors.background, borderBottomColor: colors.border }]}>
          <Pressable onPress={() => onClose(messages)} style={aiStyle.backBtn}>
            <Ionicons name="chevron-back" size={22} color={colors.text} />
          </Pressable>
          <View style={[aiStyle.aiAvatar, { backgroundColor: "#FF6B35" }]}>
            <Ionicons name="sparkles" size={16} color="#fff" />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[aiStyle.headerName, { color: colors.text }]}>AI English Tutor</Text>
            <Pressable onPress={() => setShowLangPicker(v => !v)} style={aiStyle.langRow}>
              <View style={[aiStyle.langDot, { backgroundColor: lang.color }]} />
              <Text style={[aiStyle.langSub, { color: colors.muted }]}>Practicing: {lang.name}</Text>
              <Ionicons name={showLangPicker ? "chevron-up" : "chevron-down"} size={12} color={colors.muted} />
            </Pressable>
          </View>
          <Pressable
            onPress={() => { setMessages([{ id: genId(), role: "assistant", content: "Hello! I'm your AI English tutor. I'm here to help you practice. What would you like to work on today?", ts: Date.now() }]); }}
            style={[aiStyle.clearBtn, { borderColor: colors.border }]}
          >
            <Ionicons name="refresh" size={16} color={colors.muted} />
          </Pressable>
        </View>

        {/* Lang picker */}
        {showLangPicker && (
          <View style={[aiStyle.picker, { backgroundColor: colors.card, borderColor: colors.border }]}>
            {LANGUAGES.map(l => (
              <Pressable
                key={l.code}
                onPress={() => { setSelectedLang(l.code); setShowLangPicker(false); }}
                style={[aiStyle.pickerItem, { borderBottomColor: colors.border }, selectedLang === l.code && { backgroundColor: l.color + "15" }]}
              >
                <View style={[aiStyle.pickDot, { backgroundColor: l.color }]} />
                <Text style={[aiStyle.pickText, { color: selectedLang === l.code ? l.color : colors.text }]}>{l.name}</Text>
                {selectedLang === l.code && <Ionicons name="checkmark-circle" size={16} color={l.color} />}
              </Pressable>
            ))}
          </View>
        )}

        <KeyboardAvoidingView style={{ flex: 1 }} behavior="padding" keyboardVerticalOffset={0}>
          <FlatList
            style={{ flex: 1 }}
            data={reversed}
            keyExtractor={m => m.id}
            inverted={messages.length > 0}
            renderItem={({ item }) => (
              <Bubble msg={item} primaryColor={colors.primary} cardColor={colors.card} textColor={colors.text} borderColor={colors.border} />
            )}
            ListHeaderComponent={showTyping ? (
              <View style={[bStyle.row, bStyle.left]}>
                <View style={[bStyle.bubble, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }]}>
                  <Text style={[bStyle.text, { color: colors.muted }]}>typing...</Text>
                </View>
              </View>
            ) : null}
            ListEmptyComponent={
              <View style={aiStyle.emptyWrap}>
                <Text style={[aiStyle.emptyText, { color: colors.muted }]}>Send a message to start practicing!</Text>
              </View>
            }
            contentContainerStyle={{ paddingVertical: 12, flexGrow: 1 }}
            keyboardDismissMode="interactive"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
          />
          <View style={[aiStyle.inputBar, { backgroundColor: colors.background, borderTopColor: colors.border, paddingBottom: botPad }]}>
            <TextInput
              ref={inputRef}
              value={input}
              onChangeText={setInput}
              placeholder={`Type in ${lang.name}...`}
              placeholderTextColor={colors.muted}
              style={[aiStyle.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
              multiline
              maxLength={500}
            />
            <Pressable
              onPress={handleSend}
              disabled={!input.trim() || isStreaming}
              style={[aiStyle.sendBtn, { backgroundColor: input.trim() && !isStreaming ? lang.color : colors.border }]}
            >
              <Ionicons name={isStreaming ? "hourglass" : "arrow-up"} size={20} color="#fff" />
            </Pressable>
          </View>
        </KeyboardAvoidingView>
      </View>
    </Modal>
  );
}

const aiStyle = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1,
  },
  backBtn: { width: 36, height: 36, alignItems: "center", justifyContent: "center" },
  aiAvatar: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  headerName: { fontSize: 15, fontFamily: "Nunito_700Bold" },
  langRow: { flexDirection: "row", alignItems: "center", gap: 4, marginTop: 1 },
  langDot: { width: 7, height: 7, borderRadius: 3.5 },
  langSub: { fontSize: 11, fontFamily: "Nunito_400Regular" },
  clearBtn: { width: 34, height: 34, borderRadius: 17, borderWidth: 1, alignItems: "center", justifyContent: "center" },
  picker: {
    marginHorizontal: 14, borderRadius: 12, borderWidth: 1,
    overflow: "hidden", marginBottom: 4, zIndex: 20,
  },
  pickerItem: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 14, paddingVertical: 11, borderBottomWidth: 0.5,
  },
  pickDot: { width: 9, height: 9, borderRadius: 4.5 },
  pickText: { flex: 1, fontSize: 14, fontFamily: "Nunito_600SemiBold" },
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

// ─── Friend Chat Modal ────────────────────────────────────────────────────────

function FriendChatModal({ visible, conversation, onClose, colors, insets }: {
  visible: boolean;
  conversation: Conversation | null;
  onClose: (msgs: ChatMessage[]) => void;
  colors: typeof Colors.dark;
  insets: { bottom: number };
}) {
  const [messages, setMessages] = useState<ChatMessage[]>(conversation?.messages || []);
  const [input, setInput] = useState("");
  const inputRef = useRef<TextInput>(null);

  useEffect(() => {
    if (conversation) setMessages(conversation.messages);
  }, [conversation?.id]);

  if (!conversation) return null;

  const replyBank = FRIEND_REPLIES[conversation.id] || [
    "Thanks for the message!",
    "That's great to hear!",
    "Let's keep practicing together.",
  ];

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    setInput("");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    const userMsg: ChatMessage = { id: genId(), role: "user", content: text, ts: Date.now() };
    setMessages(prev => [...prev, userMsg]);

    setTimeout(() => {
      const reply = replyBank[Math.floor(Math.random() * replyBank.length)];
      setMessages(prev => [...prev, { id: genId(), role: "them", content: reply, ts: Date.now() }]);
    }, 1200 + Math.random() * 1000);
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
              {conversation.isOnline ? "Online" : "Offline"} · {conversation.nativeLanguage} speaker
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
            keyExtractor={m => m.id}
            inverted={messages.length > 0}
            renderItem={({ item }) => (
              <Bubble msg={item} primaryColor={colors.primary} cardColor={colors.card} textColor={colors.text} borderColor={colors.border} />
            )}
            contentContainerStyle={{ paddingVertical: 12, flexGrow: 1 }}
            keyboardDismissMode="interactive"
            keyboardShouldPersistTaps="handled"
            showsVerticalScrollIndicator={false}
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

// ─── Conversation Row ─────────────────────────────────────────────────────────

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
        {conv.isAI ? (
          <View style={[rowStyle.avatar, { backgroundColor: "#FF6B35" }]}>
            <Ionicons name="sparkles" size={18} color="#fff" />
          </View>
        ) : (
          <View style={[rowStyle.avatar, { backgroundColor: conv.avatarColor }]}>
            <Text style={rowStyle.initials}>{conv.initials}</Text>
          </View>
        )}
        {conv.isOnline && <View style={[rowStyle.online, { borderColor: colors.background }]} />}
      </View>
      <View style={{ flex: 1 }}>
        <View style={rowStyle.topLine}>
          <Text style={[rowStyle.name, { color: colors.text }]} numberOfLines={1}>
            {conv.name}
            {conv.isAI && <Text style={[rowStyle.aiTag, { color: "#FF6B35" }]}> AI</Text>}
          </Text>
          <Text style={[rowStyle.time, { color: colors.muted }]}>{conv.lastTime}</Text>
        </View>
        <Text style={[rowStyle.last, { color: colors.muted }]} numberOfLines={1}>{conv.lastMessage}</Text>
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
  aiTag: { fontSize: 12, fontFamily: "Nunito_600SemiBold" },
  time: { fontSize: 11, fontFamily: "Nunito_400Regular" },
  last: { fontSize: 13, fontFamily: "Nunito_400Regular" },
  badge: { minWidth: 20, height: 20, borderRadius: 10, alignItems: "center", justifyContent: "center", paddingHorizontal: 5 },
  badgeText: { color: "#fff", fontSize: 11, fontFamily: "Nunito_700Bold" },
});

// ─── Main Messages Screen ─────────────────────────────────────────────────────

export default function MessagesScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [conversations, setConversations] = useState<Conversation[]>(INITIAL_CONVERSATIONS);
  const [openConv, setOpenConv] = useState<Conversation | null>(null);
  const [showAI, setShowAI] = useState(false);
  const [search, setSearch] = useState("");

  const topInset = Platform.OS === "web" ? 67 : insets.top;

  const filtered = search
    ? conversations.filter(c => c.name.toLowerCase().includes(search.toLowerCase()))
    : conversations;

  const handleClose = (msgs: ChatMessage[], conv: Conversation) => {
    setConversations(prev => prev.map(c => c.id === conv.id
      ? { ...c, messages: msgs, lastMessage: msgs[msgs.length - 1]?.content || c.lastMessage, unread: 0, lastTime: "now" }
      : c
    ));
    setOpenConv(null);
    setShowAI(false);
  };

  return (
    <View style={[mainStyle.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[mainStyle.header, { paddingTop: topInset + 12 }]}>
        <Text style={[mainStyle.title, { color: colors.text }]}>Messages</Text>
        <Pressable style={[mainStyle.composeBtn, { backgroundColor: colors.card, borderColor: colors.border }]}>
          <Ionicons name="create-outline" size={20} color={colors.text} />
        </Pressable>
      </View>

      {/* Search */}
      <View style={[mainStyle.searchWrap, { backgroundColor: colors.card, borderColor: colors.border }]}>
        <Ionicons name="search" size={16} color={colors.muted} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search messages..."
          placeholderTextColor={colors.muted}
          style={[mainStyle.searchInput, { color: colors.text }]}
        />
      </View>

      {/* Conversations */}
      <FlatList
        data={filtered}
        keyExtractor={c => c.id}
        renderItem={({ item }) => (
          <ConvRow
            conv={item}
            colors={colors}
            onPress={() => {
              setConversations(prev => prev.map(c => c.id === item.id ? { ...c, unread: 0 } : c));
              if (item.isAI) { setShowAI(true); }
              else { setOpenConv(item); }
            }}
          />
        )}
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Platform.OS === "web" ? 34 : 80 }}
        ListEmptyComponent={
          <View style={mainStyle.empty}>
            <Ionicons name="chatbubbles-outline" size={40} color={colors.muted} />
            <Text style={[mainStyle.emptyText, { color: colors.muted }]}>No conversations yet</Text>
          </View>
        }
      />

      {/* AI Chat Modal */}
      <AIChatModal
        visible={showAI}
        onClose={(msgs) => {
          setConversations(prev => prev.map(c => c.id === "ai"
            ? { ...c, messages: msgs, lastMessage: msgs[msgs.length - 1]?.content || c.lastMessage, unread: 0, lastTime: "now" }
            : c
          ));
          setShowAI(false);
        }}
        colors={colors}
        insets={{ bottom: insets.bottom }}
      />

      {/* Friend Chat Modal */}
      {openConv && (
        <FriendChatModal
          visible={!!openConv}
          conversation={openConv}
          onClose={(msgs) => handleClose(msgs, openConv)}
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
  title: { fontSize: 26, fontFamily: "Nunito_800ExtraBold" },
  composeBtn: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  searchWrap: {
    flexDirection: "row", alignItems: "center", gap: 8,
    marginHorizontal: 16, marginBottom: 8, borderRadius: 12, borderWidth: 1,
    paddingHorizontal: 12, paddingVertical: 9,
  },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "Nunito_400Regular" },
  empty: { alignItems: "center", paddingTop: 80, gap: 12 },
  emptyText: { fontSize: 14, fontFamily: "Nunito_400Regular" },
});
