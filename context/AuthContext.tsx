import React, { createContext, useContext, useState, useMemo, ReactNode, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type User = {
  id: string;
  email: string;
  displayName: string;
  createdAt: string;
  bio?: string;
  avatarColor?: string;
  nativeLanguage?: string;
  learningLanguages?: string[];
  followers?: number;
  following?: number;
  moments?: number;
};

type AuthContextValue = {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
  updateProfile: (updates: Partial<Omit<User, "id" | "email" | "createdAt">>) => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const USERS_KEY = "lingua_users";
const SESSION_KEY = "lingua_session";

const AVATAR_COLORS = [
  "#FF6B35", "#4ECDC4", "#45B7D1", "#8B7CF6",
  "#F7C948", "#6BCB77", "#FF4757", "#FF6B9D", "#2563EB",
];

function randomAvatarColor(seed: string) {
  let hash = 0;
  for (let i = 0; i < seed.length; i++) hash = seed.charCodeAt(i) + ((hash << 5) - hash);
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const session = await AsyncStorage.getItem(SESSION_KEY);
        if (session) setUser(JSON.parse(session));
      } catch {}
      setIsLoading(false);
    })();
  }, []);

  const login = async (email: string, password: string) => {
    const usersRaw = await AsyncStorage.getItem(USERS_KEY);
    const users: (User & { password: string })[] = usersRaw ? JSON.parse(usersRaw) : [];
    const found = users.find(u => u.email.toLowerCase() === email.toLowerCase() && u.password === password);
    if (!found) throw new Error("Invalid email or password");
    const { password: _, ...userData } = found;
    setUser(userData);
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(userData));
  };

  const register = async (email: string, password: string, displayName: string) => {
    const usersRaw = await AsyncStorage.getItem(USERS_KEY);
    const users: (User & { password: string })[] = usersRaw ? JSON.parse(usersRaw) : [];
    if (users.find(u => u.email.toLowerCase() === email.toLowerCase())) {
      throw new Error("An account with this email already exists");
    }
    const newUser: User & { password: string } = {
      id: Date.now().toString() + Math.random().toString(36).substr(2, 9),
      email,
      displayName,
      createdAt: new Date().toISOString(),
      bio: "",
      avatarColor: randomAvatarColor(email),
      nativeLanguage: "Filipino",
      learningLanguages: ["en"],
      followers: 0,
      following: 0,
      moments: 0,
      password,
    };
    users.push(newUser);
    await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users));
    const { password: _, ...userData } = newUser;
    setUser(userData);
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(userData));
  };

  const logout = async () => {
    setUser(null);
    await AsyncStorage.removeItem(SESSION_KEY);
  };

  const updateProfile = async (updates: Partial<Omit<User, "id" | "email" | "createdAt">>) => {
    if (!user) return;
    const updated = { ...user, ...updates };
    setUser(updated);
    await AsyncStorage.setItem(SESSION_KEY, JSON.stringify(updated));
    const usersRaw = await AsyncStorage.getItem(USERS_KEY);
    if (usersRaw) {
      const users: (User & { password?: string })[] = JSON.parse(usersRaw);
      const idx = users.findIndex(u => u.id === user.id);
      if (idx !== -1) {
        users[idx] = { ...users[idx], ...updates };
        await AsyncStorage.setItem(USERS_KEY, JSON.stringify(users));
      }
    }
  };

  const value = useMemo(
    () => ({ user, isLoading, login, register, logout, updateProfile }),
    [user, isLoading]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
