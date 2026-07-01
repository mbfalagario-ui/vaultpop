import { ActionButton } from "@/components/action-button";
import { ScreenShell } from "@/components/screen-shell";
import { unlockTheme } from "@/storage";
import { useSaveProfile } from "@/storage/use-save-profile";
import { colors, spacing, typography, visualThemes } from "@/theme";
import { hasPremiumThemeAccess } from "@/monetization/entitlements";
import { Text, View } from "react-native";

export function CosmeticsScreen() {
  const [profile, setProfile] = useSaveProfile();
  const premiumAccess = hasPremiumThemeAccess(profile);

  return (
    <ScreenShell
      title="Cosmetics"
      lead={`Theme progression remains local. Fictional points: ${profile.cosmetics.fictionalPoints}.`}
    >
      <View style={{ gap: spacing.sm }}>
        {visualThemes.map((theme) => {
          const subscriptionTheme = theme.id === "vaultpass-prism";
          const unlocked =
            profile.cosmetics.unlockedThemeIds.includes(theme.id) ||
            (subscriptionTheme && premiumAccess);
          const active =
            profile.cosmetics.activeThemeId === theme.id && unlocked;
          const canUnlock =
            !subscriptionTheme && profile.cosmetics.fictionalPoints >= theme.cost;

          return (
            <View
              key={theme.id}
              style={{
                backgroundColor: theme.glow,
                borderColor: active ? theme.accent : colors.border,
                borderRadius: 8,
                borderWidth: 1,
                gap: spacing.sm,
                padding: spacing.md
              }}
            >
              <Text selectable style={typography.button}>
                {theme.title}
              </Text>
              <Text selectable style={typography.body}>
                {theme.description}
              </Text>
              <ActionButton
                label={active ? "Active" : unlocked ? "Use Theme" : `Unlock for ${theme.cost}`}
                detail={
                  subscriptionTheme
                    ? premiumAccess
                      ? "Available while VaultPass is active."
                      : "Included with active VaultPass."
                    : unlocked
                      ? "Available on this device."
                      : "Uses fictional points only."
                }
                disabled={active || (!unlocked && !canUnlock)}
                onPress={() =>
                  setProfile((currentProfile) => unlockTheme(currentProfile, theme.id, theme.cost))
                }
              />
            </View>
          );
        })}
      </View>
      <AdBanner placement="cosmetics" />
    </ScreenShell>
  );
}
import { AdBanner } from "@/components/ad-banner";
