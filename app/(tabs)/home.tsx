import React, { useCallback, useMemo, useState } from "react";
import {
  View, Text, ScrollView, StyleSheet, Pressable,
  useColorScheme, Platform, Image,
} from "react-native";
import { useFocusEffect, router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { ScreenBackdrop } from "@/components/ScreenBackdrop";
import { useAuth } from "@/context/AuthContext";
import { loadMoments, type UserMoment } from "@/lib/moments";
import * as Haptics from "expo-haptics";
import { LANGUAGES } from "@/data/lessons";

function FeedCard({ moment, colors }: { moment: UserMoment; colors: typeof Colors.dark }) {
  const [liked, setLiked] = useState(false);
  const [likes, setLikes] = useState(moment.likes);

  return (
    <View style={[styles.feedCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={styles.feedHeader}>
        {moment.userAvatarUri ? (
          <Image source={{ uri: moment.userAvatarUri }} style={styles.feedAvatarImage} />
        ) : (
          <View style={[styles.feedAvatar, { backgroundColor: moment.userColor }]}>
            <Text style={styles.feedAvatarInitials}>{moment.userInitials}</Text>
          </View>
        )}
        <View style={{ flex: 1 }}>
          <Text style={[styles.feedName, { color: colors.text }]}>{moment.userName}</Text>
          <View style={styles.feedMetaRow}>
            <View style={[styles.feedLangPill, { backgroundColor: moment.langColor + "18", borderColor: moment.langColor + "38" }]}>
              <View style={[styles.feedLangDot, { backgroundColor: moment.langColor }]} />
              <Text style={[styles.feedLangText, { color: moment.langColor }]}>{moment.lang}</Text>
            </View>
            <Text style={[styles.feedTime, { color: colors.muted }]}>{moment.timeLabel}</Text>
          </View>
        </View>
      </View>

      <Text style={[styles.feedText, { color: colors.text }]}>{moment.text}</Text>

      <View style={[styles.feedActions, { borderTopColor: colors.border + "70" }]}>
        <Pressable
          onPress={() => {
            setLiked((value) => !value);
            setLikes((value) => value + (liked ? -1 : 1));
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
          style={styles.feedActionBtn}
        >
          <Ionicons name={liked ? "heart" : "heart-outline"} size={18} color={liked ? "#FF4757" : colors.muted} />
          <Text style={[styles.feedActionText, { color: colors.muted }]}>{likes}</Text>
        </Pressable>
        <View style={styles.feedActionBtn}>
          <Ionicons name="chatbubble-outline" size={17} color={colors.muted} />
          <Text style={[styles.feedActionText, { color: colors.muted }]}>{moment.comments}</Text>
        </View>
        <View style={styles.feedActionBtn}>
          <Ionicons name="share-social-outline" size={18} color={colors.muted} />
        </View>
      </View>
    </View>
  );
}

export default function HomeScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const [moments, setMoments] = useState<UserMoment[]>([]);
  const [feedTab, setFeedTab] = useState<"recent" | "forYou">("recent");

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : Math.max(insets.bottom, 20);

  useFocusEffect(
    useCallback(() => {
      let active = true;

      const refreshFeed = async () => {
        const allMoments = await loadMoments();
        if (!active) return;
        setMoments(
          allMoments
            .filter((moment) => moment.userId !== user?.id)
            .sort((a, b) => b.createdAt - a.createdAt),
        );
      };

      refreshFeed();

      return () => {
        active = false;
      };
    }, [user?.id]),
  );

  const visibleMoments = useMemo(() => {
    const recent = [...moments].sort((a, b) => b.createdAt - a.createdAt);
    if (feedTab === "recent") return recent;

    const interests = new Set(
      (user?.learningLanguages || []).flatMap((code) => {
        const language = LANGUAGES.find((item) => item.code === code);
        return [code.toLowerCase(), language?.name.toLowerCase() || ""];
      }).filter(Boolean),
    );

    const personalized = recent.filter((moment) => {
      const lang = moment.lang.toLowerCase();
      return Array.from(interests).some((code) => lang.includes(code) || lang.includes(code === "en" ? "english" : ""));
    });

    return personalized.length > 0 ? personalized : recent;
  }, [feedTab, moments, user?.learningLanguages]);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenBackdrop
        primaryColor={colors.primary + "18"}
        secondaryColor={colors.gold + "12"}
      />

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 110 + bottomInset }}>
        <View style={[styles.header, { paddingTop: topInset + 16 }]}>
          <View>
            <Text style={[styles.greeting, { color: colors.muted }]}>
              {user ? `Hello, ${user.displayName.split(" ")[0]}` : "Welcome back"}
            </Text>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Home</Text>
          </View>
          <Pressable
            onPress={() => router.push("/(tabs)/progress")}
            style={[styles.headerBtn, { backgroundColor: colors.card + "C8", borderColor: colors.border + "88" }]}
          >
            <Ionicons name="person-outline" size={20} color={colors.text} />
          </Pressable>
        </View>

        <View style={styles.sectionHeader}>
          <View>
            <Text style={[styles.sectionTitle, { color: colors.text }]}>Community Feed</Text>
            <Text style={[styles.sectionSub, { color: colors.muted }]}>See what learners are posting</Text>
          </View>
          <Pressable
            onPress={() => router.push("/(tabs)/progress")}
            style={[styles.postLink, { backgroundColor: colors.primary + "18", borderColor: colors.primary + "30" }]}
          >
            <Ionicons name="add" size={16} color={colors.primary} />
            <Text style={[styles.postLinkText, { color: colors.primary }]}>Post</Text>
          </Pressable>
        </View>

        <View style={styles.filterRow}>
          {[
            { key: "recent", label: "Recent posts" },
            { key: "forYou", label: "For you" },
          ].map((item) => {
            const selected = feedTab === item.key;
            return (
              <Pressable
                key={item.key}
                onPress={() => setFeedTab(item.key as "recent" | "forYou")}
                style={[
                  styles.filterChip,
                  {
                    backgroundColor: selected ? colors.primary + "18" : colors.card + "C8",
                    borderColor: selected ? colors.primary + "40" : colors.border + "88",
                  },
                ]}
              >
                <Text style={[styles.filterChipText, { color: selected ? colors.primary : colors.text }]}>{item.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {visibleMoments.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.card + "CC", borderColor: colors.border + "88" }]}>
            <Ionicons name="images-outline" size={34} color={colors.muted} />
            <Text style={[styles.emptyTitle, { color: colors.text }]}>No user moments yet</Text>
            <Text style={[styles.emptyText, { color: colors.muted }]}>
              Posts shared by users will appear here on Home.
            </Text>
          </View>
        ) : (
          <View style={styles.feedList}>
            {visibleMoments.map((moment) => (
              <FeedCard key={moment.id} moment={moment} colors={colors} />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  bgOrbWrap: { ...StyleSheet.absoluteFillObject, overflow: "hidden" },
  bgOrb: { position: "absolute", borderRadius: 999 },
  bgOrbOne: { width: 220, height: 220, top: -70, right: -60 },
  bgOrbTwo: { width: 180, height: 180, top: 180, left: -90 },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 14,
  },
  greeting: { fontSize: 13, fontFamily: "Nunito_600SemiBold" },
  headerTitle: { fontSize: 30, fontFamily: "Nunito_800ExtraBold", letterSpacing: 0.2 },
  headerBtn: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  sectionHeader: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    paddingHorizontal: 20,
    marginBottom: 14,
  },
  sectionTitle: { fontSize: 19, fontFamily: "Nunito_800ExtraBold", letterSpacing: 0.2 },
  sectionSub: { fontSize: 13, fontFamily: "Nunito_600SemiBold", marginTop: 2 },
  postLink: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    borderWidth: 1,
  },
  postLinkText: { fontSize: 13, fontFamily: "Nunito_700Bold" },
  filterRow: { flexDirection: "row", gap: 8, paddingHorizontal: 20, marginBottom: 14 },
  filterChip: {
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
  },
  filterChipText: { fontSize: 13, fontFamily: "Nunito_700Bold" },
  feedList: { paddingHorizontal: 20, gap: 14 },
  feedCard: {
    borderRadius: 18,
    borderWidth: 1,
    padding: 15,
    gap: 12,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.06,
    shadowRadius: 14,
    elevation: 3,
  },
  feedHeader: { flexDirection: "row", alignItems: "center", gap: 12 },
  feedAvatar: { width: 48, height: 48, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  feedAvatarImage: { width: 48, height: 48, borderRadius: 24 },
  feedAvatarInitials: { color: "#fff", fontSize: 16, fontFamily: "Nunito_800ExtraBold" },
  feedName: { fontSize: 15, fontFamily: "Nunito_800ExtraBold" },
  feedMetaRow: { flexDirection: "row", alignItems: "center", gap: 8, marginTop: 4 },
  feedLangPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 5,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
  },
  feedLangDot: { width: 6, height: 6, borderRadius: 3 },
  feedLangText: { fontSize: 11, fontFamily: "Nunito_700Bold" },
  feedTime: { fontSize: 11, fontFamily: "Nunito_600SemiBold" },
  feedText: { fontSize: 15, fontFamily: "Nunito_600SemiBold", lineHeight: 22 },
  feedActions: {
    flexDirection: "row",
    alignItems: "center",
    gap: 18,
    paddingTop: 12,
    borderTopWidth: 1,
  },
  feedActionBtn: { flexDirection: "row", alignItems: "center", gap: 6 },
  feedActionText: { fontSize: 12, fontFamily: "Nunito_700Bold" },
  emptyCard: {
    marginHorizontal: 20,
    borderRadius: 18,
    borderWidth: 1,
    paddingHorizontal: 18,
    paddingVertical: 28,
    alignItems: "center",
    gap: 10,
  },
  emptyTitle: { fontSize: 17, fontFamily: "Nunito_800ExtraBold" },
  emptyText: { fontSize: 13, fontFamily: "Nunito_600SemiBold", textAlign: "center", lineHeight: 19 },
});
