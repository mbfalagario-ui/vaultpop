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
import { ArcadeGlyph } from "@/components/arcade-glyph";
import { MetricCard } from "@/components/metric-card";
import { ScreenShell } from "@/components/screen-shell";
import { StatusPill } from "@/components/status-pill";
import { useSaveProfile } from "@/storage/use-save-profile";
import { colors, spacing, typography } from "@/theme";
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
              backgroundColor: `${colors.cyan}0E`,
              borderColor: `${colors.cyan}66`,
              borderRadius: 12,
              borderWidth: 1,
              flexDirection: "row",
              gap: spacing.md,
              padding: spacing.md
            }}
          >
            <View
              style={{
                alignItems: "center",
                backgroundColor: `${colors.cyan}18`,
                borderRadius: 999,
                height: 56,
                justifyContent: "center",
                width: 56
              }}
            >
              <ArcadeGlyph color={colors.cyan} modeId="dailyVault" size={28} type="cyan" />
            </View>
            <View style={{ flex: 1, gap: spacing.xs }}>
              <StatusPill label="SYNCED" tone="emerald" />
              <Text selectable style={[typography.sectionTitle, { fontSize: 18 }]}>
                {profile.account.email}
              </Text>
              <Text selectable style={typography.caption}>
                {formatRole(profile.account.role)}
              </Text>
            </View>
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
            <MetricCard
              label="Vault Coins"
              value={profile.economy.vaultCoins}
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
            onPress={() => void refresh()}
          />
          <ActionButton
            label="Sign Out"
            detail="Keeps local scores and offline gameplay on this device."
            tone="quiet"
            onPress={() => void signOut()}
          />
        </>
      ) : (
        <View
          style={{
            backgroundColor: colors.surfaceGlass,
            borderColor: colors.border,
            borderRadius: 12,
            borderWidth: 1,
            gap: spacing.md,
            padding: spacing.md
          }}
        >
          <View style={{ gap: spacing.xs }}>
            <Text selectable style={typography.sectionTitle}>
              Email
            </Text>
            <TextInput
              accessibilityLabel="Account email"
              autoCapitalize="none"
              autoComplete="email"
              autoCorrect={false}
              keyboardType="email-address"
              onChangeText={setEmail}
              placeholder="you@example.com"
              placeholderTextColor={colors.textSecondary}
              style={{
                backgroundColor: colors.surfaceRaised,
                borderColor: `${colors.cyan}66`,
                borderRadius: 10,
                borderWidth: 1,
                color: colors.textPrimary,
                minHeight: 48,
                padding: spacing.md
              }}
              value={email}
            />
          </View>
          <View style={{ gap: spacing.xs }}>
            <Text selectable style={typography.sectionTitle}>
              Password
            </Text>
            <TextInput
              accessibilityLabel="Account password"
              autoCapitalize="none"
              autoComplete="current-password"
              onChangeText={setPassword}
              placeholder="Password"
              placeholderTextColor={colors.textSecondary}
              secureTextEntry
              style={{
                backgroundColor: colors.surfaceRaised,
                borderColor: `${colors.violet}66`,
                borderRadius: 10,
                borderWidth: 1,
                color: colors.textPrimary,
                minHeight: 48,
                padding: spacing.md
              }}
              value={password}
            />
          </View>
          <ActionButton
            label="Sign In"
            detail="Links support and account inventory when the service is available."
            disabled={busy}
            accent={colors.cyan}
            onPress={() => void signIn()}
          />
        </View>
      )}
      {status ? <StatusPill label={status} tone="cyan" /> : null}
      <Text selectable style={[typography.caption, { color: colors.textMuted }]}>
        Credentials are verified securely and are not stored in the app.
      </Text>
    </ScreenShell>
  );
}

function formatRole(role: "player" | "reviewer" | "admin" | null): string {
  return role === "admin" ? "Owner account" : "Player account";
}
