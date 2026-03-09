import React, { useMemo, useState } from "react";
import {
  View, Text, ScrollView, StyleSheet, Pressable, TextInput,
  useColorScheme, Platform,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { ScreenBackdrop } from "@/components/ScreenBackdrop";
import { LESSONS, LANGUAGES, type Language, type Lesson } from "@/data/lessons";
import { READINGS } from "@/data/readings";
import { useAuth } from "@/context/AuthContext";
import { useProgress } from "@/context/ProgressContext";

function LangFlag({ lang, selected, onPress }: { lang: Language; selected: boolean; onPress: () => void }) {
  const colorScheme = useColorScheme();
  const colors = colorScheme === "dark" ? Colors.dark : Colors.light;

  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.langChip,
        {
          backgroundColor: selected ? lang.color + "18" : colors.card + "C4",
          borderColor: selected ? lang.color + "B0" : colors.border + "88",
        },
      ]}
    >
      <Text style={[styles.langFlag, { color: lang.color }]}>{lang.flag}</Text>
      <Text style={[styles.langName, { color: selected ? lang.color : colors.text }]}>
        {lang.name}
      </Text>
      {selected && <Ionicons name="checkmark-circle" size={14} color={lang.color} />}
    </Pressable>
  );
}

function LessonCard({ lesson, lang, isCompleted, score }: {
  lesson: Lesson;
  lang: Language;
  isCompleted: boolean;
  score?: number;
}) {
  const colorScheme = useColorScheme();
  const colors = colorScheme === "dark" ? Colors.dark : Colors.light;
  const levelColor = lesson.level === "Beginner" ? colors.mint : lesson.level === "Intermediate" ? colors.gold : "#FF6B9D";

  return (
    <Pressable
      onPress={() => router.push({ pathname: "/lesson/[id]", params: { id: lesson.id } })}
      style={({ pressed }) => [
        styles.lessonCard,
        {
          backgroundColor: colors.card,
          borderColor: colors.border,
          opacity: pressed ? 0.95 : 1,
        },
      ]}
    >
      <View style={[styles.lessonAccentGlow, { backgroundColor: lang.color + "14" }]} />

      <View style={styles.lessonCardContent}>
        <View style={styles.lessonCardTop}>
          <View style={styles.lessonLead}>
            <View style={[styles.lessonIconWrap, { backgroundColor: lang.color + "16", borderColor: lang.color + "32" }]}>
              <Text style={[styles.lessonIconFlag, { color: lang.color }]}>{lang.flag}</Text>
            </View>
            <View style={{ flex: 1 }}>
              <View style={styles.lessonBadgeRow}>
                <View style={[styles.levelBadge, { backgroundColor: levelColor + "18", borderColor: levelColor + "30" }]}>
                  <Text style={[styles.levelText, { color: levelColor }]}>{lesson.level}</Text>
                </View>
                <View style={[styles.lessonMiniPill, { backgroundColor: colors.background, borderColor: colors.border }]}>
                  <Ionicons name="star-outline" size={12} color={colors.gold} />
                  <Text style={[styles.lessonMiniText, { color: colors.text }]}>{lesson.xpReward} XP</Text>
                </View>
              </View>
              <Text style={[styles.lessonTitle, { color: colors.text }]}>{lesson.title}</Text>
            </View>
          </View>

          {isCompleted && (
            <View style={[styles.completedBadge, { backgroundColor: colors.mint + "16", borderColor: colors.mint + "32" }]}>
              <Ionicons name="checkmark-circle" size={15} color={colors.mint} />
              {score !== undefined && (
                <Text style={[styles.scoreText, { color: colors.mint }]}>{score}%</Text>
              )}
            </View>
          )}
        </View>

        <Text style={[styles.lessonDesc, { color: colors.muted }]} numberOfLines={2}>
          {lesson.description}
        </Text>

        <View style={styles.lessonFooter}>
          <View style={styles.lessonMeta}>
            <View style={[styles.metaItem, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Ionicons name="time-outline" size={13} color={colors.muted} />
              <Text style={[styles.metaText, { color: colors.muted }]}>{lesson.duration} min</Text>
            </View>
            <View style={[styles.metaItem, { backgroundColor: colors.background, borderColor: colors.border }]}>
              <Ionicons name="bookmark-outline" size={13} color={lang.color} />
              <Text style={[styles.metaText, { color: colors.text }]}>{lang.name}</Text>
            </View>
          </View>

          <View style={[styles.lessonArrowBtn, { backgroundColor: lang.color }]}>
            <Ionicons name="arrow-forward" size={16} color="#fff" />
          </View>
        </View>
      </View>
    </Pressable>
  );
}

export default function LearnScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const { user } = useAuth();
  const { progress, isLessonCompleted, getLessonScore, selectLanguage, unselectLanguage } = useProgress();
  const [contentTab, setContentTab] = useState<"courses" | "read">("courses");
  const [searchQuery, setSearchQuery] = useState("");

  const selectedLangs = progress.selectedLanguages;
  const normalizedQuery = searchQuery.trim().toLowerCase();

  const filteredLessons = useMemo(() => {
    const languageFiltered = selectedLangs.length === 0
      ? LESSONS
      : LESSONS.filter((lesson) => selectedLangs.includes(lesson.languageCode));

    if (!normalizedQuery) {
      return languageFiltered;
    }

    return languageFiltered.filter((lesson) => {
      const lang = LANGUAGES.find((item) => item.code === lesson.languageCode);
      const haystack = `${lesson.title} ${lesson.description} ${lang?.name || ""}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [normalizedQuery, selectedLangs]);

  const getLang = (code: string) => LANGUAGES.find((lang) => lang.code === code)!;

  const filteredReadings = useMemo(() => {
    const languageFiltered = selectedLangs.length === 0
      ? READINGS
      : READINGS.filter((story) => selectedLangs.includes(story.languageCode));

    if (!normalizedQuery) {
      return languageFiltered;
    }

    return languageFiltered.filter((story) => {
      const lang = LANGUAGES.find((item) => item.code === story.languageCode);
      const haystack = `${story.title} ${story.description} ${lang?.name || ""}`.toLowerCase();
      return haystack.includes(normalizedQuery);
    });
  }, [normalizedQuery, selectedLangs]);

  const handleLangToggle = async (code: string) => {
    if (selectedLangs.includes(code)) {
      if (selectedLangs.length > 1) await unselectLanguage(code);
    } else {
      await selectLanguage(code);
    }
  };

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : 0;
  const displayedStats = {
    streak: 0,
    totalXP: 0,
    completed: 0,
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScreenBackdrop
        primaryColor={colors.primary + "18"}
        secondaryColor={colors.gold + "12"}
      />

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 + bottomInset }}
      >
        <View style={[styles.header, { paddingTop: topInset + 16 }]}>
          <View>
            <Text style={[styles.greeting, { color: colors.muted }]}>
              {user ? `Hello, ${user.displayName.split(" ")[0]}` : "Welcome back"}
            </Text>
            <Text style={[styles.headerTitle, { color: colors.text }]}>Learn</Text>
          </View>
          <Pressable
            onPress={() => user ? null : router.push("/(auth)/login")}
            style={[styles.avatarBtn, { backgroundColor: colors.card + "CC", borderColor: colors.border + "88" }]}
          >
            {user ? (
              <Text style={[styles.avatarInitial, { color: colors.primary }]}>
                {user.displayName[0].toUpperCase()}
              </Text>
            ) : (
              <Ionicons name="person-outline" size={20} color={colors.muted} />
            )}
          </Pressable>
        </View>

        {!user && (
          <Pressable
            onPress={() => router.push("/(auth)/login")}
            style={[styles.authBanner, { backgroundColor: colors.primary + "14", borderColor: colors.primary + "38" }]}
          >
            <Ionicons name="person-circle-outline" size={20} color={colors.primary} />
            <Text style={[styles.authBannerText, { color: colors.primary }]}>
              Sign in to save your progress
            </Text>
            <Ionicons name="chevron-forward" size={16} color={colors.primary} />
          </Pressable>
        )}

        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.card + "CC", borderColor: colors.border + "70" }]}>
            <Ionicons name="flame" size={20} color={colors.primary} />
            <Text style={[styles.statValue, { color: colors.text }]}>{displayedStats.streak}</Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>Day Streak</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card + "CC", borderColor: colors.border + "70" }]}>
            <Ionicons name="star" size={20} color={colors.gold} />
            <Text style={[styles.statValue, { color: colors.text }]}>{displayedStats.totalXP}</Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>Total XP</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card + "CC", borderColor: colors.border + "70" }]}>
            <Ionicons name="checkmark-circle" size={20} color={colors.mint} />
            <Text style={[styles.statValue, { color: colors.text }]}>{displayedStats.completed}</Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>Completed</Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Languages</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.langScroll}>
          {LANGUAGES.map((lang) => (
            <LangFlag
              key={lang.code}
              lang={lang}
              selected={selectedLangs.includes(lang.code)}
              onPress={() => handleLangToggle(lang.code)}
            />
          ))}
        </ScrollView>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Learn</Text>
          <Text style={[styles.lessonCount, { color: colors.muted }]}>
            {contentTab === "courses" ? filteredLessons.length : filteredReadings.length} available
          </Text>
        </View>

        <View style={[styles.searchWrap, { backgroundColor: colors.card + "CC", borderColor: colors.border + "88" }]}>
          <Ionicons name="search-outline" size={18} color={colors.muted} />
          <TextInput
            value={searchQuery}
            onChangeText={setSearchQuery}
            placeholder={contentTab === "courses" ? "Search lessons or languages" : "Search stories or languages"}
            placeholderTextColor={colors.muted}
            style={[styles.searchInput, { color: colors.text }]}
          />
          {searchQuery.length > 0 && (
            <Pressable onPress={() => setSearchQuery("")}>
              <Ionicons name="close-circle" size={18} color={colors.muted} />
            </Pressable>
          )}
        </View>

        <View style={styles.contentTabs}>
          {[
            { key: "courses", label: "Courses" },
            { key: "read", label: "Read" },
          ].map((tab) => {
            const selected = contentTab === tab.key;
            return (
              <Pressable
                key={tab.key}
                onPress={() => setContentTab(tab.key as "courses" | "read")}
                style={[
                  styles.contentTab,
                  {
                    backgroundColor: selected ? colors.primary + "18" : colors.card + "CC",
                    borderColor: selected ? colors.primary + "40" : colors.border + "88",
                  },
                ]}
              >
                <Text style={[styles.contentTabText, { color: selected ? colors.primary : colors.text }]}>{tab.label}</Text>
              </Pressable>
            );
          })}
        </View>

        {(contentTab === "courses"
          ? filteredLessons.length === 0
          : filteredReadings.length === 0) ? (
          <View style={styles.emptyState}>
            <Ionicons name="book-outline" size={40} color={colors.muted} />
            <Text style={[styles.emptyText, { color: colors.muted }]}>
              {contentTab === "courses"
                ? "Select a language above to see lessons"
                : "Select a language above to see reading stories"}
            </Text>
          </View>
        ) : contentTab === "courses" ? (
          <View style={styles.lessonsList}>
            {filteredLessons.map((lesson) => (
              <LessonCard
                key={lesson.id}
                lesson={lesson}
                lang={getLang(lesson.languageCode)}
                isCompleted={isLessonCompleted(lesson.id)}
                score={getLessonScore(lesson.id)}
              />
            ))}
          </View>
        ) : (
          <View style={styles.readList}>
            {filteredReadings.map((story) => (
              <LessonCard
                key={story.id}
                lesson={story}
                lang={getLang(story.languageCode)}
                isCompleted={false}
              />
            ))}
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  bgOrbWrap: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  bgOrb: {
    position: "absolute",
    borderRadius: 999,
  },
  bgOrbOne: {
    width: 220,
    height: 220,
    top: -70,
    right: -60,
  },
  bgOrbTwo: {
    width: 180,
    height: 180,
    top: 160,
    left: -90,
  },
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  greeting: { fontSize: 13, fontFamily: "Nunito_600SemiBold" },
  headerTitle: { fontSize: 30, fontFamily: "Nunito_800ExtraBold", letterSpacing: 0.2 },
  avatarBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 4,
  },
  avatarInitial: { fontSize: 16, fontFamily: "Nunito_700Bold" },
  authBanner: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginHorizontal: 20,
    marginBottom: 16,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 12,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.06,
    shadowRadius: 16,
    elevation: 3,
  },
  authBannerText: { flex: 1, fontSize: 14, fontFamily: "Nunito_700Bold", lineHeight: 19 },
  statsRow: {
    flexDirection: "row",
    gap: 10,
    paddingHorizontal: 20,
    marginBottom: 24,
  },
  statCard: {
    flex: 1,
    alignItems: "center",
    paddingVertical: 14,
    borderRadius: 18,
    gap: 4,
    borderWidth: 1,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.08,
    shadowRadius: 18,
    elevation: 4,
  },
  statValue: { fontSize: 24, fontFamily: "Nunito_800ExtraBold", letterSpacing: 0.2 },
  statLabel: { fontSize: 11, fontFamily: "Nunito_700Bold", letterSpacing: 0.3 },
  sectionHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  sectionTitle: { fontSize: 19, fontFamily: "Nunito_800ExtraBold", letterSpacing: 0.2 },
  lessonCount: { fontSize: 13, fontFamily: "Nunito_700Bold" },
  searchWrap: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    marginHorizontal: 20,
    marginBottom: 14,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 16,
    borderWidth: 1,
  },
  searchInput: { flex: 1, fontSize: 14, fontFamily: "Nunito_600SemiBold" },
  contentTabs: { flexDirection: "row", gap: 26, paddingHorizontal: 20, marginBottom: 18 },
  contentTab: {
    minWidth: 110,
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1,
  },
  contentTabText: { fontSize: 13, fontFamily: "Nunito_800ExtraBold" },
  langScroll: { paddingHorizontal: 20, gap: 8, paddingBottom: 24 },
  langChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 14,
    paddingVertical: 9,
    borderRadius: 999,
    borderWidth: 1.5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.05,
    shadowRadius: 12,
    elevation: 3,
  },
  langFlag: { fontSize: 12, fontFamily: "Nunito_800ExtraBold" },
  langName: { fontSize: 13, fontFamily: "Nunito_700Bold", letterSpacing: 0.15 },
  lessonsList: { paddingHorizontal: 20, gap: 12 },
  readList: { paddingHorizontal: 20, gap: 12 },
  lessonCard: {
    borderRadius: 20,
    borderWidth: 1,
    overflow: "hidden",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 20,
    elevation: 5,
  },
  lessonAccentGlow: {
    position: "absolute",
    top: -22,
    right: -22,
    width: 110,
    height: 110,
    borderRadius: 55,
  },
  lessonCardContent: { padding: 16, gap: 10 },
  lessonCardTop: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "flex-start",
    gap: 10,
  },
  lessonLead: {
    flex: 1,
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
  },
  lessonIconWrap: {
    width: 46,
    height: 46,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    borderWidth: 1,
  },
  lessonIconFlag: { fontSize: 15, fontFamily: "Nunito_800ExtraBold" },
  lessonBadgeRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    marginBottom: 8,
    flexWrap: "wrap",
  },
  levelBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  levelText: { fontSize: 11, fontFamily: "Nunito_800ExtraBold", letterSpacing: 0.3 },
  lessonMiniPill: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 9,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
  },
  lessonMiniText: { fontSize: 11, fontFamily: "Nunito_700Bold" },
  completedBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 5,
    borderRadius: 999,
    borderWidth: 1,
  },
  scoreText: { fontSize: 12, fontFamily: "Nunito_800ExtraBold" },
  lessonTitle: { fontSize: 17, fontFamily: "Nunito_800ExtraBold", lineHeight: 22 },
  lessonDesc: { fontSize: 13, fontFamily: "Nunito_600SemiBold", lineHeight: 19 },
  lessonFooter: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    gap: 12,
  },
  lessonMeta: { flexDirection: "row", gap: 8, flexWrap: "wrap", flex: 1 },
  metaItem: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 999,
    borderWidth: 1,
  },
  metaText: { fontSize: 12, fontFamily: "Nunito_700Bold" },
  lessonArrowBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    alignItems: "center",
    justifyContent: "center",
  },
  emptyState: { alignItems: "center", paddingVertical: 48, gap: 12 },
  emptyText: { fontSize: 14, fontFamily: "Nunito_700Bold", textAlign: "center", paddingHorizontal: 40, lineHeight: 20 },
});
