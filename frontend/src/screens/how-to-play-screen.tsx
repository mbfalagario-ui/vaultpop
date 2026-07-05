import { ActionLink } from "@/components/action-link";
import { ArcadeGlyph } from "@/components/arcade-glyph";
import { ScreenShell } from "@/components/screen-shell";
import { GAME_MODES } from "@/game/constants";
import type { GameModeId, TileType } from "@/game/models";
import { BOOSTER_GUIDE } from "@/monetization/booster-guide";
import { colors, getModeVisual, spacing, typography } from "@/theme";
import { Text, View } from "react-native";

const coreSteps = [
  {
    number: "01",
    title: "Find a matching group",
    description:
      "Look for two or more matching coins connected up, down, left, or right. Diagonal coins do not connect."
  },
  {
    number: "02",
    title: "Tap once to clear",
    description:
      "The whole connected group pops, coins above it fall, and new coins refill the board."
  },
  {
    number: "03",
    title: "Keep the chain alive",
    description:
      "Each successful clear raises your combo. Larger groups and higher combos score more."
  }
] as const;

const modeDetails: Record<GameModeId, string> = {
  classic: "Score as much as possible in 60 seconds. Misses reset the active combo.",
  dailyVault:
    "Play the same deterministic daily vault for everyone on this device and improve today's result.",
  streak:
    "Protect the chain while the timer runs. Three taps that do not clear a group end the round."
};

export function HowToPlayScreen() {
  return (
    <ScreenShell
      eyebrow="FIELD GUIDE"
      title="How to Play"
      lead="Match connected coins, build the combo, and open the vault before time runs out."
      accent={colors.gold}
    >
      <View
        style={{
          alignItems: "center",
          backgroundColor: colors.surfaceGlass,
          borderColor: `${colors.cyan}66`,
          borderRadius: 12,
          borderWidth: 1,
          flexDirection: "row",
          justifyContent: "space-between",
          padding: spacing.md
        }}
      >
        {(["cyan", "cyan", "cyan", "ruby", "gold"] as TileType[]).map(
          (type, index) => {
            const accent =
              type === "cyan" ? colors.cyan : type === "ruby" ? colors.ruby : colors.gold;
            return (
              <View
                key={`${type}-${index}`}
                style={{
                  alignItems: "center",
                  backgroundColor: `${accent}18`,
                  borderColor: accent,
                  borderRadius: 999,
                  borderWidth: index < 3 ? 2 : 1,
                  boxShadow: index < 3 ? `0 0 16px ${accent}55` : undefined,
                  height: index < 3 ? 52 : 44,
                  justifyContent: "center",
                  width: index < 3 ? 52 : 44
                }}
              >
                <ArcadeGlyph color={accent} modeId="classic" size={22} type={type} />
              </View>
            );
          }
        )}
      </View>
      <Text selectable style={[typography.caption, { color: colors.cyan, textAlign: "center" }]}>
        MATCH 2 OR MORE ORTHOGONALLY CONNECTED COINS
      </Text>

      <GuideSectionTitle label="THE CORE LOOP" accent={colors.cyan} />
      <View style={{ gap: spacing.xs }}>
        {coreSteps.map((step, index) => (
          <View
            key={step.number}
            style={{
              alignItems: "flex-start",
              borderBottomColor: index === coreSteps.length - 1 ? "transparent" : colors.border,
              borderBottomWidth: 1,
              flexDirection: "row",
              gap: spacing.md,
              paddingVertical: spacing.md
            }}
          >
            <View
              style={{
                alignItems: "center",
                backgroundColor: `${colors.cyan}16`,
                borderColor: `${colors.cyan}88`,
                borderRadius: 999,
                borderWidth: 1,
                height: 42,
                justifyContent: "center",
                width: 42
              }}
            >
              <Text selectable style={[typography.eyebrow, { color: colors.cyan }]}>
                {step.number}
              </Text>
            </View>
            <View style={{ flex: 1, gap: spacing.xs }}>
              <Text selectable style={[typography.sectionTitle, { fontSize: 18 }]}>
                {step.title}
              </Text>
              <Text selectable style={[typography.caption, { color: colors.textSecondary }]}>
                {step.description}
              </Text>
            </View>
          </View>
        ))}
      </View>

      <GuideSectionTitle label="COMBO AND VAULT" accent={colors.violet} />
      <View style={{ gap: spacing.sm }}>
        <SystemRow
          accent={colors.violet}
          label="Combo"
          value="1x to 12x"
          description="Every valid clear raises the multiplier by 1x. A miss resets it to 1x."
        />
        <SystemRow
          accent={colors.gold}
          label="Vault Meter"
          value="Fill to 100"
          description="Groups and combos add charge. A full meter scores 750 x your combo and refreshes the board."
        />
      </View>

      <GuideSectionTitle label="CHOOSE YOUR VAULT" accent={colors.ruby} />
      <View style={{ gap: spacing.sm }}>
        {GAME_MODES.map((mode, index) => {
          const visual = getModeVisual(mode.id);
          const glyph = (["violet", "cyan", "gold"] as TileType[])[index] ?? "gold";
          return (
            <View
              key={mode.id}
              style={{
                backgroundColor: visual.surface,
                borderColor: `${visual.accent}77`,
                borderRadius: 10,
                borderWidth: 1,
                flexDirection: "row",
                gap: spacing.md,
                padding: spacing.md
              }}
            >
              <View
                style={{
                  alignItems: "center",
                  backgroundColor: `${visual.accent}18`,
                  borderRadius: 999,
                  height: 48,
                  justifyContent: "center",
                  width: 48
                }}
              >
                <ArcadeGlyph
                  color={visual.accent}
                  modeId={mode.id}
                  size={24}
                  type={glyph}
                />
              </View>
              <View style={{ flex: 1, gap: 3 }}>
                <Text selectable style={[typography.eyebrow, { color: visual.accent }]}>
                  {visual.name}
                </Text>
                <Text selectable style={[typography.sectionTitle, { fontSize: 18 }]}>
                  {mode.title}
                </Text>
                <Text selectable style={[typography.caption, { color: colors.textSecondary }]}>
                  {modeDetails[mode.id]}
                </Text>
              </View>
            </View>
          );
        })}
      </View>

      <GuideSectionTitle label="BOOSTERS" accent={colors.emerald} />
      <View style={{ gap: spacing.sm }}>
        {BOOSTER_GUIDE.map((booster, index) => {
          const accent = [colors.cyan, colors.violet, colors.gold][index]!;
          const glyph = (["cyan", "violet", "gold"] as TileType[])[index] ?? "gold";
          return (
            <View
              key={booster.id}
              style={{
                alignItems: "center",
                borderBottomColor:
                  index === BOOSTER_GUIDE.length - 1 ? "transparent" : colors.border,
                borderBottomWidth: 1,
                flexDirection: "row",
                gap: spacing.md,
                paddingVertical: spacing.md
              }}
            >
              <ArcadeGlyph color={accent} modeId="classic" size={28} type={glyph} />
              <View style={{ flex: 1, gap: 2 }}>
                <Text selectable style={[typography.sectionTitle, { fontSize: 17 }]}>
                  {booster.label}
                </Text>
                <Text selectable style={[typography.caption, { color: accent, fontWeight: "800" }]}>
                  {booster.shortEffect}
                </Text>
                <Text selectable style={[typography.caption, { color: colors.textSecondary }]}>
                  {booster.description}
                </Text>
              </View>
            </View>
          );
        })}
      </View>

      <ActionLink
        href="/modes"
        label="Choose a Mode"
        detail="Start with Classic, Daily Vault, or Streak."
        accent={colors.gold}
        prominent
      />
    </ScreenShell>
  );
}

function GuideSectionTitle({ label, accent }: { label: string; accent: string }) {
  return (
    <View style={{ alignItems: "center", flexDirection: "row", gap: spacing.sm }}>
      <View style={{ backgroundColor: accent, height: 2, width: 24 }} />
      <Text selectable style={[typography.eyebrow, { color: accent }]}>
        {label}
      </Text>
    </View>
  );
}

function SystemRow({
  accent,
  label,
  value,
  description
}: {
  accent: string;
  label: string;
  value: string;
  description: string;
}) {
  return (
    <View
      style={{
        backgroundColor: `${accent}0D`,
        borderLeftColor: accent,
        borderLeftWidth: 3,
        gap: spacing.xs,
        padding: spacing.md
      }}
    >
      <View style={{ alignItems: "center", flexDirection: "row", justifyContent: "space-between" }}>
        <Text selectable style={[typography.sectionTitle, { fontSize: 18 }]}>
          {label}
        </Text>
        <Text selectable style={[typography.eyebrow, { color: accent }]}>
          {value}
        </Text>
      </View>
      <Text selectable style={[typography.caption, { color: colors.textSecondary }]}>
        {description}
      </Text>
    </View>
  );
}
