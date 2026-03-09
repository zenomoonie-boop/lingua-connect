import React, { useState, useEffect, useRef, useMemo } from "react";
import {
  View, Text, Pressable, StyleSheet,
  ScrollView, Platform, Modal, KeyboardAvoidingView,
  TextInput, Animated, Easing, Image,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import * as Haptics from "expo-haptics";
import { router } from "expo-router";

import { LANGUAGES } from "@/data/lessons";
import { getApiUrl } from "@/lib/query-client";
import type { User } from "@/context/AuthContext";

// --- TYPES (Moved here to fix error) ---

export type RoomParticipant = {
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

export type VoiceRoom = {
  id: string;
  topic: string;
  language: string;
  languageCode: string;
  description: string;
  participants: RoomParticipant[];
  level: "All Levels" | "Beginner" | "Intermediate" | "Advanced";
  tags: string[];
  theme: "make_friends" | "chat" | "oral_practice" | "culture" | "music";
  background: "galaxy" | "rose" | "earth" | "sunflower" | "spring" | "summer" | "autumn" | "winter" | "sari_sari" | "mario";
  hostId?: string;
  hostName?: string;
  hostInitials?: string;
  hostColor?: string;
  hostAvatarUri?: string;
  speakerRequests?: RoomSpeakerRequest[];
  messages?: RoomMessage[];
};

export type RoomSpeakerRequest = {
  id: string;
  userId: string;
  name: string;
  initials: string;
  color: string;
  requestedAt: number;
};

export type RoomMessage = {
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

function getRoomBackgroundPreview(background: VoiceRoom["background"]) {
  switch (background) {
    case "galaxy":
      return { type: "solid" as const, color: "#17122B" };
    case "rose":
      return { type: "image" as const, uri: "https://images.unsplash.com/photo-1496857239036-1fb137683000?q=80&w=1000&auto=format&fit=crop", fallback: "#e11d48" };
    case "earth":
      return { type: "image" as const, uri: "https://images.unsplash.com/photo-1614730341194-75c60740a2d3?q=80&w=1000&auto=format&fit=crop", fallback: "#2563eb" };
    case "sunflower":
      return { type: "image" as const, uri: "https://images.unsplash.com/photo-1597848212624-a19eb35e2651?q=80&w=1000&auto=format&fit=crop", fallback: "#f59e0b" };
    case "spring":
      return { type: "image" as const, uri: "https://images.unsplash.com/photo-1522748906645-95d8adfd52c7?q=80&w=1000&auto=format&fit=crop", fallback: "#4ade80" };
    case "summer":
      return { type: "image" as const, uri: "https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1000&auto=format&fit=crop", fallback: "#facc15" };
    case "autumn":
      return { type: "image" as const, uri: "https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=1000&auto=format&fit=crop", fallback: "#fb923c" };
    case "winter":
      return { type: "image" as const, uri: "https://images.unsplash.com/photo-1457269449834-928af6406ed3?q=80&w=1000&auto=format&fit=crop", fallback: "#60a5fa" };
    case "sari_sari":
      return { type: "image" as const, uri: "https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=80&w=1000&auto=format&fit=crop", fallback: "#eab308" };
    case "mario":
      return { type: "image" as const, uri: "https://images.unsplash.com/photo-1612287230217-969e2614d601?q=80&w=1000&auto=format&fit=crop", fallback: "#ef4444" };
    default:
      return { type: "solid" as const, color: "#161B23" };
  }
}

function shortenRoomTopic(topic: string, maxLength = 22) {
  if (topic.length <= maxLength) {
    return topic;
  }

  return `${topic.slice(0, maxLength).trimEnd()}...`;
}

// Styles
const slotStyles = StyleSheet.create({
  container: { alignItems: "center", gap: 3, width: 68 },
  avatar: { width: 54, height: 54, borderRadius: 27, alignItems: "center", justifyContent: "center" },
  initials: { color: "#fff", fontSize: 18, fontFamily: "Nunito_700Bold" },
  badge: { position: "absolute", bottom: -2, right: -2, width: 17, height: 17, borderRadius: 8.5, borderWidth: 2, borderColor: "#1a472a", alignItems: "center", justifyContent: "center", backgroundColor: "#555" },
  name: { color: "#fff", fontSize: 10, fontFamily: "Nunito_600SemiBold", textAlign: "center" },
  hostBadge: { backgroundColor: "#FF6B35", paddingHorizontal: 5, paddingVertical: 1, borderRadius: 3, marginTop: 1 },
  hostText: { color: "#fff", fontSize: 7, fontFamily: "Nunito_700Bold" },
  reactionContainer: {
    position: "absolute",
    top: -4,
    left: -4,
    right: -4,
    bottom: -4,
    alignItems: "center",
    justifyContent: "center",
    zIndex: 10,
    pointerEvents: "none",
  },
  floatingReaction: { position: "absolute", alignItems: "center", justifyContent: "center" },
  floatingReactionText: {
    fontSize: 40,
    lineHeight: 48,
    includeFontPadding: false,
    textAlignVertical: "center",
    textShadowColor: 'rgba(0, 0, 0, 0.4)',
    textShadowOffset: { width: 0, height: 2 },
    textShadowRadius: 3,
  },
});

const reactionStyles = StyleSheet.create({
  menu: { position: "absolute", right: 14, bottom: 138, backgroundColor: "rgba(22,28,38,0.96)", borderRadius: 30, padding: 8, flexDirection: "row", gap: 8, shadowColor: "#000", shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.3, shadowRadius: 8, elevation: 20, zIndex: 40, borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" },
  emojiBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: "rgba(255,255,255,0.1)", alignItems: "center", justifyContent: "center" },
  emojiText: { fontSize: 20 },
});

const bStyle = StyleSheet.create({
  row: { paddingHorizontal: 10, marginBottom: 6 },
  right: { alignItems: "flex-end" },
  left: { alignItems: "flex-start" },
  bubble: { maxWidth: "88%", borderRadius: 14, paddingHorizontal: 10, paddingVertical: 7 },
  text: { fontSize: 12, fontFamily: "Nunito_400Regular", lineHeight: 16 },
  sender: { fontSize: 12, fontFamily: "Nunito_800ExtraBold" },
  bubbleRow: { flexDirection: "row", alignItems: "flex-start", gap: 8 },
  miniAvatar: { width: 18, height: 18, borderRadius: 9, alignItems: "center", justifyContent: "center", marginTop: 3 },
  miniInitials: { color: "#fff", fontSize: 8, fontFamily: "Nunito_800ExtraBold" },
});

const rmStyles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#05070B" },
  header: { position: "absolute", top: 0, left: 0, right: 0, flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start", paddingHorizontal: 16, zIndex: 10, paddingTop: 60 },
  headerContent: { flex: 1, minWidth: 0, paddingRight: 10 },
  roomNameWrap: { height: 24, overflow: "hidden", justifyContent: "center" },
  roomNameTrack: { flexDirection: "row", alignItems: "center", gap: 28, paddingRight: 28 },
  roomName: { fontSize: 16, fontFamily: "Nunito_800ExtraBold", color: "#fff", textShadowColor: "rgba(0,0,0,0.3)", textShadowOffset: { width: 1, height: 1 }, textShadowRadius: 3 },
  tagRow: { flexDirection: "row", gap: 8, marginTop: 6 },
  langTag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  langTagText: { color: "#fff", fontSize: 11, fontFamily: "Nunito_700Bold" },
  levelTag: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  levelTagText: { color: "#fff", fontSize: 11, fontFamily: "Nunito_600SemiBold" },
  headerIcons: { flexDirection: "row", gap: 8 },
  iconBtn: { width: 38, height: 38, borderRadius: 19, backgroundColor: "transparent", alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  participantsContainer: { flex: 1, paddingTop: 132, paddingHorizontal: 8 },
  sectionLabel: { color: "rgba(255,255,255,0.6)", fontSize: 10, fontFamily: "Nunito_700Bold", letterSpacing: 1, marginBottom: 10, marginLeft: 4 },
  participantsGrid: { alignItems: "center", gap: 10 },
  participantsRow: { flexDirection: "row", gap: 4, justifyContent: "center" },
  divider: { height: 1, marginTop: 16, marginHorizontal: 20 },
  audienceStrip: {
    marginTop: 12,
    marginHorizontal: 8,
    minHeight: 54,
    borderRadius: 18,
    backgroundColor: "rgba(255,255,255,0.07)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    paddingHorizontal: 10,
    paddingVertical: 8,
  },
  audienceScroll: { flexGrow: 0 },
  audienceRow: { flexDirection: "row", alignItems: "center", gap: 10, paddingRight: 10 },
  audienceItem: { alignItems: "center", width: 34 },
  audienceAvatar: { width: 32, height: 32, borderRadius: 16, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.16)" },
  audienceInitials: { color: "#fff", fontSize: 11, fontFamily: "Nunito_800ExtraBold" },
  audienceEmpty: { color: "rgba(255,255,255,0.48)", fontSize: 12, fontFamily: "Nunito_600SemiBold", textAlign: "center", paddingVertical: 8 },
  chatContainer: {
    position: "absolute",
    left: 12,
    right: 20,
    bottom: 112,
    minHeight: 148,
    maxHeight: 332,
    backgroundColor: "transparent",
    borderRadius: 0,
    overflow: "visible",
    zIndex: 18,
    borderWidth: 0,
    paddingVertical: 0,
  },
  chatMessages: { paddingHorizontal: 0, paddingBottom: 6 },
  chatEmpty: { color: "rgba(255,255,255,0.5)", textAlign: "center", marginVertical: 12, fontSize: 14 },
  controls: { position: "absolute", bottom: 0, left: 0, right: 0, backgroundColor: "transparent", paddingTop: 6, paddingHorizontal: 14, zIndex: 12 },
  floatingMicWrap: {
    position: "absolute",
    right: 18,
    bottom: 78,
    zIndex: 16,
  },
  requestRow: { alignItems: "center", marginBottom: 10 },
  noticeCard: {
    minHeight: 42,
    borderRadius: 21,
    paddingHorizontal: 14,
    paddingVertical: 8,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  noticeTextWrap: { flex: 1 },
  noticeTitle: { color: "#fff", fontSize: 13, fontFamily: "Nunito_700Bold" },
  noticeSub: { color: "rgba(255,255,255,0.72)", fontSize: 11, fontFamily: "Nunito_400Regular" },
  noticeAction: {
    minWidth: 78,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 14,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#4ECDC4",
  },
  noticeActionText: { color: "#fff", fontSize: 12, fontFamily: "Nunito_700Bold" },
  controlsRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  controlsMain: { flex: 1, flexDirection: "row", alignItems: "center", gap: 8 },
  ctrlBtn: { width: 42, height: 42, borderRadius: 21, backgroundColor: "rgba(255,255,255,0.08)", borderWidth: 1, borderColor: "rgba(255,255,255,0.12)", alignItems: "center", justifyContent: "center" },
  ctrlBadge: {
    position: "absolute",
    top: -4,
    right: -2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#F7C948",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 4,
  },
  ctrlBadgeText: { color: "#111827", fontSize: 9, fontFamily: "Nunito_800ExtraBold" },
  messageInputWrap: {
    flex: 1,
    position: "relative",
    justifyContent: "center",
  },
  messageInput: {
    flex: 1,
    height: 40,
    borderRadius: 20,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 0,
    paddingLeft: 12,
    paddingRight: 34,
    color: "#fff",
    fontSize: 13,
    fontFamily: "Nunito_700Bold",
  },
  messageSendBtn: {
    position: "absolute",
    right: 4,
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: "rgba(78,205,196,0.9)",
    alignItems: "center",
    justifyContent: "center",
  },
  leaveOverlay: { flex: 1, backgroundColor: "rgba(0,0,0,0.42)" },
  leaveSheetWrap: {
    position: "absolute",
    top: 52,
    right: 14,
    bottom: 34,
    width: "72%",
    maxWidth: 346,
  },
  leaveMenu: { flex: 1, backgroundColor: "rgba(14,18,28,0.94)", borderRadius: 28, padding: 18, gap: 16, borderWidth: 1, borderColor: "rgba(255,255,255,0.08)" },
  leaveTitle: { color: "#fff", fontSize: 20, fontFamily: "Nunito_800ExtraBold", textAlign: "center", marginBottom: 8 },
  leaveBtn: { flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 8, padding: 14, borderRadius: 14 },
  leaveActions: { flexDirection: "row", justifyContent: "center", gap: 24, marginTop: 2, marginBottom: 4 },
  leaveActionWrap: { alignItems: "center", gap: 10, width: 92 },
  leaveCircleBtn: { width: 66, height: 66, borderRadius: 33, alignItems: "center", justifyContent: "center", borderWidth: 1 },
  leaveBtnText: { color: "#fff", fontSize: 12, fontFamily: "Nunito_700Bold", textAlign: "center" },
  recSection: { marginTop: 4, gap: 12 },
  recTitle: { color: "rgba(255,255,255,0.92)", fontSize: 15, fontFamily: "Nunito_800ExtraBold", letterSpacing: 0.1 },
  recList: { gap: 10 },
  leaveScroll: { flex: 1 },
  leaveScrollContent: { gap: 16, paddingBottom: 26 },
  recCard: {
    borderRadius: 20,
    paddingHorizontal: 14,
    paddingVertical: 12,
    backgroundColor: "rgba(255,255,255,0.05)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
    gap: 12,
    overflow: "hidden",
    position: "relative",
  },
  recCardBg: {
    ...StyleSheet.absoluteFillObject,
  },
  recCardOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(10,14,20,0.48)",
  },
  recCardGlass: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(255,255,255,0.02)",
  },
  recCardTop: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 8 },
  recCardMain: { flex: 1, minWidth: 0 },
  recCardLangRow: { flexDirection: "row", alignItems: "center", gap: 6, marginBottom: 7, flexWrap: "wrap" },
  recCardLang: { color: "rgba(255,255,255,0.84)", fontSize: 11, fontFamily: "Nunito_800ExtraBold" },
  recCardPill: {
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    backgroundColor: "rgba(78,205,196,0.16)",
    borderWidth: 1,
    borderColor: "rgba(78,205,196,0.26)",
  },
  recCardPillText: { color: "#9FE7E1", fontSize: 10, fontFamily: "Nunito_700Bold" },
  recCardTopic: { color: "#fff", fontSize: 15, fontFamily: "Nunito_700Bold" },
  recCardBottom: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", gap: 10 },
  recAvatars: { flexDirection: "row", alignItems: "center" },
  recAvatar: {
    width: 28,
    height: 28,
    borderRadius: 14,
    borderWidth: 1.5,
    borderColor: "rgba(10,14,20,0.95)",
    marginRight: -7,
    alignItems: "center",
    justifyContent: "center",
  },
  recAvatarText: { color: "#fff", fontSize: 9, fontFamily: "Nunito_800ExtraBold" },
  recCountBubble: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.12)",
    alignItems: "center",
    justifyContent: "center",
    marginLeft: 6,
  },
  recCountText: { color: "#fff", fontSize: 12, fontFamily: "Nunito_700Bold" },
  recJoinBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: "rgba(78,205,196,0.18)",
    borderWidth: 1,
    borderColor: "rgba(78,205,196,0.34)",
    alignItems: "center",
    justifyContent: "center",
  },
  recJoinText: { color: "#4ECDC4", fontSize: 10, fontFamily: "Nunito_700Bold" },
  requestsOverlay: { flex: 1, backgroundColor: "rgba(3,6,12,0.18)", justifyContent: "flex-end" },
  requestsSheet: {
    backgroundColor: "rgba(18,24,34,0.94)",
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    paddingHorizontal: 18,
    paddingTop: 16,
    paddingBottom: 28,
    gap: 14,
    borderTopWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: -12 },
    shadowOpacity: 0.22,
    shadowRadius: 20,
    elevation: 12,
  },
  requestsHandle: { width: 46, height: 5, borderRadius: 999, backgroundColor: "rgba(255,255,255,0.26)", alignSelf: "center", marginBottom: 2 },
  requestsTitle: { color: "#fff", fontSize: 19, fontFamily: "Nunito_800ExtraBold" },
  requestsSub: { color: "rgba(255,255,255,0.68)", fontSize: 12, fontFamily: "Nunito_400Regular", lineHeight: 17 },
  requestsList: { gap: 10, maxHeight: 280 },
  requestItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 12,
    backgroundColor: "rgba(255,255,255,0.1)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    borderRadius: 20,
    padding: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.12,
    shadowRadius: 14,
    elevation: 4,
  },
  requestAvatar: { width: 42, height: 42, borderRadius: 21, alignItems: "center", justifyContent: "center", borderWidth: 1, borderColor: "rgba(255,255,255,0.18)" },
  requestAvatarText: { color: "#fff", fontSize: 14, fontFamily: "Nunito_800ExtraBold" },
  requestInfo: { flex: 1 },
  requestName: { color: "#fff", fontSize: 14, fontFamily: "Nunito_700Bold" },
  requestMeta: { color: "rgba(255,255,255,0.66)", fontSize: 11, fontFamily: "Nunito_400Regular", marginTop: 3 },
  requestApproveBtn: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: "rgba(78,205,196,0.2)",
    borderWidth: 1,
    borderColor: "rgba(78,205,196,0.38)",
  },
  requestApproveText: { color: "#B8FFF7", fontSize: 12, fontFamily: "Nunito_800ExtraBold" },
  requestDeclineBtn: {
    paddingHorizontal: 12,
    paddingVertical: 9,
    borderRadius: 999,
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  requestDeclineText: { color: "#fff", fontSize: 12, fontFamily: "Nunito_700Bold" },
  profileSheet: {
    backgroundColor: "rgba(16,20,32,0.96)",
    borderTopLeftRadius: 26,
    borderTopRightRadius: 26,
    padding: 18,
    paddingBottom: 28,
    gap: 14,
    borderTopWidth: 1,
    borderColor: "rgba(255,255,255,0.08)",
  },
  profileTop: { flexDirection: "row", alignItems: "center", gap: 12 },
  profileAvatar: { width: 58, height: 58, borderRadius: 29, alignItems: "center", justifyContent: "center" },
  profileAvatarText: { color: "#fff", fontSize: 18, fontFamily: "Nunito_800ExtraBold" },
  profileName: { color: "#fff", fontSize: 20, fontFamily: "Nunito_800ExtraBold" },
  profileMeta: { color: "rgba(255,255,255,0.68)", fontSize: 12, fontFamily: "Nunito_600SemiBold", marginTop: 3 },
  profileActions: { flexDirection: "row", gap: 10, marginTop: 4 },
  profileActionBtn: {
    flex: 1,
    paddingVertical: 11,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.1)",
  },
  profileActionPrimary: {
    backgroundColor: "rgba(78,205,196,0.18)",
    borderColor: "rgba(78,205,196,0.34)",
  },
  profileActionText: { color: "#fff", fontSize: 13, fontFamily: "Nunito_700Bold" },
  profileLinkRow: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingTop: 6,
  },
  profileLinkText: { color: "#fff", fontSize: 15, fontFamily: "Nunito_700Bold" },
});

// Components

function SpeakingPulse({ color, active }: { color: string; active: boolean }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (active) {
      Animated.loop(
        Animated.timing(anim, {
          toValue: 1,
          duration: 1500,
          easing: Easing.out(Easing.ease),
          useNativeDriver: Platform.OS !== "web",
        })
      ).start();
    } else {
      anim.setValue(0);
    }
  }, [active]);

  if (!active) return null;

  const scale = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [1, 1.6],
  });

  const opacity = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [0.4, 0],
  });

  return (
    <View style={[StyleSheet.absoluteFill, { alignItems: 'center', justifyContent: 'center' }]}>
      <View style={{
        width: 58,
        height: 58,
        borderRadius: 29,
        borderWidth: 2,
        borderColor: color,
        position: 'absolute',
      }} />
      <Animated.View
        style={{
          width: 52,
          height: 52,
          borderRadius: 26,
          backgroundColor: color,
          opacity,
          transform: [{ scale }],
          position: 'absolute',
          zIndex: -1,
        }}
      />
    </View>
  );
}

function FloatingReaction({ emoji, onAnimationEnd }: { emoji: string; onAnimationEnd: () => void }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    anim.setValue(0);
    Animated.timing(anim, {
      toValue: 1,
      duration: 2800,
      useNativeDriver: Platform.OS !== "web",
      easing: Easing.bezier(0.22, 1, 0.36, 1),
    }).start(() => {
      onAnimationEnd();
    });
  }, [anim, onAnimationEnd]);

  const opacity = anim.interpolate({
    inputRange: [0, 0.08, 0.74, 1],
    outputRange: [0, 1, 1, 0],
  });

  const scale = anim.interpolate({
    inputRange: [0, 0.12, 0.72, 1],
    outputRange: [0.8, 1.02, 1, 0.62],
    extrapolate: "clamp",
  });

  const exitTranslateX = anim.interpolate({
    inputRange: [0, 0.72, 1],
    outputRange: [0, 0, 16],
    extrapolate: "clamp",
  });

  const exitTranslateY = anim.interpolate({
    inputRange: [0, 0.72, 1],
    outputRange: [0, -1, -8],
    extrapolate: "clamp",
  });

  const baseTransforms: any[] = [
    { translateX: exitTranslateX },
    { translateY: exitTranslateY },
    { scale },
  ];

  if (emoji === "👋") {
    baseTransforms.push({
      rotate: anim.interpolate({
        inputRange: [0, 0.18, 0.34, 0.5, 0.66, 0.82, 1],
        outputRange: ["0deg", "9deg", "-7deg", "8deg", "-5deg", "3deg", "0deg"],
      }),
    });
    baseTransforms.push({
      translateY: anim.interpolate({
        inputRange: [0, 0.25, 0.55, 1],
        outputRange: [0, -1, -0.5, 0],
      }),
    });
  } else if (emoji === "❤️") {
    baseTransforms.push({
      scale: anim.interpolate({
        inputRange: [0, 0.18, 0.34, 0.5, 0.7, 1],
        outputRange: [0.92, 1.04, 1.16, 1.03, 1.1, 1],
      }),
    });
  } else if (emoji === "😂") {
    baseTransforms.push({
      rotate: anim.interpolate({
        inputRange: [0, 0.12, 0.24, 0.38, 0.52, 0.68, 0.84, 1],
        outputRange: ["-3deg", "5deg", "-4deg", "4deg", "-3deg", "2deg", "-1deg", "0deg"],
      }),
    });
    baseTransforms.push({
      translateY: anim.interpolate({
        inputRange: [0, 0.14, 0.28, 0.42, 0.6, 0.8, 1],
        outputRange: [0, -2, 0, -1.5, 0, -0.5, 0],
      }),
    });
    baseTransforms.push({
      translateX: anim.interpolate({
        inputRange: [0, 0.16, 0.32, 0.48, 0.66, 0.84, 1],
        outputRange: [0, 1.5, -1.5, 1, -1, 0.5, 0],
      }),
    });
    baseTransforms.push({
      scale: anim.interpolate({
        inputRange: [0, 0.18, 0.36, 0.58, 0.8, 1],
        outputRange: [0.96, 1.04, 1.01, 1.03, 1.01, 1],
      }),
    });
  } else if (emoji === "🔥") {
    baseTransforms.push({
      scale: anim.interpolate({
        inputRange: [0, 0.18, 0.36, 0.56, 0.78, 1],
        outputRange: [0.97, 1.03, 1, 1.05, 1.01, 1],
      }),
    });
    baseTransforms.push({
      rotate: anim.interpolate({
        inputRange: [0, 0.22, 0.44, 0.66, 1],
        outputRange: ["-1deg", "1deg", "-0.75deg", "0.5deg", "0deg"],
      }),
    });
  } else if (emoji === "😮") {
    baseTransforms.push({
      scale: anim.interpolate({
        inputRange: [0, 0.14, 0.3, 0.55, 1],
        outputRange: [0.9, 1.08, 1.04, 1.01, 1],
      }),
    });
  } else if (emoji === "👏") {
    baseTransforms.push({
      scale: anim.interpolate({
        inputRange: [0, 0.14, 0.28, 0.42, 0.56, 0.72, 0.88, 1],
        outputRange: [0.94, 1.1, 0.98, 1.08, 0.99, 1.05, 1.01, 1],
      }),
    });
    baseTransforms.push({
      translateY: anim.interpolate({
        inputRange: [0, 0.16, 0.32, 0.48, 0.66, 0.84, 1],
        outputRange: [0, -1.5, 0, -1.2, 0, -0.4, 0],
      }),
    });
    baseTransforms.push({
      rotate: anim.interpolate({
        inputRange: [0, 0.18, 0.36, 0.54, 0.72, 1],
        outputRange: ["-1deg", "1deg", "-0.75deg", "0.75deg", "-0.4deg", "0deg"],
      }),
    });
  }

  return (
    <Animated.View style={[slotStyles.floatingReaction, { opacity, transform: baseTransforms }]}>
      <Text style={slotStyles.floatingReactionText}>{emoji}</Text>
    </Animated.View>
  );
}

function LoopingRoomTitle({ title }: { title: string }) {
  const offset = useRef(new Animated.Value(0)).current;
  const [segmentWidth, setSegmentWidth] = useState(220);
  const gap = 28;

  useEffect(() => {
    offset.setValue(0);

    const loopDistance = segmentWidth + gap;
    const animation = Animated.loop(
      Animated.timing(offset, {
        toValue: -loopDistance,
        duration: 7000,
        easing: Easing.linear,
        useNativeDriver: Platform.OS !== "web",
      }),
    );

    animation.start();

    return () => {
      animation.stop();
      offset.stopAnimation();
      offset.setValue(0);
    };
  }, [gap, offset, segmentWidth, title]);

  const repeatedTitles = [title, title, title];

  return (
    <View style={rmStyles.roomNameWrap}>
      <Animated.View style={[rmStyles.roomNameTrack, { transform: [{ translateX: offset }] }]}>
        {repeatedTitles.map((item, index) => (
          <Text
            key={`${item}-${index}`}
            numberOfLines={1}
            onLayout={index === 0 ? (event) => setSegmentWidth(event.nativeEvent.layout.width) : undefined}
            style={rmStyles.roomName}
          >
            {item}
          </Text>
        ))}
      </Animated.View>
    </View>
  );
}

function ParticipantSlot({
  initials, color, avatarUri, name, isSpeaking, isMuted, isHost, isModerator, reactions, onRemoveReaction, onPress
}: {
  initials: string | null; color: string | null; avatarUri?: string | null; name: string | null; isSpeaking: boolean; isMuted: boolean; isHost?: boolean; isModerator?: boolean;
  reactions?: { id: string; emoji: string }[];
  onRemoveReaction?: (reactionId: string) => void;
  onPress?: () => void;
}) {
  const isEmpty = !name;

  return (
    <Pressable onPress={onPress} disabled={!onPress || isEmpty} style={slotStyles.container}>
      <View style={{ width: 64, height: 64, position: "relative", alignItems: "center", justifyContent: "center" }}>
        {isEmpty ? (
          <View style={[slotStyles.avatar, { backgroundColor: "rgba(255,255,255,0.1)", borderWidth: 2, borderColor: "rgba(255,255,255,0.2)", borderStyle: "dashed" }]}>
            <Ionicons name="hand-left" size={18} color="rgba(255,255,255,0.3)" />
          </View>
        ) : (
          <>
            <SpeakingPulse color={color!} active={isSpeaking} />
            {avatarUri ? (
              <Image source={{ uri: avatarUri }} style={slotStyles.avatar} resizeMode="cover" />
            ) : (
              <View style={[slotStyles.avatar, { backgroundColor: color! }]}>
                <Text style={slotStyles.initials}>{initials}</Text>
              </View>
            )}
            {isMuted && !isSpeaking && (
              <View style={slotStyles.badge}>
                <Ionicons name="mic-off" size={9} color="#fff" />
              </View>
            )}
            {isSpeaking && (
              <View style={[slotStyles.badge, { backgroundColor: color! }]}>
                <Ionicons name="mic" size={9} color="#fff" />
              </View>
            )}
          </>
        )}
        <View style={slotStyles.reactionContainer}>
          {(reactions || []).map(r => (
            <FloatingReaction key={r.id} emoji={r.emoji} onAnimationEnd={() => onRemoveReaction?.(r.id)} />
          ))}
        </View>
      </View>
      <Text style={slotStyles.name} numberOfLines={1}>{name || "Empty"}</Text>
      {isHost && !isEmpty && (
        <View style={slotStyles.hostBadge}>
          <Text style={slotStyles.hostText}>HOST</Text>
        </View>
      )}
      {isModerator && !isHost && !isEmpty && (
        <View style={[slotStyles.hostBadge, { backgroundColor: "#8B7CF6" }]}>
          <Text style={slotStyles.hostText}>MOD</Text>
        </View>
      )}
    </Pressable>
  );
}

function Bubble({ msg }: { msg: RoomMessage }) {
  return (
    <View style={[bStyle.row, bStyle.left]}>
      <View style={bStyle.bubbleRow}>
        <View style={[bStyle.miniAvatar, { backgroundColor: msg.color }]}>
          <Text style={bStyle.miniInitials}>{msg.initials}</Text>
        </View>
        <View style={[bStyle.bubble, { backgroundColor: "rgba(255,255,255,0.1)", borderWidth: 1, borderColor: "rgba(255,255,255,0.1)" }]}>
          <Text style={[bStyle.text, { color: "rgba(255,255,255,0.92)" }]}>
            <Text style={[bStyle.sender, { color: "rgba(255,255,255,0.72)" }]}>{msg.sender}: </Text>
            {msg.text}
          </Text>
        </View>
      </View>
    </View>
  );
}

export default function RoomModal({ room, user, onLeave, onMinimize, visible, onUpdateRoom, onRoomDeleted, recommendedRooms = [], onJoinRecommended }: {
  room: VoiceRoom;
  user: User | null;
  onLeave: (room: VoiceRoom) => void;
  onMinimize: () => void;
  visible: boolean;
  onUpdateRoom: (room: VoiceRoom) => void;
  onRoomDeleted?: (roomId: string) => void;
  recommendedRooms?: VoiceRoom[];
  onJoinRecommended?: (room: VoiceRoom) => void;
}) {
  const [roomState, setRoomState] = useState(room);
  const currentUserId = user?.id || "me";
  const activeRoom = roomState;
  const existingParticipant = activeRoom.participants.find((participant) => participant.id === currentUserId);
  const isHost = (activeRoom.hostId || activeRoom.participants[0]?.id || currentUserId) === currentUserId;
  const [isMuted, setIsMuted] = useState(existingParticipant?.isMuted ?? !isHost);
  const [role, setRole] = useState<"listener" | "speaker">(isHost ? "speaker" : existingParticipant?.role || "listener");
  const [showLeaveMenu, setShowLeaveMenu] = useState(false);
  const [showRequestsMenu, setShowRequestsMenu] = useState(false);
  const [showReactionMenu, setShowReactionMenu] = useState(false);
  const [reactions, setReactions] = useState<Record<string, { id: string; emoji: string }[]>>({});
  const [selectedParticipant, setSelectedParticipant] = useState<RoomParticipant | null>(null);
  const [chatInput, setChatInput] = useState("");
  const [chatMessages, setChatMessages] = useState<RoomMessage[]>(room.messages || []);
  const [isTyping, setIsTyping] = useState(false);
  const chatRef = useRef<ScrollView>(null);
  const chatInputRef = useRef<TextInput>(null);
  const wsRef = useRef<WebSocket | null>(null);

  const lang = LANGUAGES.find(l => l.code === activeRoom.languageCode);
  const langColor = lang?.color || "#FF6B35";
  const myName = user?.displayName || "You";
  const myInitials = makeInitials(myName);
  const myColor = AVATAR_COLORS[myName.length % AVATAR_COLORS.length];
  const speakerRequests = activeRoom.speakerRequests || [];
  const myRaiseRequest = speakerRequests.find((request) => request.userId === currentUserId);

  const REACTION_EMOJIS = ["❤️", "😂", "👏", "😮", "🔥", "👋"];

  useEffect(() => {
    setRoomState(room);
    setChatMessages(room.messages || []);
  }, [room]);

  useEffect(() => {
    const participant = activeRoom.participants.find((item) => item.id === currentUserId);
    setRole(isHost ? "speaker" : participant?.role || "listener");
    setIsMuted(participant?.isMuted ?? !isHost);
  }, [activeRoom.participants, currentUserId, isHost]);

  useEffect(() => {
    if (!visible) return;

    const baseUrl = new URL(getApiUrl());
    const wsProtocol = baseUrl.protocol === "https:" ? "wss:" : "ws:";
    const socket = new WebSocket(`${wsProtocol}//${baseUrl.host}/api/voice-rooms/live`);
    wsRef.current = socket;

    socket.onopen = () => {
      socket.send(JSON.stringify({
        type: "subscribe",
        roomId: activeRoom.id,
        participant: {
          id: currentUserId,
          name: myName,
          initials: myInitials,
          color: myColor,
          avatarUri: user?.avatarUri,
          role,
          isMuted,
          isSpeaking: false,
          nativeLanguage: activeRoom.language,
        },
      }));
    };

    socket.onmessage = (event) => {
      try {
        const message = JSON.parse(event.data as string) as
          | { type: "room:snapshot"; room: VoiceRoom }
          | { type: "chat"; roomId: string; message: RoomMessage }
          | { type: "reaction"; roomId: string; participantId: string; reaction: { id: string; emoji: string } }
          | { type: "room:deleted"; roomId: string };

        if (message.type === "room:snapshot" && message.room.id === activeRoom.id) {
          setRoomState(message.room);
          setChatMessages(message.room.messages || []);
          return;
        }

        if (message.type === "chat" && message.roomId === activeRoom.id) {
          setChatMessages((prev) => {
            if (prev.some((item) => item.id === message.message.id)) return prev;
            return [...prev, message.message].slice(-40);
          });
          setTimeout(() => chatRef.current?.scrollToEnd({ animated: true }), 80);
          return;
        }

        if (message.type === "reaction" && message.roomId === activeRoom.id) {
          setReactions((prev) => ({
            ...prev,
            [message.participantId]: [message.reaction],
          }));
          return;
        }

        if (message.type === "room:deleted" && message.roomId === activeRoom.id) {
          onRoomDeleted?.(activeRoom.id);
        }
      } catch (error) {
        console.error("Voice realtime client error:", error);
      }
    };

    return () => {
      if (socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify({
          type: "unsubscribe",
          roomId: activeRoom.id,
          participantId: currentUserId,
        }));
      }
      socket.close();
      wsRef.current = null;
    };
  }, [activeRoom.id, activeRoom.language, currentUserId, isMuted, myColor, myInitials, myName, onRoomDeleted, role, visible]);

  const handleSendReaction = (emoji: string) => {
    const myId = user?.id || "me";
    const reactionId = `reaction-${Date.now()}-${Math.random()}`;

    setReactions(prev => ({
      ...prev,
      [myId]: [{ id: reactionId, emoji }],
    }));
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: "reaction",
        roomId: activeRoom.id,
        participantId: myId,
        reaction: { id: reactionId, emoji },
      }));
    }
    setShowReactionMenu(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const handleRemoveReaction = (participantId: string, reactionId: string) => {
    setReactions(prev => {
      const userReactions = (prev[participantId] || []).filter(r => r.id !== reactionId);
      const next = { ...prev };
      if (userReactions.length === 0) delete next[participantId];
      else next[participantId] = userReactions;
      return next;
    });
  };

  const handleMuteUser = () => {
    if (!selectedParticipant) return;
    const updatedParticipants = activeRoom.participants.map(p => 
      p.id === selectedParticipant.id ? { ...p, isMuted: !p.isMuted } : p
    );
    onUpdateRoom({ ...activeRoom, participants: updatedParticipants });
    setSelectedParticipant(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleKickUser = () => {
    if (!selectedParticipant) return;
    const updatedParticipants = activeRoom.participants.filter(p => p.id !== selectedParticipant.id);
    onUpdateRoom({ ...activeRoom, participants: updatedParticipants });
    setSelectedParticipant(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleModUser = () => {
    if (!selectedParticipant) return;
    const updatedParticipants = activeRoom.participants.map(p => 
      p.id === selectedParticipant.id ? { ...p, isModerator: !p.isModerator } : p
    );
    onUpdateRoom({ ...activeRoom, participants: updatedParticipants });
    setSelectedParticipant(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const submitRaiseHandRequest = () => {
    if (isHost || role === "speaker") return;

    const request: RoomSpeakerRequest = {
      id: `request-${Date.now()}`,
      userId: currentUserId,
      name: myName,
      initials: myInitials,
      color: myColor,
      requestedAt: Date.now(),
    };

    onUpdateRoom({
      ...activeRoom,
      speakerRequests: [...speakerRequests.filter((item) => item.userId !== currentUserId), request],
    });
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const cancelRaiseHandRequest = () => {
    onUpdateRoom({
      ...activeRoom,
      speakerRequests: speakerRequests.filter((item) => item.userId !== currentUserId),
    });
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const approveSpeakerRequest = () => {
    const nextRequest = speakerRequests[0];
    if (!nextRequest) return;
    approveSpeakerRequestById(nextRequest.userId);
  };

  const approveSpeakerRequestById = (userId: string) => {
    const nextRequest = speakerRequests.find((request) => request.userId === userId);
    if (!nextRequest) return;

    const requestedParticipant = activeRoom.participants.find((item) => item.id === nextRequest.userId);
    const promotedParticipant: RoomParticipant = requestedParticipant
      ? { ...requestedParticipant, role: "speaker", isMuted: false }
      : {
          id: nextRequest.userId,
          name: nextRequest.name,
          initials: nextRequest.initials,
          color: nextRequest.color,
          role: "speaker",
          isMuted: false,
          isSpeaking: false,
          nativeLanguage: activeRoom.language,
        };

    const nextParticipants = requestedParticipant
      ? activeRoom.participants.map((item) => item.id === promotedParticipant.id ? promotedParticipant : item)
      : [...activeRoom.participants, promotedParticipant];

    onUpdateRoom({
      ...activeRoom,
      participants: nextParticipants,
      speakerRequests: speakerRequests.filter((item) => item.userId !== nextRequest.userId),
    });
    setShowRequestsMenu(false);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const declineSpeakerRequestById = (userId: string) => {
    onUpdateRoom({
      ...activeRoom,
      speakerRequests: speakerRequests.filter((item) => item.userId !== userId),
    });
    setShowRequestsMenu(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const handleInviteParticipant = () => {
    if (!selectedParticipant) return;
    const promotedParticipant: RoomParticipant = {
      ...selectedParticipant,
      role: "speaker",
      isMuted: false,
    };

    const nextParticipants = activeRoom.participants.some((participant) => participant.id === selectedParticipant.id)
      ? activeRoom.participants.map((participant) => participant.id === selectedParticipant.id ? promotedParticipant : participant)
      : [...activeRoom.participants, promotedParticipant];

    const nextRoom = {
      ...activeRoom,
      participants: nextParticipants,
      speakerRequests: speakerRequests.filter((item) => item.userId !== selectedParticipant.id),
    };
    setRoomState(nextRoom);
    onUpdateRoom(nextRoom);
    setSelectedParticipant(null);
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
  };

  const handleViewProfile = () => {
    if (!selectedParticipant) return;
    router.push({
      pathname: "/user/[id]",
      params: {
        id: selectedParticipant.id,
        name: selectedParticipant.name,
        initials: selectedParticipant.initials,
        color: selectedParticipant.color,
        avatarUri: selectedParticipant.avatarUri,
        language: selectedParticipant.nativeLanguage,
        location: "Voice Room",
        bio: selectedParticipant.name ? `${selectedParticipant.name} is practicing languages in voice rooms.` : "",
      },
    });
    setSelectedParticipant(null);
  };

  const participantSlots = useMemo(() => {
    const allParticipants = (activeRoom.participants || []).filter(p => p.id !== user?.id);

    return Array.from({ length: 10 }, (_, i) => {
      if (i === 0) {
        return {
          id: user?.id || "me",
          name: myName,
          initials: myInitials,
          color: myColor,
          avatarUri: user?.avatarUri,
          role: role,
          isMuted: isMuted,
          isSpeaking: false,
          nativeLanguage: "English",
          displayName: "You",
          displayInitials: myInitials,
          displayColor: myColor,
          displayAvatarUri: user?.avatarUri,
          isMe: true,
          reactions: reactions[user?.id || "me"],
          onRemoveReaction: (reactionId: string) => handleRemoveReaction(user?.id || "me", reactionId),
        };
      }

      const participant = allParticipants[i - 1];

      if (participant) {
        return {
          ...participant,
          displayName: participant.name,
          displayInitials: participant.initials,
          displayColor: participant.color,
          displayAvatarUri: participant.avatarUri,
          isMe: false,
          reactions: reactions[participant.id],
          isModerator: participant.isModerator,
          onRemoveReaction: (reactionId: string) => handleRemoveReaction(participant.id, reactionId),
        };
      }
      return null;
    });
  }, [activeRoom.participants, user, role, isMuted, reactions, myName, myInitials, myColor]);

  const audiencePreview = useMemo(() => {
    const listeners = (activeRoom.participants || [])
      .filter((participant) => participant.id !== currentUserId && participant.role !== "speaker")
      .map((participant) => ({
        id: participant.id,
        initials: participant.initials,
        color: participant.color,
        name: participant.name,
      }));

    const pending = speakerRequests
      .filter((request) => !listeners.some((participant) => participant.id === request.userId))
      .map((request) => ({
        id: request.userId,
        initials: request.initials,
        color: request.color,
        name: request.name,
      }));

    return [...listeners, ...pending].slice(0, 8);
  }, [activeRoom.participants, currentUserId, speakerRequests]);

  const leaveRecommendations = useMemo(
    () => recommendedRooms.filter((candidate) => candidate.id !== activeRoom.id).slice(0, 8),
    [activeRoom.id, recommendedRooms],
  );

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
    setChatMessages(prev => prev.some((item) => item.id === msg.id) ? prev : [...prev, msg].slice(-40));
    if (wsRef.current?.readyState === WebSocket.OPEN) {
      wsRef.current.send(JSON.stringify({
        type: "chat",
        roomId: activeRoom.id,
        message: msg,
      }));
    } else {
      onUpdateRoom({
        ...activeRoom,
        messages: [...chatMessages, msg].slice(-40),
      });
    }
    setChatInput("");
    setIsTyping(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTimeout(() => chatRef.current?.scrollToEnd({ animated: true }), 100);
  };

  const handleLeave = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Heavy);
    setShowLeaveMenu(false);
    onLeave(activeRoom);
  };

  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;
  const botPad = Platform.OS === "web" ? 34 : Math.max(insets.bottom, 16);

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <KeyboardAvoidingView
        style={rmStyles.container}
        behavior={Platform.OS === "ios" ? "padding" : undefined}
        keyboardVerticalOffset={Platform.OS === "ios" ? 18 : 0}
      >
        <RoomBackground background={activeRoom.background} />
        <View style={[rmStyles.header, { paddingTop: topPad + 8 }]}>
          <View style={rmStyles.headerContent}>
            <LoopingRoomTitle title={activeRoom.topic} />
            <View style={rmStyles.tagRow}>
              <View style={[rmStyles.langTag, { backgroundColor: langColor }]}>
                <Text style={rmStyles.langTagText}>{activeRoom.languageCode.toUpperCase()}</Text>
              </View>
              <View style={[rmStyles.levelTag, { backgroundColor: "rgba(255,255,255,0.2)" }]}>
                <Text style={rmStyles.levelTagText}>{activeRoom.level}</Text>
              </View>
            </View>
          </View>
          <View style={rmStyles.headerIcons}>
            <Pressable 
              onPress={() => setShowLeaveMenu(true)}
              style={rmStyles.iconBtn}
            >
              <Ionicons name="power" size={20} color="#fff" />
            </Pressable>
          </View>
        </View>

        <View style={rmStyles.participantsContainer}>
          <View style={rmStyles.participantsGrid}>
            <View style={rmStyles.participantsRow}>
              {participantSlots.slice(0, 5).map((slot, idx) => (
                <ParticipantSlot
                  key={slot?.id || `empty-audience-1-${idx}`}
                  initials={slot?.displayInitials || null}
                  color={slot?.displayColor || null}
                  avatarUri={slot?.displayAvatarUri || null}
                  name={slot?.displayName || null}
                  isSpeaking={slot?.isSpeaking || (slot?.isMe && !isMuted) || false}
                  isMuted={slot?.isMuted || (slot?.isMe ? isMuted : true)}
                  isHost={slot?.id === (activeRoom.hostId || activeRoom.participants[0]?.id || currentUserId)}
                  isModerator={Boolean((slot as any)?.isModerator)}
                  reactions={slot?.reactions}
                  onRemoveReaction={slot?.onRemoveReaction}
                  onPress={() => {
                    if (!slot) return;
                    if (slot.isMe) {
                      router.push({
                        pathname: "/user/[id]",
                        params: {
                          id: currentUserId,
                          name: myName,
                          initials: myInitials,
                          color: myColor,
                          avatarUri: user?.avatarUri,
                          language: user?.nativeLanguage || activeRoom.language,
                          location: user?.locationName || "Voice Room",
                          bio: user?.bio || "",
                        },
                      });
                      return;
                    }
                    setSelectedParticipant(slot as any);
                  }}
                />
              ))}
            </View>
            <View style={rmStyles.participantsRow}>
              {participantSlots.slice(5, 10).map((slot, idx) => (
                <ParticipantSlot
                  key={slot?.id || `empty-audience-2-${idx}`}
                  initials={slot?.displayInitials || null}
                  color={slot?.displayColor || null}
                  avatarUri={slot?.displayAvatarUri || null}
                  name={slot?.displayName || null}
                  isSpeaking={slot?.isSpeaking || false}
                  isMuted={slot?.isMuted || true}
                  isHost={false}
                  isModerator={Boolean((slot as any)?.isModerator)}
                  reactions={slot?.reactions}
                  onRemoveReaction={slot?.onRemoveReaction}
                  onPress={() => {
                    if (!slot) return;
                    if (slot.isMe) {
                      router.push({
                        pathname: "/user/[id]",
                        params: {
                          id: currentUserId,
                          name: myName,
                          initials: myInitials,
                          color: myColor,
                          avatarUri: user?.avatarUri,
                          language: user?.nativeLanguage || activeRoom.language,
                          location: user?.locationName || "Voice Room",
                          bio: user?.bio || "",
                        },
                      });
                      return;
                    }
                    setSelectedParticipant(slot as any);
                  }}
                />
              ))}
            </View>
          </View>
          <View style={[rmStyles.divider, { backgroundColor: "rgba(255,255,255,0.15)" }]} />
          <View style={rmStyles.audienceStrip}>
            {audiencePreview.length > 0 ? (
              <ScrollView
                horizontal
                style={rmStyles.audienceScroll}
                contentContainerStyle={rmStyles.audienceRow}
                showsHorizontalScrollIndicator={false}
              >
                {audiencePreview.map((participant) => (
                  <Pressable
                    key={participant.id}
                    style={rmStyles.audienceItem}
                    onPress={() => {
                      const fullParticipant = activeRoom.participants.find((item) => item.id === participant.id);
                      if (fullParticipant) {
                        setSelectedParticipant(fullParticipant);
                      }
                    }}
                  >
                    <View style={[rmStyles.audienceAvatar, { backgroundColor: participant.color }]}>
                      <Text style={rmStyles.audienceInitials}>{participant.initials}</Text>
                    </View>
                  </Pressable>
                ))}
              </ScrollView>
            ) : (
              <Text style={rmStyles.audienceEmpty}>People joining your room will show here</Text>
            )}
          </View>
        </View>

        {(chatMessages.length > 0 || chatInput.trim()) && (
          <View style={rmStyles.chatContainer}>
            <ScrollView 
              ref={chatRef}
              style={{ maxHeight: 340 }}
              contentContainerStyle={rmStyles.chatMessages}
              showsVerticalScrollIndicator={false}
              keyboardShouldPersistTaps="handled"
            >
              {chatMessages.length === 0 ? (
                <Text style={rmStyles.chatEmpty}>Start the conversation</Text>
              ) : (
                chatMessages.map(msg => (
                  <Bubble key={msg.id} msg={msg} />
                ))
              )}
            </ScrollView>
          </View>
        )}

        {showReactionMenu && !isTyping && (
          <View style={reactionStyles.menu}>
            {REACTION_EMOJIS.map(emoji => (
              <Pressable key={emoji} onPress={() => handleSendReaction(emoji)} style={reactionStyles.emojiBtn}>
                <Text style={reactionStyles.emojiText}>{emoji}</Text>
              </Pressable>
            ))}
          </View>
        )}

        {!isTyping && (
          <View style={rmStyles.floatingMicWrap}>
            <Pressable
              onPress={() => {
                const nextMuted = !isMuted;
                setIsMuted(nextMuted);
                const currentParticipant: RoomParticipant = {
                  id: currentUserId,
                  name: myName,
                  initials: myInitials,
                  color: myColor,
                  avatarUri: user?.avatarUri,
                  role,
                  isMuted: nextMuted,
                  isSpeaking: false,
                  nativeLanguage: user?.nativeLanguage || activeRoom.language,
                };
                const hasCurrentParticipant = activeRoom.participants.some((participant) => participant.id === currentUserId);
                const updatedParticipants = hasCurrentParticipant
                  ? activeRoom.participants.map((participant) =>
                      participant.id === currentUserId ? { ...participant, isMuted: nextMuted } : participant,
                    )
                  : [...activeRoom.participants, currentParticipant];
                const nextRoom = { ...activeRoom, participants: updatedParticipants };
                setRoomState(nextRoom);
                onUpdateRoom(nextRoom);
                Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
              }}
              style={[rmStyles.ctrlBtn, !isMuted && { backgroundColor: "rgba(239,68,68,0.92)", borderColor: "transparent" }]}
            >
              <Ionicons name={isMuted ? "mic-off" : "mic"} size={18} color="#fff" />
            </Pressable>
          </View>
        )}

        <View style={[rmStyles.controls, { paddingBottom: botPad }]}>
          {!isTyping && <View style={rmStyles.requestRow}>
            {!isHost && role === "listener" ? (
              <Pressable
                onPress={myRaiseRequest ? cancelRaiseHandRequest : submitRaiseHandRequest}
                style={rmStyles.noticeCard}
              >
                <Ionicons name="hand-left" size={18} color={myRaiseRequest ? "#F7C948" : "#fff"} />
                <View style={rmStyles.noticeTextWrap}>
                  <Text style={rmStyles.noticeTitle}>{myRaiseRequest ? "I Raised Hand" : "Raise Hand"}</Text>
                  <Text style={rmStyles.noticeSub}>
                    {myRaiseRequest ? "Host will see your request" : "Ask the host to bring you up"}
                  </Text>
                </View>
              </Pressable>
            ) : null}
          </View>}
          <View style={rmStyles.controlsRow}>
            <View style={rmStyles.controlsMain}>
              <View style={rmStyles.messageInputWrap}>
                <TextInput
                  ref={chatInputRef}
                  value={chatInput}
                  onChangeText={setChatInput}
                  onFocus={() => { setIsTyping(true); setShowReactionMenu(false); }}
                  onBlur={() => setIsTyping(false)}
                  placeholder="Write something..."
                  placeholderTextColor="rgba(255,255,255,0.55)"
                  style={rmStyles.messageInput}
                  returnKeyType="send"
                  onSubmitEditing={handleSendChat}
                />
                <Pressable
                  onPress={handleSendChat}
                  disabled={!chatInput.trim()}
                  style={[rmStyles.messageSendBtn, { opacity: chatInput.trim() ? 1 : 0.5 }]}
                >
                  <Ionicons name="send" size={12} color="#fff" />
                </Pressable>
              </View>

              {!isTyping && (
                <>
                  <Pressable 
                    onPress={() => { setShowReactionMenu(v => !v); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                    style={[rmStyles.ctrlBtn, showReactionMenu && { backgroundColor: "rgba(247,201,72,0.28)", borderWidth: 1, borderColor: "rgba(247,201,72,0.45)" }]}
                  >
                    <Text style={{ fontSize: 20 }}>😊</Text>
                  </Pressable>

                  {isHost && (
                    <Pressable onPress={() => setShowRequestsMenu(true)} style={rmStyles.ctrlBtn}>
                      <Ionicons name="hand-left" size={18} color="#fff" />
                      {speakerRequests.length > 0 && (
                        <View style={rmStyles.ctrlBadge}>
                          <Text style={rmStyles.ctrlBadgeText}>{speakerRequests.length}</Text>
                        </View>
                      )}
                    </Pressable>
                  )}

                  <Pressable style={rmStyles.ctrlBtn}>
                    <Ionicons name="wallet" size={18} color="#fff" />
                  </Pressable>

                  <Pressable style={rmStyles.ctrlBtn}>
                    <Ionicons name="ellipsis-horizontal" size={18} color="#fff" />
                  </Pressable>
                </>
              )}
            </View>
          </View>
        </View>

        <Modal visible={showLeaveMenu} transparent animationType="none">
          <View style={rmStyles.leaveOverlay}>
            <Pressable style={StyleSheet.absoluteFillObject} onPress={() => setShowLeaveMenu(false)} />
            <View style={rmStyles.leaveSheetWrap}>
            <View style={rmStyles.leaveMenu}>
              <ScrollView
                style={rmStyles.leaveScroll}
                contentContainerStyle={rmStyles.leaveScrollContent}
                showsVerticalScrollIndicator={false}
              >
                <Text style={rmStyles.leaveTitle}>Leave Room?</Text>
                <View style={rmStyles.leaveActions}>
                  <View style={rmStyles.leaveActionWrap}>
                    <Pressable
                      onPress={handleLeave}
                      style={[rmStyles.leaveCircleBtn, { backgroundColor: "rgba(239,68,68,0.92)", borderColor: "rgba(255,255,255,0.14)" }]}
                    >
                      <Ionicons name="power" size={22} color="#fff" />
                    </Pressable>
                    <Text style={rmStyles.leaveBtnText}>Leave room</Text>
                  </View>

                  <View style={rmStyles.leaveActionWrap}>
                    <Pressable
                      onPress={() => { setShowLeaveMenu(false); onMinimize(); }}
                      style={[rmStyles.leaveCircleBtn, { backgroundColor: "rgba(255,255,255,0.94)", borderColor: "rgba(255,255,255,0.16)" }]}
                    >
                      <Ionicons name="expand" size={22} color="#111827" />
                    </Pressable>
                    <Text style={rmStyles.leaveBtnText}>Minimize</Text>
                  </View>
                </View>

                {leaveRecommendations.length > 0 && (
                  <View style={rmStyles.recSection}>
                    <Text style={rmStyles.recTitle}>Recommended room</Text>
                    <View style={rmStyles.recList}>
                      {leaveRecommendations.map((recommendedRoom) => {
                        const bg = getRoomBackgroundPreview(recommendedRoom.background);

                        return (
                          <View key={recommendedRoom.id} style={rmStyles.recCard}>
                            {bg.type === "image" ? (
                              <Image
                                source={{ uri: bg.uri }}
                                style={[rmStyles.recCardBg, { backgroundColor: bg.fallback }]}
                                resizeMode="cover"
                              />
                            ) : (
                              <View style={[rmStyles.recCardBg, { backgroundColor: bg.color }]} />
                            )}
                            <View style={rmStyles.recCardOverlay} />
                            <View style={rmStyles.recCardGlass} />

                            <View style={rmStyles.recCardTop}>
                              <View style={rmStyles.recCardMain}>
                                <View style={rmStyles.recCardLangRow}>
                                  <Text style={rmStyles.recCardLang}>
                                    {recommendedRoom.languageCode.toUpperCase()} {recommendedRoom.level === "All Levels" ? "ALL" : recommendedRoom.level.toUpperCase()}
                                  </Text>
                                  <View style={rmStyles.recCardPill}>
                                    <Text style={rmStyles.recCardPillText}>
                                      {recommendedRoom.theme.replace(/_/g, " ")}
                                    </Text>
                                  </View>
                                </View>
                                <Text style={rmStyles.recCardTopic} numberOfLines={1}>
                                  {shortenRoomTopic(recommendedRoom.topic)}
                                </Text>
                              </View>
                              <Pressable
                                onPress={() => {
                                  setShowLeaveMenu(false);
                                  onJoinRecommended?.(recommendedRoom);
                                }}
                                style={rmStyles.recJoinBtn}
                              >
                                <Ionicons name="arrow-forward" size={15} color="#4ECDC4" />
                              </Pressable>
                            </View>
                            <View style={rmStyles.recCardBottom}>
                              <View style={rmStyles.recAvatars}>
                                {recommendedRoom.participants.slice(0, 4).map((participant) => (
                                  <View
                                    key={participant.id}
                                    style={[rmStyles.recAvatar, { backgroundColor: participant.color }]}
                                  >
                                    <Text style={rmStyles.recAvatarText}>{participant.initials}</Text>
                                  </View>
                                ))}
                                <View style={rmStyles.recCountBubble}>
                                  <Text style={rmStyles.recCountText}>{recommendedRoom.participants.length}</Text>
                                </View>
                              </View>
                              <Text style={rmStyles.recJoinText}>Join room</Text>
                            </View>
                          </View>
                        );
                      })}
                    </View>
                  </View>
                )}
              </ScrollView>
            </View>
            </View>
          </View>
        </Modal>

        <Modal visible={showRequestsMenu} transparent animationType="slide">
          <Pressable style={rmStyles.requestsOverlay} onPress={() => setShowRequestsMenu(false)}>
            <Pressable style={rmStyles.requestsSheet} onPress={() => {}}>
              <View style={rmStyles.requestsHandle} />
              <Text style={rmStyles.requestsTitle}>Raise Hand Requests</Text>
              <Text style={rmStyles.requestsSub}>
                {speakerRequests.length > 0 ? "Approve users here to move them into an empty participant slot." : "No one is requesting to join the stage right now."}
              </Text>

              {speakerRequests.length > 0 && (
                <ScrollView style={rmStyles.requestsList} showsVerticalScrollIndicator={false}>
                  {speakerRequests.map((request) => (
                    <View key={request.id} style={rmStyles.requestItem}>
                      <View style={[rmStyles.requestAvatar, { backgroundColor: request.color }]}>
                        <Text style={rmStyles.requestAvatarText}>{request.initials}</Text>
                      </View>
                      <View style={rmStyles.requestInfo}>
                        <Text style={rmStyles.requestName}>{request.name}</Text>
                        <Text style={rmStyles.requestMeta}>Wants to join the participant area</Text>
                      </View>
                      <Pressable onPress={() => declineSpeakerRequestById(request.userId)} style={rmStyles.requestDeclineBtn}>
                        <Text style={rmStyles.requestDeclineText}>Decline</Text>
                      </Pressable>
                      <Pressable onPress={() => approveSpeakerRequestById(request.userId)} style={rmStyles.requestApproveBtn}>
                        <Text style={rmStyles.requestApproveText}>Accept</Text>
                      </Pressable>
                    </View>
                  ))}
                </ScrollView>
              )}
            </Pressable>
          </Pressable>
        </Modal>

        {/* Participant Action Menu */}
        <Modal visible={!!selectedParticipant} transparent animationType="fade">
          <Pressable style={rmStyles.requestsOverlay} onPress={() => setSelectedParticipant(null)}>
            <Pressable style={rmStyles.profileSheet} onPress={() => {}}>
              <View style={rmStyles.requestsHandle} />
              <View style={rmStyles.profileTop}>
                <View style={[rmStyles.profileAvatar, { backgroundColor: selectedParticipant?.color || "#4ECDC4" }]}>
                  <Text style={rmStyles.profileAvatarText}>{selectedParticipant?.initials}</Text>
                </View>
                <View style={{ flex: 1 }}>
                  <Text style={rmStyles.profileName}>{selectedParticipant?.name}</Text>
                  <Text style={rmStyles.profileMeta}>
                    {selectedParticipant?.nativeLanguage || "English"} · {selectedParticipant?.role === "speaker" ? "On stage" : "Audience"}
                  </Text>
                </View>
              </View>

              <View style={rmStyles.profileActions}>
                {selectedParticipant?.role === "speaker" ? (
                  <Pressable onPress={handleKickUser} style={[rmStyles.profileActionBtn, rmStyles.profileActionPrimary]}>
                    <Text style={rmStyles.profileActionText}>Remove</Text>
                  </Pressable>
                ) : (
                  <Pressable onPress={handleInviteParticipant} style={[rmStyles.profileActionBtn, rmStyles.profileActionPrimary]}>
                    <Text style={rmStyles.profileActionText}>Invite</Text>
                  </Pressable>
                )}

                <Pressable onPress={handleViewProfile} style={rmStyles.profileActionBtn}>
                  <Text style={rmStyles.profileActionText}>View profile</Text>
                </Pressable>
              </View>

              {selectedParticipant?.role === "speaker" && (
                <View style={rmStyles.profileActions}>
                  <Pressable onPress={handleMuteUser} style={rmStyles.profileActionBtn}>
                    <Text style={rmStyles.profileActionText}>{selectedParticipant?.isMuted ? "Unmute" : "Mute"}</Text>
                  </Pressable>
                  <Pressable onPress={handleModUser} style={rmStyles.profileActionBtn}>
                    <Text style={rmStyles.profileActionText}>{selectedParticipant?.isModerator ? "Remove mod" : "Make mod"}</Text>
                  </Pressable>
                </View>
              )}

              <Pressable onPress={handleViewProfile} style={rmStyles.profileLinkRow}>
                <Text style={rmStyles.profileLinkText}>Visit profile</Text>
                <Ionicons name="chevron-forward" size={18} color="#fff" />
              </Pressable>
            </Pressable>
          </Pressable>
        </Modal>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function WindAnimatedBackground({ uri, backgroundColor }: { uri: string; backgroundColor: string }) {
  const anim = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    Animated.loop(
      Animated.sequence([
        Animated.timing(anim, {
          toValue: 1,
          duration: 6000, // Mabagal na galaw para parang hangin lang
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: Platform.OS !== "web",
        }),
        Animated.timing(anim, {
          toValue: 0,
          duration: 6000,
          easing: Easing.inOut(Easing.ease),
          useNativeDriver: Platform.OS !== "web",
        }),
      ])
    ).start();
  }, [anim]);

  const translateX = anim.interpolate({
    inputRange: [0, 1],
    outputRange: [-12, 12],
  });

  return (
    <Animated.Image
      source={{ uri }}
      style={[
        StyleSheet.absoluteFillObject,
        {
          backgroundColor,
          transform: [{ translateX }, { scale: 1.05 }],
        },
      ]}
      resizeMode="cover"
    />
  );
}

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
  const backgroundOverlay = (
    <View
      style={[
        StyleSheet.absoluteFillObject,
        { backgroundColor: "rgba(8, 12, 20, 0.34)" },
      ]}
    />
  );
  const backgroundImageStyle = [
    StyleSheet.absoluteFillObject,
    {
      backgroundColor: "#111",
      transform: [{ scale: 1.04 }],
    },
  ];

  if (background === 'rose') {
    return (
      <>
        <Image source={{ uri: 'https://images.unsplash.com/photo-1496857239036-1fb137683000?q=80&w=1000&auto=format&fit=crop' }} style={[...backgroundImageStyle, { backgroundColor: '#e11d48' }]} resizeMode="cover" />
        {backgroundOverlay}
      </>
    );
  }
  if (background === 'earth') {
    return (
      <>
        <Image source={{ uri: 'https://images.unsplash.com/photo-1614730341194-75c60740a2d3?q=80&w=1000&auto=format&fit=crop' }} style={[...backgroundImageStyle, { backgroundColor: '#2563eb' }]} resizeMode="cover" />
        {backgroundOverlay}
      </>
    );
  }
  if (background === 'sunflower') {
    return (
      <>
        <WindAnimatedBackground uri="https://images.unsplash.com/photo-1597848212624-a19eb35e2651?q=80&w=1000&auto=format&fit=crop" backgroundColor="#f59e0b" />
        {backgroundOverlay}
      </>
    );
  }
  if (background === 'spring') {
    return (
      <>
        <Image source={{ uri: 'https://images.unsplash.com/photo-1522748906645-95d8adfd52c7?q=80&w=1000&auto=format&fit=crop' }} style={[...backgroundImageStyle, { backgroundColor: '#4ade80' }]} resizeMode="cover" />
        {backgroundOverlay}
      </>
    );
  }
  if (background === 'summer') {
    return (
      <>
        <WindAnimatedBackground uri="https://images.unsplash.com/photo-1507525428034-b723cf961d3e?q=80&w=1000&auto=format&fit=crop" backgroundColor="#facc15" />
        {backgroundOverlay}
      </>
    );
  }
  if (background === 'autumn') {
    return (
      <>
        <Image source={{ uri: 'https://images.unsplash.com/photo-1506744038136-46273834b3fb?q=80&w=1000&auto=format&fit=crop' }} style={[...backgroundImageStyle, { backgroundColor: '#fb923c' }]} resizeMode="cover" />
        {backgroundOverlay}
      </>
    );
  }
  if (background === 'winter') {
    return (
      <>
        <Image source={{ uri: 'https://images.unsplash.com/photo-1457269449834-928af6406ed3?q=80&w=1000&auto=format&fit=crop' }} style={[...backgroundImageStyle, { backgroundColor: '#60a5fa' }]} resizeMode="cover" />
        {backgroundOverlay}
      </>
    );
  }
  if (background === 'sari_sari') {
    return (
      <>
        <Image source={{ uri: 'https://images.unsplash.com/photo-1555396273-367ea4eb4db5?q=80&w=1000&auto=format&fit=crop' }} style={[...backgroundImageStyle, { backgroundColor: '#eab308' }]} resizeMode="cover" />
        {backgroundOverlay}
      </>
    );
  }
  if (background === 'mario') {
    return (
      <>
        <Image source={{ uri: 'https://images.unsplash.com/photo-1612287230217-969e2614d601?q=80&w=1000&auto=format&fit=crop' }} style={[...backgroundImageStyle, { backgroundColor: '#ef4444' }]} resizeMode="cover" />
        {backgroundOverlay}
      </>
    );
  }

  // Fallback for any unexpected background value
  return <View style={{ ...StyleSheet.absoluteFillObject, backgroundColor: "#1c1c1e" }} />;
}
