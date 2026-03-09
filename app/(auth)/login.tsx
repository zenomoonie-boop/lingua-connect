import React, { useState } from "react";
import {
  View, Text, TextInput, Pressable, StyleSheet,
  useColorScheme, Alert, ActivityIndicator,
} from "react-native";
import { BlurView } from "expo-blur";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import * as Haptics from "expo-haptics";
import { BrandMark } from "@/components/BrandMark";

export default function LoginScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const { login } = useAuth();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const isValidEmail = (value: string) => /\S+@\S+\.\S+/.test(value.trim());

  const handleLogin = async () => {
    if (!email.trim() || !password) {
      Alert.alert("Missing fields", "Please enter your email and password.");
      return;
    }
    if (!isValidEmail(email)) {
      Alert.alert("Invalid email", "Please enter a valid email address.");
      return;
    }
    setLoading(true);
    try {
      await login(email.trim(), password);
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/(tabs)/home");
    } catch (e: any) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Login failed", e.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={styles.screen}>
      <View style={styles.bgHaloOne} pointerEvents="none" />
      <View style={styles.bgHaloTwo} pointerEvents="none" />
      <View style={styles.floatBubbleOne} pointerEvents="none" />
      <View style={styles.floatBubbleTwo} pointerEvents="none" />
      <View style={styles.floatBubbleThree} pointerEvents="none" />

      <KeyboardAwareScrollViewCompat
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 28 }]}
        bottomOffset={20}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.hero}>
          <BrandMark size={132} titleColor="#DCE8F3" subtitleColor="#B8C9DA" />
          <Text style={styles.heroTitle}>Welcome back</Text>
          <Text style={styles.heroSubtitle}>Sign in and continue your conversations, lessons, and voice rooms.</Text>
        </View>

        <View style={styles.form}>
          <BlurView intensity={30} tint="light" style={styles.fieldShell}>
            <View style={[styles.inputWrapper, { borderColor: "rgba(255,255,255,0.18)" }]}>
              <Ionicons name="mail-outline" size={18} color="#9BB2C8" />
              <TextInput
                value={email}
                onChangeText={setEmail}
                placeholder="Email address"
                placeholderTextColor="#97ABC0"
                keyboardType="email-address"
                autoCapitalize="none"
                style={[styles.input, { color: colors.text }]}
              />
            </View>
          </BlurView>

          <BlurView intensity={30} tint="light" style={styles.fieldShell}>
            <View style={[styles.inputWrapper, { borderColor: "rgba(255,255,255,0.18)" }]}>
              <Ionicons name="lock-closed-outline" size={18} color="#9BB2C8" />
              <TextInput
                value={password}
                onChangeText={setPassword}
                placeholder="Password"
                placeholderTextColor="#97ABC0"
                secureTextEntry={!showPw}
                style={[styles.input, { color: colors.text }]}
              />
              <Pressable onPress={() => setShowPw(!showPw)}>
                <Ionicons name={showPw ? "eye-off-outline" : "eye-outline"} size={18} color="#9BB2C8" />
              </Pressable>
            </View>
          </BlurView>

          <Pressable
            onPress={handleLogin}
            disabled={loading}
            style={({ pressed }) => [
              styles.primaryBtn,
              { opacity: pressed ? 0.9 : 1 },
            ]}
          >
            {loading ? <ActivityIndicator color="#062C53" /> : <Text style={styles.primaryBtnText}>Sign In</Text>}
          </Pressable>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>New to LinguaConnect?</Text>
          <Pressable onPress={() => router.replace("/(auth)/register")}>
            <Text style={styles.footerLink}> Create account</Text>
          </Pressable>
        </View>
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: {
    flex: 1,
    backgroundColor: "#062C53",
  },
  bgHaloOne: {
    position: "absolute",
    width: 300,
    height: 300,
    borderRadius: 150,
    backgroundColor: "rgba(33, 160, 255, 0.10)",
    top: 60,
    left: -100,
  },
  bgHaloTwo: {
    position: "absolute",
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: "rgba(31, 219, 199, 0.08)",
    bottom: 50,
    right: -90,
  },
  floatBubbleOne: {
    position: "absolute",
    width: 146,
    height: 146,
    borderRadius: 73,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    backgroundColor: "rgba(255,255,255,0.06)",
    top: 190,
    right: -28,
  },
  floatBubbleTwo: {
    position: "absolute",
    width: 88,
    height: 88,
    borderRadius: 44,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "rgba(255,255,255,0.05)",
    top: 430,
    left: -18,
  },
  floatBubbleThree: {
    position: "absolute",
    width: 110,
    height: 110,
    borderRadius: 55,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.04)",
    bottom: 150,
    right: 30,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 36,
  },
  hero: {
    alignItems: "center",
    marginBottom: 34,
  },
  heroTitle: {
    marginTop: 10,
    color: "#F4F8FC",
    fontSize: 30,
    fontFamily: "Nunito_800ExtraBold",
  },
  heroSubtitle: {
    marginTop: 8,
    color: "#A7BDD2",
    fontSize: 15,
    lineHeight: 22,
    textAlign: "center",
    fontFamily: "Nunito_400Regular",
    maxWidth: 320,
  },
  form: {
    gap: 14,
  },
  fieldShell: {
    borderRadius: 22,
    overflow: "hidden",
    backgroundColor: "rgba(255,255,255,0.08)",
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
  },
  inputWrapper: {
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
    paddingHorizontal: 16,
    paddingVertical: 16,
    borderRadius: 22,
    borderWidth: 1,
    backgroundColor: "rgba(255,255,255,0.08)",
  },
  input: {
    flex: 1,
    fontSize: 15,
    fontFamily: "Nunito_400Regular",
  },
  primaryBtn: {
    marginTop: 6,
    backgroundColor: "#DBF7F2",
    paddingVertical: 17,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#D5FFF7",
    shadowOffset: { width: 0, height: 14 },
    shadowOpacity: 0.22,
    shadowRadius: 18,
    elevation: 9,
  },
  primaryBtnText: {
    color: "#062C53",
    fontSize: 16,
    fontFamily: "Nunito_800ExtraBold",
  },
  footer: {
    flexDirection: "row",
    justifyContent: "center",
    marginTop: 24,
  },
  footerText: {
    color: "#A7BDD2",
    fontSize: 14,
    fontFamily: "Nunito_400Regular",
  },
  footerLink: {
    color: "#D7FFF8",
    fontSize: 14,
    fontFamily: "Nunito_700Bold",
  },
});
