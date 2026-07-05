import {
  applyAccountLogin,
  applyAccountRefresh,
  clearAccountSession,
  isAccountSignedIn,
  refreshAccountState,
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
import { useState } from "react";
import { Text, TextInput, View } from "react-native";

export function AccountScreen() {
  const [profile, setProfile] = useSaveProfile();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
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
      setStatus("Account linked to this installation.");
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

  const signOut = async () => {
    const token = profile.account.sessionToken;
    setProfile((current) => clearAccountSession(current));
    await signOutAccount(token);
    setStatus("Signed out. Local gameplay and progress remain available.");
  };

  const refresh = async () => {
    const token = profile.account.sessionToken;
    if (!token) {
      setStatus("Sign in again to refresh your account.");
      return;
    }
    setBusy(true);
    setStatus("Refreshing account...");
    try {
      const state = await refreshAccountState(token);
      setProfile((current) => applyAccountRefresh(current, state));
      setStatus("Account inventory and access are up to date.");
    } catch {
      setStatus("Account refresh is unavailable. You can continue playing offline.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <ScreenShell
      eyebrow="OPTIONAL SYNC"
      title="Account"
      lead="Play offline anytime. Sign in only when you want linked inventory and support."
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
            label="Refresh Account"
            detail="Updates account inventory and access from VaultPop."
            disabled={busy}
            testID="account-refresh-button"
            onPress={() => void refresh()}
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
              style={{
                backgroundColor: "#04030C",
                borderColor: colors.border,
                borderRadius: radius.sm,
                borderWidth: 1,
                color: colors.textPrimary,
                fontSize: 15,
                minHeight: 50,
                paddingHorizontal: spacing.md
              }}
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
              autoComplete="current-password"
              onChangeText={setPassword}
              placeholder="Password"
              placeholderTextColor={colors.textMuted}
              secureTextEntry
              style={{
                backgroundColor: "#04030C",
                borderColor: colors.border,
                borderRadius: radius.sm,
                borderWidth: 1,
                color: colors.textPrimary,
                fontSize: 15,
                minHeight: 50,
                paddingHorizontal: spacing.md
              }}
              value={password}
            />
          </View>
          <ActionButton
            label="Sign In"
            disabled={busy}
            accent={colors.cyan}
            testID="account-signin-button"
            onPress={() => void signIn()}
          />
        </View>
      )}
      {status ? <StatusPill label={status} tone="cyan" /> : null}
      <Text
        selectable
        style={[typography.caption, { color: colors.textMuted, fontSize: 11.5, textAlign: "center" }]}
      >
        Credentials are verified securely and are not stored in the app.
      </Text>
    </ScreenShell>
  );
}

function formatRole(role: "player" | "reviewer" | "admin" | null): string {
  return role === "admin" ? "Owner account" : "Player account";
}
