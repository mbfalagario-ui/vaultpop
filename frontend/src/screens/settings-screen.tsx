import { ActionButton } from "@/components/action-button";
import { ActionLink } from "@/components/action-link";
import { ScreenShell } from "@/components/screen-shell";
import { applyVerifiedPurchase } from "@/monetization/economy";
import {
  createStoreSession,
  verifyPurchaseWithServer
} from "@/monetization/purchase-service";
import { resetLocalProgress, updateSettings } from "@/storage";
import { useSaveProfile } from "@/storage/use-save-profile";
import { colors, radius, spacing, typography } from "@/theme";
import { useState } from "react";
import { Switch, Text, View } from "react-native";

type SettingRowProps = {
  label: string;
  detail: string;
  value: boolean;
  last?: boolean;
  onValueChange: (value: boolean) => void;
};

function SettingRow({ label, detail, value, last = false, onValueChange }: SettingRowProps) {
  return (
    <View
      style={{
        alignItems: "center",
        borderBottomColor: last ? "transparent" : colors.border,
        borderBottomWidth: 1,
        flexDirection: "row",
        gap: spacing.md,
        justifyContent: "space-between",
        minHeight: 62,
        paddingHorizontal: spacing.md
      }}
    >
      <View style={{ flex: 1, gap: 1 }}>
        <Text selectable style={[typography.button, { fontSize: 15 }]}>
          {label}
        </Text>
        <Text selectable style={[typography.caption, { color: colors.textMuted, fontSize: 11.5 }]}>
          {detail}
        </Text>
      </View>
      <Switch
        testID={`settings-${label.toLowerCase().replace(/\s+/g, "-")}-switch`}
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.border, true: colors.emeraldDeep }}
        thumbColor={colors.textPrimary}
        ios_backgroundColor={colors.border}
      />
    </View>
  );
}

export function SettingsScreen() {
  const [profile, setProfile] = useSaveProfile();
  const [confirmReset, setConfirmReset] = useState(false);
  const [restoreStatus, setRestoreStatus] = useState("");
  const [restoring, setRestoring] = useState(false);

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
      lead="Sound, feel, and account access."
      accent={colors.violet}
    >
      <View
        style={{
          backgroundColor: colors.surfaceGlass,
          borderColor: colors.border,
          borderCurve: "continuous",
          borderRadius: radius.lg,
          borderWidth: 1,
          overflow: "hidden"
        }}
      >
        <SettingRow
          label="Sound"
          detail="Round and coin-pop audio."
          value={profile.settings.soundEnabled}
          onValueChange={(value) =>
            setProfile((currentProfile) => updateSettings(currentProfile, { soundEnabled: value }))
          }
        />
        <SettingRow
          label="Haptics"
          detail="Tactile feedback on clears."
          value={profile.settings.hapticsEnabled}
          onValueChange={(value) =>
            setProfile((currentProfile) => updateSettings(currentProfile, { hapticsEnabled: value }))
          }
        />
        <SettingRow
          label="Reduced Motion"
          detail="Minimizes animation effects."
          value={profile.settings.reducedMotion}
          last
          onValueChange={(value) =>
            setProfile((currentProfile) => updateSettings(currentProfile, { reducedMotion: value }))
          }
        />
      </View>
      <View style={{ gap: spacing.sm }}>
        <ActionLink
          href="/account"
          label="Account"
          detail="Optional inventory and support sync."
          accent={colors.cyan}
          testID="settings-account-link"
        />
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
