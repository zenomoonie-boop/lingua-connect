import React from "react";
import {
  View, Text, ScrollView, StyleSheet, Pressable,
  useColorScheme, Platform,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { LESSONS, LANGUAGES } from "@/data/lessons";
import { useProgress } from "@/context/ProgressContext";
import { useAuth } from "@/context/AuthContext";

function XPBar({ value, max, color }: { value: number; max: number; color: string }) {
  const pct = Math.min(value / max, 1);
  return (
    <View style={[xpStyles.track]}>
      <View style={[xpStyles.fill, { width: `${pct * 100}%` as any, backgroundColor: color }]} />
    </View>
  );
}
const xpStyles = StyleSheet.create({
  track: { height: 8, borderRadius: 4, backgroundColor: "rgba(255,255,255,0.1)", overflow: "hidden" },
  fill: { height: "100%", borderRadius: 4 },
});

export default function ProgressScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const { progress, isLessonCompleted, getLessonScore } = useProgress();
  const { user, logout } = useAuth();

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const bottomInset = Platform.OS === "web" ? 34 : 0;

  const completedLessons = progress.completedLessons.filter(l => l.completed);
  const totalLessons = LESSONS.length;

  const langStats = LANGUAGES.map(lang => {
    const langLessons = LESSONS.filter(l => l.languageCode === lang.code);
    const done = langLessons.filter(l => isLessonCompleted(l.id)).length;
    return { lang, total: langLessons.length, done };
  }).filter(s => s.done > 0 || progress.selectedLanguages.includes(s.lang.code));

  const level = Math.floor(progress.totalXP / 200) + 1;
  const xpInLevel = progress.totalXP % 200;

  const recentActivity = [...completedLessons]
    .sort((a, b) => new Date(b.completedAt || 0).getTime() - new Date(a.completedAt || 0).getTime())
    .slice(0, 5);

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: 120 + bottomInset }}
      >
        <View style={[styles.header, { paddingTop: topInset + 16 }]}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>Progress</Text>
          {user && (
            <Pressable onPress={logout} style={[styles.logoutBtn, { borderColor: colors.border }]}>
              <Ionicons name="log-out-outline" size={18} color={colors.muted} />
            </Pressable>
          )}
          {!user && (
            <Pressable
              onPress={() => router.push("/(auth)/login")}
              style={[styles.signInBtn, { backgroundColor: colors.primary }]}
            >
              <Text style={styles.signInText}>Sign In</Text>
            </Pressable>
          )}
        </View>

        <View style={[styles.levelCard, { backgroundColor: colors.primary + "15", borderColor: colors.primary + "30" }]}>
          <View style={styles.levelRow}>
            <View>
              <Text style={[styles.levelLabel, { color: colors.muted }]}>Current Level</Text>
              <Text style={[styles.levelValue, { color: colors.text }]}>Level {level}</Text>
            </View>
            <View style={[styles.levelBadge, { backgroundColor: colors.primary }]}>
              <Ionicons name="trophy" size={20} color="#fff" />
            </View>
          </View>
          <XPBar value={xpInLevel} max={200} color={colors.primary} />
          <Text style={[styles.xpLabel, { color: colors.muted }]}>{xpInLevel} / 200 XP to next level</Text>
        </View>

        <View style={styles.statsGrid}>
          {[
            { icon: "flame", color: colors.primary, value: progress.streak, label: "Day Streak" },
            { icon: "star", color: colors.gold, value: progress.totalXP, label: "Total XP" },
            { icon: "checkmark-circle", color: colors.mint, value: completedLessons.length, label: "Lessons Done" },
            { icon: "book", color: colors.accent, value: totalLessons - completedLessons.length, label: "Remaining" },
          ].map(stat => (
            <View key={stat.label} style={[styles.statCard, { backgroundColor: colors.card }]}>
              <Ionicons name={stat.icon as any} size={22} color={stat.color} />
              <Text style={[styles.statValue, { color: colors.text }]}>{stat.value}</Text>
              <Text style={[styles.statLabel, { color: colors.muted }]}>{stat.label}</Text>
            </View>
          ))}
        </View>

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Language Progress</Text>
        {langStats.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.card }]}>
            <Ionicons name="language-outline" size={32} color={colors.muted} />
            <Text style={[styles.emptyText, { color: colors.muted }]}>Complete lessons to see your language progress</Text>
          </View>
        ) : (
          langStats.map(({ lang, total, done }) => (
            <View key={lang.code} style={[styles.langCard, { backgroundColor: colors.card }]}>
              <View style={styles.langCardRow}>
                <View style={[styles.langDot, { backgroundColor: lang.color }]} />
                <Text style={[styles.langName, { color: colors.text }]}>{lang.name}</Text>
                <Text style={[styles.langProgress, { color: colors.muted }]}>{done}/{total} lessons</Text>
              </View>
              <XPBar value={done} max={total} color={lang.color} />
            </View>
          ))
        )}

        <Text style={[styles.sectionTitle, { color: colors.text }]}>Recent Activity</Text>
        {recentActivity.length === 0 ? (
          <View style={[styles.emptyCard, { backgroundColor: colors.card }]}>
            <Ionicons name="time-outline" size={32} color={colors.muted} />
            <Text style={[styles.emptyText, { color: colors.muted }]}>No lessons completed yet. Start learning!</Text>
          </View>
        ) : (
          recentActivity.map(item => {
            const lesson = LESSONS.find(l => l.id === item.lessonId);
            if (!lesson) return null;
            const lang = LANGUAGES.find(l => l.code === lesson.languageCode);
            const date = item.completedAt ? new Date(item.completedAt).toLocaleDateString() : "";
            return (
              <Pressable
                key={item.lessonId}
                onPress={() => router.push({ pathname: "/lesson/[id]", params: { id: lesson.id } })}
                style={({ pressed }) => [
                  styles.activityItem,
                  { backgroundColor: colors.card, opacity: pressed ? 0.8 : 1 },
                ]}
              >
                <View style={[styles.activityDot, { backgroundColor: lang?.color || colors.primary }]} />
                <View style={{ flex: 1 }}>
                  <Text style={[styles.activityTitle, { color: colors.text }]}>{lesson.title}</Text>
                  <Text style={[styles.activityMeta, { color: colors.muted }]}>{lang?.name} · {date}</Text>
                </View>
                <View style={styles.activityScore}>
                  <Ionicons name="checkmark-circle" size={14} color={colors.mint} />
                  {item.score !== undefined && (
                    <Text style={[styles.activityScoreText, { color: colors.mint }]}>{item.score}%</Text>
                  )}
                </View>
              </Pressable>
            );
          })
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "center",
    paddingHorizontal: 20, paddingBottom: 16,
  },
  headerTitle: { fontSize: 28, fontFamily: "Nunito_800ExtraBold" },
  logoutBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: "center", justifyContent: "center", borderWidth: 1,
  },
  signInBtn: {
    paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20,
  },
  signInText: { color: "#fff", fontSize: 13, fontFamily: "Nunito_700Bold" },
  levelCard: {
    marginHorizontal: 20, marginBottom: 20, padding: 16,
    borderRadius: 16, borderWidth: 1, gap: 10,
  },
  levelRow: { flexDirection: "row", justifyContent: "space-between", alignItems: "center" },
  levelLabel: { fontSize: 12, fontFamily: "Nunito_600SemiBold" },
  levelValue: { fontSize: 24, fontFamily: "Nunito_800ExtraBold" },
  levelBadge: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  xpLabel: { fontSize: 12, fontFamily: "Nunito_600SemiBold" },
  statsGrid: {
    flexDirection: "row", flexWrap: "wrap", gap: 10,
    paddingHorizontal: 20, marginBottom: 24,
  },
  statCard: {
    width: "47.5%", alignItems: "center", paddingVertical: 16,
    borderRadius: 14, gap: 4,
  },
  statValue: { fontSize: 22, fontFamily: "Nunito_800ExtraBold" },
  statLabel: { fontSize: 11, fontFamily: "Nunito_600SemiBold" },
  sectionTitle: {
    fontSize: 18, fontFamily: "Nunito_700Bold",
    paddingHorizontal: 20, marginBottom: 12,
  },
  langCard: {
    marginHorizontal: 20, marginBottom: 10, padding: 14,
    borderRadius: 14, gap: 10,
  },
  langCardRow: { flexDirection: "row", alignItems: "center", gap: 8 },
  langDot: { width: 10, height: 10, borderRadius: 5 },
  langName: { flex: 1, fontSize: 15, fontFamily: "Nunito_700Bold" },
  langProgress: { fontSize: 12, fontFamily: "Nunito_600SemiBold" },
  emptyCard: {
    marginHorizontal: 20, marginBottom: 16, padding: 24,
    borderRadius: 14, alignItems: "center", gap: 10,
  },
  emptyText: {
    fontSize: 14, fontFamily: "Nunito_600SemiBold",
    textAlign: "center", lineHeight: 20,
  },
  activityItem: {
    marginHorizontal: 20, marginBottom: 8, padding: 14,
    borderRadius: 14, flexDirection: "row", alignItems: "center", gap: 12,
  },
  activityDot: { width: 10, height: 10, borderRadius: 5 },
  activityTitle: { fontSize: 14, fontFamily: "Nunito_700Bold" },
  activityMeta: { fontSize: 12, fontFamily: "Nunito_600SemiBold", marginTop: 2 },
  activityScore: { flexDirection: "row", alignItems: "center", gap: 3 },
  activityScoreText: { fontSize: 12, fontFamily: "Nunito_700Bold" },
});
