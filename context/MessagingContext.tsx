import React, { createContext, useContext, useEffect, useMemo, useRef, useState } from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { View, Text, StyleSheet } from "react-native";
import * as Haptics from "expo-haptics";
import { getApiUrl } from "@/lib/query-client";
import { useAuth } from "./AuthContext";

const SESSION_TOKEN_KEY = "lingua_session_token";

type MessagingContextValue = {
  unreadTotal: number;
  refreshTick: number;
  activeConversationId: string | null;
  setActiveConversationId: (conversationId: string | null) => void;
};

const MessagingContext = createContext<MessagingContextValue | null>(null);

export function MessagingProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [unreadTotal, setUnreadTotal] = useState(0);
  const [refreshTick, setRefreshTick] = useState(0);
  const [bannerText, setBannerText] = useState<string | null>(null);
  const [activeConversationId, setActiveConversationId] = useState<string | null>(null);
  const bannerTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!user) {
      setUnreadTotal(0);
      setRefreshTick(0);
      return;
    }

    let mounted = true;
    let socket: WebSocket | null = null;

    const refreshInboxState = async () => {
      const token = await AsyncStorage.getItem(SESSION_TOKEN_KEY);
      if (!token) {
        if (mounted) {
          setUnreadTotal(0);
        }
        return;
      }

      try {
        const response = await fetch(new URL("/api/messages/conversations", getApiUrl()).toString(), {
          headers: { Authorization: `Bearer ${token}` },
        });
        const payload = await response.json().catch(() => null);
        if (!mounted || !response.ok || !Array.isArray(payload?.conversations)) {
          return;
        }

        const unread = payload.conversations.reduce((total: number, item: any) => {
          return total + (typeof item?.unread === "number" ? item.unread : 0);
        }, 0);
        setUnreadTotal(unread);
        setRefreshTick((tick) => tick + 1);
      } catch {}
    };

    const connect = async () => {
      const token = await AsyncStorage.getItem(SESSION_TOKEN_KEY);
      if (!token) {
        return;
      }

      await refreshInboxState();

      const baseUrl = new URL(getApiUrl());
      const wsProtocol = baseUrl.protocol === "https:" ? "wss:" : "ws:";
      socket = new WebSocket(`${wsProtocol}//${baseUrl.host}/api/messages/live?token=${encodeURIComponent(token)}`);

      socket.onmessage = (event) => {
        try {
          const payload = JSON.parse(event.data as string) as
            | { type: "connected"; userId: string }
            | { type: "message:new"; conversationId: string; senderId: string };

          if (payload.type !== "message:new") {
            return;
          }

          void refreshInboxState();

          if (payload.senderId !== user.id && payload.conversationId !== activeConversationId) {
            setBannerText("New message received");
            Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(() => {});
            if (bannerTimeoutRef.current) {
              clearTimeout(bannerTimeoutRef.current);
            }
            bannerTimeoutRef.current = setTimeout(() => {
              setBannerText(null);
              bannerTimeoutRef.current = null;
            }, 2600);
          }
        } catch {}
      };

      socket.onclose = () => {
        socket = null;
      };
    };

    void connect();

    return () => {
      mounted = false;
      socket?.close();
      if (bannerTimeoutRef.current) {
        clearTimeout(bannerTimeoutRef.current);
        bannerTimeoutRef.current = null;
      }
    };
  }, [activeConversationId, user]);

  const value = useMemo(() => ({
    unreadTotal,
    refreshTick,
    activeConversationId,
    setActiveConversationId,
  }), [activeConversationId, refreshTick, unreadTotal]);

  return (
    <MessagingContext.Provider value={value}>
      {children}
      {bannerText ? (
        <View pointerEvents="none" style={styles.bannerWrap}>
          <View style={styles.banner}>
            <Text style={styles.bannerText}>{bannerText}</Text>
          </View>
        </View>
      ) : null}
    </MessagingContext.Provider>
  );
}

export function useMessaging() {
  const value = useContext(MessagingContext);
  if (!value) {
    throw new Error("useMessaging must be used within MessagingProvider");
  }
  return value;
}

const styles = StyleSheet.create({
  bannerWrap: {
    position: "absolute",
    top: 64,
    left: 0,
    right: 0,
    alignItems: "center",
    zIndex: 1000,
  },
  banner: {
    backgroundColor: "#062C53",
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.18)",
  },
  bannerText: {
    color: "#F4F8FC",
    fontSize: 13,
    fontFamily: "Nunito_700Bold",
  },
});
