import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  View, Text, Pressable, StyleSheet, FlatList,
  ScrollView, useColorScheme, Platform, Modal,
  TextInput, Animated, ActivityIndicator, Easing, Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { ScreenBackdrop } from "@/components/ScreenBackdrop";
import { LANGUAGES } from "@/data/lessons";
import { useAuth, type User } from "@/context/AuthContext";
import * as Haptics from "expo-haptics";
import FloatingVoicePlayer from "../../components/FloatingVoicePlayer";
import RoomModal, { type VoiceRoom } from "../../components/RoomModal";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { apiRequest, getApiUrl } from "@/lib/query-client";

// Constants
const ROOM_THEMES = [
  { id: "make_friends", name: "Make Friends", icon: "people" as const, color: "#FF6B35" },
  { id: "chat", name: "Chat", icon: "chatbubbles" as const, color: "#4ECDC4" },
  { id: "oral_practice", name: "Oral Practice", icon: "mic" as const, color: "#45B7D1" },
  { id: "culture", name: "Culture", icon: "globe" as const, color: "#8B7CF6" },
  { id: "music", name: "Music", icon: "musical-notes" as const, color: "#F7C948" },
];

const BACKGROUND_OPTIONS = [
  { id: "galaxy", name: "Galaxy", icon: "star" as const, color: "#4c1d95" },
  { id: "rose", name: "Rose", icon: "rose" as const, color: "#e11d48" },
  { id: "earth", name: "Earth", icon: "planet" as const, color: "#2563eb" },
  { id: "sunflower", name: "Sunflower", icon: "sunny" as const, color: "#f59e0b" },
  { id: "spring", name: "Spring", icon: "leaf" as const, color: "#4ade80" },
  { id: "summer", name: "Summer", icon: "sunny" as const, color: "#facc15" },
  { id: "autumn", name: "Autumn", icon: "leaf" as const, color: "#fb923c" },
  { id: "winter", name: "Winter", icon: "snow" as const, color: "#60a5fa" },
  { id: "sari_sari", name: "Sari-Sari", icon: "home" as const, color: "#eab308" },
  { id: "mario", name: "Super Mario", icon: "game-controller" as const, color: "#ef4444" },
];

const ROOMS_KEY = "lingua_rooms";
const USERS_KEY = "lingua_users";
const LEGACY_DEMO_ROOM_IDS = new Set(["r-1", "r-2", "r-3", "r-4", "r-5", "r-6"]);

function makeInitials(name: string) {
  return name
    .split(" ")
    .map((part) => part[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
}

function isFakeRoom(room: VoiceRoom): boolean {
  if (LEGACY_DEMO_ROOM_IDS.has(room.id)) {
    return true;
  }

  if (!room.hostId) {
    return true;
  }

  if (room.hostId.startsWith("guest-")) {
    return true;
  }

  return (room.hostName || "").trim().toLowerCase() === "guest host";
}

function filterLegacyDemoRooms(rooms: unknown): VoiceRoom[] {
  if (!Array.isArray(rooms)) {
    return [];
  }

  return rooms.filter((room): room is VoiceRoom => {
    if (!room || typeof room !== "object") return false;
    const candidate = room as VoiceRoom;
    return Boolean(candidate.id) && !isFakeRoom(candidate);
  });
}

function shortenRoomTopic(topic: string, maxLength = 24) {
  if (topic.length <= maxLength) {
    return topic;
  }

  return `${topic.slice(0, maxLength).trimEnd()}...`;
}

// Styles

function GalaxyBackground() {
  return (
    <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: '#0c0a1a', alignItems: 'center', justifyContent: 'center' }}>
      <Ionicons name="star" size={24} color="rgba(255,255,255,0.2)" style={{ position: 'absolute', top: '20%', left: '20%' }} />
      <Ionicons name="star" size={16} color="rgba(255,255,255,0.3)" style={{ position: 'absolute', top: '50%', right: '20%' }} />
      <Ionicons name="star" size={32} color="rgba(255,255,255,0.1)" style={{ position: 'absolute', bottom: '30%', left: '50%' }} />
    </View>
  );
}

function RoomBackground({ background }: { background: VoiceRoom['background'] }) {
  if (background === 'galaxy') {
    return <GalaxyBackground />;
  }

  return <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: "#2d5a27" }} />;
}

const crStyles = StyleSheet.create({
  container: { flex: 1 },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 16 },
  title: { fontSize: 24, fontFamily: "Nunito_800ExtraBold", textAlign: "center" },
  label: { fontSize: 12, fontFamily: "Nunito_700Bold", letterSpacing: 0.5, marginBottom: 8 },
  input: { borderWidth: 1, borderRadius: 12, paddingHorizontal: 16, paddingVertical: 12, fontSize: 15, fontFamily: "Nunito_400Regular" },
  chip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1, flexDirection: "row", alignItems: "center", gap: 6 },
  chipText: { fontSize: 13, fontFamily: "Nunito_600SemiBold" },
  themeChip: { paddingHorizontal: 12, paddingVertical: 8, borderRadius: 12, borderWidth: 1, flexDirection: "row", alignItems: "center", gap: 6 },
  themeChipText: { fontSize: 12, fontFamily: "Nunito_600SemiBold" },
  bgChip: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 10, borderWidth: 1, flexDirection: "row", alignItems: "center", gap: 4 },
  bgChipText: { fontSize: 11, fontFamily: "Nunito_600SemiBold" },
  preview: { height: 80, borderRadius: 16, alignItems: "center", justifyContent: "center", gap: 8 },
  bgThumbContainer: { alignItems: 'center', gap: 6, marginRight: 12 },
  bgThumb: { width: 100, height: 100, borderRadius: 16, overflow: "hidden", borderWidth: 2 },
  bgThumbSelected: { borderColor: "#4ECDC4", borderWidth: 3 },
  bgThumbLabel: { fontSize: 12, fontFamily: "Nunito_600SemiBold" },
  bgThumbOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0,0,0,0.1)",
  },
  previewText: { color: "#fff", fontSize: 14, fontFamily: "Nunito_600SemiBold" },
  createBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, paddingVertical: 16, borderRadius: 16 },
  createBtnText: { color: "#fff", fontSize: 16, fontFamily: "Nunito_700Bold" },
});

const rcStyles = StyleSheet.create({
  card: { borderRadius: 22, borderWidth: 1, padding: 14, gap: 10, overflow: "hidden", shadowColor: "#000", shadowOffset: { width: 0, height: 10 }, shadowOpacity: 0.18, shadowRadius: 18, elevation: 8 },
  glassLayer: { ...StyleSheet.absoluteFillObject, backgroundColor: "rgba(255,255,255,0.05)" },
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  langRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  langText: { fontSize: 13, fontFamily: "Nunito_700Bold" },
  levelBadge: { borderWidth: 1, borderRadius: 999, paddingHorizontal: 9, paddingVertical: 3, backgroundColor: "rgba(255,255,255,0.12)" },
  levelText: { fontSize: 11, fontFamily: "Nunito_600SemiBold" },
  livePill: { flexDirection: "row", alignItems: "center", gap: 4, backgroundColor: "rgba(239,68,68,0.16)", paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999, borderWidth: 1, borderColor: "rgba(239,68,68,0.2)" },
  liveDotCard: { width: 6, height: 6, borderRadius: 3, backgroundColor: "#EF4444" },
  liveLabelCard: { color: "#EF4444", fontSize: 10, fontFamily: "Nunito_700Bold" },
  topic: { fontSize: 16, fontFamily: "Nunito_700Bold", lineHeight: 21 },
  desc: { fontSize: 12, fontFamily: "Nunito_400Regular", lineHeight: 16 },
  footer: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  tags: { flexDirection: "row", gap: 6, flex: 1, flexWrap: "wrap" },
  tag: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.1)" },
  tagText: { fontSize: 10, fontFamily: "Nunito_600SemiBold" },
  participants: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 5, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.08)" },
  participantsText: { fontSize: 11, fontFamily: "Nunito_600SemiBold" },
  joinBtn: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 13, paddingVertical: 7, borderRadius: 999, shadowColor: "#000", shadowOffset: { width: 0, height: 6 }, shadowOpacity: 0.16, shadowRadius: 10, elevation: 5 },
  joinText: { color: "#fff", fontSize: 13, fontFamily: "Nunito_700Bold" },
});

const mainStyles = StyleSheet.create({
  container: { flex: 1 },
  bgOrbWrap: { ...StyleSheet.absoluteFillObject, overflow: "hidden" },
  bgOrb: { position: "absolute", borderRadius: 999 },
  bgOrbOne: { width: 220, height: 220, top: -70, right: -60 },
  bgOrbTwo: { width: 180, height: 180, top: 180, left: -90 },
  header: { flexDirection: "row", alignItems: "flex-start", paddingHorizontal: 20, paddingBottom: 12, gap: 12 },
  title: { fontSize: 30, fontFamily: "Nunito_800ExtraBold", letterSpacing: 0.2 },
  sub: { fontSize: 12, fontFamily: "Nunito_400Regular", marginTop: 3 },
  mutualStrip: { paddingHorizontal: 20, paddingBottom: 14, gap: 10 },
  mutualHeader: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  mutualTitle: { fontSize: 14, fontFamily: "Nunito_800ExtraBold" },
  mutualSubtitle: { fontSize: 12, fontFamily: "Nunito_600SemiBold" },
  mutualList: { paddingRight: 20, gap: 12 },
  mutualBubble: {
    width: 86,
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 8,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.16,
    shadowRadius: 16,
    elevation: 8,
  },
  mutualAvatarWrap: { position: "relative", marginTop: 2 },
  mutualAvatar: { width: 46, height: 46, borderRadius: 23, alignItems: "center", justifyContent: "center", borderWidth: 2 },
  mutualAvatarText: { color: "#fff", fontSize: 16, fontFamily: "Nunito_800ExtraBold" },
  mutualOnlineRing: { position: "absolute", top: -4, right: -4, bottom: -4, left: -4, borderRadius: 28, borderWidth: 1.5 },
  mutualOnlineDot: { position: "absolute", right: 1, bottom: 1, width: 12, height: 12, borderRadius: 6, borderWidth: 2 },
  mutualName: { fontSize: 11, fontFamily: "Nunito_700Bold", textAlign: "center" },
  newBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 14, paddingVertical: 8, borderRadius: 999, marginTop: 4, shadowColor: "#000", shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.16, shadowRadius: 12, elevation: 5 },
  newBtnText: { color: "#fff", fontSize: 13, fontFamily: "Nunito_700Bold" },
  filterRow: { paddingHorizontal: 16, gap: 8, paddingBottom: 12, maxHeight: 60 },
  chip: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 14, paddingVertical: 7, borderRadius: 999, borderWidth: 1 },
  chipDot: { width: 7, height: 7, borderRadius: 3.5 },
  chipText: { fontSize: 13, fontFamily: "Nunito_600SemiBold" },
  list: { padding: 16, gap: 12, paddingBottom: 30 },
  empty: { alignItems: "center", paddingVertical: 60, gap: 12 },
  emptyText: { fontSize: 14, fontFamily: "Nunito_400Regular" },
  emptyBtn: { paddingHorizontal: 20, paddingVertical: 10, borderRadius: 20, marginTop: 4 },
  emptyBtnText: { color: "#fff", fontSize: 14, fontFamily: "Nunito_700Bold" },
});

function CreateRoomModal({ visible, onClose, onCreated, colors, user }: {
  visible: boolean;
  onClose: () => void;
  onCreated: (room: VoiceRoom) => void;
  colors: typeof Colors.dark;
  user: User | null;
}) {
  const [topic, setTopic] = useState("");
  const [langCode, setLangCode] = useState("en");
  const [level, setLevel] = useState<VoiceRoom["level"]>("All Levels");
  const [theme, setTheme] = useState<VoiceRoom["theme"]>("make_friends");
  const [background, setBackground] = useState<VoiceRoom["background"]>("galaxy");
  
  const levels: VoiceRoom["level"][] = ["All Levels", "Beginner", "Intermediate", "Advanced"];
  const selLang = LANGUAGES.find(l => l.code === langCode) || LANGUAGES[0];
  const selTheme = ROOM_THEMES.find(t => t.id === theme) || ROOM_THEMES[0];
  const selBg = BACKGROUND_OPTIONS.find(b => b.id === background);

  const handleThemeChange = (newTheme: VoiceRoom["theme"]) => {
    setTheme(newTheme);
    // Suggest a background based on theme
    switch (newTheme) {
      case 'music': setBackground('galaxy'); break;
      case 'culture': setBackground('earth'); break;
      case 'make_friends': setBackground('summer'); break;
      case 'oral_practice': setBackground('spring'); break;
      case 'chat': setBackground('rose'); break;
      default: setBackground('galaxy');
    }
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleCreate = () => {
    if (!topic.trim()) return;
    if (!user?.id || !user.displayName.trim()) return;
    const hostId = user.id;
    const hostName = user.displayName;
    const room: VoiceRoom = {
      id: `r-${Date.now()}`,
      topic: topic.trim(),
      language: selLang.name,
      languageCode: langCode,
      description: "A new room — join and start talking!",
      level,
      tags: [selLang.name, level, theme],
      participants: [],
      theme,
      background,
      hostId,
      hostName,
      hostInitials: makeInitials(hostName),
      hostColor: user?.avatarColor || selTheme.color,
      hostAvatarUri: user?.avatarUri,
      speakerRequests: [],
    };
    onCreated(room);
    setTopic("");
    setTheme("make_friends");
    setBackground("galaxy");
  };

  const renderBackgroundContent = (bgId: string) => {
    switch (bgId) {
      case 'galaxy': return <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#0c0a1a' }]}><Ionicons name="star" size={12} color="rgba(255,255,255,0.2)" style={{ position: 'absolute', top: '20%', left: '20%' }} /><Ionicons name="star" size={8} color="rgba(255,255,255,0.3)" style={{ position: 'absolute', top: '50%', right: '20%' }} /></View>;
      case 'rose': return <Image source={{ uri: 'https://images.unsplash.com/photo-1496857239036-1fb137683000?q=80&w=1000&auto=format&fit=crop' }} style={[StyleSheet.absoluteFillObject, { backgroundColor: '#e11d48' }]} resizeMode="cover" />;
      case 'earth': return <Image source={{ uri: 'https://images.unsplash.com/photo-1614730341194-75c60740a2d3?q=80&w=1000&auto=format&fit=crop' }} style={[StyleSheet.absoluteFillObject, { backgroundColor: '#2563eb' }]} resizeMode="cover" />;
      case 'sunflower': return <Image source={{ uri: 'https://images.unsplash.com/photo-1597848212624-a19eb35e2651?q=80&w=1000&auto=format&fit=crop' }} style={[StyleSheet.absoluteFillObject, { backgroundColor: '#f59e0b' }]} resizeMode="cover" />;
      case 'spring': return <Image source={{ uri: 'https://images.unsplash.com/photo-1522748906645-95d8adfd52c7?q=80&w=1000&auto=format&fit=crop' }} style={[StyleSheet.absoluteFillObject, { backgroundColor: '#4ade80' }]} resizeMode="cover" />;
      case 'summer': return <Image source={{ uri: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1000&auto=format&fit=crop' }} style={[StyleSheet.absoluteFillObject, { backgroundColor: '#facc15' }]} resizeMode="cover" />;
      case 'autumn': return <Image source={{ uri: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=1000&auto=format&fit=crop' }} style={[StyleSheet.absoluteFillObject, { backgroundColor: '#fb923c' }]} resizeMode="cover" />;
      case 'winter': return <Image source={{ uri: 'https://images.unsplash.com/photo-1457269449834-928af6406ed3?q=80&w=1000&auto=format&fit=crop' }} style={[StyleSheet.absoluteFillObject, { backgroundColor: '#60a5fa' }]} resizeMode="cover" />;
      case 'sari_sari': return <Image source={{ uri: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=80&w=1000&auto=format&fit=crop' }} style={[StyleSheet.absoluteFillObject, { backgroundColor: '#eab308' }]} resizeMode="cover" />;
      case 'mario': return <Image source={{ uri: 'https://images.unsplash.com/photo-1612287230217-969e2614d601?q=80&w=1000&auto=format&fit=crop' }} style={[StyleSheet.absoluteFillObject, { backgroundColor: '#ef4444' }]} resizeMode="cover" />;
      default: return null;
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="formSheet" onRequestClose={onClose}>
      <ScrollView style={[crStyles.container, { backgroundColor: colors.background }]} contentContainerStyle={{ padding: 24, gap: 16 }}>
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
                { backgroundColor: langCode === l.code ? l.color + "20" : colors.card, borderColor: langCode === l.code ? l.color : colors.border },
              ]}
            >
              <Text style={[crStyles.chipText, { color: langCode === l.code ? l.color : colors.text }]}>{l.name}</Text>
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
                { backgroundColor: level === lv ? selLang.color + "20" : colors.card, borderColor: level === lv ? selLang.color : colors.border },
              ]}
            >
              <Text style={[crStyles.chipText, { color: level === lv ? selLang.color : colors.text }]}>{lv}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={[crStyles.label, { color: colors.muted }]}>ROOM THEME</Text>
        <View style={{ flexDirection: "row", gap: 8, flexWrap: "wrap" }}>
          {ROOM_THEMES.map(t => (
            <Pressable
              key={t.id}
              onPress={() => handleThemeChange(t.id as VoiceRoom["theme"])}
              style={[
                crStyles.themeChip,
                { backgroundColor: theme === t.id ? t.color + "20" : colors.card, borderColor: theme === t.id ? t.color : colors.border },
              ]}
            >
              <Ionicons name={t.icon} size={16} color={theme === t.id ? t.color : colors.muted} />
              <Text style={[crStyles.themeChipText, { color: theme === t.id ? t.color : colors.text }]}>{t.name}</Text>
            </Pressable>
          ))}
        </View>

        <Text style={[crStyles.label, { color: colors.muted }]}>BACKGROUND</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ paddingHorizontal: 4 }}>
          {BACKGROUND_OPTIONS.map(bg => (
            <View key={bg.id} style={crStyles.bgThumbContainer}>
              <Pressable
                onPress={() => setBackground(bg.id as VoiceRoom["background"])}
                style={[
                  crStyles.bgThumb,
                  { borderColor: background === bg.id ? colors.primary : "transparent" },
                  background === bg.id && crStyles.bgThumbSelected
                ]}
              >
                {renderBackgroundContent(bg.id)}
                {background === bg.id && <View style={crStyles.bgThumbOverlay} />}
              </Pressable>
              <Text style={[crStyles.bgThumbLabel, { color: background === bg.id ? colors.primary : colors.text }]}>{bg.name}</Text>
            </View>
          ))}
        </ScrollView>

        <Pressable
          onPress={handleCreate}
          disabled={!topic.trim() || !user}
          style={({ pressed }) => [crStyles.createBtn, { backgroundColor: topic.trim() && user ? selTheme.color : colors.border, opacity: pressed ? 0.85 : 1 }]}
        >
          <Ionicons name="mic-circle" size={20} color="#fff" />
          <Text style={crStyles.createBtnText}>{user ? "Start Room" : "Sign in to create"}</Text>
        </Pressable>
      </ScrollView>
    </Modal>
  );
}

function RoomCard({ room, onJoin, colors }: {
  room: VoiceRoom; onJoin: () => void; colors: typeof Colors.dark;
}) {
  const lang = LANGUAGES.find(l => l.code === room.languageCode);
  const langColor = lang?.color || "#FF6B35";
  const participantCount = room.participants?.length || 0;

  const getBackgroundElement = () => {
    switch (room.background) {
      case 'galaxy':
        return (
          <View style={[StyleSheet.absoluteFillObject, { backgroundColor: '#0c0a1a' }]}>
            <Ionicons name="star" size={12} color="rgba(255,255,255,0.2)" style={{ position: 'absolute', top: '20%', left: '20%' }} />
            <Ionicons name="star" size={8} color="rgba(255,255,255,0.3)" style={{ position: 'absolute', top: '50%', right: '20%' }} />
          </View>
        );
      case 'rose':
        return <Image source={{ uri: 'https://images.unsplash.com/photo-1496857239036-1fb137683000?q=80&w=1000&auto=format&fit=crop' }} style={[StyleSheet.absoluteFillObject, { backgroundColor: '#e11d48' }]} resizeMode="cover" />;
      case 'earth':
        return <Image source={{ uri: 'https://images.unsplash.com/photo-1614730341194-75c60740a2d3?q=80&w=1000&auto=format&fit=crop' }} style={[StyleSheet.absoluteFillObject, { backgroundColor: '#2563eb' }]} resizeMode="cover" />;
      case 'sunflower':
        return <Image source={{ uri: 'https://images.unsplash.com/photo-1597848212624-a19eb35e2651?q=80&w=1000&auto=format&fit=crop' }} style={[StyleSheet.absoluteFillObject, { backgroundColor: '#f59e0b' }]} resizeMode="cover" />;
      case 'spring':
        return <Image source={{ uri: 'https://images.unsplash.com/photo-1522748906645-95d8adfd52c7?q=80&w=1000&auto=format&fit=crop' }} style={[StyleSheet.absoluteFillObject, { backgroundColor: '#4ade80' }]} resizeMode="cover" />;
      case 'summer':
        return <Image source={{ uri: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1000&auto=format&fit=crop' }} style={[StyleSheet.absoluteFillObject, { backgroundColor: '#facc15' }]} resizeMode="cover" />;
      case 'autumn':
        return <Image source={{ uri: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=1000&auto=format&fit=crop' }} style={[StyleSheet.absoluteFillObject, { backgroundColor: '#fb923c' }]} resizeMode="cover" />;
      case 'winter':
        return <Image source={{ uri: 'https://images.unsplash.com/photo-1457269449834-928af6406ed3?q=80&w=1000&auto=format&fit=crop' }} style={[StyleSheet.absoluteFillObject, { backgroundColor: '#60a5fa' }]} resizeMode="cover" />;
      case 'sari_sari':
        return <Image source={{ uri: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=80&w=1000&auto=format&fit=crop' }} style={[StyleSheet.absoluteFillObject, { backgroundColor: '#eab308' }]} resizeMode="cover" />;
      case 'mario':
        return <Image source={{ uri: 'https://images.unsplash.com/photo-1612287230217-969e2614d601?q=80&w=1000&auto=format&fit=crop' }} style={[StyleSheet.absoluteFillObject, { backgroundColor: '#ef4444' }]} resizeMode="cover" />;
      default: return null;
    }
  };

  const bgElement = getBackgroundElement();
  const textColor = bgElement ? "#fff" : colors.text;
  const subTextColor = bgElement ? "rgba(255,255,255,0.8)" : colors.muted;

  return (
    <Pressable
      onPress={onJoin}
      style={({ pressed }) => [
        rcStyles.card,
        { backgroundColor: bgElement ? "transparent" : colors.card, borderColor: bgElement ? "transparent" : colors.border, opacity: pressed ? 0.93 : 1, overflow: "hidden" }
      ]}
    >
      {bgElement}
      {bgElement && <View style={[StyleSheet.absoluteFillObject, { backgroundColor: 'rgba(0,0,0,0.3)' }]} />}
      <View style={rcStyles.glassLayer} />

      <View style={rcStyles.topRow}>
        <View style={rcStyles.langRow}>
          <View style={[rcStyles.dot, { backgroundColor: langColor }]} />
          <Text style={[rcStyles.langText, { color: langColor }]}>{room.language}</Text>
          <View style={[rcStyles.levelBadge, { borderColor: bgElement ? "rgba(255,255,255,0.3)" : colors.border }]}>
            <Text style={[rcStyles.levelText, { color: subTextColor }]}>{room.level}</Text>
          </View>
        </View>
        <View style={rcStyles.livePill}>
          <View style={rcStyles.liveDotCard} />
          <Text style={rcStyles.liveLabelCard}>LIVE</Text>
        </View>
      </View>

      <Text style={[rcStyles.topic, { color: textColor }]} numberOfLines={1}>
        {shortenRoomTopic(room.topic)}
      </Text>
      <Text style={[rcStyles.desc, { color: subTextColor }]} numberOfLines={2}>{room.description}</Text>

      <View style={rcStyles.footer}>
        <View style={rcStyles.tags}>
          {room.tags.slice(0, 3).map(t => (
            <View key={t} style={[rcStyles.tag, { backgroundColor: langColor + "25" }]}>
              <Text style={[rcStyles.tagText, { color: langColor }]}>{t}</Text>
            </View>
          ))}
        </View>
        <View style={rcStyles.participants}>
          <Ionicons name="people" size={14} color={subTextColor} />
          <Text style={[rcStyles.participantsText, { color: subTextColor }]}>{participantCount} online</Text>
        </View>
        <Pressable onPress={onJoin} style={[rcStyles.joinBtn, { backgroundColor: langColor }]}>
          <Ionicons name="enter" size={14} color="#fff" />
          <Text style={rcStyles.joinText}>Join</Text>
        </Pressable>
      </View>
    </Pressable>
  );
}

export default function VoiceScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  
  const [rooms, setRooms] = useState<VoiceRoom[]>([]);
  const [knownUsers, setKnownUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [activeRoom, setActiveRoom] = useState<VoiceRoom | null>(null);
  const [minimizedRoom, setMinimizedRoom] = useState<VoiceRoom | null>(null);
  const [filterLang, setFilterLang] = useState<string | null>(null);
  const [showCreate, setShowCreate] = useState(false);
  const [usingApiFallback, setUsingApiFallback] = useState(false);
  const lobbySocketRef = useRef<WebSocket | null>(null);

  const loadRooms = async () => {
    try {
      const response = await apiRequest("GET", "/api/voice-rooms");
      const nextRooms = filterLegacyDemoRooms(await response.json());
      setRooms(nextRooms);
      setUsingApiFallback(false);
      return;
    } catch (error) {
      console.warn("Falling back to local room storage:", error);
    }

    try {
      const storedRooms = await AsyncStorage.getItem(ROOMS_KEY);
      if (storedRooms) {
        const parsed = JSON.parse(storedRooms);
        const nextRooms = filterLegacyDemoRooms(parsed);
        if (nextRooms.length > 0) {
          setRooms(nextRooms);
          setUsingApiFallback(true);
          await AsyncStorage.setItem(ROOMS_KEY, JSON.stringify(nextRooms));
          return;
        }
      }

      setRooms([]);
      setUsingApiFallback(true);
      await AsyncStorage.setItem(ROOMS_KEY, JSON.stringify([]));
    } catch (e) {
      console.error("Failed to load rooms:", e);
      setRooms([]);
      setUsingApiFallback(true);
    }
  };

  const loadKnownUsers = async () => {
    try {
      const storedUsers = await AsyncStorage.getItem(USERS_KEY);
      if (!storedUsers) {
        setKnownUsers([]);
        return;
      }

      setKnownUsers(JSON.parse(storedUsers) as User[]);
    } catch (error) {
      console.error("Failed to load users:", error);
      setKnownUsers([]);
    }
  };

  useEffect(() => {
    let isMounted = true;

    const bootstrap = async () => {
      await Promise.all([loadRooms(), loadKnownUsers()]);
      if (isMounted) {
        setIsLoading(false);
      }
    };

    bootstrap();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    if (isLoading || usingApiFallback) {
      lobbySocketRef.current?.close();
      lobbySocketRef.current = null;
      return;
    }

    const baseUrl = new URL(getApiUrl());
    const wsProtocol = baseUrl.protocol === "https:" ? "wss:" : "ws:";
    const socket = new WebSocket(`${wsProtocol}//${baseUrl.host}/api/voice-rooms/live`);
    lobbySocketRef.current = socket;

    socket.onopen = () => {
      socket.send(JSON.stringify({ type: "subscribe:lobby" }));
    };

    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data as string) as
          | { type: "rooms:snapshot"; rooms: VoiceRoom[] }
          | { type: "room:snapshot"; room: VoiceRoom }
          | { type: "room:deleted"; roomId: string };

        if (message.type === "rooms:snapshot") {
          setRooms(filterLegacyDemoRooms(message.rooms));
          return;
        }

        if (message.type === "room:snapshot") {
          setRooms((current) => {
            const nextRoom = message.room;
            const existing = current.find((room) => room.id === nextRoom.id);
            const nextRooms = existing
              ? current.map((room) => (room.id === nextRoom.id ? nextRoom : room))
              : [nextRoom, ...current];
            return filterLegacyDemoRooms(nextRooms);
          });
          return;
        }

        if (message.type === "room:deleted") {
          setRooms((current) => current.filter((room) => room.id !== message.roomId));
        }
      } catch (error) {
        console.error("Voice lobby realtime client error:", error);
      }
    };

    socket.onerror = () => {
      console.warn("Voice lobby realtime connection failed; keeping last room snapshot.");
    };

    return () => {
      socket.close();
      if (lobbySocketRef.current === socket) {
        lobbySocketRef.current = null;
      }
    };
  }, [isLoading, usingApiFallback]);

  const handleUpdateRoom = (updatedRoom: VoiceRoom) => {
    const nextRooms = rooms.map(r => r.id === updatedRoom.id ? updatedRoom : r);
    setRooms(nextRooms);
    setActiveRoom(updatedRoom);
    if (!usingApiFallback) {
      apiRequest("PUT", `/api/voice-rooms/${updatedRoom.id}`, updatedRoom).catch((error) => {
        console.error("Failed to sync room update:", error);
      });
      return;
    }

    AsyncStorage.setItem(
      ROOMS_KEY,
      JSON.stringify(nextRooms),
    ).catch((error) => console.error("Failed to persist room update:", error));
  };

  const handleDeleteRoomLocally = async (roomId: string) => {
    const nextRooms = rooms.filter((room) => room.id !== roomId);
    setRooms(nextRooms);
    setActiveRoom((current) => (current?.id === roomId ? null : current));
    setMinimizedRoom((current) => (current?.id === roomId ? null : current));

    if (usingApiFallback) {
      await AsyncStorage.setItem(ROOMS_KEY, JSON.stringify(nextRooms));
    }
  };

  const handleLeaveRoom = async (room: VoiceRoom) => {
    const currentUserId = user?.id || "me";
    const isHost = (room.hostId || room.participants[0]?.id || currentUserId) === currentUserId;

    if (isHost) {
      try {
        if (!usingApiFallback) {
          await apiRequest("DELETE", `/api/voice-rooms/${room.id}`);
        }
        await handleDeleteRoomLocally(room.id);
      } catch (error) {
        console.error("Failed to end room:", error);
      }
      return;
    }

    const updatedRoom = {
      ...room,
      participants: room.participants.filter((participant) => participant.id !== currentUserId),
      speakerRequests: (room.speakerRequests || []).filter((request) => request.userId !== currentUserId),
    };

    setActiveRoom(null);
    setMinimizedRoom(null);

    if (!usingApiFallback) {
      apiRequest("PUT", `/api/voice-rooms/${room.id}`, updatedRoom).catch((error) => {
        console.error("Failed to leave room:", error);
      });
      setRooms((current) => current.map((item) => (item.id === room.id ? updatedRoom : item)));
      return;
    }

    const nextRooms = rooms.map((item) => (item.id === room.id ? updatedRoom : item));
    setRooms(nextRooms);
    AsyncStorage.setItem(ROOMS_KEY, JSON.stringify(nextRooms)).catch((error) => {
      console.error("Failed to persist room leave:", error);
    });
  };

  const handleCreateRoom = async (newRoom: VoiceRoom) => {
    if (!usingApiFallback) {
      const response = await apiRequest("POST", "/api/voice-rooms", newRoom);
      const createdRoom = (await response.json()) as VoiceRoom;
      setRooms(prev => [createdRoom, ...prev.filter(room => room.id !== createdRoom.id)]);
      setShowCreate(false);
      setActiveRoom(createdRoom);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return;
    }

    const newRooms = [newRoom, ...rooms];
    setRooms(newRooms);
    await AsyncStorage.setItem(ROOMS_KEY, JSON.stringify(newRooms));
    setShowCreate(false);
    setActiveRoom(newRoom);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const topInset = Platform.OS === "web" ? 67 : insets.top;

  const roomsForDisplay = rooms;
  const filteredRooms = filterLang ? roomsForDisplay.filter(r => r.languageCode === filterLang) : roomsForDisplay;
  const langCodes = Array.from(new Set(roomsForDisplay.map(r => r.languageCode)));
  const onlineMutualHosts = useMemo(() => {
    const currentUserId = user?.id;
    const seen = new Set<string>();

    return roomsForDisplay
      .filter((room) => room.hostId && room.hostId !== currentUserId)
      .map((room) => {
        const hostUser = knownUsers.find((candidate) => candidate.id === room.hostId);
        const hostName = room.hostName || hostUser?.displayName || room.participants[0]?.name || room.language;

        return {
          id: room.hostId || room.id,
          roomId: room.id,
          name: hostName,
          color: room.hostColor || hostUser?.avatarColor || room.participants[0]?.color || "#4ECDC4",
          avatarUri: room.hostAvatarUri || hostUser?.avatarUri || room.participants[0]?.avatarUri,
          initials: room.hostInitials || makeInitials(hostName),
        };
      })
      .filter((host) => {
        if (seen.has(host.id)) {
          return false;
        }

        seen.add(host.id);
        return true;
      })
      .slice(0, 8);
  }, [knownUsers, roomsForDisplay, user?.id]);

  useEffect(() => {
    if (activeRoom) {
      const syncedActiveRoom = roomsForDisplay.find((room) => room.id === activeRoom.id);
      if (syncedActiveRoom) {
        setActiveRoom(syncedActiveRoom);
      } else {
        setActiveRoom(null);
      }
    }

    if (minimizedRoom) {
      const syncedMinimizedRoom = roomsForDisplay.find((room) => room.id === minimizedRoom.id);
      if (syncedMinimizedRoom) {
        setMinimizedRoom(syncedMinimizedRoom);
      } else {
        setMinimizedRoom(null);
      }
    }
  }, [activeRoom, minimizedRoom, roomsForDisplay]);

  return (
    <View style={[mainStyles.container, { backgroundColor: colors.background }]}>
      <ScreenBackdrop
        primaryColor={colors.primary + "16"}
        secondaryColor={colors.gold + "12"}
      />
      <View style={[mainStyles.header, { paddingTop: topInset + 12 }]}>
        <View style={{ flex: 1 }}>
          <Text style={[mainStyles.title, { color: colors.text }]}>Voice Rooms</Text>
          <Text style={[mainStyles.sub, { color: colors.muted }]}>
            {roomsForDisplay.length} rooms · practice speaking
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

      {onlineMutualHosts.length > 0 && (
        <View style={mainStyles.mutualStrip}>
          <View style={mainStyles.mutualHeader}>
            <Text style={[mainStyles.mutualTitle, { color: colors.text }]}>Mutuals in voice rooms</Text>
            <Text style={[mainStyles.mutualSubtitle, { color: colors.muted }]}>online now</Text>
          </View>
          <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={mainStyles.mutualList}>
            {onlineMutualHosts.map((host) => (
              <Pressable
                key={host.id}
                onPress={() => {
                  const selectedRoom = roomsForDisplay.find((room) => room.id === host.roomId);
                  if (selectedRoom) {
                    setActiveRoom(selectedRoom);
                    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
                  }
                }}
                style={[
                  mainStyles.mutualBubble,
                  {
                    backgroundColor: colors.card + "CC",
                    borderColor: colors.border + "A0",
                  },
                ]}
              >
                <View style={mainStyles.mutualAvatarWrap}>
                  <View style={[mainStyles.mutualOnlineRing, { borderColor: colors.mint + "66" }]} />
                  {host.avatarUri ? (
                    <Image source={{ uri: host.avatarUri }} style={[mainStyles.mutualAvatar, { borderColor: colors.background }]} />
                  ) : (
                    <View style={[mainStyles.mutualAvatar, { backgroundColor: host.color, borderColor: colors.background }]}>
                      <Text style={mainStyles.mutualAvatarText}>{host.initials}</Text>
                    </View>
                  )}
                  <View style={[mainStyles.mutualOnlineDot, { backgroundColor: colors.mint, borderColor: colors.background }]} />
                </View>
                <Text style={[mainStyles.mutualName, { color: colors.text }]} numberOfLines={1}>
                  {host.name}
                </Text>
              </Pressable>
            ))}
          </ScrollView>
        </View>
      )}

      <View style={{ height: 60 }}>
      <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={mainStyles.filterRow}>
        {["all", ...langCodes].map(code => {
          const isAll = code === "all";
          const lang = LANGUAGES.find(l => l.code === code);
          const selected = isAll ? filterLang === null : filterLang === code;
          const color = lang?.color || colors.primary;
          return (
            <Pressable
              key={code}
              onPress={() => setFilterLang(isAll ? null : code)}
              style={[mainStyles.chip, { backgroundColor: selected ? color : colors.card, borderColor: selected ? color : colors.border }]}
            >
              {!isAll && <View style={[mainStyles.chipDot, { backgroundColor: selected ? "#fff" : color }]} />}
              <Text style={[mainStyles.chipText, { color: selected ? "#fff" : colors.text }]}>{isAll ? "All" : lang?.name || code}</Text>
            </Pressable>
          );
        })}
      </ScrollView>
      </View>

      {isLoading ? (
        <View style={{ flex: 1, alignItems: 'center', justifyContent: 'center' }}>
          <ActivityIndicator color={colors.primary} size="large" />
        </View>
      ) : (
        <FlatList
          data={filteredRooms}
          keyExtractor={r => r.id}
          renderItem={({ item }) => (
            <RoomCard room={item} onJoin={() => { setActiveRoom(item); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium); }} colors={colors} />
          )}
          contentContainerStyle={mainStyles.list}
          showsVerticalScrollIndicator={false}
          ListEmptyComponent={
            <View style={mainStyles.empty}>
              <Ionicons name="mic-circle-outline" size={40} color={colors.muted} />
              <Text style={[mainStyles.emptyText, { color: colors.muted }]}>No rooms yet. Create one!</Text>
              <Pressable onPress={() => setShowCreate(true)} style={[mainStyles.emptyBtn, { backgroundColor: colors.primary }]}>
                <Text style={mainStyles.emptyBtnText}>Create Room</Text>
              </Pressable>
            </View>
          }
        />
      )}

      {activeRoom && (
        <RoomModal
          room={activeRoom}
          user={user}
          onLeave={handleLeaveRoom}
          onMinimize={() => { setMinimizedRoom(activeRoom); setActiveRoom(null); }}
          visible={!!activeRoom}
          onUpdateRoom={handleUpdateRoom}
          onRoomDeleted={(roomId) => { void handleDeleteRoomLocally(roomId); }}
          recommendedRooms={roomsForDisplay}
          onJoinRecommended={(room) => {
            setActiveRoom(room);
            setMinimizedRoom(null);
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          }}
        />
      )}

      {minimizedRoom && (
        <FloatingVoicePlayer
          roomName={minimizedRoom.topic}
          language={minimizedRoom.language}
          isMuted={true}
          isSpeaking={(minimizedRoom.participants || []).some(p => p.isSpeaking)}
          onRestore={() => { setActiveRoom(minimizedRoom); setMinimizedRoom(null); }}
          onLeave={() => { void handleLeaveRoom(minimizedRoom); }}
        />
      )}

      <CreateRoomModal
        visible={showCreate}
        onClose={() => setShowCreate(false)}
        onCreated={handleCreateRoom}
        colors={colors}
        user={user}
      />
    </View>
  );
}
