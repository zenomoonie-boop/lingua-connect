import React, { createContext, useContext, useState, useMemo, ReactNode, useEffect } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";

export type User = {
  id: string;
  email: string;
  displayName: string;
  createdAt: string;
};

type AuthContextValue = {
  user: User | null;
  isLoading: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, displayName: string) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

const USERS_KEY = "lingua_users";
const SESSION_KEY = "lingua_session";

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    (async () => {
      try {
        const session = await AsyncStorage.getItem(SESSION_KEY);
        if (session) {
          setUser(JSON.parse(session));
        }
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

  const value = useMemo(() => ({ user, isLoading, login, register, logout }), [user, isLoading]);

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
