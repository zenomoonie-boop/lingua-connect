import React, { useEffect, useMemo, useState } from "react";
import { View, Text, ScrollView, StyleSheet, Pressable, useColorScheme, Image, ActivityIndicator } from "react-native";
import { Stack, router, useLocalSearchParams } from "expo-router";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Colors from "@/constants/colors";
import { LANGUAGES } from "@/data/lessons";
import { useAuth } from "@/context/AuthContext";

type ProfileTab = "moments" | "reviews" | "about";

export default function UserProfileScreen() {
  const params = useLocalSearchParams<{
    id: string;
    name?: string;
    initials?: string;
    color?: string;
    avatarUri?: string;
    language?: string;
    gender?: string;
    age?: string;
    flag?: string;
    countryName?: string;
    location?: string;
    bio?: string;
    followers?: string;
    following?: string;
    moments?: string;
    xp?: string;
  }>();

  const colorScheme = useColorScheme();
  const colors = colorScheme === "dark" ? Colors.dark : Colors.light;
  const insets = useSafeAreaInsets();
  const [activeTab, setActiveTab] = useState<ProfileTab>("moments");
  const [profileUser, setProfileUser] = useState<ReturnType<typeof buildFallbackProfile> | null>(null);
  const [isRefreshingProfile, setIsRefreshingProfile] = useState(true);
  const { user, getUserById, toggleFollowUser, isFollowingUser } = useAuth();

  function buildFallbackProfile() {
    return {
      id: params.id,
      name: params.name || "User",
      initials: params.initials || "U",
      color: params.color || "#4ECDC4",
      avatarUri: params.avatarUri,
      nativeLang: params.language || "English",
      gender: params.gender || "",
      age: Number(params.age ?? 0),
      flag: params.flag || "",
      countryName: params.countryName || "",
      location: params.location || "",
      bio: params.bio || "",
      followers: Number(params.followers ?? 0),
      following: Number(params.following ?? 0),
      moments: Number(params.moments ?? 0),
      xp: Number(params.xp ?? 0),
      learningLanguages: [] as string[],
      isOwnProfile: false,
    };
  }

  useEffect(() => {
    let isMounted = true;

    const loadProfile = async () => {
      setIsRefreshingProfile(true);
      const fallbackProfile = buildFallbackProfile();

      if (user?.id === params.id) {
        if (isMounted) {
          setProfileUser(null);
          setIsRefreshingProfile(false);
        }
        return;
      }

      try {
        const storedUser = params.id ? await getUserById(params.id) : null;
        if (isMounted) {
          if (storedUser) {
            setProfileUser({
              id: storedUser.id,
              name: storedUser.displayName,
              initials: storedUser.displayName.split(" ").map((word) => word[0]).join("").slice(0, 2).toUpperCase(),
              color: storedUser.avatarColor || "#4ECDC4",
              avatarUri: storedUser.avatarUri,
              nativeLang: storedUser.nativeLanguage || fallbackProfile.nativeLang,
              gender: storedUser.gender || "",
              age: Number(storedUser.age ?? 0),
              flag: storedUser.flag || "",
              countryName: storedUser.countryName || "",
              location: storedUser.locationName || "",
              bio: storedUser.bio || "",
              followers: Number(storedUser.followers ?? 0),
              following: Number(storedUser.following ?? 0),
              moments: Number(storedUser.moments ?? 0),
              xp: fallbackProfile.xp,
              learningLanguages: storedUser.learningLanguages || [],
              isOwnProfile: false,
            });
          } else {
            setProfileUser(fallbackProfile);
          }
        }
      } finally {
        if (isMounted) {
          setIsRefreshingProfile(false);
        }
      }
    };

    loadProfile();

    return () => {
      isMounted = false;
    };
  }, [getUserById, params.age, params.avatarUri, params.bio, params.color, params.countryName, params.flag, params.followers, params.following, params.gender, params.id, params.initials, params.language, params.location, params.moments, params.name, params.xp, user?.id]);

  const profile = useMemo(() => {
    const isOwnProfile = user?.id === params.id;
    const source = isOwnProfile ? user : null;
    const nativeLang = source?.nativeLanguage || params.language || "English";
    const languageObj = LANGUAGES.find((item) => item.name === nativeLang || item.code === nativeLang.toLowerCase());

    if (!isOwnProfile && profileUser) {
      const storedLanguageObj = LANGUAGES.find((item) => item.name === profileUser.nativeLang || item.code === profileUser.nativeLang.toLowerCase());
      return {
        ...profileUser,
        langColor: storedLanguageObj?.color || "#2563EB",
      };
    }

    return {
      id: user?.id || params.id,
      name: source?.displayName || params.name || "User",
      initials: params.initials || (source?.displayName ? source.displayName.split(" ").map((word) => word[0]).join("").slice(0, 2).toUpperCase() : "U"),
      color: source?.avatarColor || params.color || "#4ECDC4",
      avatarUri: source?.avatarUri || params.avatarUri,
      nativeLang,
      langColor: languageObj?.color || "#2563EB",
      gender: source?.gender || params.gender || "",
      age: Number(source?.age ?? params.age ?? 0),
      flag: source?.flag || params.flag || "",
      countryName: source?.countryName || params.countryName || "",
      location: source?.locationName || params.location || "",
      bio: source?.bio || params.bio || "",
      followers: Number(source?.followers ?? params.followers ?? 0),
      following: Number(source?.following ?? params.following ?? 0),
      moments: Number(source?.moments ?? params.moments ?? 0),
      xp: Number(params.xp ?? 0),
      learningLanguages: source?.learningLanguages || [],
      isOwnProfile,
    };
  }, [params.age, params.avatarUri, params.bio, params.color, params.countryName, params.flag, params.followers, params.following, params.gender, params.id, params.initials, params.language, params.location, params.moments, params.name, params.xp, profileUser, user]);

  const topInset = insets.top;
  const genderIcon = profile.gender === "Female" ? "female" : "male";
  const genderColor = profile.gender === "Female" ? "#EC4899" : "#3B82F6";
  const isFollowing = !profile.isOwnProfile && Boolean(profile.id) && isFollowingUser(profile.id);
  const tabs: { key: ProfileTab; icon: keyof typeof Ionicons.glyphMap; label: string }[] = [
    { key: "moments", icon: "grid-outline", label: "Moments" },
    { key: "reviews", icon: "star-outline", label: "Reviews" },
    { key: "about", icon: "person-outline", label: "About" },
  ];

  if (isRefreshingProfile && !profile.isOwnProfile && !profileUser) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: colors.background }]}>
        <ActivityIndicator size="large" color={colors.primary} />
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={{ paddingBottom: 40 }}>
          <View style={[styles.headerBg, { paddingTop: topInset + 8, backgroundColor: colors.card }]}>
            <View style={styles.topBar}>
              <Pressable onPress={() => router.back()} style={[styles.backBtn, { borderColor: colors.border }]}>
                <Ionicons name="arrow-back" size={18} color={colors.text} />
              </Pressable>
              <Text style={[styles.screenLabel, { color: colors.muted }]}>Profile</Text>
              <View style={{ width: 40 }} />
            </View>

            <View style={styles.profileRow}>
              {profile.avatarUri ? (
                <Image source={{ uri: profile.avatarUri }} style={styles.avatar} resizeMode="cover" />
              ) : (
                <View style={[styles.avatar, { backgroundColor: profile.color }]}>
                  <Text style={styles.avatarInitials}>{profile.initials}</Text>
                </View>
              )}

              <View style={{ flex: 1, gap: 4 }}>
                <Text style={[styles.displayName, { color: colors.text }]}>{profile.name}</Text>
                {!profile.isOwnProfile && (
                  <Pressable
                    onPress={async () => {
                      const nextIsFollowing = await toggleFollowUser(profile.id);
                      setProfileUser((current) => {
                        if (!current || current.id !== profile.id) {
                          return current;
                        }

                        return {
                          ...current,
                          followers: Math.max(0, current.followers + (nextIsFollowing ? 1 : -1)),
                        };
                      });
                    }}
                    style={[
                      styles.followBtn,
                      {
                        backgroundColor: isFollowing ? colors.card : colors.primary,
                        borderColor: isFollowing ? colors.border : colors.primary,
                      },
                    ]}
                  >
                    <Ionicons name={isFollowing ? "checkmark" : "person-add"} size={14} color={isFollowing ? colors.text : "#fff"} />
                    <Text style={[styles.followBtnText, { color: isFollowing ? colors.text : "#fff" }]}>
                      {isFollowing ? "Following" : "Follow"}
                    </Text>
                  </Pressable>
                )}
                <View style={styles.badgeRow}>
                  {profile.xp > 0 && (
                    <View style={[styles.levelBadge, { backgroundColor: colors.primary + "20" }]}>
                      <Ionicons name="flash" size={11} color={colors.primary} />
                      <Text style={[styles.levelText, { color: colors.primary }]}>{profile.xp} XP</Text>
                    </View>
                  )}
                  {profile.countryName ? (
                    <View style={[styles.infoBadge, { backgroundColor: colors.background, borderColor: colors.border }]}>
                      <Text style={styles.infoBadgeFlag}>{profile.flag || "🌍"}</Text>
                      <Text style={[styles.infoBadgeText, { color: colors.text }]}>{profile.countryName}</Text>
                    </View>
                  ) : null}
                  <View style={[styles.langBadge, { backgroundColor: profile.langColor + "20" }]}>
                    <View style={[styles.langDot, { backgroundColor: profile.langColor }]} />
                    <Text style={[styles.langText, { color: profile.langColor }]}>{profile.nativeLang}</Text>
                  </View>
                  {profile.gender ? (
                    <View style={[styles.infoBadge, { backgroundColor: colors.background, borderColor: colors.border }]}>
                      <Ionicons name={genderIcon as any} size={13} color={genderColor} />
                      {profile.age ? <Text style={[styles.infoBadgeText, { color: colors.text }]}>{profile.age}</Text> : null}
                    </View>
                  ) : null}
                </View>
                {profile.location ? (
                  <View style={styles.locationRow}>
                    <Ionicons name="location" size={12} color={colors.muted} />
                    <Text style={[styles.locationText, { color: colors.muted }]}>{profile.location}</Text>
                  </View>
                ) : null}
              </View>
            </View>

            <Text style={[styles.bio, { color: profile.bio ? colors.text : colors.muted }]}>{profile.bio || "No bio yet."}</Text>

            <View style={styles.learningRow}>
              <Text style={[styles.learningLabel, { color: colors.muted }]}>Learning: </Text>
              {(profile.learningLanguages.length > 0 ? profile.learningLanguages : ["en"]).map((code) => {
                const language = LANGUAGES.find((item) => item.code === code || item.name === code) || LANGUAGES.find((item) => item.code === "en");
                if (!language) return null;
                return (
                <View key={code} style={[styles.learnChip, { backgroundColor: colors.primary + "18" }]}>
                  <View style={[styles.learnDot, { backgroundColor: language.color }]} />
                  <Text style={[styles.learnText, { color: language.color }]}>{language.name}</Text>
                </View>
                );
              })}
            </View>

            <View style={[styles.stats, { borderTopColor: colors.border }]}>
              <View style={styles.statItem}>
                <Text style={[styles.statNum, { color: colors.text }]}>{profile.moments}</Text>
                <Text style={[styles.statLabel, { color: colors.muted }]}>Moments</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
              <View style={styles.statItem}>
                <Text style={[styles.statNum, { color: colors.text }]}>{profile.followers}</Text>
                <Text style={[styles.statLabel, { color: colors.muted }]}>Followers</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
              <View style={styles.statItem}>
                <Text style={[styles.statNum, { color: colors.text }]}>{profile.following}</Text>
                <Text style={[styles.statLabel, { color: colors.muted }]}>Following</Text>
              </View>
              <View style={[styles.statDivider, { backgroundColor: colors.border }]} />
              <View style={styles.statItem}>
                <Text style={[styles.statNum, { color: colors.text }]}>{profile.xp}</Text>
                <Text style={[styles.statLabel, { color: colors.muted }]}>XP</Text>
              </View>
            </View>
          </View>

          <View style={[styles.tabBar, { backgroundColor: colors.background, borderBottomColor: colors.border }]}>
            {tabs.map((tab) => (
              <Pressable
                key={tab.key}
                onPress={() => setActiveTab(tab.key)}
                style={[styles.tab, activeTab === tab.key && { borderBottomColor: colors.primary, borderBottomWidth: 2 }]}
              >
                <Ionicons name={tab.icon} size={18} color={activeTab === tab.key ? colors.primary : colors.muted} />
                <Text style={[styles.tabText, { color: activeTab === tab.key ? colors.primary : colors.muted }]}>{tab.label}</Text>
              </Pressable>
            ))}
          </View>

          <View style={styles.tabContent}>
            {activeTab === "moments" && (
              <View style={{ gap: 12 }}>
                {profile.moments > 0 ? Array.from({ length: Math.min(profile.moments, 3) }, (_, index) => (
                  <View key={`moment-${index}`} style={[styles.momentCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={[styles.momentTitle, { color: colors.text }]}>Moment {index + 1}</Text>
                    <Text style={[styles.momentText, { color: colors.muted }]}>
                      {profile.isOwnProfile ? "Your language learning moment." : `${profile.name}'s language learning moment.`}
                    </Text>
                  </View>
                )) : (
                  <View style={[styles.momentCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                    <Text style={[styles.momentText, { color: colors.muted }]}>No moments yet.</Text>
                  </View>
                )}
              </View>
            )}

            {activeTab === "reviews" && (
              <View style={{ gap: 12 }}>
                <View style={[styles.ratingCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                  <Text style={[styles.ratingNum, { color: colors.text }]}>0.0</Text>
                  <View style={{ gap: 4 }}>
                    <View style={{ flexDirection: "row", gap: 3 }}>
                      {[1, 2, 3, 4, 5].map((i) => (
                        <Ionicons key={i} name="star-outline" size={18} color="#F7C948" />
                      ))}
                    </View>
                    <Text style={[styles.ratingCount, { color: colors.muted }]}>No reviews yet</Text>
                  </View>
                </View>
              </View>
            )}

            {activeTab === "about" && (
              <View style={[styles.momentCard, { backgroundColor: colors.card, borderColor: colors.border }]}>
                <Text style={[styles.momentTitle, { color: colors.text }]}>About {profile.name}</Text>
                <Text style={[styles.momentText, { color: colors.muted }]}>
                  {profile.bio || `${profile.name} has not added more profile details yet.`}
                </Text>
              </View>
            )}
          </View>
        </ScrollView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  centered: { alignItems: "center", justifyContent: "center" },
  headerBg: { paddingHorizontal: 20, paddingBottom: 0, gap: 12 },
  topBar: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingTop: 8 },
  backBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    borderWidth: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  screenLabel: { fontSize: 14, fontFamily: "Nunito_600SemiBold" },
  profileRow: { flexDirection: "row", alignItems: "flex-start", gap: 14, paddingTop: 4 },
  avatar: { width: 78, height: 78, borderRadius: 39, alignItems: "center", justifyContent: "center" },
  avatarInitials: { color: "#fff", fontSize: 28, fontFamily: "Nunito_800ExtraBold" },
  displayName: { fontSize: 20, fontFamily: "Nunito_800ExtraBold" },
  followBtn: {
    marginTop: 6,
    alignSelf: "flex-start",
    flexDirection: "row",
    alignItems: "center",
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 7,
    borderRadius: 999,
    borderWidth: 1,
  },
  followBtnText: { fontSize: 12, fontFamily: "Nunito_800ExtraBold" },
  badgeRow: { flexDirection: "row", gap: 6, flexWrap: "wrap", marginTop: 4 },
  levelBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10 },
  levelText: { fontSize: 11, fontFamily: "Nunito_700Bold" },
  infoBadge: { flexDirection: "row", alignItems: "center", gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 10, borderWidth: 1 },
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
  statNum: { fontSize: 18, fontFamily: "Nunito_800ExtraBold" },
  statLabel: { fontSize: 11, fontFamily: "Nunito_400Regular" },
  statDivider: { width: 1, height: 30 },
  locationRow: { flexDirection: "row", alignItems: "center", gap: 4 },
  locationText: { fontSize: 12, fontFamily: "Nunito_400Regular" },
  tabBar: { flexDirection: "row", borderBottomWidth: 1 },
  tab: { flex: 1, flexDirection: "row", alignItems: "center", justifyContent: "center", gap: 5, paddingVertical: 12 },
  tabText: { fontSize: 12, fontFamily: "Nunito_600SemiBold" },
  tabContent: { padding: 14 },
  momentCard: { borderRadius: 14, borderWidth: 1, padding: 14, gap: 6 },
  momentTitle: { fontSize: 14, fontFamily: "Nunito_700Bold" },
  momentText: { fontSize: 13, fontFamily: "Nunito_400Regular", lineHeight: 18 },
  ratingCard: { flexDirection: "row", alignItems: "center", gap: 16, padding: 16, borderRadius: 14, borderWidth: 1 },
  ratingNum: { fontSize: 40, fontFamily: "Nunito_800ExtraBold" },
  ratingCount: { fontSize: 12, fontFamily: "Nunito_400Regular" },
});
