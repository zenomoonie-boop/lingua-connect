import React, { useState } from "react";
import {
  View, Text, TextInput, Pressable, StyleSheet,
  useColorScheme, Alert, ActivityIndicator,
} from "react-native";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import * as Haptics from "expo-haptics";

export default function RegisterScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const { register } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const handleRegister = async () => {
    if (!name.trim() || !email.trim() || !password) {
      Alert.alert("Missing fields", "Please fill in all fields.");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Weak password", "Password must be at least 6 characters.");
      return;
    }
    setLoading(true);
    try {
      await register(email.trim(), password, name.trim());
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.dismissAll();
    } catch (e: any) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Registration failed", e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <KeyboardAwareScrollViewCompat
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 60 }]}
        bottomOffset={20}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.hero}>
          <View style={[styles.logoIcon, { backgroundColor: colors.primary + "20" }]}>
            <Ionicons name="language" size={36} color={colors.primary} />
          </View>
          <Text style={[styles.title, { color: colors.text }]}>Create account</Text>
          <Text style={[styles.subtitle, { color: colors.muted }]}>Start your language learning journey today</Text>
        </View>

        <View style={styles.form}>
          <View style={[styles.inputWrapper, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="person-outline" size={18} color={colors.muted} />
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              placeholderTextColor={colors.muted}
              style={[styles.input, { color: colors.text }]}
            />
          </View>

          <View style={[styles.inputWrapper, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="mail-outline" size={18} color={colors.muted} />
            <TextInput
              value={email}
              onChangeText={setEmail}
              placeholder="Email address"
              placeholderTextColor={colors.muted}
              keyboardType="email-address"
              autoCapitalize="none"
              style={[styles.input, { color: colors.text }]}
            />
          </View>

          <View style={[styles.inputWrapper, { backgroundColor: colors.card, borderColor: colors.border }]}>
            <Ionicons name="lock-closed-outline" size={18} color={colors.muted} />
            <TextInput
              value={password}
              onChangeText={setPassword}
              placeholder="Password (min 6 chars)"
              placeholderTextColor={colors.muted}
              secureTextEntry={!showPw}
              style={[styles.input, { color: colors.text }]}
            />
            <Pressable onPress={() => setShowPw(!showPw)}>
              <Ionicons name={showPw ? "eye-off-outline" : "eye-outline"} size={18} color={colors.muted} />
            </Pressable>
          </View>

          <Pressable
            onPress={handleRegister}
            disabled={loading}
            style={({ pressed }) => [
              styles.primaryBtn,
              { backgroundColor: colors.primary, opacity: pressed ? 0.85 : 1 },
            ]}
          >
            {loading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={styles.primaryBtnText}>Create Account</Text>
            )}
          </Pressable>
        </View>

        <View style={styles.footer}>
          <Text style={[styles.footerText, { color: colors.muted }]}>Already have an account?</Text>
          <Pressable onPress={() => router.replace("/(auth)/login")}>
            <Text style={[styles.linkText, { color: colors.primary }]}> Sign in</Text>
          </Pressable>
        </View>
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  scroll: { flexGrow: 1, padding: 24 },
  hero: { alignItems: "center", gap: 12, marginBottom: 36 },
  logoIcon: { width: 80, height: 80, borderRadius: 24, alignItems: "center", justifyContent: "center" },
  title: { fontSize: 28, fontFamily: "Nunito_800ExtraBold" },
  subtitle: { fontSize: 15, fontFamily: "Nunito_400Regular", textAlign: "center" },
  form: { gap: 14 },
  inputWrapper: {
    flexDirection: "row", alignItems: "center", gap: 10,
    paddingHorizontal: 14, paddingVertical: 14, borderRadius: 14, borderWidth: 1,
  },
  input: { flex: 1, fontSize: 15, fontFamily: "Nunito_400Regular" },
  primaryBtn: { paddingVertical: 16, borderRadius: 14, alignItems: "center" },
  primaryBtnText: { color: "#fff", fontSize: 16, fontFamily: "Nunito_700Bold" },
  footer: { flexDirection: "row", justifyContent: "center", marginTop: 24 },
  footerText: { fontSize: 14, fontFamily: "Nunito_400Regular" },
  linkText: { fontSize: 14, fontFamily: "Nunito_700Bold" },
});
