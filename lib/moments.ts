import AsyncStorage from "@react-native-async-storage/async-storage";
import { fetch } from "expo/fetch";
import { getApiUrl } from "@/lib/query-client";

export type UserMoment = {
  id: string;
  userId: string;
  userName: string;
  userInitials: string;
  userColor: string;
  userAvatarUri?: string;
  text: string;
  lang: string;
  langColor: string;
  likes: number;
  comments: number;
  createdAt: number;
  timeLabel: string;
  isOwn?: boolean;
  correction: { original: string; corrected: string | null; note: string | null } | null;
};

const MOMENTS_KEY = "lingua_moments";
const SESSION_TOKEN_KEY = "lingua_session_token";

function isRemovedLegacyMoment(moment: UserMoment): boolean {
  const text = moment.text.trim().toLowerCase().replace(/\s+/g, " ");
  const name = moment.userName.trim().toLowerCase().replace(/\s+/g, " ");

  if (name === "moon") {
    return true;
  }

  return text.includes("ang ganda mo");
}

export async function loadMoments(): Promise<UserMoment[]> {
  try {
    const token = await AsyncStorage.getItem(SESSION_TOKEN_KEY);
    if (token) {
      try {
        const response = await fetch(new URL("/api/moments", getApiUrl()).toString(), {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          const payload = await response.json();
          const moments = Array.isArray(payload?.moments) ? payload.moments : [];
          const sanitized = moments.filter((item: unknown): item is UserMoment => {
            if (!item || typeof item !== "object") {
              return false;
            }

            return !isRemovedLegacyMoment(item as UserMoment);
          });

          await AsyncStorage.setItem(MOMENTS_KEY, JSON.stringify(sanitized));
          return sanitized;
        }
      } catch {}
    }

    const raw = await AsyncStorage.getItem(MOMENTS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) {
      return [];
    }

    const sanitized = parsed.filter((item): item is UserMoment => {
      if (!item || typeof item !== "object") {
        return false;
      }

      const candidate = item as UserMoment;
      return !isRemovedLegacyMoment(candidate);
    });

    if (sanitized.length !== parsed.length) {
      await AsyncStorage.setItem(MOMENTS_KEY, JSON.stringify(sanitized));
    }

    return sanitized;
  } catch {
    return [];
  }
}

export async function saveMoments(moments: UserMoment[]): Promise<void> {
  const sanitized = moments.filter((moment) => !isRemovedLegacyMoment(moment));
  await AsyncStorage.setItem(MOMENTS_KEY, JSON.stringify(sanitized));
}

export async function createMoment(input: {
  text: string;
  lang: string;
  langColor: string;
  correction?: UserMoment["correction"];
}): Promise<{ moment: UserMoment; userMomentsCount?: number } | null> {
  const token = await AsyncStorage.getItem(SESSION_TOKEN_KEY);
  if (!token) {
    return null;
  }

  try {
    const response = await fetch(new URL("/api/moments", getApiUrl()).toString(), {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify(input),
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.moment) {
      return null;
    }

    const currentMoments = await loadMoments();
    const nextMoments = [payload.moment as UserMoment, ...currentMoments.filter((moment) => moment.id !== payload.moment.id)];
    await AsyncStorage.setItem(MOMENTS_KEY, JSON.stringify(nextMoments));

    return {
      moment: payload.moment as UserMoment,
      userMomentsCount: typeof payload?.user?.moments === "number" ? payload.user.moments : undefined,
    };
  } catch {
    return null;
  }
}
