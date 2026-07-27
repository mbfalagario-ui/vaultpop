import {
  isAccountSignedIn,
  requestAdminConsoleHandoffUrl
} from "@/account/account-service";
import { ActionButton } from "@/components/action-button";
import { ActionLink } from "@/components/action-link";
import { ScreenShell } from "@/components/screen-shell";
import { useSaveProfile } from "@/storage/use-save-profile";
import { colors, spacing, typography } from "@/theme";
import { useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { ActivityIndicator, Linking, Pressable, Text, View } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";

type WebViewComponent = typeof import("react-native-webview").WebView;

const IS_NATIVE =
  process.env.EXPO_OS === "ios" || process.env.EXPO_OS === "android";

/**
 * In-app Admin Console. Uses the existing authenticated app session: the app
 * exchanges its session for a short-lived single-use handoff code, and the
 * backend sets a secure HttpOnly cookie session for /admin — the owner is
 * never asked to sign in a second time. No session token appears in any URL.
 */
export function AdminConsoleScreen() {
  const [profile] = useSaveProfile();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const [WebView, setWebView] = useState<WebViewComponent | null>(null);
  const [consoleUrl, setConsoleUrl] = useState<string | null>(null);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(true);
  const signedIn = isAccountSignedIn(profile);
  const isAdmin = signedIn && profile.account.role === "admin";
  const sessionToken = profile.account.sessionToken;

  const startSession = useCallback(async () => {
    if (!sessionToken) {
      return;
    }
    setLoading(true);
    setError("");
    setConsoleUrl(null);
    try {
      setConsoleUrl(await requestAdminConsoleHandoffUrl(sessionToken));
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "Admin Console is unavailable right now."
      );
    } finally {
      setLoading(false);
    }
  }, [sessionToken]);

  useEffect(() => {
    if (isAdmin) {
      void startSession();
    }
  }, [isAdmin, startSession]);

  useEffect(() => {
    if (!IS_NATIVE || !isAdmin) {
      return undefined;
    }
    let active = true;
    void import("react-native-webview")
      .then((module) => {
        if (active) {
          setWebView(() => module.WebView);
        }
      })
      .catch(() => {
        if (active) {
          setError("The in-app browser is unavailable in this build.");
        }
      });
    return () => {
      active = false;
    };
  }, [isAdmin]);

  // Web preview fallback only — native builds always use the in-app WebView.
  const openInBrowser = async () => {
    if (!sessionToken) {
      return;
    }
    try {
      // Handoff codes are single-use, so mint a fresh one per open.
      await Linking.openURL(await requestAdminConsoleHandoffUrl(sessionToken));
    } catch (openError) {
      setError(
        openError instanceof Error
          ? openError.message
          : "Admin Console is unavailable right now."
      );
    }
  };

  if (!isAdmin) {
    return (
      <ScreenShell
        eyebrow="RESTRICTED"
        title="Admin Console"
        lead="This area is available to the owner account only."
        accent={colors.ruby}
      >
        <ActionLink
          href="/account"
          label="Go to Account"
          detail="Sign in with the owner account to continue."
          accent={colors.cyan}
          testID="admin-console-restricted-account-link"
        />
      </ScreenShell>
    );
  }

  if (IS_NATIVE && WebView && consoleUrl && !error) {
    return (
      <View style={{ backgroundColor: colors.background, flex: 1 }}>
        <View
          style={{
            alignItems: "center",
            flexDirection: "row",
            gap: spacing.sm,
            paddingBottom: spacing.xs,
            paddingHorizontal: spacing.md,
            paddingTop: insets.top + spacing.xs
          }}
        >
          <Pressable
            accessibilityLabel="Back"
            accessibilityRole="button"
            testID="admin-console-back"
            onPress={() => router.back()}
            style={{
              alignItems: "center",
              justifyContent: "center",
              minHeight: 44,
              minWidth: 44
            }}
          >
            <Text
              selectable={false}
              style={{ color: colors.cyan, fontSize: 15, fontWeight: "800" }}
            >
              ‹ Back
            </Text>
          </Pressable>
          <Text
            selectable={false}
            style={[typography.sectionTitle, { flex: 1, fontSize: 17 }]}
          >
            Admin Console
          </Text>
        </View>
        <WebView
          source={{ uri: consoleUrl }}
          style={{ flex: 1 }}
          sharedCookiesEnabled
          testID="admin-console-webview"
          onError={() =>
            setError("The Admin Console could not load. Check your connection and retry.")
          }
        />
      </View>
    );
  }

  return (
    <ScreenShell
      eyebrow="OWNER TOOLS"
      title="Admin Console"
      lead="Support inbox, analytics, and user management."
      accent={colors.gold}
    >
      {loading ? (
        <View style={{ alignItems: "center", paddingVertical: spacing.lg }}>
          <ActivityIndicator color={colors.gold} size="large" />
          <Text
            selectable={false}
            style={[typography.caption, { marginTop: spacing.sm }]}
          >
            Starting your admin session...
          </Text>
        </View>
      ) : error ? (
        <>
          <Text
            selectable
            testID="admin-console-error"
            style={[typography.caption, { color: colors.textSecondary, fontSize: 13 }]}
          >
            {error}
          </Text>
          <ActionButton
            label="Retry"
            accent={colors.gold}
            testID="admin-console-retry-button"
            onPress={() => void startSession()}
          />
        </>
      ) : (
        <>
          <Text
            selectable
            style={[typography.caption, { color: colors.textSecondary, fontSize: 13 }]}
          >
            Your admin session is ready. On this preview the console opens in a
            browser tab; on your device it opens inside the app.
          </Text>
          <ActionButton
            label="Open Admin Console"
            detail="Uses your current signed-in session."
            accent={colors.gold}
            testID="admin-console-open-button"
            onPress={() => void openInBrowser()}
          />
        </>
      )}
    </ScreenShell>
  );
}
