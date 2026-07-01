import { colors } from "@/theme";
import { StatusBar } from "expo-status-bar";
import Stack from "expo-router/stack";

export default function RootLayout() {
  return (
    <>
      <StatusBar style="light" />
      <AdLifecycle />
      <Stack
        screenOptions={{
          headerStyle: { backgroundColor: colors.surface },
          headerTintColor: colors.textPrimary,
          headerTitleStyle: { fontWeight: "700" },
          contentStyle: { backgroundColor: colors.background }
        }}
      >
        <Stack.Screen name="index" options={{ title: "VaultPop" }} />
        <Stack.Screen name="splash" options={{ title: "Loading" }} />
        <Stack.Screen name="modes" options={{ title: "Mode Select" }} />
        <Stack.Screen name="gameplay" options={{ title: "Gameplay" }} />
        <Stack.Screen name="pause" options={{ title: "Pause", presentation: "modal" }} />
        <Stack.Screen name="results" options={{ title: "Round Result" }} />
        <Stack.Screen name="cosmetics" options={{ title: "Cosmetics" }} />
        <Stack.Screen name="shop" options={{ title: "Shop" }} />
        <Stack.Screen name="support" options={{ title: "Support" }} />
        <Stack.Screen name="settings" options={{ title: "Settings" }} />
        <Stack.Screen name="legal" options={{ title: "Privacy and Support" }} />
      </Stack>
    </>
  );
}
import { AdLifecycle } from "@/components/ad-lifecycle";
