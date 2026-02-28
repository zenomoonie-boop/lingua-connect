import React, { useMemo } from "react";
import {
  View, Text, ScrollView, StyleSheet, Pressable,
  useColorScheme, Platform,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { LESSONS, LANGUAGES, type Language, type Lesson } from "@/data/lessons";
import { useAuth } from "@/context/AuthContext";
import { useProgress } from "@/context/ProgressContext";

function LangFlag({ lang, selected, onPress }: { lang: Language; selected: boolean; onPress: () => void }) {
  const colorScheme = useColorScheme();
  const colors = (colorScheme === "dark" ? Colors.dark : Colors.light);
  return (
    <Pressable
      onPress={onPress}
      style={[
        styles.langChip,
        {
          backgroundColor: selected ? lang.color + "22" : colors.card,
          borderColor: selected ? lang.color : colors.border,
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
        { backgroundColor: colors.card, opacity: pressed ? 0.85 : 1 },
      ]}
    >
      <View style={[styles.lessonColorBar, { backgroundColor: lang.color }]} />
      <View style={styles.lessonCardContent}>
        <View style={styles.lessonCardTop}>
          <View style={[styles.levelBadge, { backgroundColor: levelColor + "22" }]}>
            <Text style={[styles.levelText, { color: levelColor }]}>{lesson.level}</Text>
          </View>
          {isCompleted && (
            <View style={styles.completedBadge}>
              <Ionicons name="checkmark-circle" size={16} color={colors.mint} />
              {score !== undefined && (
                <Text style={[styles.scoreText, { color: colors.mint }]}>{score}%</Text>
              )}
            </View>
          )}
        </View>
        <Text style={[styles.lessonTitle, { color: colors.text }]}>{lesson.title}</Text>
        <Text style={[styles.lessonDesc, { color: colors.muted }]} numberOfLines={2}>
          {lesson.description}
        </Text>
        <View style={styles.lessonMeta}>
          <View style={styles.metaItem}>
            <Ionicons name="time-outline" size={13} color={colors.muted} />
            <Text style={[styles.metaText, { color: colors.muted }]}>{lesson.duration} min</Text>
          </View>
          <View style={styles.metaItem}>
            <Ionicons name="star-outline" size={13} color={colors.gold} />
            <Text style={[styles.metaText, { color: colors.muted }]}>{lesson.xpReward} XP</Text>
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

  const selectedLangs = progress.selectedLanguages;

  const filteredLessons = useMemo(() => {
    if (selectedLangs.length === 0) return LESSONS;
    return LESSONS.filter(l => selectedLangs.includes(l.languageCode));
  }, [selectedLangs]);

  const getLang = (code: string) => LANGUAGES.find(l => l.code === code)!;

  const handleLangToggle = async (code: string) => {
    if (selectedLangs.includes(code)) {
      if (selectedLangs.length > 1) await unselectLanguage(code);
    } else {
      await selectLanguage(code);
    }
  };

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : 0;

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
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
            style={[styles.avatarBtn, { backgroundColor: colors.card, borderColor: colors.border }]}
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
            style={[styles.authBanner, { backgroundColor: colors.primary + "18", borderColor: colors.primary + "40" }]}
          >
            <Ionicons name="person-circle-outline" size={20} color={colors.primary} />
            <Text style={[styles.authBannerText, { color: colors.primary }]}>
              Sign in to save your progress
            </Text>
            <Ionicons name="chevron-forward" size={16} color={colors.primary} />
          </Pressable>
        )}

        <View style={styles.statsRow}>
          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <Ionicons name="flame" size={20} color={colors.primary} />
            <Text style={[styles.statValue, { color: colors.text }]}>{progress.streak}</Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>Day Streak</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <Ionicons name="star" size={20} color={colors.gold} />
            <Text style={[styles.statValue, { color: colors.text }]}>{progress.totalXP}</Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>Total XP</Text>
          </View>
          <View style={[styles.statCard, { backgroundColor: colors.card }]}>
            <Ionicons name="checkmark-circle" size={20} color={colors.mint} />
            <Text style={[styles.statValue, { color: colors.text }]}>{progress.completedLessons.filter(l => l.completed).length}</Text>
            <Text style={[styles.statLabel, { color: colors.muted }]}>Completed</Text>
          </View>
        </View>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Languages</Text>
        </View>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.langScroll}>
          {LANGUAGES.map(lang => (
            <LangFlag
              key={lang.code}
              lang={lang}
              selected={selectedLangs.includes(lang.code)}
              onPress={() => handleLangToggle(lang.code)}
            />
          ))}
        </ScrollView>

        <View style={styles.sectionHeader}>
          <Text style={[styles.sectionTitle, { color: colors.text }]}>Lessons</Text>
          <Text style={[styles.lessonCount, { color: colors.muted }]}>{filteredLessons.length} available</Text>
        </View>

        {filteredLessons.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="book-outline" size={40} color={colors.muted} />
            <Text style={[styles.emptyText, { color: colors.muted }]}>Select a language above to see lessons</Text>
          </View>
        ) : (
          <View style={styles.lessonsList}>
            {filteredLessons.map(lesson => (
              <LessonCard
                key={lesson.id}
                lesson={lesson}
                lang={getLang(lesson.languageCode)}
                isCompleted={isLessonCompleted(lesson.id)}
                score={getLessonScore(lesson.id)}
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
  header: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingBottom: 12,
  },
  greeting: { fontSize: 13, fontFamily: "Nunito_600SemiBold" },
  headerTitle: { fontSize: 28, fontFamily: "Nunito_800ExtraBold" },
  avatarBtn: {
    width: 40, height: 40, borderRadius: 20,
    alignItems: "center", justifyContent: "center",
    borderWidth: 1,
  },
  avatarInitial: { fontSize: 16, fontFamily: "Nunito_700Bold" },
  authBanner: {
    flexDirection: "row", alignItems: "center", gap: 8,
    marginHorizontal: 20, marginBottom: 16, paddingHorizontal: 14, paddingVertical: 12,
    borderRadius: 12, borderWidth: 1,
  },
  authBannerText: { flex: 1, fontSize: 14, fontFamily: "Nunito_600SemiBold" },
  statsRow: {
    flexDirection: "row", gap: 10, paddingHorizontal: 20, marginBottom: 24,
  },
  statCard: {
    flex: 1, alignItems: "center", paddingVertical: 14, borderRadius: 14, gap: 4,
  },
  statValue: { fontSize: 22, fontFamily: "Nunito_800ExtraBold" },
  statLabel: { fontSize: 11, fontFamily: "Nunito_600SemiBold" },
  sectionHeader: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 20, marginBottom: 12,
  },
  sectionTitle: { fontSize: 18, fontFamily: "Nunito_700Bold" },
  lessonCount: { fontSize: 13, fontFamily: "Nunito_600SemiBold" },
  langScroll: { paddingHorizontal: 20, gap: 8, paddingBottom: 24 },
  langChip: {
    flexDirection: "row", alignItems: "center", gap: 6,
    paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1.5,
  },
  langFlag: { fontSize: 12, fontFamily: "Nunito_700Bold" },
  langName: { fontSize: 13, fontFamily: "Nunito_600SemiBold" },
  lessonsList: { paddingHorizontal: 20, gap: 12 },
  lessonCard: {
    borderRadius: 16, overflow: "hidden", flexDirection: "row",
  },
  lessonColorBar: { width: 4 },
  lessonCardContent: { flex: 1, padding: 14, gap: 6 },
  lessonCardTop: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  levelBadge: {
    paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6,
  },
  levelText: { fontSize: 11, fontFamily: "Nunito_700Bold" },
  completedBadge: { flexDirection: "row", alignItems: "center", gap: 4 },
  scoreText: { fontSize: 12, fontFamily: "Nunito_700Bold" },
  lessonTitle: { fontSize: 16, fontFamily: "Nunito_700Bold" },
  lessonDesc: { fontSize: 13, fontFamily: "Nunito_400Regular", lineHeight: 18 },
  lessonMeta: { flexDirection: "row", gap: 12, marginTop: 4 },
  metaItem: { flexDirection: "row", alignItems: "center", gap: 4 },
  metaText: { fontSize: 12, fontFamily: "Nunito_600SemiBold" },
  emptyState: { alignItems: "center", paddingVertical: 48, gap: 12 },
  emptyText: { fontSize: 14, fontFamily: "Nunito_600SemiBold", textAlign: "center", paddingHorizontal: 40 },
});
