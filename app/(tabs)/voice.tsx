import React, { useState, useEffect, useRef } from "react";
import {
  View, Text, Pressable, StyleSheet, FlatList,
  ScrollView, useColorScheme, Platform, Modal,
  TextInput, Animated,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { LANGUAGES } from "@/data/lessons";
import { useAuth } from "@/context/AuthContext";
import * as Haptics from "expo-haptics";

// ─── Types ────────────────────────────────────────────────────────────────────

type RoomParticipant = {
  id: string;
  name: string;
  initials: string;
  color: string;
  role: "speaker" | "listener";
  isMuted: boolean;
  isSpeaking: boolean;
  nativeLanguage: string;
};

type VoiceRoom = {
  id: string;
  topic: string;
  language: string;
  languageCode: string;
  description: string;
  participants: RoomParticipant[];
  maxParticipants: number;
  level: "All Levels" | "Beginner" | "Intermediate" | "Advanced";
  tags: string[];
};

type RoomMessage = {
  id: string;
  sender: string;
  initials: string;
  color: string;
  text: string;
  ts: number;
};

const AVATAR_COLORS = [
  "#FF6B35", "#4ECDC4", "#45B7D1", "#8B7CF6", "#F7C948", "#6BCB77", "#FF4757", "#FF6B9D",
];

function makeInitials(name: string) {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

// ─── Room Data ────────────────────────────────────────────────────────────────

const SAMPLE_ROOMS: VoiceRoom[] = [
  {
    id: "r1", topic: "Daily English Conversation", language: "English", languageCode: "en",
    description: "Practice everyday English — talk about your day, hobbies, and current events.",
    level: "All Levels", tags: ["Casual", "Beginner-friendly"],
    maxParticipants: 12,
    participants: [
      { id: "u1", name: "Maria Santos", initials: "MS", color: "#FF6B35", role: "speaker", isMuted: false, isSpeaking: true, nativeLanguage: "Filipino" },
      { id: "u2", name: "Liam Chen", initials: "LC", color: "#4ECDC4", role: "speaker", isMuted: false, isSpeaking: false, nativeLanguage: "Mandarin" },
      { id: "u3", name: "Ana Reyes", initials: "AR", color: "#45B7D1", role: "listener", isMuted: true, isSpeaking: false, nativeLanguage: "Spanish" },
      { id: "u4", name: "Park Jun", initials: "PJ", color: "#8B7CF6", role: "listener", isMuted: true, isSpeaking: false, nativeLanguage: "Korean" },
      { id: "u5", name: "Fatima Ali", initials: "FA", color: "#F7C948", role: "speaker", isMuted: false, isSpeaking: false, nativeLanguage: "Arabic" },
    ],
  },
  {
    id: "r2", topic: "English Grammar Help", language: "English", languageCode: "en",
    description: "Ask grammar questions, get corrections, and practice speaking with helpful speakers.",
    level: "Beginner", tags: ["Grammar", "Q&A"],
    maxParticipants: 8,
    participants: [
      { id: "u6", name: "John Park", initials: "JP", color: "#6BCB77", role: "speaker", isMuted: false, isSpeaking: true, nativeLanguage: "English" },
      { id: "u7", name: "Yuki Tanaka", initials: "YT", color: "#FF4757", role: "listener", isMuted: true, isSpeaking: false, nativeLanguage: "Japanese" },
      { id: "u8", name: "Carlos Lima", initials: "CL", color: "#FF6B9D", role: "listener", isMuted: true, isSpeaking: false, nativeLanguage: "Portuguese" },
    ],
  },
  {
    id: "r3", topic: "Business English Practice", language: "English", languageCode: "en",
    description: "Work on professional vocabulary, presentations, emails, and business small talk.",
    level: "Intermediate", tags: ["Business", "Professional"],
    maxParticipants: 10,
    participants: [
      { id: "u9", name: "Sophie Martin", initials: "SM", color: "#FF6B35", role: "speaker", isMuted: false, isSpeaking: false, nativeLanguage: "French" },
      { id: "u10", name: "David Kim", initials: "DK", color: "#4ECDC4", role: "speaker", isMuted: false, isSpeaking: true, nativeLanguage: "Korean" },
      { id: "u11", name: "Nina Patel", initials: "NP", color: "#45B7D1", role: "listener", isMuted: true, isSpeaking: false, nativeLanguage: "Hindi" },
      { id: "u12", name: "Omar Hassan", initials: "OH", color: "#8B7CF6", role: "listener", isMuted: true, isSpeaking: false, nativeLanguage: "Arabic" },
      { id: "u13", name: "Emma Weber", initials: "EW", color: "#F7C948", role: "speaker", isMuted: false, isSpeaking: false, nativeLanguage: "German" },
    ],
  },
  {
    id: "r4", topic: "Spanish for Beginners", language: "Spanish", languageCode: "es",
    description: "Practice basic Spanish phrases and get help from native speakers.",
    level: "Beginner", tags: ["Spanish", "Casual"],
    maxParticipants: 8,
    participants: [
      { id: "u14", name: "Isabella Vega", initials: "IV", color: "#6BCB77", role: "speaker", isMuted: false, isSpeaking: true, nativeLanguage: "Spanish" },
      { id: "u15", name: "Alex Green", initials: "AG", color: "#FF4757", role: "listener", isMuted: true, isSpeaking: false, nativeLanguage: "English" },
    ],
  },
  {
    id: "r5", topic: "Japanese Conversation Club", language: "Japanese", languageCode: "ja",
    description: "Practice your Japanese with native and non-native speakers in a relaxed setting.",
    level: "Intermediate", tags: ["Japanese", "Anime", "Culture"],
    maxParticipants: 10,
    participants: [
      { id: "u16", name: "Hana Mori", initials: "HM", color: "#FF6B9D", role: "speaker", isMuted: false, isSpeaking: false, nativeLanguage: "Japanese" },
      { id: "u17", name: "Kevin Liu", initials: "KL", color: "#45B7D1", role: "listener", isMuted: true, isSpeaking: false, nativeLanguage: "Mandarin" },
      { id: "u18", name: "Sara Park", initials: "SP", color: "#8B7CF6", role: "listener", isMuted: true, isSpeaking: false, nativeLanguage: "Korean" },
    ],
  },
  {
    id: "r6", topic: "Pronunciation Workshop", language: "English", languageCode: "en",
    description: "Focus on clear pronunciation, accent reduction, and speaking confidence.",
    level: "All Levels", tags: ["Pronunciation", "Speaking"],
    maxParticipants: 6,
    participants: [
      { id: "u19", name: "Rachel Moore", initials: "RM", color: "#FF6B35", role: "speaker", isMuted: false, isSpeaking: true, nativeLanguage: "English" },
      { id: "u20", name: "Jin Ho", initials: "JH", color: "#4ECDC4", role: "listener", isMuted: true, isSpeaking: false, nativeLanguage: "Korean" },
      { id: "u21", name: "Priya Singh", initials: "PS", color: "#6BCB77", role: "listener", isMuted: true, isSpeaking: false, nativeLanguage: "Hindi" },
    ],
  },
];

// ─── Speaking Pulse ───────────────────────────────────────────────────────────

function SpeakingPulse({ color, active }: { color: string; active: boolean }) {
  const pulse = useRef(new Animated.Value(1)).current;
  const opacity = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (active) {
      const loop = Animated.loop(
        Animated.parallel([
          Animated.sequence([
            Animated.timing(pulse, { toValue: 1.4, duration: 700, useNativeDriver: Platform.OS !== "web" }),
            Animated.timing(pulse, { toValue: 1, duration: 700, useNativeDriver: Platform.OS !== "web" }),
          ]),
          Animated.sequence([
            Animated.timing(opacity, { toValue: 0.5, duration: 700, useNativeDriver: Platform.OS !== "web" }),
            Animated.timing(opacity, { toValue: 0, duration: 700, useNativeDriver: Platform.OS !== "web" }),
          ]),
        ])
      );
      loop.start();
      return () => { loop.stop(); pulse.setValue(1); opacity.setValue(0); };
    } else {
      pulse.setValue(1);
      opacity.setValue(0);
    }
  }, [active]);

  return (
    <Animated.View
      style={[
        StyleSheet.absoluteFillObject,
        { borderRadius: 40, backgroundColor: color, transform: [{ scale: pulse }], opacity },
      ]}
    />
  );
}

// ─── Participant Tile ─────────────────────────────────────────────────────────

function ParticipantTile({
  initials, color, name, nativeLang, isSpeaking, isMuted, size = 64,
}: {
  initials: string; color: string; name: string; nativeLang: string;
  isSpeaking: boolean; isMuted: boolean; size?: number;
}) {
  return (
    <View style={{ width: size + 24, alignItems: "center", gap: 5 }}>
      <View style={{ width: size, height: size, position: "relative", alignItems: "center", justifyContent: "center" }}>
        <SpeakingPulse color={color} active={isSpeaking} />
        <View style={[ptStyles.avatar, { width: size, height: size, borderRadius: size / 2, backgroundColor: color }]}>
          <Text style={[ptStyles.initials, { fontSize: size * 0.3 }]}>{initials}</Text>
        </View>
        {isMuted && !isSpeaking && (
          <View style={[ptStyles.badge, { backgroundColor: "#555" }]}>
            <Ionicons name="mic-off" size={9} color="#fff" />
          </View>
        )}
        {isSpeaking && (
          <View style={[ptStyles.badge, { backgroundColor: color }]}>
            <Ionicons name="mic" size={9} color="#fff" />
          </View>
        )}
      </View>
      <Text style={ptStyles.name} numberOfLines={1}>{name.split(" ")[0]}</Text>
      <Text style={ptStyles.sub} numberOfLines={1}>{nativeLang}</Text>
    </View>
  );
}

const ptStyles = StyleSheet.create({
  avatar: { alignItems: "center", justifyContent: "center" },
  initials: { color: "#fff", fontFamily: "Nunito_700Bold" },
  badge: {
    position: "absolute", bottom: 0, right: 0,
    width: 20, height: 20, borderRadius: 10, borderWidth: 2, borderColor: "#0F1117",
    alignItems: "center", justifyContent: "center",
  },
  name: { color: "#fff", fontFamily: "Nunito_600SemiBold", fontSize: 11, textAlign: "center" },
  sub: { color: "rgba(255,255,255,0.45)", fontSize: 10, fontFamily: "Nunito_400Regular", textAlign: "center" },
});

// ─── Room Modal (HelloTalk-style) ─────────────────────────────────────────────

function RoomModal({ room, user, onLeave, visible }: {
  room: VoiceRoom;
  user: { name: string; email: string } | null;
  onLeave: () => void;
  visible: boolean;
}) {
  const [isMuted, setIsMuted] = useState(true);
  const [isRaisedHand, setIsRaisedHand] = useState(false);
  const [role, setRole] = useState<"listener" | "speaker">("listener");
  const [showChat, setShowChat] = useState(false);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<RoomMessage[]>([
    { id: "c1", sender: "Maria Santos", initials: "MS", color: "#FF6B35", text: "Welcome everyone! Let's introduce ourselves.", ts: Date.now() - 120000 },
    { id: "c2", sender: "Liam Chen", initials: "LC", color: "#4ECDC4", text: "Hi! I'm from Shanghai. Nice to meet you all!", ts: Date.now() - 80000 },
    { id: "c3", sender: "Fatima Ali", initials: "FA", color: "#F7C948", text: "Hello! I want to improve my speaking for work.", ts: Date.now() - 30000 },
  ]);
  const [participants, setParticipants] = useState<RoomParticipant[]>(room.participants);
  const chatRef = useRef<ScrollView>(null);

  const lang = LANGUAGES.find(l => l.code === room.languageCode);
  const langColor = lang?.color || "#FF6B35";
  const myName = user?.name || "You";
  const myInitials = makeInitials(myName);
  const myColor = AVATAR_COLORS[myName.length % AVATAR_COLORS.length];

  const speakers = participants.filter(p => p.role === "speaker");
  const listeners = participants.filter(p => p.role === "listener");

  useEffect(() => {
    if (!visible) return;
    const interval = setInterval(() => {
      setParticipants(prev => prev.map(p => {
        if (p.role !== "speaker" || p.isMuted) return { ...p, isSpeaking: false };
        return { ...p, isSpeaking: Math.random() > 0.5 };
      }));
    }, 2800);
    return () => clearInterval(interval);
  }, [visible]);

  const handleSendChat = () => {
    if (!chatInput.trim()) return;
    const msg: RoomMessage = {
      id: `c-${Date.now()}`,
      sender: myName,
      initials: myInitials,
      color: myColor,
      text: chatInput.trim(),
      ts: Date.now(),
    };
    setChatMessages(prev => [...prev, msg]);
    setChatInput("");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTimeout(() => chatRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : Math.max(insets.bottom, 16);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <View style={rmStyles.container}>
        {/* Top bar */}
        <View style={[rmStyles.topBar, { paddingTop: topPad + 8 }]}>
          <View style={{ flex: 1 }}>
            <View style={rmStyles.langRow}>
              <View style={[rmStyles.dot, { backgroundColor: langColor }]} />
              <Text style={[rmStyles.langLabel, { color: langColor }]}>{room.language}</Text>
              <Text style={rmStyles.levelLabel}>{room.level}</Text>
            </View>
            <Text style={rmStyles.roomTitle} numberOfLines={2}>{room.topic}</Text>
          </View>
          <View style={{ flexDirection: "row", gap: 8, alignItems: "flex-start", marginTop: 4 }}>
            <Pressable
              onPress={() => setShowChat(v => !v)}
              style={[rmStyles.topBtn, showChat && { backgroundColor: langColor + "30" }]}
            >
              <Ionicons name="chatbubble-ellipses" size={18} color={showChat ? langColor : "rgba(255,255,255,0.5)"} />
            </Pressable>
          </View>
        </View>

        {/* Live indicator */}
        <View style={rmStyles.liveBadge}>
          <View style={rmStyles.liveDot} />
          <Text style={rmStyles.liveText}>{participants.length} in room</Text>
          <Text style={rmStyles.separator}>·</Text>
          <Text style={rmStyles.liveText}>{speakers.length} speakers</Text>
        </View>

        {/* Main content */}
        <View style={{ flex: 1, flexDirection: "row" }}>
          {/* Participant area */}
          <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 16 }}>
            {/* Speakers */}
            <View style={rmStyles.section}>
              <Text style={rmStyles.sectionTitle}>
                {"  "}SPEAKERS ({speakers.length + (role === "speaker" ? 1 : 0)})
              </Text>
              <View style={rmStyles.grid}>
                {role === "speaker" && (
                  <ParticipantTile
                    initials={myInitials} color={myColor} name="You"
                    nativeLang="Me" isSpeaking={!isMuted} isMuted={isMuted} size={68}
                  />
                )}
                {speakers.map(p => (
                  <ParticipantTile
                    key={p.id} initials={p.initials} color={p.color} name={p.name}
                    nativeLang={p.nativeLanguage} isSpeaking={p.isSpeaking} isMuted={p.isMuted} size={68}
                  />
                ))}
              </View>
            </View>

            {/* Divider */}
            <View style={rmStyles.divider} />

            {/* Listeners */}
            <View style={rmStyles.section}>
              <Text style={rmStyles.sectionTitle}>
                {"  "}LISTENERS ({listeners.length + (role === "listener" ? 1 : 0)})
              </Text>
              <View style={rmStyles.grid}>
                {role === "listener" && (
                  <ParticipantTile
                    initials={myInitials} color={myColor} name="You"
                    nativeLang="Me" isSpeaking={false} isMuted size={52}
                  />
                )}
                {listeners.map(p => (
                  <ParticipantTile
                    key={p.id} initials={p.initials} color={p.color} name={p.name}
                    nativeLang={p.nativeLanguage} isSpeaking={false} isMuted={p.isMuted} size={52}
                  />
                ))}
              </View>
            </View>
          </ScrollView>

          {/* Chat panel */}
          {showChat && (
            <View style={rmStyles.chatPanel}>
              <Text style={rmStyles.chatTitle}>Chat</Text>
              <ScrollView
                ref={chatRef}
                style={{ flex: 1 }}
                contentContainerStyle={{ padding: 8, gap: 10 }}
                showsVerticalScrollIndicator={false}
              >
                {chatMessages.map(m => (
                  <View key={m.id} style={{ flexDirection: "row", gap: 7, marginBottom: 8 }}>
                    <View style={[rmStyles.chatAvatar, { backgroundColor: m.color }]}>
                      <Text style={rmStyles.chatAvatarText}>{m.initials}</Text>
                    </View>
                    <View style={{ flex: 1 }}>
                      <Text style={rmStyles.chatName}>{m.sender.split(" ")[0]}</Text>
                      <Text style={rmStyles.chatText}>{m.text}</Text>
                    </View>
                  </View>
                ))}
              </ScrollView>
              <View style={rmStyles.chatInputRow}>
                <TextInput
                  value={chatInput}
                  onChangeText={setChatInput}
                  placeholder="Type here..."
                  placeholderTextColor="rgba(255,255,255,0.3)"
                  style={rmStyles.chatInput}
                  onSubmitEditing={handleSendChat}
                  returnKeyType="send"
                />
                <Pressable onPress={handleSendChat} style={[rmStyles.chatSendBtn, { backgroundColor: langColor }]}>
                  <Ionicons name="arrow-up" size={14} color="#fff" />
                </Pressable>
              </View>
            </View>
          )}
        </View>

        {/* Controls */}
        <View style={[rmStyles.controls, { paddingBottom: botPad }]}>
          <View style={rmStyles.controlsRow}>
            {/* Mute */}
            <View style={rmStyles.ctrlItem}>
              <Pressable
                onPress={() => { setIsMuted(v => !v); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }}
                style={[rmStyles.ctrlBtn, isMuted && { backgroundColor: "#EF4444" }]}
              >
                <Ionicons name={isMuted ? "mic-off" : "mic"} size={22} color="#fff" />
              </Pressable>
              <Text style={rmStyles.ctrlLabel}>{isMuted ? "Unmute" : "Mute"}</Text>
            </View>

            {/* Speaker toggle */}
            <View style={rmStyles.ctrlItem}>
              <Pressable
                onPress={() => {
                  setRole(r => r === "listener" ? "speaker" : "listener");
                  if (role === "listener") setIsMuted(false);
                  else setIsMuted(true);
                  Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
                }}
                style={[rmStyles.ctrlBtn, role === "speaker" && { backgroundColor: "#8B7CF6" }]}
              >
                <Ionicons name={role === "speaker" ? "mic-circle" : "headset"} size={22} color="#fff" />
              </Pressable>
              <Text style={rmStyles.ctrlLabel}>{role === "speaker" ? "Go Listen" : "Speak"}</Text>
            </View>

            {/* Raise hand */}
            <View style={rmStyles.ctrlItem}>
              <Pressable
                onPress={() => { setIsRaisedHand(v => !v); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                style={[rmStyles.ctrlBtn, isRaisedHand && { backgroundColor: "#F7C948" }]}
              >
                <Ionicons name="hand-left" size={22} color="#fff" />
              </Pressable>
              <Text style={rmStyles.ctrlLabel}>{isRaisedHand ? "Lower" : "Raise"}</Text>
            </View>

            {/* Leave */}
            <View style={rmStyles.ctrlItem}>
              <Pressable
                onPress={() => { Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy); onLeave(); }}
                style={[rmStyles.ctrlBtn, { backgroundColor: "#EF4444" }]}
              >
                <Ionicons name="call" size={22} color="#fff" style={{ transform: [{ rotate: "135deg" }] }} />
              </Pressable>
              <Text style={rmStyles.ctrlLabel}>Leave</Text>
            </View>
          </View>
        </View>
      </View>
    </Modal>
  );
}

const rmStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0F1117" },
  topBar: {
    paddingHorizontal: 20, paddingBottom: 10,
    flexDirection: "row", alignItems: "flex-start", gap: 12,
    borderBottomWidth: 1, borderBottomColor: "rgba(255,255,255,0.07)",
  },
  langRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  langLabel: { fontSize: 12, fontFamily: "Nunito_700Bold" },
  levelLabel: { fontSize: 12, color: "rgba(255,255,255,0.35)", fontFamily: "Nunito_400Regular" },
  roomTitle: { fontSize: 19, fontFamily: "Nunito_800ExtraBold", color: "#fff", lineHeight: 26 },
  topBtn: {
    width: 38, height: 38, borderRadius: 19,
    backgroundColor: "rgba(255,255,255,0.08)",
    alignItems: "center", justifyContent: "center",
  },
  liveBadge: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 20, paddingVertical: 8,
  },
  liveDot: { width: 7, height: 7, borderRadius: 3.5, backgroundColor: "#6BCB77" },
  liveText: { color: "rgba(255,255,255,0.5)", fontSize: 12, fontFamily: "Nunito_400Regular" },
  separator: { color: "rgba(255,255,255,0.25)" },
  section: { paddingHorizontal: 16, paddingTop: 12 },
  sectionTitle: { color: "rgba(255,255,255,0.35)", fontSize: 11, fontFamily: "Nunito_700Bold", letterSpacing: 1, marginBottom: 14 },
  grid: { flexDirection: "row", flexWrap: "wrap", gap: 14 },
  divider: { height: 1, backgroundColor: "rgba(255,255,255,0.07)", marginHorizontal: 16, marginVertical: 10 },
  chatPanel: { width: 190, borderLeftWidth: 1, borderLeftColor: "rgba(255,255,255,0.07)" },
  chatTitle: { color: "rgba(255,255,255,0.4)", fontSize: 11, fontFamily: "Nunito_700Bold", letterSpacing: 1, padding: 10 },
  chatAvatar: { width: 26, height: 26, borderRadius: 13, alignItems: "center", justifyContent: "center", marginTop: 2 },
  chatAvatarText: { color: "#fff", fontSize: 10, fontFamily: "Nunito_700Bold" },
  chatName: { color: "rgba(255,255,255,0.5)", fontSize: 10, fontFamily: "Nunito_600SemiBold", marginBottom: 2 },
  chatText: { color: "#fff", fontSize: 12, fontFamily: "Nunito_400Regular", lineHeight: 16 },
  chatInputRow: {
    flexDirection: "row", alignItems: "center", gap: 6,
    padding: 8, borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.07)",
  },
  chatInput: {
    flex: 1, backgroundColor: "rgba(255,255,255,0.08)", borderRadius: 14,
    paddingHorizontal: 10, paddingVertical: 7,
    color: "#fff", fontSize: 12, fontFamily: "Nunito_400Regular",
  },
  chatSendBtn: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  controls: {
    borderTopWidth: 1, borderTopColor: "rgba(255,255,255,0.07)",
    paddingTop: 16, paddingHorizontal: 20,
  },
  controlsRow: { flexDirection: "row", justifyContent: "space-around" },
  ctrlItem: { alignItems: "center", gap: 6 },
  ctrlBtn: {
    width: 56, height: 56, borderRadius: 28,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center", justifyContent: "center",
  },
  ctrlLabel: { color: "rgba(255,255,255,0.4)", fontSize: 11, fontFamily: "Nunito_400Regular" },
});

// ─── Create Room ──────────────────────────────────────────────────────────────

function CreateRoomModal({ visible, onClose, onCreated, colors }: {
  visible: boolean;
  onClose: () => void;
  onCreated: (room: VoiceRoom) => void;
  colors: typeof Colors.dark;
}) {
  const [topic, setTopic] = useState("");
  const [langCode, setLangCode] = useState("en");
  const [level, setLevel] = useState<VoiceRoom["level"]>("All Levels");
  const levels: VoiceRoom["level"][] = ["All Levels", "Beginner", "Intermediate", "Advanced"];
  const selLang = LANGUAGES.find(l => l.code === langCode) || LANGUAGES[0];

  const handleCreate = () => {
    if (!topic.trim()) return;
    const room: VoiceRoom = {
      id: `r-${Date.now()}`,
      topic: topic.trim(),
      language: selLang.name,
      languageCode: langCode,
      description: "A new room — join and start talking!",
      level,
      tags: [selLang.name, level],
      maxParticipants: 10,
      participants: [],
    };
    onCreated(room);
    setTopic("");
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="formSheet" onRequestClose={onClose}>
      <View style={[crStyles.container, { backgroundColor: colors.background }]}>
        <View style={[crStyles.handle, { backgroundColor: colors.border }]} />
        <Text style={[crStyles.title, { color: colors.text }]}>Create a Room</Text>

        <Text style={[crStyles.label, { color: colors.muted }]}>TOPIC</Text>
        <TextInput
          value={topic}
          onChangeText={setTopic}
          placeholder="e.g. Daily English Conversation"
          placeholderTextColor={colors.muted}
          style={[crStyles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
          maxLength={60}
        />

        <Text style={[crStyles.label, { color: colors.muted }]}>LANGUAGE</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8, paddingBottom: 4 }}>
          {LANGUAGES.map(l => (
            <Pressable
              key={l.code}
              onPress={() => setLangCode(l.code)}
              style={[
                crStyles.chip,
                {
                  backgroundColor: langCode === l.code ? l.color + "20" : colors.card,
                  borderColor: langCode === l.code ? l.color : colors.border,
                },
              ]}
            >
              <Text style={[crStyles.chipText, { color: langCode === l.code ? l.color : colors.text }]}>
                {l.name}
              </Text>
            </Pressable>
          ))}
        </ScrollView>

        <Text style={[crStyles.label, { color: colors.muted }]}>LEVEL</Text>
        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
          {levels.map(lv => (
            <Pressable
              key={lv}
              onPress={() => setLevel(lv)}
              style={[
                crStyles.chip,
                {
                  backgroundColor: level === lv ? selLang.color + "20" : colors.card,
                  borderColor: level === lv ? selLang.color : colors.border,
                },
              ]}
            >
              <Text style={[crStyles.chipText, { color: level === lv ? selLang.color : colors.text }]}>
                {lv}
              </Text>
            </Pressable>
          ))}
        </View>

        <Pressable
          onPress={handleCreate}
          disabled={!topic.trim()}
          style={({ pressed }) => [
            crStyles.createBtn,
            { backgroundColor: topic.trim() ? selLang.color : colors.border, opacity: pressed ? 0.85 : 1 },
          ]}
        >
          <Ionicons name="mic-circle" size={20} color="#fff" />
          <Text style={crStyles.createBtnText}>Start Room</Text>
        </Pressable>
      </View>
    </Modal>
  );
}

const crStyles = StyleSheet.create({
  container: { flex: 1, padding: 24, gap: 14 },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 4 },
  title: { fontSize: 22, fontFamily: "Nunito_800ExtraBold" },
  label: { fontSize: 11, fontFamily: "Nunito_700Bold", letterSpacing: 1 },
  input: {
    borderRadius: 12, borderWidth: 1,
    paddingHorizontal: 14, paddingVertical: 12,
    fontSize: 15, fontFamily: "Nunito_400Regular",
  },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  chipText: { fontSize: 13, fontFamily: "Nunito_600SemiBold" },
  createBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, padding: 16, borderRadius: 14, marginTop: 8,
  },
  createBtnText: { color: "#fff", fontSize: 16, fontFamily: "Nunito_700Bold" },
});

// ─── Room Card ────────────────────────────────────────────────────────────────

function RoomCard({ room, onJoin, colors }: {
  room: VoiceRoom; onJoin: () => void; colors: typeof Colors.dark;
}) {
  const lang = LANGUAGES.find(l => l.code === room.languageCode);
  const langColor = lang?.color || "#FF6B35";
  const speakers = room.participants.filter(p => p.role === "speaker");
  const speakingNow = room.participants.some(p => p.isSpeaking);

  return (
    <Pressable
      onPress={onJoin}
      style={({ pressed }) => [
        rcStyles.card,
        { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.93 : 1 },
      ]}
    >
      <View style={rcStyles.topRow}>
        <View style={rcStyles.langRow}>
          <View style={[rcStyles.dot, { backgroundColor: langColor }]} />
          <Text style={[rcStyles.langText, { color: langColor }]}>{room.language}</Text>
          <View style={[rcStyles.levelBadge, { borderColor: colors.border }]}>
            <Text style={[rcStyles.levelText, { color: colors.muted }]}>{room.level}</Text>
          </View>
        </View>
        {speakingNow && (
          <View style={rcStyles.livePill}>
            <View style={rcStyles.liveDotCard} />
            <Text style={rcStyles.liveLabelCard}>LIVE</Text>
          </View>
        )}
      </View>

      <Text style={[rcStyles.topic, { color: colors.text }]}>{room.topic}</Text>
      <Text style={[rcStyles.desc, { color: colors.muted }]} numberOfLines={2}>{room.description}</Text>

      <View style={rcStyles.avatarRow}>
        {room.participants.slice(0, 5).map((p, i) => (
          <View
            key={p.id}
            style={[
              rcStyles.avatar,
              {
                backgroundColor: p.color,
                borderColor: colors.background,
                marginLeft: i > 0 ? -10 : 0,
                zIndex: 5 - i,
              },
              p.isSpeaking && { borderColor: p.color, borderWidth: 2.5 },
            ]}
          >
            <Text style={rcStyles.avatarText}>{p.initials}</Text>
          </View>
        ))}
        {room.participants.length > 5 && (
          <View style={[rcStyles.avatar, { backgroundColor: colors.border, borderColor: colors.background, marginLeft: -10, zIndex: 0 }]}>
            <Text style={[rcStyles.avatarText, { color: colors.muted }]}>+{room.participants.length - 5}</Text>
          </View>
        )}
        <Text style={[rcStyles.count, { color: colors.muted }]}>
          {room.participants.length}/{room.maxParticipants}
        </Text>
      </View>

      <View style={rcStyles.footer}>
        <View style={rcStyles.tags}>
          {room.tags.map(t => (
            <View key={t} style={[rcStyles.tag, { backgroundColor: langColor + "18" }]}>
              <Text style={[rcStyles.tagText, { color: langColor }]}>{t}</Text>
            </View>
          ))}
        </View>
        <Pressable onPress={onJoin} style={[rcStyles.joinBtn, { backgroundColor: langColor }]}>
          <Ionicons name="enter" size={14} color="#fff" />
          <Text style={rcStyles.joinText}>Join</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

const rcStyles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, padding: 16, gap: 10 },
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  langRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  langText: { fontSize: 13, fontFamily: "Nunito_700Bold" },
  levelBadge: { borderWidth: 1, borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  levelText: { fontSize: 11, fontFamily: "Nunito_600SemiBold" },
  livePill: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "#EF444422", paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  liveDotCard: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#EF4444" },
  liveLabelCard: { color: "#EF4444", fontSize: 10, fontFamily: "Nunito_700Bold" },
  topic: { fontSize: 16, fontFamily: "Nunito_700Bold", lineHeight: 22 },
  desc: { fontSize: 13, fontFamily: "Nunito_400Regular", lineHeight: 18 },
  avatarRow: { flexDirection: "row", alignItems: "center" },
  avatar: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", borderWidth: 2 },
  avatarText: { color: "#fff", fontSize: 11, fontFamily: "Nunito_700Bold" },
  count: { marginLeft: 10, fontSize: 12, fontFamily: "Nunito_400Regular" },
  footer: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  tags: { flexDirection: "row", gap: 6, flex: 1, flexWrap: "wrap" },
  tag: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  tagText: { fontSize: 11, fontFamily: "Nunito_600SemiBold" },
  joinBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20 },
  joinText: { color: "#fff", fontSize: 13, fontFamily: "Nunito_700Bold" },
});

// ─── Main Screen ──────────────────────────────────────────────────────────────

export default function VoiceScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const { user } = useAuth();

  const [rooms, setRooms] = useState<VoiceRoom[]>(SAMPLE_ROOMS);
  const [activeRoom, setActiveRoom] = useState<VoiceRoom | null>(null);
  const [filterLang, setFilterLang] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);

  const topInset = Platform.OS === "web" ? 67 : insets.top;

  const filteredRooms = filterLang
    ? rooms.filter(r => r.languageCode === filterLang)
    : rooms;

  const langCodes = Array.from(new Set(rooms.map(r => r.languageCode)));

  return (
    <View style={[mainStyles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[mainStyles.header, { paddingTop: topInset + 12 }]}>
        <View style={{ flex: 1 }}>
          <Text style={[mainStyles.title, { color: colors.text }]}>Voice Rooms</Text>
          <Text style={[mainStyles.sub, { color: colors.muted }]}>
            {rooms.length} live rooms · practice speaking
          </Text>
        </View>
        <Pressable
          onPress={() => setShowCreate(true)}
          style={[mainStyles.newBtn, { backgroundColor: colors.primary }]}
        >
          <Ionicons name="add" size={18} color="#fff" />
          <Text style={mainStyles.newBtnText}>Create</Text>
        </Pressable>
      </View>

      {/* Filter bar */}
      <ScrollView
        horizontal showsHorizontalScrollIndicator={false}
        contentContainerStyle={mainStyles.filterRow}
      >
        {["all", ...langCodes].map(code => {
          const isAll = code === "all";
          const lang = LANGUAGES.find(l => l.code === code);
          const selected = isAll ? filterLang === null : filterLang === code;
          const color = lang?.color || colors.primary;
          return (
            <Pressable
              key={code}
              onPress={() => setFilterLang(isAll ? null : code)}
              style={[
                mainStyles.chip,
                {
                  backgroundColor: selected ? color : colors.card,
                  borderColor: selected ? color : colors.border,
                },
              ]}
            >
              {!isAll && <View style={[mainStyles.chipDot, { backgroundColor: selected ? "#fff" : color }]} />}
              <Text style={[mainStyles.chipText, { color: selected ? "#fff" : colors.text }]}>
                {isAll ? "All" : lang?.name || code}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {/* Room list */}
      <FlatList
        data={filteredRooms}
        keyExtractor={r => r.id}
        renderItem={({ item }) => (
          <RoomCard
            room={item}
            onJoin={() => { setActiveRoom(item); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }}
            colors={colors}
          />
        )}
        contentContainerStyle={mainStyles.list}
        showsVerticalScrollIndicator={false}
        ListEmptyComponent={
          <View style={mainStyles.empty}>
            <Ionicons name="mic-circle-outline" size={40} color={colors.muted} />
            <Text style={[mainStyles.emptyText, { color: colors.muted }]}>No rooms for this language.</Text>
            <Pressable
              onPress={() => setShowCreate(true)}
              style={[mainStyles.emptyBtn, { backgroundColor: colors.primary }]}
            >
              <Text style={mainStyles.emptyBtnText}>Create the first one</Text>
            </Pressable>
          </View>
        }
      />

      {/* Room modal */}
      {activeRoom && (
        <RoomModal
          room={activeRoom}
          user={user}
          onLeave={() => setActiveRoom(null)}
          visible={!!activeRoom}
        />
      )}

      {/* Create modal */}
      <CreateRoomModal
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={room => {
          setRooms(prev => [room, ...prev]);
          setShowCreate(false);
          setActiveRoom(room);
        }}
        colors={colors}
      />
    </View>
  );
}

const mainStyles = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "flex-start", paddingHorizontal: 20, paddingBottom: 12, gap: 12 },
  title: { fontSize: 22, fontFamily: "Nunito_800ExtraBold" },
  sub: { fontSize: 12, fontFamily: "Nunito_400Regular", marginTop: 3 },
  newBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, marginTop: 4 },
  newBtnText: { color: "#fff", fontSize: 13, fontFamily: "Nunito_700Bold" },
  filterRow: { paddingHorizontal: 16, gap: 8, paddingBottom: 12 },
  chip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  chipDot: { width: 7, height: 7, borderRadius: 3.5 },
  chipText: { fontSize: 13, fontFamily: "Nunito_600SemiBold" },
  list: { padding: 16, gap: 12, paddingBottom: 30 },
  empty: { alignItems: "center", paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: 14, fontFamily: "Nunito_400Regular" },
  emptyBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, marginTop: 4 },
  emptyBtnText: { color: "#fff", fontSize: 14, fontFamily: "Nunito_700Bold" },
});
