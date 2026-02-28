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
import { useProgress } from "@/context/ProgressContext";
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

function MessageBubble({ message, colors }: { message: Message; colors: typeof Colors.dark }) {
  const isUser = message.role === "user";
  return (
    <View style={[styles.bubbleWrapper, isUser ? styles.bubbleRight : styles.bubbleLeft]}>
      {!isUser && (
        <View style={[styles.aiAvatar, { backgroundColor: colors.primary }]}>
          <Ionicons name="sparkles" size={12} color="#fff" />
        </View>
      )}
      <View style={[
        styles.bubble,
        isUser
          ? { backgroundColor: colors.primary }
          : { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border },
      ]}>
        <Text style={[styles.bubbleText, { color: isUser ? "#fff" : colors.text }]}>
          {message.content}
        </Text>
      </View>
    </View>
  );
}

function TypingIndicator({ colors }: { colors: typeof Colors.dark }) {
  return (
    <View style={[styles.bubbleWrapper, styles.bubbleLeft]}>
      <View style={[styles.aiAvatar, { backgroundColor: colors.primary }]}>
        <Ionicons name="sparkles" size={12} color="#fff" />
      </View>
      <View style={[styles.bubble, { backgroundColor: colors.card, borderWidth: 1, borderColor: colors.border }]}>
        <Text style={[styles.bubbleText, { color: colors.muted }]}>...</Text>
      </View>
    </View>
  );
}

export default function ChatScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const { progress } = useProgress();

  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [isStreaming, setIsStreaming] = useState(false);
  const [showTyping, setShowTyping] = useState(false);
  const [selectedLang, setSelectedLang] = useState(progress.selectedLanguages[0] || "es");
  const [showLangPicker, setShowLangPicker] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const lang = LANGUAGES.find(l => l.code === selectedLang)!;
  const topInset = Platform.OS === "web" ? 67 : insets.top;

  const handleSend = useCallback(async () => {
    const text = input.trim();
    if (!text || isStreaming) return;

    setInput("");
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
      setMessages(prev => [...prev, { id: genId(), role: "assistant", content: "Sorry, I had trouble connecting. Please try again." }]);
    } finally {
      setIsStreaming(false);
      setShowTyping(false);
      inputRef.current?.focus();
    }
  }, [input, isStreaming, messages, selectedLang, lang]);

  const reversed = [...messages].reverse();

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.header, { paddingTop: topInset + 12 }]}>
        <View>
          <Text style={[styles.headerTitle, { color: colors.text }]}>AI Chat Practice</Text>
          <Pressable onPress={() => setShowLangPicker(!showLangPicker)} style={styles.langRow}>
            <View style={[styles.langDot, { backgroundColor: lang.color }]} />
            <Text style={[styles.langName, { color: colors.muted }]}>{lang.name}</Text>
            <Ionicons name={showLangPicker ? "chevron-up" : "chevron-down"} size={14} color={colors.muted} />
          </Pressable>
        </View>
        <Pressable
          onPress={() => { setMessages([]); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
          style={[styles.clearBtn, { borderColor: colors.border }]}
        >
          <Ionicons name="trash-outline" size={18} color={colors.muted} />
        </Pressable>
      </View>

      {showLangPicker && (
        <View style={[styles.langPicker, { backgroundColor: colors.card, borderColor: colors.border }]}>
          {LANGUAGES.map(l => (
            <Pressable
              key={l.code}
              onPress={() => { setSelectedLang(l.code); setShowLangPicker(false); setMessages([]); }}
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
              {selectedLang === l.code && <Ionicons name="checkmark" size={16} color={l.color} />}
            </Pressable>
          ))}
        </View>
      )}

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior="padding"
        keyboardVerticalOffset={0}
      >
        {messages.length === 0 && (
          <View style={styles.emptyState}>
            <View style={[styles.emptyIcon, { backgroundColor: lang.color + "20" }]}>
              <Ionicons name="chatbubbles" size={32} color={lang.color} />
            </View>
            <Text style={[styles.emptyTitle, { color: colors.text }]}>Start Practicing {lang.name}</Text>
            <Text style={[styles.emptySubtitle, { color: colors.muted }]}>
              Your AI tutor will correct mistakes gently and help you improve naturally.
            </Text>
            {["Hola, ¿cómo estás?", "Tell me about your day", "Help me with greetings"].slice(0, selectedLang === "es" ? 3 : 2).map((prompt, i) => (
              <Pressable
                key={i}
                onPress={() => { setInput(prompt); inputRef.current?.focus(); }}
                style={[styles.suggestionChip, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <Text style={[styles.suggestionText, { color: colors.text }]}>{prompt}</Text>
              </Pressable>
            ))}
          </View>
        )}

        <FlatList
          data={reversed}
          keyExtractor={item => item.id}
          renderItem={({ item }) => <MessageBubble message={item} colors={colors} />}
          inverted={messages.length > 0}
          ListHeaderComponent={showTyping ? <TypingIndicator colors={colors} /> : null}
          keyboardDismissMode="interactive"
          keyboardShouldPersistTaps="handled"
          contentContainerStyle={{ paddingHorizontal: 16, paddingVertical: 12 }}
          showsVerticalScrollIndicator={false}
        />

        <View style={[styles.inputBar, {
          backgroundColor: colors.background,
          borderTopColor: colors.border,
          paddingBottom: Math.max(insets.bottom, Platform.OS === "web" ? 34 : 8),
        }]}>
          <TextInput
            ref={inputRef}
            value={input}
            onChangeText={setInput}
            placeholder={`Write in ${lang.name}...`}
            placeholderTextColor={colors.muted}
            style={[styles.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
            multiline
            blurOnSubmit={false}
            onSubmitEditing={handleSend}
          />
          <Pressable
            onPress={handleSend}
            disabled={!input.trim() || isStreaming}
            style={({ pressed }) => [
              styles.sendBtn,
              {
                backgroundColor: input.trim() && !isStreaming ? colors.primary : colors.border,
                opacity: pressed ? 0.8 : 1,
              },
            ]}
          >
            <Ionicons name="arrow-up" size={20} color="#fff" />
          </Pressable>
        </View>
      </KeyboardAvoidingView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row", justifyContent: "space-between", alignItems: "flex-start",
    paddingHorizontal: 20, paddingBottom: 12,
  },
  headerTitle: { fontSize: 24, fontFamily: "Nunito_800ExtraBold" },
  langRow: { flexDirection: "row", alignItems: "center", gap: 5, marginTop: 4 },
  langDot: { width: 8, height: 8, borderRadius: 4 },
  langName: { fontSize: 13, fontFamily: "Nunito_600SemiBold" },
  clearBtn: {
    width: 36, height: 36, borderRadius: 18,
    alignItems: "center", justifyContent: "center", borderWidth: 1,
  },
  langPicker: {
    marginHorizontal: 20, borderRadius: 14, borderWidth: 1,
    overflow: "hidden", marginBottom: 8,
  },
  langOption: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 14, paddingVertical: 12, borderBottomWidth: 0.5,
  },
  optionDot: { width: 10, height: 10, borderRadius: 5 },
  optionText: { flex: 1, fontSize: 14, fontFamily: "Nunito_600SemiBold" },
  emptyState: { flex: 1, alignItems: "center", justifyContent: "center", padding: 32, gap: 12 },
  emptyIcon: { width: 72, height: 72, borderRadius: 36, alignItems: "center", justifyContent: "center" },
  emptyTitle: { fontSize: 20, fontFamily: "Nunito_700Bold", textAlign: "center" },
  emptySubtitle: { fontSize: 14, fontFamily: "Nunito_400Regular", textAlign: "center", lineHeight: 20 },
  suggestionChip: {
    paddingHorizontal: 16, paddingVertical: 10, borderRadius: 20, borderWidth: 1,
  },
  suggestionText: { fontSize: 14, fontFamily: "Nunito_600SemiBold" },
  bubbleWrapper: { flexDirection: "row", marginBottom: 8, gap: 8, maxWidth: "85%" },
  bubbleLeft: { alignSelf: "flex-start" },
  bubbleRight: { alignSelf: "flex-end", flexDirection: "row-reverse" },
  bubble: { borderRadius: 18, paddingHorizontal: 14, paddingVertical: 10, flexShrink: 1 },
  bubbleText: { fontSize: 15, fontFamily: "Nunito_400Regular", lineHeight: 22 },
  aiAvatar: {
    width: 28, height: 28, borderRadius: 14,
    alignItems: "center", justifyContent: "center", marginTop: 2,
  },
  inputBar: {
    flexDirection: "row", alignItems: "flex-end", gap: 10,
    paddingHorizontal: 16, paddingTop: 10, borderTopWidth: 1,
  },
  input: {
    flex: 1, borderRadius: 22, paddingHorizontal: 16, paddingVertical: 10,
    fontSize: 15, fontFamily: "Nunito_400Regular", maxHeight: 100,
    borderWidth: 1,
  },
  sendBtn: {
    width: 44, height: 44, borderRadius: 22,
    alignItems: "center", justifyContent: "center",
  },
});
