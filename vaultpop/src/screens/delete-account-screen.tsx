import {
  clearAccountSession,
  deleteAccountPermanently,
  isAccountSignedIn,
  SessionExpiredError
} from "@/account/account-service";
import { ActionButton } from "@/components/action-button";
import { ActionLink } from "@/components/action-link";
import { ScreenShell } from "@/components/screen-shell";
import { StatusPill } from "@/components/status-pill";
import { hasActiveVaultPass } from "@/monetization/entitlements";
import { createDefaultSaveProfile } from "@/storage/save-model";
import { useSaveProfile } from "@/storage/use-save-profile";
import { colors, radius, spacing, typography } from "@/theme";
import { useRouter } from "expo-router";
import { useState } from "react";
import { Linking, Text, TextInput, View } from "react-native";

const APPLE_SUBSCRIPTIONS_URL = "https://apps.apple.com/account/subscriptions";

const REMOVAL_ITEMS = [
  "Your email address and sign-in access",
  "All active sessions on every device",
  "Synced inventory and virtual items (Vault Coins, boosters)",
  "Your leaderboard handle and scores",
  "Your support tickets and any pending password-reset requests",
  "Local progress, settings, and saved data on this device"
];

export function DeleteAccountScreen() {
  const router = useRouter();
  const [profile, setProfile] = useSaveProfile();
  const [password, setPassword] = useState("");
  const [confirmText, setConfirmText] = useState("");
  const [status, setStatus] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const signedIn = isAccountSignedIn(profile);
  const vaultPassActive = hasActiveVaultPass(profile);
  const canDelete = password.length > 0 && confirmText.trim() === "DELETE" && !busy;

  const confirmDeletion = async () => {
    const token = profile.account.sessionToken;
    if (!token) {
      setStatus("Sign in again to delete your account.");
      return;
    }
    setBusy(true);
    setStatus("Deleting your account...");
    try {
      await deleteAccountPermanently(token, password);
      // Full local wipe: account, session, progress, inventory, entitlement
      // cache, and install ID are all replaced with a fresh signed-out state.
      setProfile(() => createDefaultSaveProfile());
      setDone(true);
    } catch (error) {
      if (error instanceof SessionExpiredError) {
        setProfile((current) => clearAccountSession(current));
        setStatus(error.message);
      } else {
        setStatus(
          error instanceof Error
            ? error.message
            : "Account deletion failed. Please try again."
        );
      }
    } finally {
      setBusy(false);
    }
  };

  if (done) {
    return (
      <ScreenShell
        eyebrow="ACCOUNT DELETED"
        title="All Done"
        lead="Your account has been permanently deleted."
        accent={colors.emerald}
      >
        <View style={cardStyle}>
          <Text selectable style={typography.body}>
            Your VaultPop account, synced data, and leaderboard identity have
            been removed, and this device has been reset to a fresh signed-out
            state. You can keep playing offline anytime.
          </Text>
          <Text selectable style={[typography.caption, { color: colors.textMuted }]}>
            Reminder: if you had an Apple subscription, it is managed by Apple
            and must be cancelled separately in your Apple account settings.
          </Text>
        </View>
        <ActionButton
          label="Done"
          detail="Returns to the home screen."
          accent={colors.emerald}
          testID="delete-account-done-button"
          onPress={() => router.replace("/")}
        />
      </ScreenShell>
    );
  }

  if (!signedIn) {
    return (
      <ScreenShell
        eyebrow="PERMANENT ACTION"
        title="Delete Account"
        lead="Sign in first to delete your account."
        accent={colors.ruby}
      >
        <View style={cardStyle}>
          <Text selectable style={typography.body}>
            You are not signed in on this device. Account deletion requires an
            active sign-in so we can verify it is really you.
          </Text>
        </View>
        <ActionLink
          href="/account"
          label="Go to Account"
          detail="Sign in, then return here to delete your account."
          accent={colors.cyan}
        />
      </ScreenShell>
    );
  }

  return (
    <ScreenShell
      eyebrow="PERMANENT ACTION"
      title="Delete Account"
      lead="This permanently deletes your VaultPop account. It cannot be undone."
      accent={colors.ruby}
    >
      <View style={cardStyle}>
        <Text selectable style={[typography.sectionTitle, { color: colors.ruby, fontSize: 15 }]}>
          What will be removed
        </Text>
        {REMOVAL_ITEMS.map((item) => (
          <Text selectable key={item} style={typography.body}>
            {"\u2022"} {item}
          </Text>
        ))}
        <Text selectable style={[typography.caption, { color: colors.textMuted }]}>
          De-identified purchase and reward-verification records are retained
          for fraud prevention and financial record-keeping, detached from
          your identity. Vault Coins and boosters are fictional in-game items
          with no cash value.
        </Text>
      </View>

      <View style={[cardStyle, { borderColor: colors.gold }]}>
        <Text selectable style={[typography.sectionTitle, { color: colors.gold, fontSize: 15 }]}>
          {vaultPassActive ? "You have an active VaultPass Plus subscription" : "Apple subscriptions"}
        </Text>
        <Text selectable style={typography.body}>
          Deleting your VaultPop account does NOT cancel an Apple subscription.
          {vaultPassActive
            ? " Cancel VaultPass Plus in your Apple account settings first, or Apple will keep billing you."
            : " If you ever subscribed, manage it in your Apple account settings."}
        </Text>
        <ActionButton
          label="Manage Apple Subscriptions"
          detail="Opens your Apple subscription settings."
          tone="quiet"
          testID="delete-account-manage-subscriptions"
          onPress={() => {
            void Linking.openURL(APPLE_SUBSCRIPTIONS_URL);
          }}
        />
      </View>

      <View style={{ gap: spacing.xs }}>
        <Text selectable style={[typography.eyebrow, { color: colors.textMuted }]}>
          CONFIRM YOUR PASSWORD
        </Text>
        <TextInput
          accessibilityLabel="Confirm your password to delete your account"
          testID="delete-account-password-input"
          autoCapitalize="none"
          autoComplete="current-password"
          onChangeText={setPassword}
          placeholder="Your account password"
          placeholderTextColor={colors.textMuted}
          secureTextEntry
          style={inputStyle}
          value={password}
        />
      </View>
      <View style={{ gap: spacing.xs }}>
        <Text selectable style={[typography.eyebrow, { color: colors.textMuted }]}>
          TYPE DELETE TO CONFIRM
        </Text>
        <TextInput
          accessibilityLabel="Type DELETE to confirm account deletion"
          testID="delete-account-confirm-input"
          autoCapitalize="characters"
          autoCorrect={false}
          onChangeText={setConfirmText}
          placeholder="DELETE"
          placeholderTextColor={colors.textMuted}
          style={inputStyle}
          value={confirmText}
        />
      </View>
      {status ? <StatusPill label={status} tone="gold" /> : null}
      <ActionButton
        label="Permanently Delete Account"
        detail="Cannot be undone."
        tone="danger"
        disabled={!canDelete}
        testID="delete-account-confirm-button"
        onPress={() => void confirmDeletion()}
      />
      <ActionButton
        label="Cancel"
        detail="Keeps your account exactly as it is."
        tone="quiet"
        testID="delete-account-cancel-button"
        onPress={() => router.back()}
      />
    </ScreenShell>
  );
}

const cardStyle = {
  backgroundColor: colors.surfaceGlass,
  borderColor: colors.border,
  borderCurve: "continuous",
  borderRadius: radius.lg,
  borderWidth: 1,
  gap: spacing.xs,
  padding: spacing.md
} as const;

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
