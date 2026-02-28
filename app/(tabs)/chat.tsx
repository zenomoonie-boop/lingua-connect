import React, { useState, useRef, useCallback } from "react";
import {
  View, Text, FlatList, TextInput, Pressable,
  StyleSheet, useColorScheme, Platform,
} from "react-native";
import { KeyboardAvoidingView } from "react-native-keyboard-controller";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { LANGUAGES } from "@/data/lessons";
import { fetch } from "expo/fetch";
import { getApiUrl } from "@/lib/query-client";
import * as Haptics from "expo-haptics";

type Message = {
  id: string;
  role: "user" | "assistant";
  content: string;
};

let msgCounter = 0;
function genId() {
  msgCounter++;
  return `msg-${Date.now()}-${msgCounter}-${Math.random().toString(36).substr(2, 9)}`;
}

function MessageBubble({ message, primaryColor, cardColor, textColor, borderColor }: {
  message: Message;
  primaryColor: string;
  cardColor: string;
  textColor: string;
  borderColor: string;
}) {
  const isUser = message.role === "user";
  return (
    <View style={[bubbleStyles.row, isUser ? bubbleStyles.rowRight : bubbleStyles.rowLeft]}>
      {!isUser && (
        <View style={[bubbleStyles.avatar, { backgroundColor: primaryColor }]}>
          <Ionicons name="sparkles" size={12} color="#fff" />
        </View>
      )}
      <View style={[
        bubbleStyles.bubble,
        isUser
          ? { backgroundColor: primaryColor }
          : { backgroundColor: cardColor, borderWidth: 1, borderColor },
        { maxWidth: "80%" },
      ]}>
        <Text style={[bubbleStyles.text, { color: isUser ? "#fff" : textColor }]}>
          {message.content}
        </Text>
      </View>
    </View>
  );
}

const bubbleStyles = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "flex-end", marginBottom: 10, gap: 8, paddingHorizontal: 16 },
  rowLeft: { justifyContent: "flex-start" },
  rowRight: { justifyContent: "flex-end", flexDirection: "row-reverse" },
  avatar: { width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center", marginBottom: 2 },
  bubble: { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10 },
  text: { fontSize: 15, fontFamily: "Nunito_400Regular", lineHeight: 22 },
});

export default function ChatScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();

  // English is the default language
  const [selectedLang, setSelectedLang] = useState("en");
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [showTyping, setShowTyping] = useState(false);
  const [showLangPicker, setShowLangPicker] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const lang = LANGUAGES.find(l => l.code === selectedLang) || LANGUAGES[0];
  const topInset = Platform.OS === "web" ? 67 : insets.top;

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isStreaming) return;

    setInput("");
    setShowLangPicker(false);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const currentMessages = [...messages];
    const userMsg: Message = { id: genId(), role: "user", content: text };
    setMessages(prev => [...prev, userMsg]);
    setIsStreaming(true);
    setShowTyping(true);

    try {
      const baseUrl = getApiUrl();
      const chatHistory = [
        ...currentMessages.map(m => ({ role: m.role, content: m.content })),
        { role: "user", content: text },
      ];

      const response = await fetch(`${baseUrl}api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
        body: JSON.stringify({
          messages: chatHistory,
          language: selectedLang,
          languageName: lang.name,
        }),
      });

      if (!response.ok) throw new Error("Request failed");

      const reader = response.body?.getReader();
      if (!reader) throw new Error("No body");

      const decoder = new TextDecoder();
      let fullContent = "";
      let buffer = "";
      let assistantAdded = false;

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";

        for (const line of lines) {
          if (!line.startsWith("data: ")) continue;
          const data = line.slice(6);
          if (data === "[DONE]") continue;
          try {
            const parsed = JSON.parse(data);
            if (parsed.content) {
              fullContent += parsed.content;
              if (!assistantAdded) {
                setShowTyping(false);
                setMessages(prev => [...prev, { id: genId(), role: "assistant", content: fullContent }]);
                assistantAdded = true;
              } else {
                setMessages(prev => {
                  const updated = [...prev];
                  updated[updated.length - 1] = { ...updated[updated.length - 1], content: fullContent };
                  return updated;
                });
              }
            }
          } catch {}
        }
      }
    } catch {
      setShowTyping(false);
      setMessages(prev => [...prev, {
        id: genId(), role: "assistant",
        content: "Sorry, I had trouble connecting. Please check your connection and try again.",
      }]);
    } finally {
      setIsStreaming(false);
      setShowTyping(false);
      inputRef.current?.focus();
    }
  }, [input, isStreaming, messages, selectedLang, lang]);

  const reversed = [...messages].reverse();

  const SUGGESTIONS = [
    "Can you help me improve my grammar?",
    "Let's practice pronunciation tips",
    "Give me a common phrase to practice",
    "Correct my mistakes as we talk",
  ];

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      {/* Header */}
      <View style={[styles.header, { paddingTop: topInset + 12, backgroundColor: colors.background }]}>
        <View style={{ flex: 1 }}>
          <Text style={[styles.headerTitle, { color: colors.text }]}>AI Chat Practice</Text>
          <Pressable
            onPress={() => setShowLangPicker(!showLangPicker)}
            style={styles.langRow}
          >
            <View style={[styles.langDot, { backgroundColor: lang.color }]} />
            <Text style={[styles.langName, { color: colors.muted }]}>Practicing: {lang.name}</Text>
            <Ionicons name={showLangPicker ? "chevron-up" : "chevron-down"} size={13} color={colors.muted} />
          </Pressable>
        </View>
        <Pressable
          onPress={() => { setMessages([]); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
          style={[styles.clearBtn, { borderColor: colors.border }]}
        >
          <Ionicons name="trash-outline" size={18} color={colors.muted} />
        </Pressable>
      </View>

      {/* Language picker dropdown */}
      {showLangPicker && (
        <View style={[styles.langPicker, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {LANGUAGES.map(l => (
            <Pressable
              key={l.code}
              onPress={() => {
                setSelectedLang(l.code);
                setShowLangPicker(false);
                setMessages([]);
              }}
              style={[
                styles.langOption,
                { borderBottomColor: colors.border },
                selectedLang === l.code && { backgroundColor: l.color + "15" },
              ]}
            >
              <View style={[styles.optionDot, { backgroundColor: l.color }]} />
              <Text style={[styles.optionText, { color: selectedLang === l.code ? l.color : colors.text }]}>
                {l.name}
              </Text>
              {selectedLang === l.code && (
                <Ionicons name="checkmark-circle" size={16} color={l.color} />
              )}
            </Pressable>
          ))}
        </View>
      )}

      {/* Chat area + input */}
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior="padding"
        keyboardVerticalOffset={0}
      >
        {/* Messages list — always rendered, flex: 1 so it fills space */}
        <FlatList
          style={{ flex: 1 }}
          data={reversed}
          keyExtractor={item => item.id}
          renderItem={({ item }) => (
            <MessageBubble
              message={item}
              primaryColor={colors.primary}
              cardColor={colors.card}
              textColor={colors.text}
              borderColor={colors.border}
            />
          )}
          inverted={messages.length > 0}
          ListHeaderComponent={
            showTyping ? (
              <View style={[bubbleStyles.row, bubbleStyles.rowLeft, { paddingHorizontal: 16, marginBottom: 10 }]}>
                <View style={[bubbleStyles.avatar, { backgroundColor: colors.primary }]}>
                  <Ionicons name="sparkles" size={12} color="#fff" />
                </View>
                <View style={[bubbleStyles.bubble, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }]}>
                  <Text style={[bubbleStyles.text, { color: colors.muted }]}>typing...</Text>
                </View>
              </View>
            ) : null
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <View style={[styles.emptyIcon, { backgroundColor: lang.color + "20" }]}>
                <Ionicons name="chatbubbles" size={32} color={lang.color} />
              </View>
              <Text style={[styles.emptyTitle, { color: colors.text }]}>
                Start Practicing {lang.name}
              </Text>
              <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
                Your AI tutor will correct your mistakes gently and help you improve naturally.
              </Text>
              <View style={styles.suggestions}>
                {SUGGESTIONS.map((s, i) => (
                  <Pressable
                    key={i}
                    onPress={() => { setInput(s); inputRef.current?.focus(); }}
                    style={({ pressed }) => [
                      styles.suggestion,
                      { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
                    ]}
                  >
                    <Text style={[styles.suggestionText, { color: colors.text }]}>{s}</Text>
                    <Ionicons name="arrow-forward" size={14} color={colors.muted} />
                  </Pressable>
                ))}
              </View>
            </View>
          }
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingTop: 12, paddingBottom: 8, flexGrow: 1 }}
          showsVerticalScrollIndicator={false}
        />

        {/* Input bar */}
        <View style={[
          styles.inputBar,
          {
            backgroundColor: colors.background,
            borderTopColor: colors.border,
            paddingBottom: Math.max(insets.bottom, Platform.OS === "web" ? 34 : 10),
          },
        ]}>
          <TextInput
            ref={inputRef}
            value={input}
            onChangeText={setInput}
            placeholder={`Message in ${lang.name}...`}
            placeholderTextColor={colors.muted}
            style={[styles.input, {
              backgroundColor: colors.card,
              color: colors.text,
              borderColor: colors.border,
            }]}
            multiline
            maxLength={500}
            blurOnSubmit={false}
            onSubmitEditing={handleSend}
          />
          <Pressable
            onPress={() => { handleSend(); inputRef.current?.focus(); }}
            disabled={!input.trim() || isStreaming}
            style={({ pressed }) => [
              styles.sendBtn,
              {
                backgroundColor: input.trim() && !isStreaming ? lang.color : colors.border,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <Ionicons name={isStreaming ? "hourglass" : "arrow-up"} size={20} color="#fff" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row",
    alignItems: "flex-start",
    paddingHorizontal: 20,
    paddingBottom: 10,
    gap: 12,
    zIndex: 10,
  },
  headerTitle: { fontSize: 22, fontFamily: "Nunito_800ExtraBold" },
  langRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 3 },
  langDot: { width: 8, height: 8, borderRadius: 4 },
  langName: { fontSize: 12, fontFamily: "Nunito_600SemiBold" },
  clearBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: "center", justifyContent: "center", borderWidth: 1,
    marginTop: 4,
  },
  langPicker: {
    marginHorizontal: 16,
    borderRadius: 14,
    borderWidth: 1,
    overflow: "hidden",
    marginBottom: 6,
    zIndex: 20,
  },
  langOption: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 14, paddingVertical: 11,
    borderBottomWidth: 0.5,
  },
  optionDot: { width: 10, height: 10, borderRadius: 5 },
  optionText: { flex: 1, fontSize: 14, fontFamily: "Nunito_600SemiBold" },
  emptyState: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 28,
    paddingVertical: 40,
    gap: 12,
  },
  emptyIcon: {
    width: 70, height: 70, borderRadius: 35,
    alignItems: "center", justifyContent: "center",
  },
  emptyTitle: { fontSize: 20, fontFamily: "Nunito_700Bold", textAlign: "center" },
  emptySubtitle: { fontSize: 14, fontFamily: "Nunito_400Regular", textAlign: "center", lineHeight: 20 },
  suggestions: { width: "100%", gap: 8, marginTop: 6 },
  suggestion: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 14, paddingVertical: 11,
    borderRadius: 12, borderWidth: 1,
  },
  suggestionText: { fontSize: 14, fontFamily: "Nunito_400Regular", flex: 1 },
  inputBar: {
    flexDirection: "row", alignItems: "flex-end", gap: 10,
    paddingHorizontal: 14, paddingTop: 10, borderTopWidth: 1,
  },
  input: {
    flex: 1, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10,
    fontSize: 15, fontFamily: "Nunito_400Regular", maxHeight: 100, borderWidth: 1,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: "center", justifyContent: "center",
  },
});
