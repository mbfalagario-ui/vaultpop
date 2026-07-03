import {
  applyAccountLogin,
  clearAccountSession,
  isAccountSignedIn,
  signInAccount,
  signOutAccount
} from "@/account/account-service";
import { ActionButton } from "@/components/action-button";
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

  return (
    <ScreenShell
      title="Account"
      lead="Sign in is optional. VaultPop remains playable offline without an account."
    >
      {signedIn ? (
        <>
          <StatusPill label="Signed In" tone="emerald" />
          <View style={{ gap: spacing.xs }}>
            <Text selectable style={typography.sectionTitle}>
              {profile.account.email}
            </Text>
            <Text selectable style={typography.body}>
              Account type: {formatRole(profile.account.role)}
            </Text>
            <Text selectable style={typography.caption}>
              Installation link: {profile.account.linkedInstallId ?? "Pending"}
            </Text>
          </View>
          <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.sm }}>
            <MetricCard
              label="Vault Coins"
              value={profile.economy.vaultCoins}
              accent={colors.gold}
            />
            <MetricCard
              label="Bonus Lives"
              value={profile.economy.boosters.bonusLives}
              accent={colors.emerald}
            />
          </View>
          <ActionButton
            label="Sign Out"
            detail="Keeps local scores and offline gameplay on this device."
            tone="quiet"
            onPress={() => void signOut()}
          />
        </>
      ) : (
        <View style={{ gap: spacing.md }}>
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
                borderColor: colors.border,
                borderRadius: 8,
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
                borderColor: colors.border,
                borderRadius: 8,
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
            onPress={() => void signIn()}
          />
        </View>
      )}
      {status ? <StatusPill label={status} tone="cyan" /> : null}
      <Text selectable style={typography.caption}>
        Passwords are sent only to the VaultPop service for verification and are never saved
        in the app.
      </Text>
    </ScreenShell>
  );
}

function formatRole(role: "player" | "reviewer" | "admin" | null): string {
  return role === "admin" ? "Owner" : role === "reviewer" ? "Test Player" : "Player";
}
