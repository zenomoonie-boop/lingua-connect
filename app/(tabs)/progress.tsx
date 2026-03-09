import React, { useState, useRef, useEffect } from "react";
import {
  View, Text, ScrollView, StyleSheet, Pressable,
  useColorScheme, Platform, Modal, TextInput, Animated, Switch, Linking, Image, Appearance, Alert
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import { router } from "expo-router";
import Colors from "@/constants/colors";
import { ScreenBackdrop } from "@/components/ScreenBackdrop";
import { useNavigation } from "@react-navigation/native";
import { LANGUAGES } from "@/data/lessons";
import { useAuth } from "@/context/AuthContext";
import { useProgress } from "@/context/ProgressContext";
import * as Haptics from "expo-haptics";
import * as ImagePicker from "expo-image-picker";
import * as Location from "expo-location";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { createMoment, loadMoments, saveMoments, type UserMoment } from "@/lib/moments";
import { COUNTRIES, GENDER_OPTIONS, getCountryByCode } from "@/data/profileOptions";

// ─── Default Location (San Juan, Philippines) ───────────────────────────────

const DEFAULT_LOCATION = {
  latitude: 14.5995,
  longitude: 121.0369,
  locationName: "San Juan, Philippines",
};

// ─── Avatar Colors ────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  "#FF6B35", "#4ECDC4", "#45B7D1", "#8B7CF6",
  "#F7C948", "#6BCB77", "#FF4757", "#FF6B9D", "#2563EB",
];

function makeInitials(name: string) {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}


// ─── Simulated Data ───────────────────────────────────────────────────────────

type ProfileReview = { id: string; name: string; initials: string; color: string; stars: number; text: string; time: string };
const EMPTY_REVIEWS: ProfileReview[] = [];

// ─── Storage Keys ──────────────────────────────────────────────────────────────

const NOTIFICATION_KEY = "lingua_notifications";
const PRIVACY_KEY = "lingua_privacy";
const LANGUAGE_KEY = "lingua_language";
const APPEARANCE_KEY = "lingua_appearance";

// ─── Settings Modal Types ─────────────────────────────────────────────────────

type SettingsModalType = "notifications" | "privacy" | "language" | "appearance" | "help" | "about" | null;

function SettingsModal({ type, visible, onClose, colors }: {
  type: SettingsModalType; visible: boolean; onClose: () => void; colors: typeof Colors.dark;
}) {
  const [notifications, setNotifications] = useState(true);
  const [privacySetting, setPrivacySetting] = useState("everyone");
  const [appLanguage, setAppLanguage] = useState("English");
  const [isDarkMode, setIsDarkMode] = useState(useColorScheme() === "dark");

  useEffect(() => {
    if (visible) {
      loadSettings();
    }
  }, [visible]);

  const loadSettings = async () => {
    try {
      const notif = await AsyncStorage.getItem(NOTIFICATION_KEY);
      if (notif !== null) setNotifications(JSON.parse(notif));
      const privacy = await AsyncStorage.getItem(PRIVACY_KEY);
      if (privacy !== null) setPrivacySetting(privacy);
      const lang = await AsyncStorage.getItem(LANGUAGE_KEY);
      if (lang !== null) setAppLanguage(lang);
      const appearance = await AsyncStorage.getItem(APPEARANCE_KEY);
      if (appearance !== null) setIsDarkMode(JSON.parse(appearance));
    } catch (e) { console.log(e); }
  };

  const saveNotification = async (value: boolean) => {
    setNotifications(value);
    await AsyncStorage.setItem(NOTIFICATION_KEY, JSON.stringify(value));
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert("Notifications", value ? "Notifications enabled" : "Notifications disabled");
  };

  const savePrivacy = async (value: string) => {
    setPrivacySetting(value);
    await AsyncStorage.setItem(PRIVACY_KEY, value);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert("Privacy Updated", `Profile visibility set to: ${value === "everyone" ? "Everyone" : value === "friends" ? "Friends Only" : "No One"}`);
  };

  const saveLanguage = async (value: string) => {
    setAppLanguage(value);
    await AsyncStorage.setItem(LANGUAGE_KEY, value);
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    Alert.alert("Language Changed", `App language set to ${value}. Please restart the app to apply changes.`);
  };

  const saveAppearance = async (value: boolean) => {
    setIsDarkMode(value);
    await AsyncStorage.setItem(APPEARANCE_KEY, JSON.stringify(value));
    Appearance.setColorScheme(value ? "dark" : "light");
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  };

  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  const renderContent = () => {
    switch (type) {
      case "notifications":
        return (
          <View style={setStyle.section}>
            <Text style={[setStyle.title, { color: colors.text }]}>Notifications</Text>
            <View style={[setStyle.row, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[setStyle.label, { color: colors.text }]}>Push Notifications</Text>
                <Text style={[setStyle.sub, { color: colors.muted }]}>Receive notifications for new messages and room invites</Text>
              </View>
              <Switch value={notifications} onValueChange={saveNotification} trackColor={{ true: colors.primary }} />
            </View>
            <View style={[setStyle.row, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[setStyle.label, { color: colors.text }]}>Sound</Text>
                <Text style={[setStyle.sub, { color: colors.muted }]}>Play sound for notifications</Text>
              </View>
              <Switch value={notifications} onValueChange={saveNotification} trackColor={{ true: colors.primary }} />
            </View>
          </View>
        );
      case "privacy":
        return (
          <View style={setStyle.section}>
            <Text style={[setStyle.title, { color: colors.text }]}>Privacy</Text>
            <Text style={[setStyle.label, { color: colors.muted, marginBottom: 8 }]}>Who can see your profile</Text>
            {["everyone", "friends", "noone"].map((opt) => (
              <Pressable
                key={opt}
                onPress={() => savePrivacy(opt)}
                style={[setStyle.optionRow, { backgroundColor: colors.card, borderColor: privacySetting === opt ? colors.primary : colors.border }]}
              >
                <Text style={[setStyle.optionText, { color: colors.text }]}>
                  {opt === "everyone" ? "Everyone" : opt === "friends" ? "Friends Only" : "No One"}
                </Text>
                {privacySetting === opt && <Ionicons name="checkmark" size={20} color={colors.primary} />}
              </Pressable>
            ))}
          </View>
        );
      case "language":
        return (
          <View style={setStyle.section}>
            <Text style={[setStyle.title, { color: colors.text }]}>Language Preferences</Text>
            <Text style={[setStyle.label, { color: colors.muted, marginBottom: 8 }]}>App Language</Text>
            {["English", "Filipino", "Spanish", "French", "German", "Japanese", "Korean", "Mandarin"].map((lang) => (
              <Pressable
                key={lang}
                onPress={() => saveLanguage(lang)}
                style={[setStyle.optionRow, { backgroundColor: colors.card, borderColor: appLanguage === lang ? colors.primary : colors.border }]}
              >
                <Text style={[setStyle.optionText, { color: colors.text }]}>{lang}</Text>
                {appLanguage === lang && <Ionicons name="checkmark" size={20} color={colors.primary} />}
              </Pressable>
            ))}
          </View>
        );
      case "appearance":
        return (
          <View style={setStyle.section}>
            <Text style={[setStyle.title, { color: colors.text }]}>Appearance</Text>
            <View style={[setStyle.row, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <View style={{ flex: 1 }}>
                <Text style={[setStyle.label, { color: colors.text }]}>Dark Mode</Text>
                <Text style={[setStyle.sub, { color: colors.muted }]}>Use dark theme</Text>
              </View>
              <Switch value={isDarkMode} onValueChange={saveAppearance} trackColor={{ true: colors.primary }} />
            </View>
          </View>
        );
      case "help":
        return (
          <View style={setStyle.section}>
            <Text style={[setStyle.title, { color: colors.text }]}>Help & Support</Text>
            <Pressable
              onPress={() => Linking.openURL("mailto:support@linguaconnect.app")}
              style={[setStyle.row, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <Ionicons name="mail-outline" size={20} color={colors.primary} />
              <Text style={[setStyle.label, { color: colors.text, flex: 1 }]}>Contact Us</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.muted} />
            </Pressable>
            <Pressable
              onPress={() => Linking.openURL("https://linguaconnect.app/faq").catch(() => Alert.alert("Error", "Could not open FAQ page"))}
              style={[setStyle.row, { backgroundColor: colors.card, borderColor: colors.border }]}
            >
              <Ionicons name="help-circle-outline" size={20} color={colors.primary} />
              <Text style={[setStyle.label, { color: colors.text, flex: 1 }]}>FAQ</Text>
              <Ionicons name="chevron-forward" size={16} color={colors.muted} />
            </Pressable>
          </View>
        );
      case "about":
        return (
          <View style={setStyle.section}>
            <Text style={[setStyle.title, { color: colors.text }]}>About LinguaConnect</Text>
            <View style={[setStyle.row, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[setStyle.label, { color: colors.text }]}>Version</Text>
              <Text style={[setStyle.sub, { color: colors.muted }]}>1.0.0</Text>
            </View>
            <View style={[setStyle.row, { backgroundColor: colors.card, borderColor: colors.border }]}>
              <Text style={[setStyle.label, { color: colors.text }]}>Developer</Text>
              <Text style={[setStyle.sub, { color: colors.muted }]}>LinguaConnect Team</Text>
            </View>
          </View>
        );
      default:
        return null;
    }
  };

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <View style={[setStyle.container, { backgroundColor: colors.background }]}>
        <View style={[setStyle.header, { paddingTop: topPad + 8, borderBottomColor: colors.border }]}>
          <Pressable onPress={onClose} style={setStyle.headerBtn}>
            <Ionicons name="chevron-back" size={24} color={colors.primary} />
          </Pressable>
          <Text style={[setStyle.headerTitle, { color: colors.text }]}>
            {type === "notifications" ? "Notifications" :
             type === "privacy" ? "Privacy" :
             type === "language" ? "Language" :
             type === "appearance" ? "Appearance" :
             type === "help" ? "Help & Support" :
             type === "about" ? "About" : "Settings"}
          </Text>
          <View style={setStyle.headerBtn} />
        </View>
        <ScrollView contentContainerStyle={{ padding: 16 }} showsVerticalScrollIndicator={false}>
          {renderContent()}
        </ScrollView>
      </View>
    </Modal>
  );
}

const setStyle = StyleSheet.create({
  container: { flex: 1 },
  header: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1 },
  headerBtn: { width: 40, alignItems: "center" },
  headerTitle: { fontSize: 18, fontFamily: "Nunito_700Bold" },
  section: { gap: 12 },
  title: { fontSize: 20, fontFamily: "Nunito_800ExtraBold", marginBottom: 4 },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 14, borderRadius: 12, borderWidth: 1 },
  label: { fontSize: 15, fontFamily: "Nunito_600SemiBold" },
  sub: { fontSize: 12, fontFamily: "Nunito_400Regular", marginTop: 2 },
  optionRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", padding: 14, borderRadius: 12, borderWidth: 1 },
  optionText: { fontSize: 15, fontFamily: "Nunito_500Medium" },
});

// ─── Edit Profile Modal ───────────────────────────────────────────────────────

function EditProfileModal({ visible, onClose, colors }: {
  visible: boolean; onClose: () => void; colors: typeof Colors.dark;
}) {
  const { user, updateProfile } = useAuth();
  const [name, setName] = useState(user?.displayName || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [nativeLang, setNativeLang] = useState(user?.nativeLanguage || "Filipino");
  const [gender, setGender] = useState(user?.gender || "Female");
  const [age, setAge] = useState(user?.age ? String(user.age) : "");
  const [countryCode, setCountryCode] = useState(user?.countryCode || "PH");
  const [avatarColor, setAvatarColor] = useState(user?.avatarColor || AVATAR_COLORS[0]);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (visible && user) {
      setName(user.displayName || "");
      setBio(user.bio || "");
      setNativeLang(user.nativeLanguage || "Filipino");
      setGender(user.gender || "Female");
      setAge(user.age ? String(user.age) : "");
      setCountryCode(user.countryCode || "PH");
      setAvatarColor(user.avatarColor || AVATAR_COLORS[0]);
      setAvatarUri(user.avatarUri || null);
    }
  }, [visible, user]);

  const pickImage = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert("Permission Required", "Please allow access to your photos to change your profile picture.");
      return;
    }

    try {
      const result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.5,
      });
      if (!result.canceled && result.assets[0]) {
        setAvatarUri(result.assets[0].uri);
        Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      }
    } catch (error) {
      Alert.alert("Error", "Failed to pick image. Please try again.");
    }
  };

  const handleSave = async () => {
    const selectedCountry = getCountryByCode(countryCode) || COUNTRIES[0];
    const parsedAge = Number(age);
    setSaving(true);
    try {
      await updateProfile({ 
        displayName: name.trim() || user?.displayName, 
        bio, 
        gender,
        age: Number.isFinite(parsedAge) && parsedAge > 0 ? parsedAge : undefined,
        countryCode: selectedCountry.code,
        countryName: selectedCountry.name,
        flag: selectedCountry.flag,
        nativeLanguage: nativeLang, 
        avatarColor,
        avatarUri: avatarUri || undefined,
      });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onClose();
    } catch (e) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert("Error", "Failed to save profile. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const insets = useSafeAreaInsets();
  const topPad = Platform.OS === "web" ? 67 : insets.top;

  return (
    <Modal visible={visible} animationType="slide" presentationStyle="fullScreen">
      <View style={[editStyle.container, { backgroundColor: colors.background }]}>
        <View style={[editStyle.header, { paddingTop: topPad + 8, borderBottomColor: colors.border }]}>
          <Pressable onPress={onClose} style={editStyle.headerBtn}>
            <Text style={[editStyle.headerBtnText, { color: colors.muted }]}>Cancel</Text>
          </Pressable>
          <Text style={[editStyle.headerTitle, { color: colors.text }]}>Edit Profile</Text>
          <Pressable onPress={handleSave} disabled={saving} style={editStyle.headerBtn}>
            <Text style={[editStyle.headerBtnText, { color: colors.primary, fontFamily: "Nunito_700Bold" }]}>
              {saving ? "Saving..." : "Save"}
            </Text>
          </Pressable>
        </View>

        <ScrollView contentContainerStyle={{ padding: 20, gap: 20 }} showsVerticalScrollIndicator={false}>
          {/* Avatar picker */}
          <View style={editStyle.section}>
            <Pressable onPress={pickImage} style={{ alignItems: "center" }}>
              {avatarUri ? (
                <View style={{ position: "relative" }}>
                  <Image source={{ uri: avatarUri }} style={editStyle.bigAvatar} />
                  <View style={[editStyle.cameraOverlay, { backgroundColor: colors.background }]}>
                    <Ionicons name="camera" size={20} color={colors.text} />
                  </View>
                </View>
              ) : (
                <View style={[editStyle.bigAvatar, { backgroundColor: avatarColor }]}>
                  <Text style={editStyle.bigInitials}>{makeInitials(name || user?.displayName || "?")}</Text>
                </View>
              )}
            </Pressable>
            <Text style={[editStyle.label, { color: colors.muted }]}>TAP TO CHANGE PHOTO</Text>
            <Text style={[editStyle.label, { color: colors.muted, marginTop: 16 }]}>CHOOSE AVATAR COLOR</Text>
            <View style={editStyle.colorGrid}>
              {AVATAR_COLORS.map(c => (
                <Pressable
                  key={c}
                  onPress={() => { setAvatarColor(c); Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light); }}
                  style={[editStyle.colorSwatch, { backgroundColor: c }, avatarColor === c && editStyle.swatchSelected]}
                />
              ))}
            </View>
          </View>

          {/* Name */}
          <View style={{ gap: 6 }}>
            <Text style={[editStyle.label, { color: colors.muted }]}>DISPLAY NAME</Text>
            <TextInput
              value={name}
              onChangeText={setName}
              placeholder="Your name"
              placeholderTextColor={colors.muted}
              style={[editStyle.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
            />
          </View>

          {/* Bio */}
          <View style={{ gap: 6 }}>
            <Text style={[editStyle.label, { color: colors.muted }]}>BIO</Text>
            <TextInput
              value={bio}
              onChangeText={setBio}
              placeholder="Tell others about yourself..."
              placeholderTextColor={colors.muted}
              multiline
              numberOfLines={3}
              style={[editStyle.input, editStyle.bioInput, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
              maxLength={150}
            />
            <Text style={[{ color: colors.muted, fontSize: 11, fontFamily: "Nunito_400Regular", textAlign: "right" }]}>
              {bio.length}/150
            </Text>
          </View>

          <View style={{ gap: 8 }}>
            <Text style={[editStyle.label, { color: colors.muted }]}>GENDER</Text>
            <View style={editStyle.optionRow}>
              {GENDER_OPTIONS.map((option) => {
                const selected = gender === option;
                const isFemale = option === "Female";
                return (
                  <Pressable
                    key={option}
                    onPress={() => setGender(option)}
                    style={[
                      editStyle.genderChip,
                      {
                        backgroundColor: selected
                          ? (isFemale ? "#FF4FA320" : "#3B82F620")
                          : colors.card,
                        borderColor: selected
                          ? (isFemale ? "#FF4FA3" : "#3B82F6")
                          : colors.border,
                      },
                    ]}
                  >
                    <View
                      style={[
                        editStyle.genderIconWrap,
                        { backgroundColor: selected ? (isFemale ? "#FF4FA3" : "#3B82F6") : colors.background },
                      ]}
                    >
                      <Ionicons
                        name={isFemale ? "female" : "male"}
                        size={20}
                        color={selected ? "#fff" : isFemale ? "#FF4FA3" : "#3B82F6"}
                      />
                    </View>
                    <Text style={[editStyle.langChipText, { color: selected ? (isFemale ? "#FF4FA3" : "#3B82F6") : colors.text }]}>
                      {option}
                    </Text>
                  </Pressable>
                );
              })}
            </View>
          </View>

          <View style={{ gap: 6 }}>
            <Text style={[editStyle.label, { color: colors.muted }]}>AGE</Text>
            <TextInput
              value={age}
              onChangeText={setAge}
              placeholder="Your age"
              placeholderTextColor={colors.muted}
              keyboardType="number-pad"
              maxLength={2}
              style={[editStyle.input, { backgroundColor: colors.card, color: colors.text, borderColor: colors.border }]}
            />
          </View>

          <View style={{ gap: 8 }}>
            <Text style={[editStyle.label, { color: colors.muted }]}>COUNTRY</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={editStyle.optionRow}>
              {COUNTRIES.map((country) => {
                const selected = country.code === countryCode;
                return (
                  <Pressable
                    key={country.code}
                    onPress={() => setCountryCode(country.code)}
                    style={[
                      editStyle.countryChip,
                      {
                        backgroundColor: selected ? colors.primary + "18" : colors.card,
                        borderColor: selected ? colors.primary : colors.border,
                      },
                    ]}
                  >
                    <Text style={editStyle.countryFlag}>{country.flag}</Text>
                    <Text style={[editStyle.langChipText, { color: selected ? colors.primary : colors.text }]}>{country.name}</Text>
                  </Pressable>
                );
              })}
            </ScrollView>
          </View>

          {/* Native language */}
          <View style={{ gap: 8 }}>
            <Text style={[editStyle.label, { color: colors.muted }]}>NATIVE LANGUAGE</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 8 }}>
              {["Filipino", "English", "Mandarin", "Japanese", "Korean", "Spanish", "French", "German", "Portuguese", "Arabic", "Hindi"].map(l => (
                <Pressable
                  key={l}
                  onPress={() => setNativeLang(l)}
                  style={[
                    editStyle.langChip,
                    {
                      backgroundColor: nativeLang === l ? colors.primary + "20" : colors.card,
                      borderColor: nativeLang === l ? colors.primary : colors.border,
                    },
                  ]}
                >
                  <Text style={[editStyle.langChipText, { color: nativeLang === l ? colors.primary : colors.text }]}>{l}</Text>
                </Pressable>
              ))}
            </ScrollView>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const editStyle = StyleSheet.create({
  container: { flex: 1 },
  header: {
    flexDirection: "row", alignItems: "center", justifyContent: "space-between",
    paddingHorizontal: 16, paddingBottom: 12, borderBottomWidth: 1,
  },
  headerBtn: { paddingVertical: 4, paddingHorizontal: 4, minWidth: 60 },
  headerBtnText: { fontSize: 16, fontFamily: "Nunito_600SemiBold" },
  headerTitle: { fontSize: 16, fontFamily: "Nunito_700Bold" },
  section: { alignItems: "center", gap: 14 },
  bigAvatar: { width: 90, height: 90, borderRadius: 45, alignItems: "center", justifyContent: "center", position: "relative" },
  bigInitials: { color: "#fff", fontSize: 32, fontFamily: "Nunito_800ExtraBold" },
  cameraOverlay: { position: "absolute", bottom: 0, right: 0, width: 28, height: 28, borderRadius: 14, alignItems: "center", justifyContent: "center" },
  label: { fontSize: 11, fontFamily: "Nunito_700Bold", letterSpacing: 0.8, alignSelf: "flex-start" },
  colorGrid: { flexDirection: "row", gap: 10, flexWrap: "wrap", justifyContent: "center" },
  colorSwatch: { width: 36, height: 36, borderRadius: 18 },
  swatchSelected: { borderWidth: 3, borderColor: "#fff" },
  input: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15, fontFamily: "Nunito_400Regular" },
  bioInput: { minHeight: 80, textAlignVertical: "top", paddingTop: 12 },
  optionRow: { flexDirection: "row", gap: 8, flexWrap: "wrap" },
  optionChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  genderChip: { width: 118, alignItems: "center", gap: 8, paddingHorizontal: 14, paddingVertical: 12, borderRadius: 20, borderWidth: 1.5 },
  genderIconWrap: { width: 44, height: 44, borderRadius: 22, alignItems: "center", justifyContent: "center" },
  countryChip: { flexDirection: "row", alignItems: "center", gap: 6, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  countryFlag: { fontSize: 14 },
  langChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  langChipText: { fontSize: 13, fontFamily: "Nunito_600SemiBold" },
});

// ─── Moment Card ──────────────────────────────────────────────────────────────

function MomentCard({ moment, colors, userColor, userInitials, onUserPress, onCommentPress, onSharePress }: {
  moment: UserMoment; colors: typeof Colors.dark; userColor: string; userInitials: string;
  onUserPress?: (userId: string) => void;
  onCommentPress?: (momentId: string) => void;
  onSharePress?: (moment: UserMoment) => void;
}) {
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(moment.likes);
  const [showComments, setShowComments] = useState(false);
  const cardColor = moment.userColor || userColor;
  const cardInitials = moment.userInitials || userInitials;
  return (
    <View style={[mStyle.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={mStyle.top}>
        <Pressable
          onPress={() => onUserPress?.(moment.userId)}
          style={[mStyle.avatar, { backgroundColor: cardColor }]}
        >
          <Text style={mStyle.initials}>{cardInitials}</Text>
        </Pressable>
        <View style={{ flex: 1 }}>
          <Pressable onPress={() => onUserPress?.(moment.userId)}>
            <Text style={[mStyle.userName, { color: colors.text }]}>{moment.userName}</Text>
          </Pressable>
          <View style={mStyle.langBadge}>
            <View style={[mStyle.langDot, { backgroundColor: moment.langColor }]} />
            <Text style={[mStyle.langText, { color: moment.langColor }]}>{moment.lang}</Text>
          </View>
          <Text style={[mStyle.time, { color: colors.muted }]}>{moment.timeLabel}</Text>
        </View>
      </View>
      <Text style={[mStyle.text, { color: colors.text }]}>{moment.text}</Text>
      <View style={[mStyle.actions, { borderTopColor: colors.border }]}>
        <Pressable
          onPress={() => {
            setLiked(v => !v);
            setLikeCount(v => v + (liked ? -1 : 1));
            Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
          }}
          style={mStyle.actionBtn}
        >
          <Ionicons name={liked ? "heart" : "heart-outline"} size={18} color={liked ? "#FF4757" : colors.muted} />
          <Text style={[mStyle.actionText, { color: colors.muted }]}>{likeCount}</Text>
        </Pressable>
        <Pressable
          onPress={() => onCommentPress?.(moment.id)}
          style={mStyle.actionBtn}
        >
          <Ionicons name="chatbubble-outline" size={17} color={colors.muted} />
          <Text style={[mStyle.actionText, { color: colors.muted }]}>{moment.comments}</Text>
        </Pressable>
        <Pressable
          onPress={() => onSharePress?.(moment)}
          style={mStyle.actionBtn}
        >
          <Ionicons name="share-outline" size={18} color={colors.muted} />
        </Pressable>
      </View>
    </View>
  );
}

const mStyle = StyleSheet.create({
  card: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  top: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, paddingBottom: 10 },
  avatar: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  initials: { color: "#fff", fontSize: 14, fontFamily: "Nunito_700Bold" },
  userName: { fontSize: 14, fontFamily: "Nunito_700Bold" },
  langBadge: { flexDirection: "row", alignItems: "center", gap: 5 },
  langDot: { width: 7, height: 7, borderRadius: 3.5 },
  langText: { fontSize: 12, fontFamily: "Nunito_700Bold" },
  time: { fontSize: 11, fontFamily: "Nunito_400Regular", marginTop: 2 },
  text: { fontSize: 14, fontFamily: "Nunito_400Regular", lineHeight: 21, paddingHorizontal: 14, paddingBottom: 12 },
  actions: { flexDirection: "row", alignItems: "center", gap: 20, paddingHorizontal: 14, paddingVertical: 10, borderTopWidth: 1 },
  actionBtn: { flexDirection: "row", alignItems: "center", gap: 5 },
  actionText: { fontSize: 13, fontFamily: "Nunito_400Regular" },
});

// ─── Review Card ──────────────────────────────────────────────────────────────

function ReviewCard({ review, colors }: { review: ProfileReview; colors: typeof Colors.dark }) {
  return (
    <View style={[revStyle.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={revStyle.top}>
        <View style={[revStyle.avatar, { backgroundColor: review.color }]}>
          <Text style={revStyle.initials}>{review.initials}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <Text style={[revStyle.name, { color: colors.text }]}>{review.name}</Text>
          <View style={revStyle.stars}>
            {Array.from({ length: 5 }).map((_, i) => (
              <Ionicons key={i} name={i < review.stars ? "star" : "star-outline"} size={13} color="#F7C948" />
            ))}
            <Text style={[revStyle.time, { color: colors.muted }]}>{review.time}</Text>
          </View>
        </View>
      </View>
      <Text style={[revStyle.text, { color: colors.text }]}>{review.text}</Text>
    </View>
  );
}

const revStyle = StyleSheet.create({
  card: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 10 },
  top: { flexDirection: "row", alignItems: "center", gap: 10 },
  avatar: { width: 40, height: 40, borderRadius: 20, alignItems: "center", justifyContent: "center" },
  initials: { color: "#fff", fontSize: 14, fontFamily: "Nunito_700Bold" },
  name: { fontSize: 14, fontFamily: "Nunito_700Bold" },
  stars: { flexDirection: "row", alignItems: "center", gap: 2, marginTop: 3 },
  time: { fontSize: 11, fontFamily: "Nunito_400Regular", marginLeft: 6 },
  text: { fontSize: 13, fontFamily: "Nunito_400Regular", lineHeight: 19 },
});

// ─── Post Moment Modal ────────────────────────────────────────────────────────

function PostMomentModal({ visible, onClose, onPost, colors }: {
  visible: boolean; onClose: () => void;
  onPost: (text: string) => void; colors: typeof Colors.dark;
}) {
  const [text, setText] = useState("");
  const insets = useSafeAreaInsets();
  return (
    <Modal visible={visible} animationType="slide" presentationStyle="formSheet" onRequestClose={onClose}>
      <View style={[pmStyle.container, { backgroundColor: colors.background }]}>
        <View style={[pmStyle.handle, { backgroundColor: colors.border }]} />
        <View style={pmStyle.topRow}>
          <Pressable onPress={onClose}>
            <Text style={[pmStyle.cancel, { color: colors.muted }]}>Cancel</Text>
          </Pressable>
          <Text style={[pmStyle.title, { color: colors.text }]}>New Moment</Text>
          <Pressable
            onPress={() => { if (text.trim()) { onPost(text.trim()); setText(""); onClose(); Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success); } }}
            disabled={!text.trim()}
          >
            <Text style={[pmStyle.post, { color: text.trim() ? colors.primary : colors.muted }]}>Post</Text>
          </Pressable>
        </View>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder="Share your language learning moment, question, or phrase..."
          placeholderTextColor={colors.muted}
          multiline
          autoFocus
          style={[pmStyle.input, { color: colors.text }]}
          maxLength={280}
        />
        <Text style={[pmStyle.counter, { color: colors.muted }]}>{text.length}/280</Text>
      </View>
    </Modal>
  );
}

const pmStyle = StyleSheet.create({
  container: { flex: 1, padding: 20, gap: 12 },
  handle: { width: 36, height: 4, borderRadius: 2, alignSelf: "center", marginBottom: 4 },
  topRow: { flexDirection: "row", alignItems: "center", justifyContent: "space-between" },
  cancel: { fontSize: 16, fontFamily: "Nunito_600SemiBold" },
  title: { fontSize: 16, fontFamily: "Nunito_700Bold" },
  post: { fontSize: 16, fontFamily: "Nunito_700Bold" },
  input: { flex: 1, fontSize: 16, fontFamily: "Nunito_400Regular", lineHeight: 24, textAlignVertical: "top" },
  counter: { fontSize: 12, fontFamily: "Nunito_400Regular", textAlign: "right" },
});

// ─── Settings Tab ─────────────────────────────────────────────────────────────

function SettingsTab({ colors, onLogout, onOpenSettings }: { 
  colors: typeof Colors.dark; 
  onLogout: () => void;
  onOpenSettings: (type: SettingsModalType) => void;
}) {
  const SETTINGS = [
    { icon: "notifications-outline", label: "Notifications", sub: "Push notifications", type: "notifications" as const },
    { icon: "lock-closed-outline", label: "Privacy", sub: "Who can see your profile", type: "privacy" as const },
    { icon: "language-outline", label: "Language Preferences", sub: "App language & learning", type: "language" as const },
    { icon: "moon-outline", label: "Appearance", sub: "Dark / Light mode", type: "appearance" as const },
    { icon: "help-circle-outline", label: "Help & Support", sub: "FAQ, contact us", type: "help" as const },
    { icon: "information-circle-outline", label: "About LinguaConnect", sub: "Version 1.0.0", type: "about" as const },
  ];

  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 12, gap: 8 }}>
      {SETTINGS.map(s => (
        <Pressable
          key={s.label}
          onPress={() => onOpenSettings(s.type)}
          style={({ pressed }) => [
            sStyle.row,
            { backgroundColor: colors.card, borderColor: colors.border, opacity: pressed ? 0.7 : 1 },
          ]}
        >
          <View style={[sStyle.iconWrap, { backgroundColor: colors.primary + "18" }]}>
            <Ionicons name={s.icon as any} size={20} color={colors.primary} />
          </View>
          <View style={{ flex: 1 }}>
            <Text style={[sStyle.label, { color: colors.text }]}>{s.label}</Text>
            <Text style={[sStyle.sub, { color: colors.muted }]}>{s.sub}</Text>
          </View>
          <Ionicons name="chevron-forward" size={16} color={colors.muted} />
        </Pressable>
      ))}
      <Pressable
        onPress={onLogout}
        style={({ pressed }) => [
          sStyle.row,
          { backgroundColor: "#FF475718", borderColor: "#FF475730", marginTop: 8, opacity: pressed ? 0.8 : 1 },
        ]}
      >
        <View style={[sStyle.iconWrap, { backgroundColor: "#FF475720" }]}>
          <Ionicons name="log-out-outline" size={20} color="#FF4757" />
        </View>
        <Text style={[sStyle.label, { color: "#FF4757" }]}>Sign Out</Text>
      </Pressable>
    </View>
  );
}

const sStyle = StyleSheet.create({
  row: { flexDirection: "row", alignItems: "center", gap: 12, padding: 14, borderRadius: 14, borderWidth: 1 },
  iconWrap: { width: 38, height: 38, borderRadius: 10, alignItems: "center", justifyContent: "center" },
  label: { fontSize: 14, fontFamily: "Nunito_700Bold" },
  sub: { fontSize: 12, fontFamily: "Nunito_400Regular", marginTop: 1 },
});

// ─── Main Profile Screen ──────────────────────────────────────────────────────

type ProfileTab = "moments" | "reviews" | "settings";

export default function ProfileScreen() {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === "dark";
  const colors = isDark ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const { user, logout, updateProfile } = useAuth();
  const { progress } = useProgress();

  const [activeTab, setActiveTab] = useState<ProfileTab>("moments");
  const [showEdit, setShowEdit] = useState(false);
  const [showPost, setShowPost] = useState(false);
  const [showFullImage, setShowFullImage] = useState(false);
  const [moments, setMoments] = useState<UserMoment[]>([]);
  const [settingsModal, setSettingsModal] = useState<SettingsModalType>(null);

  // Location state for map background
  const [userLocation, setUserLocation] = useState<{
    latitude: number;
    longitude: number;
    locationName?: string;
  } | null>(null);
  const [locationLoading, setLocationLoading] = useState(false);

  // Load user location from profile on mount
  useEffect(() => {
    if (user?.latitude && user?.longitude) {
      setUserLocation({
        latitude: user.latitude,
        longitude: user.longitude,
        locationName: user.locationName,
      });
    } else {
      setUserLocation(DEFAULT_LOCATION);
    }
  }, [user]);

  useEffect(() => {
    let mounted = true;

    const bootstrapMoments = async () => {
      const allMoments = await loadMoments();
      if (!mounted) return;
      setMoments(allMoments.filter((moment) => moment.userId === user?.id));
    };

    bootstrapMoments();

    return () => {
      mounted = false;
    };
  }, [user?.id]);

  const getCurrentLocation = async () => {
    setLocationLoading(true);
    try {
      const { status } = await Location.requestForegroundPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Location permission is required to show your location on the map.');
        setLocationLoading(false);
        return;
      }

      const location = await Location.getCurrentPositionAsync({});
      const { latitude, longitude } = location.coords;

      let locationName = 'Current Location';
      try {
        const [address] = await Location.reverseGeocodeAsync({ latitude, longitude });
        if (address) {
          locationName = address.city || address.region || address.country || 'Current Location';
        }
      } catch (e) {
        console.log('Reverse geocode error:', e);
      }

      setUserLocation({ latitude, longitude, locationName });
      await updateProfile({ latitude, longitude, locationName });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      Alert.alert('Location Updated', `Your location has been set to ${locationName}`);
    } catch (error) {
      console.error('Location error:', error);
      Alert.alert('Error', 'Failed to get your location. Please try again.');
    } finally {
      setLocationLoading(false);
    }
  };

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const botInset = Platform.OS === "web" ? 34 : 0;

  const displayName = user?.displayName || "Learner";
  const initials = makeInitials(displayName);
  const avatarColor = user?.avatarColor || AVATAR_COLORS[0];
  const avatarUri = user?.avatarUri;
  const bio = user?.bio || "";
  const nativeLang = user?.nativeLanguage || "Filipino";
  const countryFlag = user?.flag || "🌍";
  const countryName = user?.countryName || "Set country";
  const gender = user?.gender || "";
  const genderIcon = gender === "Female" ? "female" : "male";
  const genderColor = gender === "Female" ? "#EC4899" : "#3B82F6";
  const age = user?.age;
  const followers = user?.followers ?? 0;
  const following = user?.following ?? 0;
  const momentCount = moments.length;
  const level = Math.floor(progress.totalXP / 200) + 1;

  const handleLogout = async () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Sign Out",
        style: "destructive",
        onPress: async () => {
          await logout();
          Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
          router.replace("/(auth)/login");
        },
      },
    ]);
  };

  const addMoment = async (text: string) => {
    const newMoment: UserMoment = {
      id: `m-${Date.now()}`,
      userId: user?.id || "me",
      userName: user?.displayName || "You",
      userInitials: initials,
      userColor: avatarColor,
      userAvatarUri: avatarUri,
      text,
      lang: "English",
      langColor: "#2563EB",
      likes: 0,
      comments: 0,
      createdAt: Date.now(),
      timeLabel: "just now",
      isOwn: true,
      correction: null,
    };
    const created = await createMoment({
      text,
      lang: newMoment.lang,
      langColor: newMoment.langColor,
      correction: null,
    });

    if (created?.moment) {
      const nextMoments = [created.moment, ...moments];
      setMoments(nextMoments);
      await updateProfile({ moments: created.userMomentsCount ?? nextMoments.length });
      return;
    }

    const nextMoments = [newMoment, ...moments];
    setMoments(nextMoments);
    const allMoments = await loadMoments();
    const mergedMoments = [newMoment, ...allMoments];
    await saveMoments(mergedMoments);
    await updateProfile({ moments: nextMoments.length });
  };

  const TABS: { key: ProfileTab; icon: string; label: string }[] = [
    { key: "moments", icon: "grid-outline", label: "Moments" },
    { key: "reviews", icon: "star-outline", label: "Reviews" },
    { key: "settings", icon: "settings-outline", label: "Settings" },
  ];

  return (
    <View style={[pStyle.container, { backgroundColor: colors.background }]}>
      <ScreenBackdrop
        primaryColor={colors.primary + "16"}
        secondaryColor={colors.gold + "12"}
      />
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Math.max(botInset, 80) }}
      >
        {/* Header background */}
        <View style={[pStyle.headerBg, { paddingTop: topInset, backgroundColor: colors.card + "CC", borderColor: colors.border + "88" }]}>
          {/* Top row: back + edit button */}
          <View style={pStyle.topBar}>
            <Text style={[pStyle.screenLabel, { color: colors.muted }]}>Profile</Text>
            <Pressable
              onPress={() => setShowEdit(true)}
              style={[pStyle.editBtn, { borderColor: colors.border }]}
            >
              <Ionicons name="create-outline" size={16} color={colors.text} />
              <Text style={[pStyle.editBtnText, { color: colors.text }]}>Edit</Text>
            </Pressable>
          </View>

          {/* Avatar + info */}
          <View style={pStyle.profileRow}>
            <View style={{ position: "relative" }}>
              {/* Avatar only - no map background */}
              
              <Pressable onPress={() => setShowFullImage(true)}>
                {avatarUri ? (
                  <Image source={{ uri: avatarUri }} style={pStyle.avatar} />
                ) : (
                  <View style={[pStyle.avatar, { backgroundColor: avatarColor }]}>
                    <Text style={pStyle.avatarInitials}>{initials}</Text>
                  </View>
                )}
              </Pressable>
              <Pressable
                onPress={() => setShowEdit(true)}
                style={[pStyle.avatarEdit, { backgroundColor: colors.background, borderColor: colors.border }]}
              >
                <Ionicons name="camera" size={12} color={colors.text} />
              </Pressable>
            </View>

            <View style={{ flex: 1, gap: 4 }}>
              <Text style={[pStyle.displayName, { color: colors.text }]}>{displayName}</Text>
              <View style={pStyle.badgeRow}>
                <View style={[pStyle.levelBadge, { backgroundColor: colors.primary + "20" }]}>
                  <Ionicons name="ribbon" size={11} color={colors.primary} />
                  <Text style={[pStyle.levelText, { color: colors.primary }]}>Level {level}</Text>
                </View>
                <View style={[pStyle.infoBadge, { backgroundColor: colors.background + "CC", borderColor: colors.border }]}>
                  <Text style={pStyle.infoBadgeFlag}>{countryFlag}</Text>
                  <Text style={[pStyle.infoBadgeText, { color: colors.text }]}>{countryName}</Text>
                </View>
                <View style={[pStyle.langBadge, { backgroundColor: "#2563EB20" }]}>
                  <View style={[pStyle.langDot, { backgroundColor: "#2563EB" }]} />
                  <Text style={[pStyle.langText, { color: "#2563EB" }]}>{nativeLang}</Text>
                </View>
                {gender ? (
                  <View style={[pStyle.infoBadge, { backgroundColor: colors.background + "CC", borderColor: colors.border }]}>
                    <Ionicons name={genderIcon as any} size={13} color={genderColor} />
                    {age ? <Text style={[pStyle.infoBadgeText, { color: colors.text }]}>{age}</Text> : null}
                  </View>
                ) : null}
              </View>
              {/* Location display */}
              <Pressable 
                onPress={getCurrentLocation}
                style={[pStyle.locationRow, { marginTop: 4 }]}
              >
                <Ionicons name="location" size={12} color={userLocation?.locationName ? colors.primary : colors.muted} />
                <Text style={[pStyle.locationText, { color: userLocation?.locationName ? colors.primary : colors.muted }]}>
                  {userLocation?.locationName || (locationLoading ? "Getting location..." : "San Juan, Philippines")}
                </Text>
                {!userLocation?.locationName && !locationLoading && (
                  <Ionicons name="add-circle-outline" size={14} color={colors.muted} />
                )}
              </Pressable>
            </View>
          </View>
          {/* Bio */}
          {bio ? (
            <Text style={[pStyle.bio, { color: colors.text }]}>{bio}</Text>
          ) : (
            <Pressable onPress={() => setShowEdit(true)}>
              <Text style={[pStyle.bio, { color: colors.muted, fontStyle: "italic" }]}>Tap to add a bio...</Text>
            </Pressable>
          )}

          {/* Learning languages */}
          <View style={pStyle.learningRow}>
            <Text style={[pStyle.learningLabel, { color: colors.muted }]}>Learning: </Text>
            {(user?.learningLanguages || ["en"]).map(code => {
              const l = LANGUAGES.find(lg => lg.code === code);
              if (!l) return null;
              return (
                <View key={code} style={[pStyle.learnChip, { backgroundColor: l.color + "20" }]}>
                  <View style={[pStyle.learnDot, { backgroundColor: l.color }]} />
                  <Text style={[pStyle.learnText, { color: l.color }]}>{l.name}</Text>
                </View>
              );
            })}
          </View>

          {/* Stats */}
          <View style={[pStyle.stats, { borderTopColor: colors.border }]}>
            <View style={pStyle.statItem}>
              <Text style={[pStyle.statNum, { color: colors.text }]}>{momentCount}</Text>
              <Text style={[pStyle.statLabel, { color: colors.muted }]}>Moments</Text>
            </View>
            <View style={[pStyle.statDivider, { backgroundColor: colors.border }]} />
            <View style={pStyle.statItem}>
              <Text style={[pStyle.statNum, { color: colors.text }]}>{followers}</Text>
              <Text style={[pStyle.statLabel, { color: colors.muted }]}>Followers</Text>
            </View>
            <View style={[pStyle.statDivider, { backgroundColor: colors.border }]} />
            <View style={pStyle.statItem}>
              <Text style={[pStyle.statNum, { color: colors.text }]}>{following}</Text>
              <Text style={[pStyle.statLabel, { color: colors.muted }]}>Following</Text>
            </View>
            <View style={[pStyle.statDivider, { backgroundColor: colors.border }]} />
            <View style={pStyle.statItem}>
              <Text style={[pStyle.statNum, { color: colors.text }]}>{progress.totalXP}</Text>
              <Text style={[pStyle.statLabel, { color: colors.muted }]}>XP</Text>
            </View>
          </View>
        </View>

        {/* Tab bar */}
        <View style={[pStyle.tabBar, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
          {TABS.map(t => (
            <Pressable
              key={t.key}
              onPress={() => setActiveTab(t.key)}
              style={[pStyle.tab, activeTab === t.key && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
            >
              <Ionicons
                name={t.icon as any}
                size={18}
                color={activeTab === t.key ? colors.primary : colors.muted}
              />
              <Text style={[pStyle.tabText, { color: activeTab === t.key ? colors.primary : colors.muted }]}>
                {t.label}
              </Text>
            </Pressable>
          ))}
        </View>

        {/* Tab content */}
        <View style={pStyle.tabContent}>
          {activeTab === "moments" && (
            <View style={{ gap: 12 }}>
              <Pressable
                onPress={() => setShowPost(true)}
                style={[pStyle.postPrompt, { backgroundColor: colors.card, borderColor: colors.border }]}
              >
                <View style={[pStyle.postAvatar, { backgroundColor: avatarColor }]}>
                  <Text style={{ color: "#fff", fontSize: 12, fontFamily: "Nunito_700Bold" }}>{initials}</Text>
                </View>
                <Text style={[pStyle.postPlaceholder, { color: colors.muted }]}>Share a language learning moment...</Text>
                <Pressable
                  onPress={() => setShowPost(true)}
                  style={[pStyle.postBtn, { backgroundColor: colors.primary }]}
                >
                  <Text style={pStyle.postBtnText}>Post</Text>
                </Pressable>
              </Pressable>
              {moments.map(m => (
                <MomentCard
                  key={m.id}
                  moment={m}
                  colors={colors}
                  userColor={avatarColor}
                  userInitials={initials}
                  onUserPress={(userId) => {
                    router.push({
                      pathname: "/user/[id]",
                      params: { id: userId },
                    });
                  }}
                  onCommentPress={(momentId) => {
                    Alert.alert("Comments", `Comments for moment ${momentId} - Feature coming soon!`);
                  }}
                  onSharePress={(moment) => {
                    Alert.alert("Share", `Sharing: "${moment.text.substring(0, 50)}..."`);
                  }}
                />
              ))}
            </View>
          )}

          {activeTab === "reviews" && (
            <View style={{ gap: 12 }}>
              {/* Average rating */}
              <View style={[pStyle.ratingCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[pStyle.ratingNum, { color: colors.text }]}>0.0</Text>
                <View style={{ gap: 4 }}>
                  <View style={{ flexDirection: "row", gap: 3 }}>
                    {[1, 2, 3, 4, 5].map(i => (
                      <Ionicons key={i} name="star-outline" size={18} color="#F7C948" />
                    ))}
                  </View>
                  <Text style={[pStyle.ratingCount, { color: colors.muted }]}>{EMPTY_REVIEWS.length} reviews</Text>
                </View>
              </View>
              {EMPTY_REVIEWS.map(r => (
                <ReviewCard key={r.id} review={r} colors={colors} />
              ))}
            </View>
          )}

          {activeTab === "settings" && (
            <SettingsTab colors={colors} onLogout={handleLogout} onOpenSettings={setSettingsModal} />
          )}
        </View>
      </ScrollView>

      {/* Edit Profile Modal */}
      <EditProfileModal visible={showEdit} onClose={() => setShowEdit(false)} colors={colors} />

      {/* Post Moment Modal */}
      <PostMomentModal
        visible={showPost}
        onClose={() => setShowPost(false)}
        onPost={addMoment}
        colors={colors}
      />

      {/* Settings Modal */}
      <SettingsModal
        type={settingsModal}
        visible={settingsModal !== null}
        onClose={() => setSettingsModal(null)}
        colors={colors}
      />

      {/* Full Image Modal */}
      <Modal visible={showFullImage} transparent={true} animationType="fade" onRequestClose={() => setShowFullImage(false)}>
        <Pressable style={pStyle.fullImageOverlay} onPress={() => setShowFullImage(false)}>
          {avatarUri ? (
            <Image source={{ uri: avatarUri }} style={pStyle.fullImage} resizeMode="contain" />
          ) : (
            <View style={[pStyle.fullImagePlaceholder, { backgroundColor: avatarColor }]}>
              <Text style={pStyle.fullImageInitials}>{initials}</Text>
            </View>
          )}
          <Pressable onPress={() => setShowFullImage(false)} style={pStyle.closeFullImageBtn}>
            <Ionicons name="close-circle" size={40} color="#fff" />
          </Pressable>
        </Pressable>
      </Modal>
    </View>
  );
}

const pStyle = StyleSheet.create({
  container: { flex: 1 },
  bgOrbWrap: { ...StyleSheet.absoluteFillObject, overflow: "hidden" },
  bgOrb: { position: "absolute", borderRadius: 999 },
  bgOrbOne: { width: 220, height: 220, top: -70, right: -60 },
  bgOrbTwo: { width: 180, height: 180, top: 180, left: -90 },
  headerBg: { paddingHorizontal: 20, paddingBottom: 0, gap: 12, borderBottomWidth: 1 },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 8 },
  screenLabel: { fontSize: 14, fontFamily: "Nunito_600SemiBold" },
  editBtn: { flexDirection: "row", alignItems: "center", gap: 5, paddingHorizontal: 12, paddingVertical: 7, borderRadius: 20, borderWidth: 1 },
  editBtnText: { fontSize: 13, fontFamily: "Nunito_600SemiBold" },
  profileRow: { flexDirection: "row", alignItems: "flex-start", gap: 14, paddingTop: 4 },
  avatar: { width: 78, height: 78, borderRadius: 39, alignItems: "center", justifyContent: "center" },
  avatarInitials: { color: "#fff", fontSize: 28, fontFamily: "Nunito_800ExtraBold" },
  avatarEdit: {

    position: "absolute", bottom: 0, right: 0,
    width: 26, height: 26, borderRadius: 13, borderWidth: 2,
    alignItems: "center", justifyContent: "center",
  },
  displayName: { fontSize: 20, fontFamily: "Nunito_800ExtraBold" },
  badgeRow: { flexDirection: "row", gap: 6, flexWrap: "wrap", marginTop: 4 },
  levelBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  levelText: { fontSize: 11, fontFamily: "Nunito_700Bold" },
  infoBadge: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
    borderWidth: 1,
  },
  infoBadgeFlag: { fontSize: 12 },
  infoBadgeText: { fontSize: 11, fontFamily: "Nunito_700Bold" },
  langBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  langDot: { width: 6, height: 6, borderRadius: 3 },
  langText: { fontSize: 11, fontFamily: "Nunito_700Bold" },
  bio: { fontSize: 14, fontFamily: "Nunito_400Regular", lineHeight: 20 },
  learningRow: { flexDirection: "row", alignItems: "center", flexWrap: "wrap", gap: 6 },
  learningLabel: { fontSize: 12, fontFamily: "Nunito_600SemiBold" },
  learnChip: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 4, borderRadius: 10 },
  learnDot: { width: 6, height: 6, borderRadius: 3 },
  learnText: { fontSize: 12, fontFamily: "Nunito_700Bold" },
  stats: { flexDirection: "row", alignItems: "center", justifyContent: "space-around", paddingTop: 14, paddingBottom: 14, borderTopWidth: 1, marginTop: 4 },

  statItem: { alignItems: "center", gap: 3 },
     mapContainer: {
    width: '100%',
    height: 200,
  },
  statNum: { fontSize: 18, fontFamily: "Nunito_800ExtraBold" },
  statLabel: { fontSize: 11, fontFamily: "Nunito_400Regular" },
  statDivider: { width: 1, height: 30 },
  tabBar: { flexDirection: "row", borderBottomWidth: 1 },
  tab: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingVertical: 12 },
  tabText: { fontSize: 12, fontFamily: "Nunito_600SemiBold" },
  tabContent: { padding: 14 },
  postPrompt: {
    flexDirection: "row", alignItems: "center", gap: 10,
    padding: 12, borderRadius: 14, borderWidth: 1,
  },
  postAvatar: { width: 36, height: 36, borderRadius: 18, alignItems: "center", justifyContent: "center" },
  postPlaceholder: { flex: 1, fontSize: 14, fontFamily: "Nunito_400Regular" },
  postBtn: { paddingHorizontal: 14, paddingVertical: 7, borderRadius: 16 },
  postBtnText: { color: "#fff", fontSize: 13, fontFamily: "Nunito_700Bold" },
  ratingCard: {
    flexDirection: "row", alignItems: "center", gap: 16,
    padding: 16, borderRadius: 14, borderWidth: 1,
  },
  ratingNum: { fontSize: 40, fontFamily: "Nunito_800ExtraBold" },
  ratingCount: { fontSize: 12, fontFamily: "Nunito_400Regular" },
  fullImageOverlay: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.95)",
    justifyContent: "center",
    alignItems: "center",
  },
  fullImage: {
    width: "100%",
    height: "70%",
  },
  fullImagePlaceholder: {
    width: 240,
    height: 240,
    borderRadius: 120,
    justifyContent: "center",
    alignItems: "center",
  },
  fullImageInitials: {
    fontSize: 100,
    fontFamily: "Nunito_800ExtraBold",
    color: "#fff",
  },
  closeFullImageBtn: {
    position: "absolute",
    top: 60,
    right: 24,
    zIndex: 50,
  },
  // Map background styles
  mapBackground: {
    width: 78,
    height: 78,
    position: "absolute",
    top: 0,
    left: 0,
  },
  locationRow: {
    flexDirection: "row",
    alignItems: "center",
    gap: 4,
  },
  locationText: {
    fontSize: 12,
    fontFamily: "Nunito_400Regular",
  },
});
