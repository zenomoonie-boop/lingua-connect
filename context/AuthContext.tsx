import React, { createContext, useContext, useState, useMemo, ReactNode, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { fetch } from "expo/fetch";
import type { GenderOption } from "@/data/profileOptions";
import { getApiUrl } from "@/lib/query-client";

export type User = {
  id: string;
  email: string;
  displayName: string;
  createdAt: string;
  bio?: string;
  avatarColor?: string;
  avatarUri?: string;
  gender?: GenderOption;
  age?: number;
  countryCode?: string;
  countryName?: string;
  flag?: string;
  nativeLanguage?: string;
  learningLanguages?: string[];
  followers?: number;
  following?: number;
  followingUserIds?: string[];
  moments?: number;
  locationName?: string;
  latitude?: number;
  longitude?: number;
};

export type RegisterPayload = {
  email: string;
  password: string;
  displayName: string;
  gender: GenderOption;
  age: number;
  countryCode: string;
  countryName: string;
  flag: string;
  nativeLanguage: string;
  learningLanguages: string[];
};

type AuthContextValue = {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (payload: RegisterPayload) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<Omit<User, "id" | "email" | "createdAt">>) => Promise<void>;
  getUserById: (userId: string) => Promise<User | null>;
  toggleFollowUser: (targetUserId: string) => Promise<boolean>;
  isFollowingUser: (targetUserId: string) => boolean;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const USER_CACHE_KEY = "lingua_users";
const SESSION_KEY = "lingua_session";
const SESSION_TOKEN_KEY = "lingua_session_token";

const AVATAR_COLORS = [
  "#FF6B35", "#4ECDC4", "#45B7D1", "#8B7CF6",
  "#F7C948", "#6BCB77", "#FF4757", "#FF6B9D", "#2563EB",
];
const REQUEST_TIMEOUT_MS = 12000;

function randomAvatarColor(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

function mapServerUser(user: Record<string, any>): User {
  return {
    id: String(user.id),
    email: String(user.email),
    displayName: String(user.displayName),
    createdAt: user.createdAt ? new Date(user.createdAt).toISOString() : new Date().toISOString(),
    bio: user.bio ?? "",
    avatarColor: user.avatarColor ?? randomAvatarColor(String(user.email)),
    avatarUri: user.avatarUri ?? undefined,
    gender: user.gender ?? undefined,
    age: typeof user.age === "number" ? user.age : undefined,
    countryCode: user.countryCode ?? undefined,
    countryName: user.countryName ?? undefined,
    flag: user.flag ?? undefined,
    nativeLanguage: user.nativeLanguage ?? undefined,
    learningLanguages: Array.isArray(user.learningLanguages) ? user.learningLanguages : [],
    followers: typeof user.followers === "number" ? user.followers : 0,
    following: typeof user.following === "number" ? user.following : 0,
    followingUserIds: Array.isArray(user.followingUserIds) ? user.followingUserIds : [],
    moments: typeof user.moments === "number" ? user.moments : 0,
    locationName: user.locationName ?? undefined,
    latitude: user.latitude !== null && user.latitude !== undefined ? Number(user.latitude) : undefined,
    longitude: user.longitude !== null && user.longitude !== undefined ? Number(user.longitude) : undefined,
  };
}

async function readCachedUsers(): Promise<User[]> {
  const raw = await AsyncStorage.getItem(USER_CACHE_KEY);
  if (!raw) {
    return [];
  }

  try {
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

async function upsertCachedUser(nextUser: User) {
  const users = await readCachedUsers();
  const existingIndex = users.findIndex((candidate) => candidate.id === nextUser.id);

  if (existingIndex >= 0) {
    users[existingIndex] = { ...users[existingIndex], ...nextUser };
  } else {
    users.push(nextUser);
  }

  await AsyncStorage.setItem(USER_CACHE_KEY, JSON.stringify(users));
}

async function clearSessionCache() {
  await AsyncStorage.multiRemove([SESSION_KEY, SESSION_TOKEN_KEY]);
}

async function requireSessionToken(): Promise<string> {
  const token = await AsyncStorage.getItem(SESSION_TOKEN_KEY);
  if (!token) {
    throw new Error("Please sign in again.");
  }

  return token;
}

async function fetchWithTimeout(input: string, init?: RequestInit) {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  const normalizedInit = init
    ? {
        ...init,
        body: init.body ?? undefined,
      }
    : undefined;

  try {
    return await fetch(input, {
      ...normalizedInit,
      signal: controller.signal,
    });
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      throw new Error("Request timed out. Check that your phone can reach the backend server.");
    }
    throw error;
  } finally {
    clearTimeout(timeoutId);
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const token = await AsyncStorage.getItem(SESSION_TOKEN_KEY);
        if (!token) {
          await clearSessionCache();
          setIsLoading(false);
          return;
        }

        const response = await fetchWithTimeout(new URL("/api/auth/me", getApiUrl()).toString(), {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (!response.ok) {
          await clearSessionCache();
          setUser(null);
          setIsLoading(false);
          return;
        }

        const payload = await response.json();
        const mappedUser = mapServerUser(payload.user);
        setUser(mappedUser);
        await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(mappedUser));
        await upsertCachedUser(mappedUser);
      } catch {
        await clearSessionCache();
        setUser(null);
      }

      setIsLoading(false);
    })();
  }, []);

  const login = async (email: string, password: string) => {
    const response = await fetchWithTimeout(new URL("/api/auth/login", getApiUrl()).toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.user || !payload?.token) {
      throw new Error(payload?.error || "Invalid email or password");
    }

    const mappedUser = mapServerUser(payload.user);
    setUser(mappedUser);
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(mappedUser));
    await AsyncStorage.setItem(SESSION_TOKEN_KEY, payload.token);
    await upsertCachedUser(mappedUser);
  };

  const register = async ({
    email,
    password,
    displayName,
    gender,
    age,
    countryCode,
    countryName,
    flag,
    nativeLanguage,
    learningLanguages,
  }: RegisterPayload) => {
    const response = await fetchWithTimeout(new URL("/api/auth/register", getApiUrl()).toString(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        email,
        password,
        displayName,
        gender,
        age,
        countryCode,
        countryName,
        flag,
        nativeLanguage,
        learningLanguages,
      }),
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.user || !payload?.token) {
      throw new Error(payload?.error || "Registration failed");
    }

    const mappedUser = {
      ...mapServerUser(payload.user),
      avatarColor: payload.user.avatarColor ?? randomAvatarColor(email),
    };
    setUser(mappedUser);
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(mappedUser));
    await AsyncStorage.setItem(SESSION_TOKEN_KEY, payload.token);
    await upsertCachedUser(mappedUser);
  };

  const logout = async () => {
    setUser(null);
    const token = await AsyncStorage.getItem(SESSION_TOKEN_KEY);
    if (token) {
      try {
        await fetchWithTimeout(new URL("/api/auth/logout", getApiUrl()).toString(), {
          method: "POST",
          headers: { Authorization: `Bearer ${token}` },
        });
      } catch {}
    }
    await clearSessionCache();
  };

  const updateProfile = async (updates: Partial<Omit<User, "id" | "email" | "createdAt">>) => {
    if (!user) {
      throw new Error("Please sign in again.");
    }

    const previousUser = user;
    const optimisticUser = { ...user, ...updates };
    setUser(optimisticUser);
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(optimisticUser));

    try {
      const token = await requireSessionToken();
      const response = await fetchWithTimeout(new URL("/api/auth/profile", getApiUrl()).toString(), {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(updates),
      });

      const payload = await response.json().catch(() => null);
      if (!response.ok || !payload?.user) {
        throw new Error(payload?.error || "Failed to update profile");
      }

      const mappedUser = mapServerUser(payload.user);
      setUser(mappedUser);
      await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(mappedUser));
      await upsertCachedUser(mappedUser);
    } catch (error) {
      setUser(previousUser);
      await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(previousUser));
      throw error instanceof Error ? error : new Error("Failed to update profile");
    }
  };

  const getUserById = async (userId: string) => {
    const token = await AsyncStorage.getItem(SESSION_TOKEN_KEY);
    if (token) {
      try {
        const response = await fetchWithTimeout(new URL(`/api/users/${userId}`, getApiUrl()).toString(), {
          headers: { Authorization: `Bearer ${token}` },
        });

        if (response.ok) {
          const payload = await response.json();
          const mappedUser = mapServerUser(payload.user);
          await upsertCachedUser(mappedUser);
          return mappedUser;
        }
      } catch {}
    }

    const cachedUsers = await readCachedUsers();
    return cachedUsers.find((candidate) => candidate.id === userId) ?? null;
  };

  const toggleFollowUser = async (targetUserId: string) => {
    if (!user || user.id === targetUserId) {
      return false;
    }

    const token = await requireSessionToken();
    const response = await fetchWithTimeout(new URL(`/api/users/${targetUserId}/follow`, getApiUrl()).toString(), {
      method: "POST",
      headers: { Authorization: `Bearer ${token}` },
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok || !payload?.currentUser || !payload?.targetUser) {
      throw new Error(payload?.error || "Failed to update follow status");
    }

    const mappedCurrentUser = mapServerUser(payload.currentUser);
    const mappedTargetUser = mapServerUser(payload.targetUser);
    setUser(mappedCurrentUser);
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(mappedCurrentUser));
    await upsertCachedUser(mappedCurrentUser);
    await upsertCachedUser(mappedTargetUser);
    return Boolean(payload.isFollowing);
  };

  const isFollowingUser = (targetUserId: string) => {
    if (!user) {
      return false;
    }

    return (user.followingUserIds || []).includes(targetUserId);
  };

  const value = useMemo(
    () => ({ user, isLoading, login, register, logout, updateProfile, getUserById, toggleFollowUser, isFollowingUser }),
    [user, isLoading],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
