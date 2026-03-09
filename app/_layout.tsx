import { QueryClientProvider } from "@tanstack/react-query";
import { Stack } from "expo-router";
import * as SplashScreen from "expo-splash-screen";
import React, { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { GestureHandlerRootView } from "react-native-gesture-handler";
import { KeyboardProvider } from "react-native-keyboard-controller";
import { ErrorBoundary } from "@/components/ErrorBoundary";
import { BrandMark } from "@/components/BrandMark";
import { queryClient } from "@/lib/query-client";
import { AuthProvider } from "@/context/AuthContext";
import { MessagingProvider } from "@/context/MessagingContext";
import { ProgressProvider } from "@/context/ProgressContext";
import {
  useFonts,
  Nunito_400Regular,
  Nunito_600SemiBold,
  Nunito_700Bold,
  Nunito_800ExtraBold,
} from "@expo-google-fonts/nunito";

SplashScreen.preventAutoHideAsync();

function RootLayoutNav() {
  return (
    <Stack screenOptions={{ headerBackTitle: "Back" }}>
      <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
      <Stack.Screen
        name="(auth)"
        options={{ presentation: "modal", headerShown: false }}
      />
      <Stack.Screen
        name="lesson/[id]"
        options={{ headerShown: false, presentation: "card" }}
      />
      <Stack.Screen
        name="quiz/[id]"
        options={{ headerShown: false, presentation: "card" }}
      />
    </Stack>
  );
}

export default function RootLayout() {
  const [fontsLoaded] = useFonts({
    Nunito_400Regular,
    Nunito_600SemiBold,
    Nunito_700Bold,
    Nunito_800ExtraBold,
  });
  const [showBrandLaunch, setShowBrandLaunch] = useState(true);
  const [canRenderApp, setCanRenderApp] = useState(false);

  useEffect(() => {
    if (!fontsLoaded) return;

    const revealTimeoutId = setTimeout(() => {
      setCanRenderApp(true);
      SplashScreen.hideAsync();
    }, 700);

    const hideTimeoutId = setTimeout(() => {
      setShowBrandLaunch(false);
    }, 3600);

    return () => {
      clearTimeout(revealTimeoutId);
      clearTimeout(hideTimeoutId);
    };
  }, [fontsLoaded]);

  if (!fontsLoaded) return null;

  return (
    <ErrorBoundary>
      <QueryClientProvider client={queryClient}>
        <AuthProvider>
          <MessagingProvider>
            <ProgressProvider>
              <GestureHandlerRootView style={{ flex: 1 }}>
                <KeyboardProvider>
                  <View style={styles.root}>
                    {canRenderApp && <RootLayoutNav />}
                    {showBrandLaunch && (
                      <View style={styles.launchScreen}>
                        <View style={styles.launchOrbOne} />
                        <View style={styles.launchOrbTwo} />
                        <BrandMark
                          size={148}
                          titleColor="#AEBFD2"
                          subtitleColor="#8EA6BE"
                        />
                        <Text style={styles.launchCaption}>Learn. Speak. Connect.</Text>
                      </View>
                    )}
                  </View>
                </KeyboardProvider>
              </GestureHandlerRootView>
            </ProgressProvider>
          </MessagingProvider>
        </AuthProvider>
      </QueryClientProvider>
    </ErrorBoundary>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  launchScreen: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "#062C53",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
  },
  launchOrbOne: {
    position: "absolute",
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: "rgba(20, 149, 224, 0.12)",
    top: "18%",
    left: -50,
  },
  launchOrbTwo: {
    position: "absolute",
    width: 200,
    height: 200,
    borderRadius: 100,
    backgroundColor: "rgba(25, 213, 191, 0.12)",
    bottom: "16%",
    right: -40,
  },
  launchCaption: {
    color: "#7FA0C0",
    fontFamily: "Nunito_600SemiBold",
    fontSize: 15,
    letterSpacing: 0.4,
  },
});
