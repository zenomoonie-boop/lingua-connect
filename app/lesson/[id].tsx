import React, { useState } from "react";
import {
  View, Text, ScrollView, Pressable, StyleSheet,
  useColorScheme,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { LESSONS, LANGUAGES } from "@/data/lessons";
import { READINGS } from "@/data/readings";
import { QUIZZES } from "@/data/quizzes";
import * as Haptics from "expo-haptics";

export default function LessonScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();

  const lesson = [...LESSONS, ...READINGS].find(l => l.id === id);
  const lang = lesson ? LANGUAGES.find(l => l.code === lesson.languageCode) : null;
  const hasQuiz = QUIZZES.some(q => q.lessonId === id);

  const [currentSection, setCurrentSection] = useState(0);

  if (!lesson || !lang) {
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <Text style={{ color: colors.text, padding: 24 }}>Lesson not found</Text>
      </View>
    );
  }

  const sections = lesson.content;
  const isLast = currentSection === sections.length - 1;

  const handleNext = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    if (isLast) {
      if (hasQuiz) {
        router.replace({ pathname: "/quiz/[id]", params: { id: lesson.id } });
      } else {
        router.back();
      }
    } else {
      setCurrentSection(c => c + 1);
    }
  };

  const section = sections[currentSection];
  const levelColor = lesson.level === "Beginner" ? colors.mint : lesson.level === "Intermediate" ? colors.gold : "#FF6B9D";

  const typeIcon = (type: string) => {
    if (type === "phrase") return "chatbubble-outline";
    if (type === "vocab") return "book-outline";
    if (type === "grammar") return "school-outline";
    return "document-text-outline";
  };

  const typeLabel = (type: string) => {
    if (type === "phrase") return "Phrase";
    if (type === "vocab") return "Vocabulary";
    if (type === "grammar") return "Grammar";
    return "Reading";
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable
          onPress={() => router.back()}
          style={[styles.backBtn, { backgroundColor: colors.card }]}
        >
          <Ionicons name="arrow-back" size={20} color={colors.text} />
        </Pressable>
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text style={[styles.lessonTitle, { color: colors.text }]} numberOfLines={1}>{lesson.title}</Text>
          <View style={[styles.levelBadge, { backgroundColor: levelColor + "20" }]}>
            <Text style={[styles.levelText, { color: levelColor }]}>{lesson.level}</Text>
          </View>
        </View>
        <View style={[styles.langBadge, { backgroundColor: lang.color + "20" }]}>
          <Text style={[styles.langText, { color: lang.color }]}>{lang.flag}</Text>
        </View>
      </View>

      <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
        <View style={[
          styles.progressFill,
          {
            width: `${((currentSection + 1) / sections.length) * 100}%` as any,
            backgroundColor: lang.color,
          },
        ]} />
      </View>
      <Text style={[styles.progressLabel, { color: colors.muted }]}>
        {currentSection + 1} of {sections.length}
      </Text>

      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}
      >
        <View style={styles.typeRow}>
          <Ionicons name={typeIcon(section.type) as any} size={16} color={lang.color} />
          <Text style={[styles.typeLabel, { color: lang.color }]}>{typeLabel(section.type)}</Text>
        </View>

        {section.title && (
          <Text style={[styles.sectionTitle, { color: colors.text }]}>{section.title}</Text>
        )}

        <View style={[styles.mainCard, { backgroundColor: colors.card, borderColor: lang.color + "40" }]}>
          <Text style={[styles.mainText, {
            color: colors.text,
            fontSize: section.type === "phrase" || section.type === "vocab" ? 26 : 18,
            fontFamily: section.type === "text" || section.type === "grammar" ? "Nunito_400Regular" : "Nunito_700Bold",
          }]}>
            {section.body}
          </Text>
          {section.translation && (
            <Text style={[styles.translationText, { color: colors.muted }]}>{section.translation}</Text>
          )}
        </View>

        {section.example && (
          <View style={[styles.exampleCard, { backgroundColor: lang.color + "10", borderColor: lang.color + "30" }]}>
            <Text style={[styles.exampleLabel, { color: lang.color }]}>Example</Text>
            <Text style={[styles.exampleText, { color: colors.text }]}>{section.example}</Text>
            {section.exampleTranslation && (
              <Text style={[styles.exampleTranslation, { color: colors.muted }]}>
                {section.exampleTranslation}
              </Text>
            )}
          </View>
        )}
      </ScrollView>

      <View style={[styles.footer, { backgroundColor: colors.background, paddingBottom: insets.bottom + 16 }]}>
        {currentSection > 0 && (
          <Pressable
            onPress={() => { setCurrentSection(c => c - 1); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
            style={[styles.prevBtn, { borderColor: colors.border }]}
          >
            <Ionicons name="arrow-back" size={20} color={colors.text} />
          </Pressable>
        )}
        <Pressable
          onPress={handleNext}
          style={({ pressed }) => [
            styles.nextBtn,
            { backgroundColor: lang.color, opacity: pressed ? 0.85 : 1, flex: 1 },
          ]}
        >
          <Text style={styles.nextBtnText}>
            {isLast ? (hasQuiz ? "Take Quiz" : "Complete") : "Continue"}
          </Text>
          <Ionicons name={isLast && hasQuiz ? "trophy" : "arrow-forward"} size={18} color="#fff" />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 16, paddingBottom: 12,
  },
  backBtn: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  lessonTitle: { fontSize: 16, fontFamily: "Nunito_700Bold" },
  levelBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6, marginTop: 2 },
  levelText: { fontSize: 10, fontFamily: "Nunito_700Bold" },
  langBadge: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  langText: { fontSize: 11, fontFamily: "Nunito_700Bold" },
  progressBar: { height: 4, marginHorizontal: 16, borderRadius: 2, overflow: "hidden" },
  progressFill: { height: "100%", borderRadius: 2 },
  progressLabel: { fontSize: 12, fontFamily: "Nunito_600SemiBold", paddingHorizontal: 16, paddingTop: 6, paddingBottom: 8 },
  content: { padding: 20, gap: 16 },
  typeRow: { flexDirection: "row", alignItems: "center", gap: 6 },
  typeLabel: { fontSize: 12, fontFamily: "Nunito_700Bold", textTransform: "uppercase", letterSpacing: 0.5 },
  sectionTitle: { fontSize: 20, fontFamily: "Nunito_700Bold" },
  mainCard: {
    padding: 24, borderRadius: 20, borderWidth: 1.5, gap: 10,
  },
  mainText: { lineHeight: 32 },
  translationText: { fontSize: 16, fontFamily: "Nunito_400Regular" },
  exampleCard: { padding: 16, borderRadius: 14, borderWidth: 1, gap: 8 },
  exampleLabel: { fontSize: 11, fontFamily: "Nunito_700Bold", textTransform: "uppercase", letterSpacing: 0.5 },
  exampleText: { fontSize: 17, fontFamily: "Nunito_600SemiBold", lineHeight: 24 },
  exampleTranslation: { fontSize: 14, fontFamily: "Nunito_400Regular" },
  footer: {
    flexDirection: "row", gap: 10, paddingHorizontal: 16, paddingTop: 12,
    borderTopWidth: 0,
  },
  prevBtn: {
    width: 50, height: 50, borderRadius: 14, borderWidth: 1,
    alignItems: "center", justifyContent: "center",
  },
  nextBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, height: 50, borderRadius: 14,
  },
  nextBtnText: { color: "#fff", fontSize: 16, fontFamily: "Nunito_700Bold" },
});
