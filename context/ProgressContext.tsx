import React, { createContext, useContext, useState, useMemo, ReactNode, useEffect, useCallback } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { fetch } from "expo/fetch";
import { getApiUrl } from "@/lib/query-client";

export type LessonProgress = {
  lessonId: string;
  completed: boolean;
  score?: number;
  completedAt?: string;
  xpEarned: number;
};

export type ProgressData = {
  completedLessons: LessonProgress[];
  totalXP: number;
  streak: number;
  lastStudyDate: string | null;
  selectedLanguages: string[];
};

type ProgressContextValue = {
  progress: ProgressData;
  isLoading: boolean;
  completeLesson: (lessonId: string, score: number, xp: number) => Promise<void>;
  isLessonCompleted: (lessonId: string) => boolean;
  getLessonScore: (lessonId: string) => number | undefined;
  selectLanguage: (code: string) => Promise<void>;
  unselectLanguage: (code: string) => Promise<void>;
  completedCount: number;
};

const ProgressContext = createContext<ProgressContextValue | null>(null);

const PROGRESS_KEY = "lingua_progress";
const SESSION_TOKEN_KEY = "lingua_session_token";

const DEFAULT_PROGRESS: ProgressData = {
  completedLessons: [],
  totalXP: 0,
  streak: 0,
  lastStudyDate: null,
  selectedLanguages: ["es", "fr"],
};

export function ProgressProvider({ children }: { children: ReactNode }) {
  const [progress, setProgress] = useState<ProgressData>(DEFAULT_PROGRESS);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const token = await AsyncStorage.getItem(SESSION_TOKEN_KEY);
        if (token) {
          try {
            const response = await fetch(new URL("/api/progress", getApiUrl()).toString(), {
              headers: { Authorization: `Bearer ${token}` },
            });

            if (response.ok) {
              const payload = await response.json();
              const serverProgress: ProgressData = {
                completedLessons: Array.isArray(payload?.completedLessons)
                  ? payload.completedLessons.map((item: any) => ({
                      lessonId: item.lessonId,
                      completed: Boolean(item.completed),
                      score: typeof item.score === "number" ? item.score : undefined,
                      completedAt: item.completedAt ? new Date(item.completedAt).toISOString() : undefined,
                      xpEarned: 0,
                    }))
                  : [],
                totalXP: typeof payload?.progress?.totalXp === "number" ? payload.progress.totalXp : 0,
                streak: typeof payload?.progress?.streak === "number" ? payload.progress.streak : 0,
                lastStudyDate: null,
                selectedLanguages: Array.isArray(payload?.progress?.selectedLanguages) ? payload.progress.selectedLanguages : DEFAULT_PROGRESS.selectedLanguages,
              };

              setProgress(serverProgress);
              await AsyncStorage.setItem(PROGRESS_KEY, JSON.stringify(serverProgress));
              setIsLoading(false);
              return;
            }
          } catch {}
        }

        const raw = await AsyncStorage.getItem(PROGRESS_KEY);
        if (raw) setProgress(JSON.parse(raw));
      } catch {}
      setIsLoading(false);
    })();
  }, []);

  const save = useCallback(async (data: ProgressData) => {
    setProgress(data);
    await AsyncStorage.setItem(PROGRESS_KEY, JSON.stringify(data));

    const token = await AsyncStorage.getItem(SESSION_TOKEN_KEY);
    if (token) {
      try {
        await fetch(new URL("/api/progress", getApiUrl()).toString(), {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            streak: data.streak,
            totalXp: data.totalXP,
            selectedLanguages: data.selectedLanguages,
          }),
        });
      } catch {}
    }
  }, []);

  const completeLesson = useCallback(async (lessonId: string, score: number, xp: number) => {
    const today = new Date().toDateString();
    const existing = progress.completedLessons.find(l => l.lessonId === lessonId);

    const updatedLesson: LessonProgress = {
      lessonId,
      completed: true,
      score: existing ? Math.max(score, existing.score ?? 0) : score,
      completedAt: new Date().toISOString(),
      xpEarned: xp,
    };

    const completedLessons = existing
      ? progress.completedLessons.map(l => l.lessonId === lessonId ? updatedLesson : l)
      : [...progress.completedLessons, updatedLesson];

    const isNewToday = progress.lastStudyDate !== today;
    const wasYesterday = progress.lastStudyDate === new Date(Date.now() - 86400000).toDateString();

    const newXP = existing ? progress.totalXP : progress.totalXP + xp;
    const newStreak = isNewToday ? (wasYesterday ? progress.streak + 1 : 1) : progress.streak;

    const nextProgress = {
      ...progress,
      completedLessons,
      totalXP: newXP,
      streak: newStreak,
      lastStudyDate: today,
    };

    setProgress(nextProgress);
    await AsyncStorage.setItem(PROGRESS_KEY, JSON.stringify(nextProgress));

    const token = await AsyncStorage.getItem(SESSION_TOKEN_KEY);
    if (token) {
      try {
        await fetch(new URL("/api/progress/lesson", getApiUrl()).toString(), {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            lessonId,
            languageCode: lessonId.split("-")[0] || "en",
            completed: true,
            score: updatedLesson.score,
            completedAt: updatedLesson.completedAt,
            xpEarned: xp,
            streak: newStreak,
            totalXp: newXP,
          }),
        });
        return;
      } catch {}
    }

    await save(nextProgress);
  }, [progress, save]);

  const isLessonCompleted = useCallback((lessonId: string) => {
    return progress.completedLessons.some(l => l.lessonId === lessonId && l.completed);
  }, [progress]);

  const getLessonScore = useCallback((lessonId: string) => {
    return progress.completedLessons.find(l => l.lessonId === lessonId)?.score;
  }, [progress]);

  const selectLanguage = useCallback(async (code: string) => {
    if (progress.selectedLanguages.includes(code)) return;
    await save({ ...progress, selectedLanguages: [...progress.selectedLanguages, code] });
  }, [progress, save]);

  const unselectLanguage = useCallback(async (code: string) => {
    await save({
      ...progress,
      selectedLanguages: progress.selectedLanguages.filter(l => l !== code),
    });
  }, [progress, save]);

  const completedCount = useMemo(() => progress.completedLessons.filter(l => l.completed).length, [progress]);

  const value = useMemo(() => ({
    progress, isLoading, completeLesson, isLessonCompleted, getLessonScore,
    selectLanguage, unselectLanguage, completedCount,
  }), [progress, isLoading, completeLesson, isLessonCompleted, getLessonScore, selectLanguage, unselectLanguage, completedCount]);

  return <ProgressContext.Provider value={value}>{children}</ProgressContext.Provider>;
}

export function useProgress() {
  const ctx = useContext(ProgressContext);
  if (!ctx) throw new Error("useProgress must be used within ProgressProvider");
  return ctx;
}
