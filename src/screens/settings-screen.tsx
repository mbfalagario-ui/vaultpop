import { ActionButton } from "@/components/action-button";
import { ScreenShell } from "@/components/screen-shell";
import { applyVerifiedPurchase } from "@/monetization/economy";
import {
  createStoreSession,
  verifyPurchaseWithServer
} from "@/monetization/purchase-service";
import { resetLocalProgress, updateSettings } from "@/storage";
import { useSaveProfile } from "@/storage/use-save-profile";
import { colors, spacing, typography } from "@/theme";
import { useState } from "react";
import { Switch, Text, View } from "react-native";

type SettingRowProps = {
  label: string;
  value: boolean;
  onValueChange: (value: boolean) => void;
};

function SettingRow({ label, value, onValueChange }: SettingRowProps) {
  return (
    <View
      style={{
        alignItems: "center",
        backgroundColor: colors.surfaceRaised,
        borderColor: colors.border,
        borderRadius: 8,
        borderWidth: 1,
        flexDirection: "row",
        justifyContent: "space-between",
        padding: spacing.md
      }}
    >
      <Text selectable style={typography.button}>
        {label}
      </Text>
      <Switch
        value={value}
        onValueChange={onValueChange}
        trackColor={{ false: colors.border, true: colors.emerald }}
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
    <ScreenShell title="Settings" lead="All preferences use local save only.">
      <View style={{ gap: spacing.sm }}>
        <SettingRow
          label="Sound"
          value={profile.settings.soundEnabled}
          onValueChange={(value) =>
            setProfile((currentProfile) => updateSettings(currentProfile, { soundEnabled: value }))
          }
        />
        <SettingRow
          label="Haptics"
          value={profile.settings.hapticsEnabled}
          onValueChange={(value) =>
            setProfile((currentProfile) => updateSettings(currentProfile, { hapticsEnabled: value }))
          }
        />
        <SettingRow
          label="Reduced Motion"
          value={profile.settings.reducedMotion}
          onValueChange={(value) =>
            setProfile((currentProfile) => updateSettings(currentProfile, { reducedMotion: value }))
          }
        />
      </View>
      <View style={{ gap: spacing.sm }}>
        <ActionButton
          label="Restore Purchases"
          detail="Restores Ad-Free Upgrade and active VaultPass access."
          disabled={restoring}
          onPress={() => void restorePurchases()}
        />
        {restoreStatus ? (
          <Text selectable style={typography.caption}>
            {restoreStatus}
          </Text>
        ) : null}
      </View>
      <View style={{ gap: spacing.sm }}>
        <ActionButton
          label={confirmReset ? "Confirm Reset" : "Reset Local Progress"}
          detail={
            confirmReset
              ? "This clears scores, settings, daily state, and themes. Purchases remain."
              : "Tap once, then confirm."
          }
          tone="danger"
          onPress={() => {
            if (!confirmReset) {
              setConfirmReset(true);
              return;
            }
            setProfile((current) => resetLocalProgress(current));
            setConfirmReset(false);
          }}
        />
      </View>
    </ScreenShell>
  );
}
