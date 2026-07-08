import { AdLifecycle } from "@/components/ad-lifecycle";
import { RootErrorBoundary } from "@/components/root-error-boundary";
import { initializePersistentStorage } from "@/storage/client-storage";
import { colors } from "@/theme";
import { StatusBar } from "expo-status-bar";
import Stack from "expo-router/stack";
import * as SplashScreen from "expo-splash-screen";
import { useEffect, useState } from "react";
import { InteractionManager, LogBox } from "react-native";

import { useIconFonts } from "@/hooks/use-icon-fonts";

// Disable logbox errors etc so that users can see the app
// and agent works as expected.
LogBox.ignoreAllLogs(true);

// Keep the native splash visible from cold start until icon fonts register.
// Required because @expo/vector-icons' componentDidMount fallback fires
// Font.loadAsync against a broken vendor path if any <Icon> mounts before
// the family is registered — which throws on Android Expo Go.
SplashScreen.preventAutoHideAsync();

export default function RootLayout() {
  const [loaded, error] = useIconFonts();

  useEffect(() => {
    if (loaded || error) {
      SplashScreen.hideAsync();
    }
  }, [loaded, error]);

  // If the CDN is unreachable we fall through on error rather than wedging
  // the app — icons will tofu, but the app still boots.
  if (!loaded && !error) return null;

  return (
    <RootErrorBoundary>
      <StatusBar style="light" />
      <DeferredLaunchServices />
      <Stack
        screenOptions={{
          headerShown: false,
          contentStyle: { backgroundColor: colors.backgroundDeep }
        }}
      >
        <Stack.Screen name="index" options={{ title: "VaultPop" }} />
        <Stack.Screen name="modes" options={{ title: "Mode Select" }} />
        <Stack.Screen name="gameplay" options={{ title: "Gameplay" }} />
        <Stack.Screen name="pause" options={{ title: "Pause", presentation: "modal" }} />
        <Stack.Screen name="results" options={{ title: "Round Result" }} />
        <Stack.Screen name="leaderboard" options={{ title: "Leaderboard" }} />
        <Stack.Screen name="streaks" options={{ title: "Streak Calendar" }} />
        <Stack.Screen name="how-to-play" options={{ title: "How to Play" }} />
        <Stack.Screen name="cosmetics" options={{ title: "Cosmetics" }} />
        <Stack.Screen name="shop" options={{ title: "Shop" }} />
        <Stack.Screen name="support" options={{ title: "Support" }} />
        <Stack.Screen name="account" options={{ title: "Account" }} />
        <Stack.Screen name="settings" options={{ title: "Settings" }} />
        <Stack.Screen name="gameplay-settings" options={{ title: "Gameplay Settings" }} />
        <Stack.Screen name="faq" options={{ title: "FAQ" }} />
        <Stack.Screen name="assistant" options={{ title: "Support Assistant" }} />
        <Stack.Screen name="legal" options={{ title: "Privacy and Support" }} />
      </Stack>
    </RootErrorBoundary>
  );
}

function DeferredLaunchServices() {
  const [storageReady, setStorageReady] = useState(false);

  useEffect(() => {
    let active = true;
    let timeout: ReturnType<typeof setTimeout> | null = null;
    const task = InteractionManager.runAfterInteractions(() => {
      timeout = setTimeout(() => {
        void initializePersistentStorage().finally(() => {
          if (active) {
            setStorageReady(true);
          }
        });
      }, 1_000);
    });

    return () => {
      active = false;
      task.cancel();
      if (timeout) {
        clearTimeout(timeout);
      }
    };
  }, []);

  return storageReady ? <AdLifecycle /> : null;
}
