import React, { useState } from "react";
import {
  View, Text, ScrollView, StyleSheet, Pressable,
  useColorScheme, Platform,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { LANGUAGES } from "@/data/lessons";
import * as Haptics from "expo-haptics";

type Room = {
  id: string;
  title: string;
  language: string;
  topic: string;
  participants: number;
  maxParticipants: number;
  level: "All Levels" | "Beginner" | "Intermediate" | "Advanced";
  isLive: boolean;
};

const ROOMS: Room[] = [
  { id: "r1", title: "Spanish Conversation Hour", language: "es", topic: "Daily Life", participants: 5, maxParticipants: 8, level: "All Levels", isLive: true },
  { id: "r2", title: "French Grammar Practice", language: "fr", topic: "Grammar", participants: 3, maxParticipants: 6, level: "Intermediate", isLive: true },
  { id: "r3", title: "Japanese for Beginners", language: "ja", topic: "Introductions", participants: 7, maxParticipants: 10, level: "Beginner", isLive: true },
  { id: "r4", title: "German Speaking Club", language: "de", topic: "Travel", participants: 2, maxParticipants: 8, level: "Advanced", isLive: false },
  { id: "r5", title: "Mandarin Tones Workshop", language: "zh", topic: "Pronunciation", participants: 4, maxParticipants: 6, level: "Beginner", isLive: true },
  { id: "r6", title: "Portuguese Casual Chat", language: "pt", topic: "Culture & Food", participants: 6, maxParticipants: 8, level: "All Levels", isLive: true },
  { id: "r7", title: "Korean K-Drama Discussion", language: "ko", topic: "Entertainment", participants: 9, maxParticipants: 12, level: "Intermediate", isLive: true },
  { id: "r8", title: "Italian Food & Language", language: "it", topic: "Cuisine", participants: 3, maxParticipants: 8, level: "All Levels", isLive: false },
];

function RoomCard({ room, onJoin }: { room: Room; onJoin: (room: Room) => void }) {
  const colorScheme = useColorScheme();
  const colors = colorScheme === "dark" ? Colors.dark : Colors.light;
  const lang = LANGUAGES.find(l => l.code === room.language);
  const fillPct = room.participants / room.maxParticipants;
  const levelColor = room.level === "Beginner" ? colors.mint : room.level === "Intermediate" ? colors.gold : "#FF6B9D";

  return (
    <View style={[styles.roomCard, { backgroundColor: colors.card }]}>
      <View style={styles.roomHeader}>
        <View style={styles.roomTitleRow}>
          <View style={[styles.langDot, { backgroundColor: lang?.color || colors.primary }]} />
          <View style={{ flex: 1 }}>
            <Text style={[styles.roomTitle, { color: colors.text }]}>{room.title}</Text>
            <Text style={[styles.roomTopic, { color: colors.muted }]}>{room.topic}</Text>
          </View>
          {room.isLive && (
            <View style={[styles.liveBadge, { backgroundColor: colors.error + "20" }]}>
              <View style={[styles.liveDot, { backgroundColor: colors.error }]} />
              <Text style={[styles.liveText, { color: colors.error }]}>LIVE</Text>
            </View>
          )}
        </View>
        <View style={styles.roomMeta}>
          <View style={[styles.levelTag, { backgroundColor: levelColor + "20" }]}>
            <Text style={[styles.levelText, { color: levelColor }]}>{room.level}</Text>
          </View>
          <View style={styles.participantInfo}>
            <Ionicons name="people-outline" size={14} color={colors.muted} />
            <Text style={[styles.participantText, { color: colors.muted }]}>
              {room.participants}/{room.maxParticipants}
            </Text>
          </View>
        </View>
      </View>

      <View style={[styles.fillTrack, { backgroundColor: colors.border }]}>
        <View style={[styles.fillBar, {
          width: `${fillPct * 100}%` as any,
          backgroundColor: fillPct > 0.8 ? colors.error : lang?.color || colors.primary,
        }]} />
      </View>

      <Pressable
        onPress={() => onJoin(room)}
        disabled={!room.isLive}
        style={({ pressed }) => [
          styles.joinBtn,
          {
            backgroundColor: room.isLive ? (lang?.color || colors.primary) : colors.border,
            opacity: pressed ? 0.8 : 1,
          },
        ]}
      >
        <Ionicons name={room.isLive ? "mic" : "mic-off"} size={16} color="#fff" />
        <Text style={styles.joinText}>{room.isLive ? "Join Room" : "Scheduled"}</Text>
      </Pressable>
    </View>
  );
}

export default function VoiceScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const [activeRoom, setActiveRoom] = useState<Room | null>(null);
  const [isMuted, setIsMuted] = useState(false);
  const [filterLang, setFilterLang] = useState<string | null>(null);

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : 0;

  const handleJoin = (room: Room) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    setActiveRoom(room);
    setIsMuted(false);
  };

  const handleLeave = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setActiveRoom(null);
  };

  const filteredRooms = filterLang ? ROOMS.filter(r => r.language === filterLang) : ROOMS;
  const activeLang = activeRoom ? LANGUAGES.find(l => l.code === activeRoom.language) : null;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {activeRoom && (
        <View style={[styles.activeRoomBanner, { backgroundColor: activeLang?.color || colors.primary }]}>
          <View style={{ flex: 1 }}>
            <Text style={styles.activeRoomLabel}>Now in room</Text>
            <Text style={styles.activeRoomTitle} numberOfLines={1}>{activeRoom.title}</Text>
          </View>
          <Pressable
            onPress={() => { setIsMuted(!isMuted); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
            style={[styles.muteBtn, { backgroundColor: "rgba(0,0,0,0.2)" }]}
          >
            <Ionicons name={isMuted ? "mic-off" : "mic"} size={18} color="#fff" />
          </Pressable>
          <Pressable onPress={handleLeave} style={[styles.leaveBtn, { backgroundColor: "rgba(0,0,0,0.25)" }]}>
            <Ionicons name="exit-outline" size={18} color="#fff" />
            <Text style={styles.leaveText}>Leave</Text>
          </Pressable>
        </View>
      )}

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 + bottomInset }}
      >
        <View style={[styles.header, { paddingTop: topInset + 16 }]}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Voice Rooms</Text>
          <View style={[styles.liveCount, { backgroundColor: colors.error + "15" }]}>
            <View style={[styles.livePulse, { backgroundColor: colors.error }]} />
            <Text style={[styles.liveCountText, { color: colors.error }]}>
              {ROOMS.filter(r => r.isLive).length} live
            </Text>
          </View>
        </View>

        <View style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={16} color={colors.muted} />
          <Text style={[styles.infoText, { color: colors.muted }]}>
            Join live rooms to practice speaking with other learners worldwide
          </Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.filterScroll}>
          <Pressable
            onPress={() => setFilterLang(null)}
            style={[styles.filterChip, {
              backgroundColor: !filterLang ? colors.primary : colors.card,
              borderColor: !filterLang ? colors.primary : colors.border,
            }]}
          >
            <Text style={[styles.filterText, { color: !filterLang ? "#fff" : colors.muted }]}>All</Text>
          </Pressable>
          {LANGUAGES.map(lang => (
            <Pressable
              key={lang.code}
              onPress={() => setFilterLang(filterLang === lang.code ? null : lang.code)}
              style={[styles.filterChip, {
                backgroundColor: filterLang === lang.code ? lang.color + "22" : colors.card,
                borderColor: filterLang === lang.code ? lang.color : colors.border,
              }]}
            >
              <Text style={[styles.filterText, {
                color: filterLang === lang.code ? lang.color : colors.muted,
              }]}>{lang.name}</Text>
            </Pressable>
          ))}
        </ScrollView>

        <View style={styles.roomsList}>
          {filteredRooms.map(room => (
            <RoomCard key={room.id} room={room} onJoin={handleJoin} />
          ))}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 20, paddingBottom: 12,
  },
  headerTitle: { fontSize: 28, fontFamily: "Nunito_800ExtraBold" },
  liveCount: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12,
  },
  livePulse: { width: 6, height: 6, borderRadius: 3 },
  liveCountText: { fontSize: 12, fontFamily: "Nunito_700Bold" },
  infoCard: {
    flexDirection: "row", alignItems: "flex-start", gap: 8,
    marginHorizontal: 20, marginBottom: 16,
  },
  infoText: { flex: 1, fontSize: 13, fontFamily: "Nunito_400Regular", lineHeight: 18 },
  filterScroll: { paddingHorizontal: 20, gap: 8, paddingBottom: 20 },
  filterChip: {
    paddingHorizontal: 14, paddingVertical: 7, borderRadius: 20, borderWidth: 1.5,
  },
  filterText: { fontSize: 13, fontFamily: "Nunito_600SemiBold" },
  roomsList: { paddingHorizontal: 20, gap: 12 },
  roomCard: { borderRadius: 16, padding: 16, gap: 12 },
  roomHeader: { gap: 8 },
  roomTitleRow: { flexDirection: "row", alignItems: "flex-start", gap: 10 },
  langDot: { width: 10, height: 10, borderRadius: 5, marginTop: 5 },
  roomTitle: { fontSize: 15, fontFamily: "Nunito_700Bold" },
  roomTopic: { fontSize: 12, fontFamily: "Nunito_600SemiBold", marginTop: 2 },
  liveBadge: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8,
  },
  liveDot: { width: 5, height: 5, borderRadius: 2.5 },
  liveText: { fontSize: 10, fontFamily: "Nunito_700Bold" },
  roomMeta: { flexDirection: "row", alignItems: "center", gap: 10 },
  levelTag: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
  },
  levelText: { fontSize: 11, fontFamily: "Nunito_700Bold" },
  participantInfo: { flexDirection: "row", alignItems: "center", gap: 4 },
  participantText: { fontSize: 12, fontFamily: "Nunito_600SemiBold" },
  fillTrack: { height: 4, borderRadius: 2, overflow: "hidden" },
  fillBar: { height: "100%", borderRadius: 2 },
  joinBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, paddingVertical: 10, borderRadius: 12,
  },
  joinText: { color: "#fff", fontSize: 14, fontFamily: "Nunito_700Bold" },
  activeRoomBanner: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 16, paddingVertical: 12,
  },
  activeRoomLabel: { color: "rgba(255,255,255,0.75)", fontSize: 11, fontFamily: "Nunito_600SemiBold" },
  activeRoomTitle: { color: "#fff", fontSize: 14, fontFamily: "Nunito_700Bold" },
  muteBtn: {
    width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center",
  },
  leaveBtn: {
    flexDirection: "row", alignItems: "center", gap: 4,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 10,
  },
  leaveText: { color: "#fff", fontSize: 13, fontFamily: "Nunito_700Bold" },
});
