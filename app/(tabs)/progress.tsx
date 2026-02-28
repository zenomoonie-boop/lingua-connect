import React, { useState, useRef } from "react";
import {
  View, Text, ScrollView, StyleSheet, Pressable,
  useColorScheme, Platform, Modal, TextInput, Animated,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { LANGUAGES } from "@/data/lessons";
import { useAuth } from "@/context/AuthContext";
import { useProgress } from "@/context/ProgressContext";
import * as Haptics from "expo-haptics";

// ─── Avatar Colors ────────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  "#FF6B35", "#4ECDC4", "#45B7D1", "#8B7CF6",
  "#F7C948", "#6BCB77", "#FF4757", "#FF6B9D", "#2563EB",
];

function makeInitials(name: string) {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

// ─── Simulated Data ───────────────────────────────────────────────────────────

const SAMPLE_REVIEWS = [
  { id: "r1", name: "Maria Santos", initials: "MS", color: "#4ECDC4", stars: 5, text: "Great language partner! Very patient and helpful. My English improved a lot after practicing with them.", time: "2 days ago" },
  { id: "r2", name: "Park Jun", initials: "PJ", color: "#8B7CF6", stars: 5, text: "Super active in voice rooms. Always gives helpful corrections without making you feel bad.", time: "1 week ago" },
  { id: "r3", name: "Sofia Lima", initials: "SL", color: "#F7C948", stars: 4, text: "Really dedicated to learning. We practice together every day now!", time: "2 weeks ago" },
];

const SAMPLE_MOMENTS = [
  {
    id: "m1",
    text: "Today I learned the difference between 'affect' and 'effect'. It's tricky but I think I finally get it!",
    lang: "English",
    langColor: "#2563EB",
    likes: 12,
    comments: 3,
    time: "2h ago",
    isOwn: true,
    correction: null,
  },
  {
    id: "m2",
    text: "Practiced speaking for 30 minutes today in the voice room. I was nervous at first but everyone was so encouraging!",
    lang: "English",
    langColor: "#2563EB",
    likes: 28,
    comments: 7,
    time: "1d ago",
    isOwn: true,
    correction: null,
  },
  {
    id: "m3",
    text: "I can now introduce myself in English without looking at my notes. Small win but I'm proud!",
    lang: "English",
    langColor: "#2563EB",
    likes: 34,
    comments: 5,
    time: "3d ago",
    isOwn: true,
    correction: { original: "I can now introduce myself", corrected: null, note: null },
  },
];

// ─── Edit Profile Modal ───────────────────────────────────────────────────────

function EditProfileModal({ visible, onClose, colors }: {
  visible: boolean; onClose: () => void; colors: typeof Colors.dark;
}) {
  const { user, updateProfile } = useAuth();
  const [name, setName] = useState(user?.displayName || "");
  const [bio, setBio] = useState(user?.bio || "");
  const [nativeLang, setNativeLang] = useState(user?.nativeLanguage || "Filipino");
  const [avatarColor, setAvatarColor] = useState(user?.avatarColor || AVATAR_COLORS[0]);
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile({ displayName: name.trim() || user?.displayName, bio, nativeLanguage: nativeLang, avatarColor });
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onClose();
    } catch {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
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
            <View style={[editStyle.bigAvatar, { backgroundColor: avatarColor }]}>
              <Text style={editStyle.bigInitials}>{makeInitials(name || user?.displayName || "?")}</Text>
            </View>
            <Text style={[editStyle.label, { color: colors.muted }]}>CHOOSE AVATAR COLOR</Text>
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
  bigAvatar: { width: 90, height: 90, borderRadius: 45, alignItems: "center", justifyContent: "center" },
  bigInitials: { color: "#fff", fontSize: 32, fontFamily: "Nunito_800ExtraBold" },
  label: { fontSize: 11, fontFamily: "Nunito_700Bold", letterSpacing: 0.8, alignSelf: "flex-start" },
  colorGrid: { flexDirection: "row", gap: 10, flexWrap: "wrap", justifyContent: "center" },
  colorSwatch: { width: 36, height: 36, borderRadius: 18 },
  swatchSelected: { borderWidth: 3, borderColor: "#fff" },
  input: { borderRadius: 12, borderWidth: 1, paddingHorizontal: 14, paddingVertical: 11, fontSize: 15, fontFamily: "Nunito_400Regular" },
  bioInput: { minHeight: 80, textAlignVertical: "top", paddingTop: 12 },
  langChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, borderWidth: 1 },
  langChipText: { fontSize: 13, fontFamily: "Nunito_600SemiBold" },
});

// ─── Moment Card ──────────────────────────────────────────────────────────────

function MomentCard({ moment, colors, userColor, userInitials }: {
  moment: typeof SAMPLE_MOMENTS[0]; colors: typeof Colors.dark; userColor: string; userInitials: string;
}) {
  const [liked, setLiked] = useState(false);
  const [likeCount, setLikeCount] = useState(moment.likes);
  return (
    <View style={[mStyle.card, { backgroundColor: colors.card, borderColor: colors.border }]}>
      <View style={mStyle.top}>
        <View style={[mStyle.avatar, { backgroundColor: userColor }]}>
          <Text style={mStyle.initials}>{userInitials}</Text>
        </View>
        <View style={{ flex: 1 }}>
          <View style={mStyle.langBadge}>
            <View style={[mStyle.langDot, { backgroundColor: moment.langColor }]} />
            <Text style={[mStyle.langText, { color: moment.langColor }]}>{moment.lang}</Text>
          </View>
          <Text style={[mStyle.time, { color: colors.muted }]}>{moment.time}</Text>
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
        <View style={mStyle.actionBtn}>
          <Ionicons name="chatbubble-outline" size={17} color={colors.muted} />
          <Text style={[mStyle.actionText, { color: colors.muted }]}>{moment.comments}</Text>
        </View>
        <View style={mStyle.actionBtn}>
          <Ionicons name="share-outline" size={18} color={colors.muted} />
        </View>
      </View>
    </View>
  );
}

const mStyle = StyleSheet.create({
  card: { borderRadius: 14, borderWidth: 1, overflow: "hidden" },
  top: { flexDirection: "row", alignItems: "center", gap: 10, padding: 14, paddingBottom: 10 },
  avatar: { width: 38, height: 38, borderRadius: 19, alignItems: "center", justifyContent: "center" },
  initials: { color: "#fff", fontSize: 14, fontFamily: "Nunito_700Bold" },
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

function ReviewCard({ review, colors }: { review: typeof SAMPLE_REVIEWS[0]; colors: typeof Colors.dark }) {
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

function SettingsTab({ colors, onLogout }: { colors: typeof Colors.dark; onLogout: () => void }) {
  const SETTINGS = [
    { icon: "notifications-outline", label: "Notifications", sub: "Push notifications" },
    { icon: "lock-closed-outline", label: "Privacy", sub: "Who can see your profile" },
    { icon: "language-outline", label: "Language Preferences", sub: "App language & learning" },
    { icon: "moon-outline", label: "Appearance", sub: "Dark / Light mode" },
    { icon: "help-circle-outline", label: "Help & Support", sub: "FAQ, contact us" },
    { icon: "information-circle-outline", label: "About LinguaConnect", sub: "Version 1.0.0" },
  ];

  return (
    <View style={{ paddingHorizontal: 16, paddingTop: 12, gap: 8 }}>
      {SETTINGS.map(s => (
        <Pressable
          key={s.label}
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
  const { user, logout } = useAuth();
  const { progress } = useProgress();

  const [activeTab, setActiveTab] = useState<ProfileTab>("moments");
  const [showEdit, setShowEdit] = useState(false);
  const [showPost, setShowPost] = useState(false);
  const [moments, setMoments] = useState(SAMPLE_MOMENTS);

  const topInset = Platform.OS === "web" ? 67 : insets.top;
  const botInset = Platform.OS === "web" ? 34 : 0;

  const displayName = user?.displayName || "Learner";
  const initials = makeInitials(displayName);
  const avatarColor = user?.avatarColor || AVATAR_COLORS[0];
  const bio = user?.bio || "Language learner on a mission to speak fluently!";
  const nativeLang = user?.nativeLanguage || "Filipino";
  const followers = user?.followers ?? 128;
  const following = user?.following ?? 54;
  const momentCount = moments.length;
  const level = Math.floor(progress.totalXP / 200) + 1;

  const handleLogout = async () => {
    await logout();
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
  };

  const addMoment = (text: string) => {
    const newMoment = {
      id: `m-${Date.now()}`,
      text,
      lang: "English",
      langColor: "#2563EB",
      likes: 0,
      comments: 0,
      time: "just now",
      isOwn: true,
      correction: null,
    };
    setMoments(prev => [newMoment, ...prev]);
  };

  const TABS: { key: ProfileTab; icon: string; label: string }[] = [
    { key: "moments", icon: "grid-outline", label: "Moments" },
    { key: "reviews", icon: "star-outline", label: "Reviews" },
    { key: "settings", icon: "settings-outline", label: "Settings" },
  ];

  return (
    <View style={[pStyle.container, { backgroundColor: colors.background }]}>
      <ScrollView
        showsVerticalScrollIndicator={false}
        contentContainerStyle={{ paddingBottom: Math.max(botInset, 80) }}
      >
        {/* Header background */}
        <View style={[pStyle.headerBg, { paddingTop: topInset, backgroundColor: colors.card }]}>
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
              <View style={[pStyle.avatar, { backgroundColor: avatarColor }]}>
                <Text style={pStyle.avatarInitials}>{initials}</Text>
              </View>
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
                <View style={[pStyle.langBadge, { backgroundColor: "#2563EB20" }]}>
                  <View style={[pStyle.langDot, { backgroundColor: "#2563EB" }]} />
                  <Text style={[pStyle.langText, { color: "#2563EB" }]}>{nativeLang}</Text>
                </View>
              </View>
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
                />
              ))}
            </View>
          )}

          {activeTab === "reviews" && (
            <View style={{ gap: 12 }}>
              {/* Average rating */}
              <View style={[pStyle.ratingCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[pStyle.ratingNum, { color: colors.text }]}>4.8</Text>
                <View style={{ gap: 4 }}>
                  <View style={{ flexDirection: "row", gap: 3 }}>
                    {[1, 2, 3, 4, 5].map(i => (
                      <Ionicons key={i} name={i <= 4 ? "star" : "star-half"} size={18} color="#F7C948" />
                    ))}
                  </View>
                  <Text style={[pStyle.ratingCount, { color: colors.muted }]}>{SAMPLE_REVIEWS.length} reviews</Text>
                </View>
              </View>
              {SAMPLE_REVIEWS.map(r => (
                <ReviewCard key={r.id} review={r} colors={colors} />
              ))}
            </View>
          )}

          {activeTab === "settings" && (
            <SettingsTab colors={colors} onLogout={handleLogout} />
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
    </View>
  );
}

const pStyle = StyleSheet.create({
  container: { flex: 1 },
  headerBg: { paddingHorizontal: 20, paddingBottom: 0, gap: 12 },
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
});
