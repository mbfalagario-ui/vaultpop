import { AdLifecycle } from "@/components/ad-lifecycle";
import { RootErrorBoundary } from "@/components/root-error-boundary";
import { initializePersistentStorage } from "@/storage/client-storage";
import { colors } from "@/theme";
import { StatusBar } from "expo-status-bar";
import Stack from "expo-router/stack";
import { useEffect, useState } from "react";
import { InteractionManager } from "react-native";

export default function RootLayout() {
  return (
    <RootErrorBoundary>
      <StatusBar style="light" />
      <DeferredLaunchServices />
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
