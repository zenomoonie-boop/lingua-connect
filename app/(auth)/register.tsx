import React, { useMemo, useState } from "react";
import {
  View, Text, TextInput, Pressable, StyleSheet,
  useColorScheme, Alert, ActivityIndicator, ScrollView,
} from "react-native";
import { BlurView } from "expo-blur";
import { router } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { useAuth } from "@/context/AuthContext";
import * as Haptics from "expo-haptics";
import { COUNTRIES, GENDER_OPTIONS } from "@/data/profileOptions";
import { LANGUAGES } from "@/data/lessons";
import { BrandMark } from "@/components/BrandMark";

export default function RegisterScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const { register } = useAuth();

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [age, setAge] = useState("");
  const [gender, setGender] = useState<"Female" | "Male">("Female");
  const [countryCode, setCountryCode] = useState("PH");
  const [nativeLanguage, setNativeLanguage] = useState("Filipino");
  const [learningLanguages, setLearningLanguages] = useState<string[]>(["en"]);
  const [loading, setLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);

  const selectedCountry = useMemo(
    () => COUNTRIES.find((country) => country.code === countryCode) || COUNTRIES[0],
    [countryCode],
  );
  const learningPicks = LANGUAGES.slice(0, 12);
  const selectedLearningPreview = useMemo(() => {
    return learningPicks
      .filter((language) => learningLanguages.includes(language.code))
      .map((language) => language.name)
      .slice(0, 3)
      .join(", ");
  }, [learningLanguages, learningPicks]);
  const nativeOptions = ["Filipino", "English", "Spanish", "French", "Japanese", "Korean", "Mandarin", "Arabic"];
  const isValidEmail = (value: string) => /\S+@\S+\.\S+/.test(value.trim());

  const toggleLearningLanguage = (code: string) => {
    setLearningLanguages((current) => {
      if (current.includes(code)) {
        return current.length > 1 ? current.filter((item) => item !== code) : current;
      }
      return [...current, code];
    });
  };

  const handleRegister = async () => {
    const parsedAge = Number(age);
    if (!name.trim() || !email.trim() || !password || !age.trim()) {
      Alert.alert("Missing fields", "Please fill in all fields.");
      return;
    }
    if (!isValidEmail(email)) {
      Alert.alert("Invalid email", "Please enter a valid email address.");
      return;
    }
    if (password.length < 6) {
      Alert.alert("Weak password", "Password must be at least 6 characters.");
      return;
    }
    if (!Number.isFinite(parsedAge) || parsedAge < 10 || parsedAge > 99) {
      Alert.alert("Invalid age", "Please enter a valid age between 10 and 99.");
      return;
    }
    if (learningLanguages.length === 0) {
      Alert.alert("Choose a language", "Pick at least one language you want to learn.");
      return;
    }

    setLoading(true);
    try {
      await register({
        email: email.trim(),
        password,
        displayName: name.trim(),
        gender,
        age: parsedAge,
        countryCode: selectedCountry.code,
        countryName: selectedCountry.name,
        flag: selectedCountry.flag,
        nativeLanguage,
        learningLanguages,
      });
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      router.replace("/(tabs)/home");
    } catch (e: any) {
      await Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Registration failed", e.message);
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
        contentContainerStyle={[styles.scroll, { paddingTop: insets.top + 22 }]}
        bottomOffset={24}
        keyboardShouldPersistTaps="handled"
      >
        <View style={styles.hero}>
          <BrandMark size={126} titleColor="#DCE8F3" subtitleColor="#B8C9DA" />
          <Text style={styles.heroTitle}>Create new account</Text>
          <Text style={styles.heroSubtitle}>Set up your profile and start learning with people around the world.</Text>
        </View>

        <View style={styles.form}>
          <BlurView intensity={30} tint="light" style={styles.fieldShell}>
            <View style={[styles.inputWrapper, { borderColor: "rgba(255,255,255,0.18)" }]}>
              <Ionicons name="person-outline" size={18} color="#9BB2C8" />
              <TextInput
                value={name}
                onChangeText={setName}
                placeholder="Your name"
                placeholderTextColor="#97ABC0"
                style={[styles.input, { color: colors.text }]}
              />
            </View>
          </BlurView>

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
                placeholder="Password (min 6 chars)"
                placeholderTextColor="#97ABC0"
                secureTextEntry={!showPw}
                style={[styles.input, { color: colors.text }]}
              />
              <Pressable onPress={() => setShowPw(!showPw)}>
                <Ionicons name={showPw ? "eye-off-outline" : "eye-outline"} size={18} color="#9BB2C8" />
              </Pressable>
            </View>
          </BlurView>

          <BlurView intensity={30} tint="light" style={styles.fieldShell}>
            <View style={[styles.inputWrapper, { borderColor: "rgba(255,255,255,0.18)" }]}>
              <Ionicons name="calendar-outline" size={18} color="#9BB2C8" />
              <TextInput
                value={age}
                onChangeText={setAge}
                placeholder="Your age"
                placeholderTextColor="#97ABC0"
                keyboardType="number-pad"
                maxLength={2}
                style={[styles.input, { color: colors.text }]}
              />
            </View>
          </BlurView>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Gender</Text>
            <View style={styles.inlineRow}>
              {GENDER_OPTIONS.map((option) => {
                const selected = gender === option;
                const isFemale = option === "Female";
                return (
                  <Pressable
                    key={option}
                    onPress={() => setGender(option)}
                    style={[
                      styles.segmentChip,
                      {
                        borderColor: selected ? (isFemale ? "#FF84BF" : "#84B8FF") : "rgba(255,255,255,0.16)",
                        backgroundColor: selected
                          ? (isFemale ? "rgba(255,132,191,0.14)" : "rgba(132,184,255,0.14)")
                          : "rgba(255,255,255,0.08)",
                      },
                    ]}
                  >
                    <Ionicons
                      name={isFemale ? "female" : "male"}
                      size={17}
                      color={selected ? (isFemale ? "#FF84BF" : "#84B8FF") : "#9BB2C8"}
                    />
                    <Text style={[styles.segmentText, { color: selected ? "#F4F8FC" : "#D0DDE9" }]}>{option}</Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Country</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.inlineScroll}>
              {COUNTRIES.map((country) => {
                const selected = country.code === countryCode;
                return (
                  <Pressable
                    key={country.code}
                    onPress={() => setCountryCode(country.code)}
                    style={[
                      styles.pillChip,
                      {
                        borderColor: selected ? "#9FE7DD" : "rgba(255,255,255,0.14)",
                        backgroundColor: selected ? "rgba(159,231,221,0.14)" : "rgba(255,255,255,0.08)",
                      },
                    ]}
                  >
                    <Text style={styles.flagText}>{country.flag}</Text>
                    <Text style={styles.pillText}>{country.name}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Native language</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.inlineScroll}>
              {nativeOptions.map((option) => {
                const selected = nativeLanguage === option;
                return (
                  <Pressable
                    key={option}
                    onPress={() => setNativeLanguage(option)}
                    style={[
                      styles.pillChip,
                      {
                        borderColor: selected ? "#85C8FF" : "rgba(255,255,255,0.14)",
                        backgroundColor: selected ? "rgba(133,200,255,0.14)" : "rgba(255,255,255,0.08)",
                      },
                    ]}
                  >
                    <Text style={styles.pillText}>{option}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          <View style={styles.fieldGroup}>
            <Text style={styles.fieldLabel}>Languages you want to learn</Text>
            <Text style={styles.fieldHint}>
              {learningLanguages.length} selected
              {selectedLearningPreview ? ` · ${selectedLearningPreview}` : ""}
            </Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={styles.inlineScroll}>
              {learningPicks.map((language) => {
                const selected = learningLanguages.includes(language.code);
                return (
                  <Pressable
                    key={language.code}
                    onPress={() => toggleLearningLanguage(language.code)}
                    style={[
                      styles.languageChip,
                      {
                        borderColor: selected ? language.color : "rgba(255,255,255,0.14)",
                        backgroundColor: selected ? `${language.color}22` : "rgba(255,255,255,0.08)",
                      },
                    ]}
                  >
                    <Text style={[styles.languageFlag, { color: language.color }]}>{language.flag}</Text>
                    <Text style={[styles.languageText, { color: selected ? "#F4F8FC" : "#DCE8F3" }]}>{language.name}</Text>
                    {selected && <Ionicons name="checkmark-circle" size={16} color={language.color} />}
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          <Pressable
            onPress={handleRegister}
            disabled={loading}
            style={({ pressed }) => [
              styles.primaryBtn,
              { opacity: pressed ? 0.9 : 1 },
            ]}
          >
            {loading ? <ActivityIndicator color="#062C53" /> : <Text style={styles.primaryBtnText}>Create Account</Text>}
          </Pressable>
        </View>

        <View style={styles.footer}>
          <Text style={styles.footerText}>Already have an account?</Text>
          <Pressable onPress={() => router.replace("/(auth)/login")}>
            <Text style={styles.footerLink}> Sign in</Text>
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
    width: 320,
    height: 320,
    borderRadius: 160,
    backgroundColor: "rgba(33, 160, 255, 0.10)",
    top: 60,
    left: -110,
  },
  bgHaloTwo: {
    position: "absolute",
    width: 290,
    height: 290,
    borderRadius: 145,
    backgroundColor: "rgba(31, 219, 199, 0.08)",
    bottom: 50,
    right: -100,
  },
  floatBubbleOne: {
    position: "absolute",
    width: 152,
    height: 152,
    borderRadius: 76,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.16)",
    backgroundColor: "rgba(255,255,255,0.06)",
    top: 210,
    right: -30,
  },
  floatBubbleTwo: {
    position: "absolute",
    width: 92,
    height: 92,
    borderRadius: 46,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.14)",
    backgroundColor: "rgba(255,255,255,0.05)",
    top: 510,
    left: -20,
  },
  floatBubbleThree: {
    position: "absolute",
    width: 116,
    height: 116,
    borderRadius: 58,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
    backgroundColor: "rgba(255,255,255,0.04)",
    bottom: 180,
    right: 34,
  },
  scroll: {
    flexGrow: 1,
    paddingHorizontal: 24,
    paddingBottom: 38,
  },
  hero: {
    alignItems: "center",
    marginBottom: 30,
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
    textAlign: "center",
    lineHeight: 22,
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
  fieldGroup: {
    gap: 10,
    marginTop: 4,
  },
  fieldLabel: {
    color: "#DCE8F3",
    fontSize: 14,
    fontFamily: "Nunito_700Bold",
  },
  fieldHint: {
    color: "#95ABC0",
    fontSize: 12,
    fontFamily: "Nunito_600SemiBold",
    lineHeight: 18,
  },
  inlineRow: {
    flexDirection: "row",
    gap: 10,
  },
  inlineScroll: {
    gap: 10,
    paddingRight: 10,
  },
  wrapRow: {
    flexDirection: "row",
    flexWrap: "wrap",
    gap: 10,
  },
  segmentChip: {
    minWidth: 128,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 18,
    borderWidth: 1,
  },
  segmentText: {
    fontSize: 13,
    fontFamily: "Nunito_700Bold",
  },
  pillChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  pillText: {
    color: "#DCE8F3",
    fontSize: 13,
    fontFamily: "Nunito_700Bold",
  },
  flagText: {
    fontSize: 16,
  },
  languageChip: {
    flexDirection: "row",
    alignItems: "center",
    gap: 8,
    paddingHorizontal: 14,
    paddingVertical: 10,
    borderRadius: 999,
    borderWidth: 1,
  },
  languageFlag: {
    fontSize: 16,
  },
  languageText: {
    fontSize: 13,
    fontFamily: "Nunito_700Bold",
  },
  primaryBtn: {
    marginTop: 8,
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
