import {
  applyAccountLogin,
  applyAccountRefresh,
  clearAccountSession,
  isAccountSignedIn,
  refreshAccountState,
  registerAccount,
  SessionExpiredError,
  signInAccount,
  signOutAccount
} from "@/account/account-service";
import { ActionButton } from "@/components/action-button";
import { CoinFace } from "@/components/coin-face";
import { MetricCard } from "@/components/metric-card";
import { ScreenShell } from "@/components/screen-shell";
import { StatusPill } from "@/components/status-pill";
import { useSaveProfile } from "@/storage/use-save-profile";
import { colors, radius, spacing, typography } from "@/theme";
import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Pressable, Text, TextInput, View } from "react-native";

type AuthMode = "signin" | "create";

export function AccountScreen() {
  const params = useLocalSearchParams<{ mode?: string }>();
  const [profile, setProfile] = useSaveProfile();
  const [mode, setMode] = useState<AuthMode>(params.mode === "create" ? "create" : "signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const signedIn = isAccountSignedIn(profile);

  const signIn = async () => {
    if (!email.trim() || !password) {
      setStatus("Enter your email and password.");
      return;
    }
    setBusy(true);
    setStatus("Signing in...");
    try {
      const login = await signInAccount({
        email: email.trim(),
        password,
        installId: profile.support.installId
      });
      setProfile((current) => applyAccountLogin(current, login));
      setPassword("");
      setStatus("Signed in. Account linked to this installation.");
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : "Sign in is unavailable. You can continue playing offline."
      );
    } finally {
      setBusy(false);
    }
  };

  const create = async () => {
    if (!email.trim() || !password) {
      setStatus("Enter an email and a password of at least 12 characters.");
      return;
    }
    if (password.length < 12) {
      setStatus("Password must be at least 12 characters.");
      return;
    }
    if (password !== confirmPassword) {
      setStatus("Passwords do not match.");
      return;
    }
    setBusy(true);
    setStatus("Creating your account...");
    try {
      const login = await registerAccount({
        email: email.trim(),
        password,
        installId: profile.support.installId
      });
      setProfile((current) => applyAccountLogin(current, login));
      setPassword("");
      setConfirmPassword("");
      setStatus("Account created and signed in.");
    } catch (error) {
      setStatus(
        error instanceof Error
          ? error.message
          : "Account creation is unavailable. You can continue playing offline."
      );
    } finally {
      setBusy(false);
    }
  };

  const signOut = async () => {
    const token = profile.account.sessionToken;
    setProfile((current) => clearAccountSession(current));
    await signOutAccount(token);
    setStatus("Signed out. Local gameplay and progress remain available.");
  };

  const sync = async () => {
    const token = profile.account.sessionToken;
    if (!token) {
      setStatus("Sign in again to sync your account.");
      return;
    }
    setBusy(true);
    setStatus("Syncing account...");
    try {
      const state = await refreshAccountState(token);
      setProfile((current) => applyAccountRefresh(current, state));
      setStatus("Account synced.");
    } catch (error) {
      if (error instanceof SessionExpiredError) {
        setProfile((current) => clearAccountSession(current));
        setStatus(error.message);
      } else {
        setStatus("Sync unavailable. Try again.");
      }
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScreenShell
      eyebrow="OPTIONAL SYNC"
      title="Account"
      lead="Play offline anytime. An account only adds inventory sync and support history."
      accent={colors.cyan}
    >
      {signedIn ? (
        <>
          <View
            style={{
              alignItems: "center",
              backgroundColor: colors.surfaceGlass,
              borderColor: colors.border,
              borderCurve: "continuous",
              borderRadius: radius.lg,
              borderWidth: 1,
              flexDirection: "row",
              gap: spacing.md,
              padding: spacing.md
            }}
          >
            <CoinFace type="cyan" size={56} glow />
            <View style={{ flex: 1, gap: spacing.xs }}>
              <StatusPill label="SYNCED" tone="emerald" />
              <Text selectable style={[typography.caption, { color: colors.textMuted, fontSize: 11 }]}>
                Signed in as
              </Text>
              <Text selectable style={[typography.sectionTitle, { fontSize: 17 }]}>
                {profile.account.email}
              </Text>
              <Text selectable style={[typography.caption, { fontSize: 12 }]}>
                {formatRole(profile.account.role)}
              </Text>
            </View>
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
            <MetricCard
              label="Vault Coins"
              value={profile.economy.vaultCoins.toLocaleString()}
              accent={colors.gold}
            />
            <MetricCard
              label="Boosters"
              value={
                profile.economy.boosters.bonusLives +
                profile.economy.boosters.chainBoosts +
                profile.economy.boosters.vaultBursts
              }
              accent={colors.emerald}
            />
          </View>
          <ActionButton
            label="Account Sync"
            detail="Updates account inventory and access from VaultPop."
            disabled={busy}
            testID="account-refresh-button"
            onPress={() => void sync()}
          />
          <ActionButton
            label="Sign Out"
            detail="Keeps local scores and offline gameplay on this device."
            tone="quiet"
            testID="account-signout-button"
            onPress={() => void signOut()}
          />
        </>
      ) : (
        <View
          style={{
            backgroundColor: colors.surfaceGlass,
            borderColor: colors.border,
            borderCurve: "continuous",
            borderRadius: radius.lg,
            borderWidth: 1,
            gap: spacing.md,
            padding: spacing.lg
          }}
        >
          {/* Sign In / Create Account toggle */}
          <View
            style={{
              backgroundColor: "#04030C",
              borderColor: colors.border,
              borderRadius: radius.pill,
              borderWidth: 1,
              flexDirection: "row",
              overflow: "hidden",
              padding: 3
            }}
          >
            {(
              [
                { id: "signin", label: "Sign In" },
                { id: "create", label: "Create Account" }
              ] as const
            ).map((tab) => {
              const selected = mode === tab.id;
              return (
                <Pressable
                  key={tab.id}
                  testID={`account-mode-${tab.id}`}
                  accessibilityRole="button"
                  accessibilityState={{ selected }}
                  onPress={() => {
                    setMode(tab.id);
                    setStatus("");
                  }}
                  style={{
                    alignItems: "center",
                    backgroundColor: selected ? colors.cyan : "transparent",
                    borderRadius: radius.pill,
                    flex: 1,
                    paddingVertical: spacing.sm
                  }}
                >
                  <Text
                    selectable={false}
                    style={{
                      color: selected ? "#0B0919" : colors.textSecondary,
                      fontSize: 13.5,
                      fontWeight: "800"
                    }}
                  >
                    {tab.label}
                  </Text>
                </Pressable>
              );
            })}
          </View>

          <View style={{ gap: spacing.xs }}>
            <Text selectable style={[typography.eyebrow, { color: colors.textMuted }]}>
              EMAIL
            </Text>
            <TextInput
              accessibilityLabel="Account email"
              testID="account-email-input"
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect={false}
              keyboardType="email-address"
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={colors.textMuted}
              style={inputStyle}
              value={email}
            />
          </View>
          <View style={{ gap: spacing.xs }}>
            <Text selectable style={[typography.eyebrow, { color: colors.textMuted }]}>
              PASSWORD
            </Text>
            <TextInput
              accessibilityLabel="Account password"
              testID="account-password-input"
              autoCapitalize="none"
              autoComplete={mode === "create" ? "new-password" : "current-password"}
              onChangeText={setPassword}
              placeholder={mode === "create" ? "At least 12 characters" : "Password"}
              placeholderTextColor={colors.textMuted}
              secureTextEntry
              style={inputStyle}
              value={password}
            />
          </View>
          {mode === "create" ? (
            <View style={{ gap: spacing.xs }}>
              <Text selectable style={[typography.eyebrow, { color: colors.textMuted }]}>
                CONFIRM PASSWORD
              </Text>
              <TextInput
                accessibilityLabel="Confirm account password"
                testID="account-confirm-password-input"
                autoCapitalize="none"
                autoComplete="new-password"
                onChangeText={setConfirmPassword}
                placeholder="Repeat password"
                placeholderTextColor={colors.textMuted}
                secureTextEntry
                style={inputStyle}
                value={confirmPassword}
              />
            </View>
          ) : null}
          {mode === "create" ? (
            <ActionButton
              label="Create Account"
              disabled={busy}
              accent={colors.cyan}
              testID="account-create-button"
              onPress={() => void create()}
            />
          ) : (
            <ActionButton
              label="Sign In"
              disabled={busy}
              accent={colors.cyan}
              testID="account-signin-button"
              onPress={() => void signIn()}
            />
          )}
        </View>
      )}
      {status ? <StatusPill label={status} tone="cyan" /> : null}
      <Text
        selectable
        style={[typography.caption, { color: colors.textMuted, fontSize: 11.5, textAlign: "center" }]}
      >
        Play offline anytime. Credentials are verified securely and are not stored in the app.
      </Text>
    </ScreenShell>
  );
}

const inputStyle = {
  backgroundColor: "#04030C",
  borderColor: colors.border,
  borderRadius: radius.sm,
  borderWidth: 1,
  color: colors.textPrimary,
  fontSize: 15,
  minHeight: 50,
  paddingHorizontal: spacing.md
} as const;

function formatRole(role: "player" | "reviewer" | "admin" | null): string {
  return role === "admin" ? "Owner account" : "Player account";
}
