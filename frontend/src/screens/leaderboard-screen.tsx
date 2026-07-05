import { CoinFace } from "@/components/coin-face";
import { ScreenShell } from "@/components/screen-shell";
import type { GameModeId, TileType } from "@/game/models";
import {
  fetchLeaderboard,
  type LeaderboardSnapshot
} from "@/social/leaderboard-service";
import { getPlayerHandle } from "@/social/player-identity";
import { useSaveProfile } from "@/storage/use-save-profile";
import { colors, getModeVisual, radius, spacing, typography } from "@/theme";
import { useEffect, useState } from "react";
import { ActivityIndicator, Pressable, ScrollView, Text, View } from "react-native";

const MODES: { id: GameModeId; label: string; glyph: TileType }[] = [
  { id: "classic", label: "Classic", glyph: "violet" },
  { id: "dailyVault", label: "Daily", glyph: "cyan" },
  { id: "streak", label: "Streak", glyph: "gold" }
];

const MEDALS = [colors.gold, "#C7CBE0", "#D98A5B"];

export function LeaderboardScreen() {
  const [profile] = useSaveProfile();
  const [mode, setMode] = useState<GameModeId>("classic");
  const [snapshot, setSnapshot] = useState<LeaderboardSnapshot | null>(null);
  const [loading, setLoading] = useState(true);
  const handle = getPlayerHandle();

  useEffect(() => {
    let active = true;
    setLoading(true);
    const load = async () => {
      const data = await fetchLeaderboard(mode, 50, profile.support.installId);
      if (active) {
        setSnapshot(data);
        setLoading(false);
      }
    };
    void load();
    const intervalId = setInterval(load, 10_000);
    return () => {
      active = false;
      clearInterval(intervalId);
    };
  }, [mode, profile.support.installId]);

  const visual = getModeVisual(mode);
  const entries = snapshot?.entries ?? [];
  const podium = entries.slice(0, 3);
  const rest = entries.slice(3);

  return (
    <ScreenShell
      eyebrow="GLOBAL RANKS"
      title="Leaderboard"
      lead={`Playing as ${handle}. Updates live as vaults open.`}
      accent={colors.cyan}
      compact
    >
      {/* Mode chips — single horizontal row, never wraps */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0, height: 56 }}
        contentContainerStyle={{ alignItems: "center", gap: spacing.sm, paddingHorizontal: 2 }}
      >
        {MODES.map((item) => {
          const selected = item.id === mode;
          const chipVisual = getModeVisual(item.id);
          return (
            <Pressable
              key={item.id}
              testID={`leaderboard-mode-${item.id}`}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => setMode(item.id)}
              style={{
                alignItems: "center",
                backgroundColor: selected ? chipVisual.accent : colors.surfaceGlass,
                borderColor: selected ? chipVisual.accent : colors.border,
                borderRadius: radius.pill,
                borderWidth: 1,
                flexDirection: "row",
                flexShrink: 0,
                gap: 7,
                height: 36,
                paddingHorizontal: spacing.md
              }}
            >
              <CoinFace type={item.glyph} size={18} />
              <Text
                selectable={false}
                style={{
                  color: selected ? "#0B0919" : colors.textSecondary,
                  fontSize: 13,
                  fontWeight: "800"
                }}
              >
                {item.label}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      {snapshot?.yourRank ? (
        <View
          style={{
            alignItems: "center",
            backgroundColor: `${visual.accent}16`,
            borderColor: `${visual.accent}55`,
            borderRadius: radius.md,
            borderWidth: 1,
            flexDirection: "row",
            justifyContent: "space-between",
            paddingHorizontal: spacing.md,
            paddingVertical: spacing.sm
          }}
        >
          <Text selectable style={[typography.button, { fontSize: 14 }]}>
            Your global rank
          </Text>
          <Text selectable style={[typography.numeral, { color: visual.accent, fontSize: 20 }]}>
            #{snapshot.yourRank}
          </Text>
        </View>
      ) : null}

      {loading && !snapshot ? (
        <View style={{ alignItems: "center", paddingVertical: spacing.xxl }}>
          <ActivityIndicator color={colors.cyan} />
        </View>
      ) : entries.length === 0 ? (
        <View style={{ alignItems: "center", gap: spacing.md, paddingVertical: spacing.xl }}>
          <CoinFace type="gold" size={64} glow />
          <Text selectable style={[typography.sectionTitle, { fontSize: 18 }]}>
            No scores yet
          </Text>
          <Text selectable style={[typography.caption, { textAlign: "center" }]}>
            Finish a round and claim the top of the vault.
          </Text>
        </View>
      ) : (
        <>
          {/* Podium */}
          <View
            style={{
              alignItems: "flex-end",
              flexDirection: "row",
              gap: spacing.sm,
              justifyContent: "center",
              paddingVertical: spacing.sm
            }}
          >
            {[1, 0, 2].map((position) => {
              const entry = podium[position];
              if (!entry) {
                return <View key={position} style={{ flex: 1 }} />;
              }
              const first = position === 0;
              return (
                <View
                  key={position}
                  style={{
                    alignItems: "center",
                    backgroundColor: colors.surfaceGlass,
                    borderColor: entry.you ? visual.accent : colors.border,
                    borderRadius: radius.md,
                    borderWidth: 1,
                    boxShadow: first ? `0 0 22px ${colors.gold}33` : undefined,
                    flex: 1,
                    gap: 5,
                    paddingVertical: first ? spacing.lg : spacing.md
                  }}
                >
                  <CoinFace type={MODES.find((m) => m.id === mode)?.glyph ?? "gold"} size={first ? 44 : 34} glow={first} />
                  <Text
                    selectable={false}
                    numberOfLines={1}
                    style={[typography.caption, { color: colors.textPrimary, fontSize: 11.5, fontWeight: "800" }]}
                  >
                    {entry.handle}
                  </Text>
                  <Text
                    selectable={false}
                    style={[typography.numeral, { color: MEDALS[position], fontSize: first ? 19 : 15 }]}
                  >
                    {entry.score.toLocaleString()}
                  </Text>
                  <Text selectable={false} style={[typography.eyebrow, { color: colors.textMuted, fontSize: 9 }]}>
                    #{position + 1}
                  </Text>
                </View>
              );
            })}
          </View>

          {/* Ranks 4+ */}
          <View
            style={{
              backgroundColor: colors.surfaceGlass,
              borderColor: colors.border,
              borderRadius: radius.lg,
              borderWidth: 1,
              overflow: "hidden"
            }}
          >
            {rest.map((entry, index) => (
              <View
                key={`${entry.handle}-${index}`}
                style={{
                  alignItems: "center",
                  backgroundColor: entry.you ? `${visual.accent}14` : "transparent",
                  borderBottomColor: index === rest.length - 1 ? "transparent" : colors.border,
                  borderBottomWidth: 1,
                  flexDirection: "row",
                  gap: spacing.md,
                  minHeight: 50,
                  paddingHorizontal: spacing.md
                }}
              >
                <Text
                  selectable={false}
                  style={[typography.numeral, { color: colors.textMuted, fontSize: 14, width: 34 }]}
                >
                  #{index + 4}
                </Text>
                <Text
                  selectable={false}
                  numberOfLines={1}
                  style={[typography.button, { flex: 1, fontSize: 14 }]}
                >
                  {entry.handle}
                </Text>
                {entry.you ? (
                  <View
                    style={{
                      backgroundColor: visual.accent,
                      borderRadius: radius.pill,
                      paddingHorizontal: spacing.sm,
                      paddingVertical: 2
                    }}
                  >
                    <Text selectable={false} style={{ color: "#0B0919", fontSize: 10, fontWeight: "900" }}>
                      YOU
                    </Text>
                  </View>
                ) : null}
                <Text
                  selectable={false}
                  style={[typography.numeral, { color: visual.energy, fontSize: 15 }]}
                >
                  {entry.score.toLocaleString()}
                </Text>
              </View>
            ))}
            {rest.length === 0 ? (
              <View style={{ alignItems: "center", paddingVertical: spacing.md }}>
                <Text selectable style={[typography.caption, { color: colors.textMuted }]}>
                  {snapshot?.players ?? 0} player{(snapshot?.players ?? 0) === 1 ? "" : "s"} on the board.
                </Text>
              </View>
            ) : null}
          </View>
        </>
      )}
    </ScreenShell>
  );
}
