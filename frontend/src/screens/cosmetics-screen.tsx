import { AdBanner } from "@/components/ad-banner";
import { ActionButton } from "@/components/action-button";
import { CoinFace } from "@/components/coin-face";
import { ScreenShell } from "@/components/screen-shell";
import { unlockTheme } from "@/storage";
import { useSaveProfile } from "@/storage/use-save-profile";
import { colors, radius, spacing, typography, visualThemes } from "@/theme";
import { hasPremiumThemeAccess } from "@/monetization/entitlements";
import { LinearGradient } from "expo-linear-gradient";
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
              testID={`cosmetic-theme-${theme.id}`}
              style={{
                alignItems: "center",
                backgroundColor: colors.surfaceGlass,
                borderColor: active ? `${theme.accent}88` : colors.border,
                borderCurve: "continuous",
                borderRadius: radius.lg,
                borderWidth: 1,
                boxShadow: active ? `0 0 22px ${theme.accent}22` : undefined,
                flexDirection: "row",
                gap: spacing.md,
                overflow: "hidden",
                padding: spacing.md
              }}
            >
              <LinearGradient
                colors={[theme.glow, "#00000000"]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={{ bottom: 0, left: 0, pointerEvents: "none", position: "absolute", top: 0, width: 120 }}
              />
              <View
                style={{
                  alignItems: "center",
                  backgroundColor: theme.glow,
                  borderColor: `${theme.accent}66`,
                  borderRadius: radius.pill,
                  borderWidth: 1.5,
                  height: 58,
                  justifyContent: "center",
                  width: 58
                }}
              >
                <CoinFace type="violet" size={38} />
              </View>
              <View style={{ flex: 1, gap: 2 }}>
                <Text selectable style={[typography.button, { fontSize: 15 }]}>
                  {theme.title}
                </Text>
                <Text selectable style={[typography.caption, { fontSize: 11.5 }]}>
                  {theme.description}
                </Text>
              </View>
              <View style={{ minWidth: 92 }}>
                <ActionButton
                  label={active ? "Active" : unlocked ? "Use" : `${theme.cost} pts`}
                  disabled={active || (!unlocked && !canUnlock)}
                  tone={active ? "quiet" : "primary"}
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
