import { Stack } from "expo-router";

export default function AuthLayout() {
  return (
    <Stack
      screenOptions={{
        headerBackButtonDisplayMode: "minimal",
        headerTintColor: "#FF6B35",
        headerStyle: { backgroundColor: "transparent" },
        headerTransparent: true,
      }}
    >
      <Stack.Screen name="login" options={{ title: "" }} />
      <Stack.Screen name="register" options={{ title: "" }} />
    </Stack>
  );
}
