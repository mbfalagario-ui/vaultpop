import { ActionButton } from "@/components/action-button";
import { ArcadeGlyph } from "@/components/arcade-glyph";
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
      eyebrow={`${profile.cosmetics.fictionalPoints} STYLE POINTS`}
      title="Arcade Styles"
      lead="Tune the glow without changing the game."
      accent={colors.violet}
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
                alignItems: "center",
                backgroundColor: `${theme.accent}0E`,
                borderColor: active ? theme.accent : colors.border,
                borderRadius: 12,
                borderWidth: 1,
                flexDirection: "row",
                gap: spacing.sm,
                padding: spacing.md
              }}
            >
              <View
                style={{
                  alignItems: "center",
                  backgroundColor: theme.glow,
                  borderColor: theme.accent,
                  borderRadius: 999,
                  borderWidth: 2,
                  height: 58,
                  justifyContent: "center",
                  width: 58
                }}
              >
                <ArcadeGlyph color={theme.accent} modeId="classic" size={28} type="violet" />
              </View>
              <View style={{ flex: 1, gap: spacing.xs }}>
                <Text selectable style={typography.button}>
                  {theme.title}
                </Text>
                <Text selectable style={typography.caption}>
                  {theme.description}
                </Text>
              </View>
              <View style={{ minWidth: 92 }}>
                <ActionButton
                  label={active ? "Active" : unlocked ? "Use" : `${theme.cost} pts`}
                  disabled={active || (!unlocked && !canUnlock)}
                  accent={theme.accent}
                  onPress={() =>
                    setProfile((currentProfile) =>
                      unlockTheme(currentProfile, theme.id, theme.cost)
                    )
                  }
                />
              </View>
            </View>
          );
        })}
      </View>
      <AdBanner placement="cosmetics" />
    </ScreenShell>
  );
}
import { AdBanner } from "@/components/ad-banner";
