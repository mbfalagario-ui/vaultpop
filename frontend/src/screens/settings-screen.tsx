import { ActionButton } from "@/components/action-button";
import { ActionLink } from "@/components/action-link";
import { ScreenShell } from "@/components/screen-shell";
import { isAccountSignedIn } from "@/account/account-service";
import { applyVerifiedPurchase } from "@/monetization/economy";
import {
  createStoreSession,
  verifyPurchaseWithServer
} from "@/monetization/purchase-service";
import { resetLocalProgress } from "@/storage";
import { useSaveProfile } from "@/storage/use-save-profile";
import { colors, radius, spacing, typography } from "@/theme";
import { useState } from "react";
import { Text, View } from "react-native";

export function SettingsScreen() {
  const [profile, setProfile] = useSaveProfile();
  const [confirmReset, setConfirmReset] = useState(false);
  const [restoreStatus, setRestoreStatus] = useState("");
  const [restoring, setRestoring] = useState(false);
  const signedIn = isAccountSignedIn(profile);

  const restorePurchases = async () => {
    setRestoring(true);
    setRestoreStatus("Restoring purchases...");
    const session = await createStoreSession({
      onPurchase: () => undefined,
      onError: setRestoreStatus
    }).catch(() => null);
    if (!session) {
      setRestoreStatus("The App Store is unavailable right now.");
      setRestoring(false);
      return;
    }
    try {
      const purchases = await session.restore();
      const restorable = purchases.filter(
        (purchase) =>
          purchase.productId === "app.vaultpop.remove_ads" ||
          purchase.productId === "app.vaultpop.vaultpass.monthly"
      );
      for (const purchase of restorable) {
        const verified = await verifyPurchaseWithServer(
          purchase,
          profile.support.installId
        );
        setProfile((current) => applyVerifiedPurchase(current, verified));
        await session.finish(purchase);
      }
      setRestoreStatus(
        restorable.length > 0
          ? "Restorable purchases are up to date."
          : "No restorable purchases were found."
      );
    } catch {
      setRestoreStatus("Restore Purchases could not finish. Please try again.");
    } finally {
      await session.close();
      setRestoring(false);
    }
  };

  return (
    <ScreenShell
      eyebrow="TUNE THE ARCADE"
      title="Settings"
      lead="Gameplay feel, account, and help."
      accent={colors.violet}
    >
      <ActionLink
        href="/gameplay-settings"
        label="Gameplay Settings"
        detail="Sound, haptics, and motion."
        accent={colors.violet}
        testID="settings-gameplay-link"
      />

      {/* Account */}
      <View style={{ gap: spacing.sm }}>
        <Text selectable style={[typography.eyebrow, { color: colors.textMuted }]}>
          ACCOUNT
        </Text>
        {signedIn ? (
          <>
            <View
              style={{
                backgroundColor: `${colors.cyan}10`,
                borderColor: `${colors.cyan}44`,
                borderCurve: "continuous",
                borderRadius: radius.md,
                borderWidth: 1,
                paddingHorizontal: spacing.md,
                paddingVertical: spacing.sm + 2
              }}
            >
              <Text selectable style={[typography.caption, { color: colors.cyan, fontSize: 12.5 }]}>
                Signed in as {profile.account.email}
              </Text>
            </View>
            <ActionLink
              href="/account"
              label="Account Sync"
              detail="Refresh linked inventory, or sign out."
              accent={colors.cyan}
              testID="settings-account-link"
            />
            {profile.account.role === "admin" ? (
              <ActionLink
                href="/admin-console"
                label="Admin Console"
                detail="Owner tools: support inbox, analytics, user management."
                accent={colors.gold}
                testID="settings-admin-console-button"
              />
            ) : null}
          </>
        ) : (
          <View style={{ flexDirection: "row", gap: spacing.sm }}>
            <View style={{ flex: 1 }}>
              <ActionLink
                href={{ pathname: "/account", params: { mode: "create" } }}
                label="Create Account"
                accent={colors.cyan}
                testID="settings-create-account-link"
              />
            </View>
            <View style={{ flex: 1 }}>
              <ActionLink
                href={{ pathname: "/account", params: { mode: "signin" } }}
                label="Sign In"
                accent={colors.emerald}
                testID="settings-account-link"
              />
            </View>
          </View>
        )}
      </View>

      {/* Help */}
      <View style={{ gap: spacing.sm }}>
        <Text selectable style={[typography.eyebrow, { color: colors.textMuted }]}>
          HELP
        </Text>
        <ActionLink
          href="/faq"
          label="FAQ"
          detail="Gameplay, store, accounts, leaderboards, and more."
          accent={colors.violet}
          testID="settings-faq-link"
        />
        <ActionLink
          href="/assistant"
          label="Support Assistant"
          detail="Search instant answers, escalate anytime."
          accent={colors.cyan}
          testID="settings-assistant-link"
        />
        <ActionLink
          href="/support"
          label="Support"
          detail="Send a request — support@vaultpop.app"
          accent={colors.emerald}
          testID="settings-support-link"
        />
      </View>

      <View style={{ gap: spacing.sm }}>
        <ActionButton
          label="Restore Purchases"
          detail="Restores Ad-Free Upgrade and active VaultPass access."
          disabled={restoring}
          tone="quiet"
          testID="settings-restore-button"
          onPress={() => void restorePurchases()}
        />
        {restoreStatus ? (
          <Text selectable style={[typography.caption, { fontSize: 12 }]}>
            {restoreStatus}
          </Text>
        ) : null}
      </View>
      <ActionButton
        label={confirmReset ? "Confirm Reset" : "Reset Local Progress"}
        detail={
          confirmReset
            ? "This clears scores, settings, daily state, and themes. Purchases remain."
            : "Tap once, then confirm."
        }
        tone="danger"
        testID="settings-reset-button"
        onPress={() => {
          if (!confirmReset) {
            setConfirmReset(true);
            return;
          }
          setProfile((current) => resetLocalProgress(current));
          setConfirmReset(false);
        }}
      />
    </ScreenShell>
  );
}
