import React, { useState, useRef } from "react";
import {
  View, Text, Pressable, StyleSheet, useColorScheme, TextInput,
  Animated, ScrollView,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { LESSONS, LANGUAGES } from "@/data/lessons";
import { QUIZZES } from "@/data/quizzes";
import { useProgress } from "@/context/ProgressContext";
import * as Haptics from "expo-haptics";

type Phase = "question" | "result" | "complete";

export default function QuizScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const { completeLesson } = useProgress();

  const lesson = LESSONS.find(l => l.id === id);
  const lang = lesson ? LANGUAGES.find(l => l.code === lesson.languageCode) : null;
  const quiz = QUIZZES.find(q => q.lessonId === id);

  const [current, setCurrent] = useState(0);
  const [phase, setPhase] = useState<Phase>("question");
  const [selected, setSelected] = useState<string | null>(null);
  const [fillInput, setFillInput] = useState("");
  const [score, setScore] = useState(0);
  const shakeAnim = useRef(new Animated.Value(0)).current;

  if (!lesson || !lang || !quiz) {
    router.back();
    return null;
  }

  const question = quiz.questions[current];
  const totalQ = quiz.questions.length;
  const isComplete = phase === "complete";

  const checkAnswer = (answer: string) => {
    const correct = answer.trim().toLowerCase() === question.correctAnswer.toLowerCase();
    setSelected(answer);
    setPhase("result");
    if (correct) {
      setScore(s => s + 1);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    } else {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Animated.sequence([
        Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: -10, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 10, duration: 60, useNativeDriver: true }),
        Animated.timing(shakeAnim, { toValue: 0, duration: 60, useNativeDriver: true }),
      ]).start();
    }
  };

  const handleNext = async () => {
    if (current + 1 >= totalQ) {
      const pct = Math.round((score / totalQ) * 100);
      await completeLesson(lesson.id, pct, lesson.xpReward);
      setPhase("complete");
    } else {
      setCurrent(c => c + 1);
      setPhase("question");
      setSelected(null);
      setFillInput("");
    }
  };

  const finalScore = Math.round((score / totalQ) * 100);

  if (isComplete) {
    const passed = finalScore >= 60;
    return (
      <View style={[styles.container, { backgroundColor: colors.background, paddingTop: insets.top }]}>
        <View style={styles.completeContent}>
          <View style={[styles.resultIcon, { backgroundColor: passed ? colors.mint + "20" : colors.error + "20" }]}>
            <Ionicons name={passed ? "trophy" : "refresh"} size={48} color={passed ? colors.mint : colors.error} />
          </View>
          <Text style={[styles.completeTitle, { color: colors.text }]}>
            {passed ? "Lesson Complete!" : "Keep Practicing!"}
          </Text>
          <Text style={[styles.completeSubtitle, { color: colors.muted }]}>
            {passed ? "Great work! You've earned your XP." : "You'll get it next time. Keep going!"}
          </Text>

          <View style={[styles.scoreCard, { backgroundColor: colors.card }]}>
            <Text style={[styles.scoreNumber, { color: passed ? colors.mint : colors.error }]}>{finalScore}%</Text>
            <Text style={[styles.scoreLabel, { color: colors.muted }]}>{score}/{totalQ} correct</Text>
            {passed && (
              <View style={styles.xpRow}>
                <Ionicons name="star" size={16} color={colors.gold} />
                <Text style={[styles.xpText, { color: colors.gold }]}>+{lesson.xpReward} XP earned!</Text>
              </View>
            )}
          </View>

          <Pressable
            onPress={() => router.back()}
            style={({ pressed }) => [styles.doneBtn, { backgroundColor: lang.color, opacity: pressed ? 0.85 : 1 }]}
          >
            <Text style={styles.doneBtnText}>Back to Lessons</Text>
          </Pressable>

          {!passed && (
            <Pressable
              onPress={() => {
                setCurrent(0); setPhase("question"); setSelected(null);
                setFillInput(""); setScore(0);
              }}
              style={[styles.retryBtn, { borderColor: colors.border }]}
            >
              <Ionicons name="refresh" size={16} color={colors.text} />
              <Text style={[styles.retryText, { color: colors.text }]}>Try Again</Text>
            </Pressable>
          )}
        </View>
      </View>
    );
  }

  const isCorrect = selected !== null && selected.toLowerCase() === question.correctAnswer.toLowerCase();
  const showResult = phase === "result";

  const getOptionStyle = (option: string) => {
    if (!showResult) return {};
    if (option.toLowerCase() === question.correctAnswer.toLowerCase()) {
      return { backgroundColor: colors.mint + "20", borderColor: colors.mint };
    }
    if (option === selected) {
      return { backgroundColor: colors.error + "20", borderColor: colors.error };
    }
    return {};
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: insets.top + 12 }]}>
        <Pressable onPress={() => router.back()} style={[styles.backBtn, { backgroundColor: colors.card }]}>
          <Ionicons name="close" size={20} color={colors.text} />
        </Pressable>
        <View style={{ flex: 1, alignItems: "center" }}>
          <Text style={[styles.quizLabel, { color: colors.muted }]}>Quiz</Text>
          <Text style={[styles.quizTitle, { color: colors.text }]} numberOfLines={1}>{lesson.title}</Text>
        </View>
        <View style={[styles.qCount, { backgroundColor: lang.color + "20" }]}>
          <Text style={[styles.qCountText, { color: lang.color }]}>{current + 1}/{totalQ}</Text>
        </View>
      </View>

      <View style={[styles.progressBar, { backgroundColor: colors.border }]}>
        <View style={[styles.progressFill, { width: `${((current) / totalQ) * 100}%` as any, backgroundColor: lang.color }]} />
      </View>

      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={[styles.content, { paddingBottom: insets.bottom + 100 }]}>
        <Animated.View style={{ transform: [{ translateX: shakeAnim }] }}>
          <View style={[styles.questionCard, { backgroundColor: colors.card }]}>
            <View style={styles.typeRow}>
              <Text style={[styles.typeText, { color: lang.color }]}>
                {question.type === "multiple-choice" ? "Multiple Choice" : question.type === "true-false" ? "True or False" : "Fill in the Blank"}
              </Text>
            </View>
            <Text style={[styles.questionText, { color: colors.text }]}>{question.question}</Text>
          </View>
        </Animated.View>

        {question.type === "fill-blank" ? (
          <View style={styles.fillSection}>
            <TextInput
              value={fillInput}
              onChangeText={setFillInput}
              placeholder="Type your answer..."
              placeholderTextColor={colors.muted}
              editable={!showResult}
              style={[
                styles.fillInput,
                {
                  backgroundColor: colors.card,
                  color: colors.text,
                  borderColor: showResult
                    ? (isCorrect ? colors.mint : colors.error)
                    : colors.border,
                },
              ]}
              autoCapitalize="none"
              onSubmitEditing={() => !showResult && fillInput.trim() && checkAnswer(fillInput.trim())}
            />
            {!showResult && (
              <Pressable
                onPress={() => fillInput.trim() && checkAnswer(fillInput.trim())}
                disabled={!fillInput.trim()}
                style={({ pressed }) => [
                  styles.submitBtn,
                  { backgroundColor: fillInput.trim() ? lang.color : colors.border, opacity: pressed ? 0.85 : 1 },
                ]}
              >
                <Text style={styles.submitText}>Check</Text>
              </Pressable>
            )}
          </View>
        ) : (
          <View style={styles.options}>
            {(question.options || ["True", "False"]).map(option => (
              <Pressable
                key={option}
                onPress={() => !showResult && checkAnswer(option)}
                disabled={showResult}
                style={({ pressed }) => [
                  styles.optionBtn,
                  { backgroundColor: colors.card, borderColor: colors.border },
                  getOptionStyle(option),
                  { opacity: pressed && !showResult ? 0.8 : 1 },
                ]}
              >
                <Text style={[styles.optionText, { color: colors.text }]}>{option}</Text>
                {showResult && option.toLowerCase() === question.correctAnswer.toLowerCase() && (
                  <Ionicons name="checkmark-circle" size={20} color={colors.mint} />
                )}
                {showResult && option === selected && option.toLowerCase() !== question.correctAnswer.toLowerCase() && (
                  <Ionicons name="close-circle" size={20} color={colors.error} />
                )}
              </Pressable>
            ))}
          </View>
        )}

        {showResult && (
          <View style={[styles.explanationCard, {
            backgroundColor: (isCorrect || (question.type === "fill-blank" && fillInput.toLowerCase() === question.correctAnswer.toLowerCase()))
              ? colors.mint + "15" : colors.error + "15",
            borderColor: (isCorrect || (question.type === "fill-blank" && fillInput.toLowerCase() === question.correctAnswer.toLowerCase()))
              ? colors.mint + "40" : colors.error + "40",
          }]}>
            <Ionicons
              name={(isCorrect || (question.type === "fill-blank" && fillInput.toLowerCase() === question.correctAnswer.toLowerCase())) ? "checkmark-circle" : "information-circle"}
              size={18}
              color={(isCorrect || (question.type === "fill-blank" && fillInput.toLowerCase() === question.correctAnswer.toLowerCase())) ? colors.mint : colors.error}
            />
            <View style={{ flex: 1, gap: 4 }}>
              {question.type === "fill-blank" && fillInput.toLowerCase() !== question.correctAnswer.toLowerCase() && (
                <Text style={[styles.correctAnswerText, { color: colors.mint }]}>
                  Correct: {question.correctAnswer}
                </Text>
              )}
              <Text style={[styles.explanationText, { color: colors.text }]}>{question.explanation}</Text>
            </View>
          </View>
        )}
      </ScrollView>

      {showResult && (
        <View style={[styles.footer, { paddingBottom: insets.bottom + 12 }]}>
          <Pressable
            onPress={handleNext}
            style={({ pressed }) => [styles.nextBtn, { backgroundColor: lang.color, opacity: pressed ? 0.85 : 1 }]}
          >
            <Text style={styles.nextBtnText}>{current + 1 >= totalQ ? "See Results" : "Next Question"}</Text>
            <Ionicons name={current + 1 >= totalQ ? "trophy" : "arrow-forward"} size={18} color="#fff" />
          </Pressable>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center", gap: 12,
    paddingHorizontal: 16, paddingBottom: 8,
  },
  backBtn: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  quizLabel: { fontSize: 11, fontFamily: "Nunito_600SemiBold" },
  quizTitle: { fontSize: 14, fontFamily: "Nunito_700Bold" },
  qCount: { paddingHorizontal: 10, paddingVertical: 4, borderRadius: 10 },
  qCountText: { fontSize: 12, fontFamily: "Nunito_700Bold" },
  progressBar: { height: 4, marginHorizontal: 16, borderRadius: 2, overflow: "hidden", marginBottom: 8 },
  progressFill: { height: "100%", borderRadius: 2 },
  content: { padding: 16, gap: 14 },
  questionCard: { borderRadius: 18, padding: 20, gap: 12 },
  typeRow: { flexDirection: "row" },
  typeText: { fontSize: 11, fontFamily: "Nunito_700Bold", textTransform: "uppercase", letterSpacing: 0.5 },
  questionText: { fontSize: 19, fontFamily: "Nunito_700Bold", lineHeight: 28 },
  options: { gap: 10 },
  optionBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    padding: 16, borderRadius: 14, borderWidth: 1.5,
  },
  optionText: { fontSize: 16, fontFamily: "Nunito_600SemiBold", flex: 1 },
  fillSection: { gap: 10 },
  fillInput: {
    padding: 16, borderRadius: 14, fontSize: 16,
    fontFamily: "Nunito_400Regular", borderWidth: 1.5,
  },
  submitBtn: { paddingVertical: 14, borderRadius: 14, alignItems: "center" },
  submitText: { color: "#fff", fontSize: 16, fontFamily: "Nunito_700Bold" },
  explanationCard: {
    flexDirection: "row", gap: 10, padding: 14, borderRadius: 14, borderWidth: 1, alignItems: "flex-start",
  },
  explanationText: { fontSize: 14, fontFamily: "Nunito_400Regular", lineHeight: 20 },
  correctAnswerText: { fontSize: 14, fontFamily: "Nunito_700Bold" },
  footer: { paddingHorizontal: 16, paddingTop: 12 },
  nextBtn: {
    flexDirection: "row", alignItems: "center", justifyContent: "center",
    gap: 8, paddingVertical: 16, borderRadius: 14,
  },
  nextBtnText: { color: "#fff", fontSize: 16, fontFamily: "Nunito_700Bold" },
  completeContent: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 16 },
  resultIcon: { width: 100, height: 100, borderRadius: 50, alignItems: "center", justifyContent: "center" },
  completeTitle: { fontSize: 28, fontFamily: "Nunito_800ExtraBold", textAlign: "center" },
  completeSubtitle: { fontSize: 16, fontFamily: "Nunito_400Regular", textAlign: "center", lineHeight: 22 },
  scoreCard: { padding: 24, borderRadius: 20, alignItems: "center", gap: 8, width: "100%" },
  scoreNumber: { fontSize: 56, fontFamily: "Nunito_800ExtraBold" },
  scoreLabel: { fontSize: 16, fontFamily: "Nunito_600SemiBold" },
  xpRow: { flexDirection: "row", alignItems: "center", gap: 6, marginTop: 4 },
  xpText: { fontSize: 15, fontFamily: "Nunito_700Bold" },
  doneBtn: { width: "100%", paddingVertical: 16, borderRadius: 14, alignItems: "center" },
  doneBtnText: { color: "#fff", fontSize: 16, fontFamily: "Nunito_700Bold" },
  retryBtn: {
    flexDirection: "row", alignItems: "center", gap: 8,
    paddingHorizontal: 24, paddingVertical: 12, borderRadius: 14, borderWidth: 1,
  },
  retryText: { fontSize: 15, fontFamily: "Nunito_600SemiBold" },
});
