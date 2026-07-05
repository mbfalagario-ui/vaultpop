import { CoinFace } from "@/components/coin-face";
import { MetricCard } from "@/components/metric-card";
import { ScreenShell } from "@/components/screen-shell";
import { getLocalDateKey } from "@/game/daily-seed";
import { getStreakInfo } from "@/social/streak-tracker";
import { colors, radius, spacing, typography } from "@/theme";
import { useMemo } from "react";
import { Text, View } from "react-native";

const WEEKDAYS = ["S", "M", "T", "W", "T", "F", "S"];

export function StreakScreen() {
  const info = useMemo(() => getStreakInfo(), []);
  const played = useMemo(() => new Set(info.dates), [info.dates]);
  const today = new Date();
  const todayKey = getLocalDateKey(today);
  const monthLabel = today.toLocaleDateString(undefined, {
    month: "long",
    year: "numeric"
  });

  const cells = useMemo(() => {
    const first = new Date(today.getFullYear(), today.getMonth(), 1);
    const daysInMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
    const result: (string | null)[] = Array.from({ length: first.getDay() }, () => null);
    for (let day = 1; day <= daysInMonth; day += 1) {
      result.push(getLocalDateKey(new Date(today.getFullYear(), today.getMonth(), day)));
    }
    return result;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [todayKey]);

  return (
    <ScreenShell
      eyebrow="DAILY STREAK"
      title="Streak Calendar"
      lead="Play at least one round a day to keep the chain alive."
      accent={colors.gold}
      compact
    >
      {/* Flame hero */}
      <View style={{ alignItems: "center", gap: spacing.sm, paddingVertical: spacing.md }}>
        <View
          style={{
            alignItems: "center",
            backgroundColor: colors.surfaceRaised,
            borderColor: info.current > 0 ? colors.gold : colors.border,
            borderRadius: radius.pill,
            borderWidth: 2,
            boxShadow: info.current > 0 ? `0 0 34px ${colors.gold}55` : undefined,
            height: 104,
            justifyContent: "center",
            width: 104
          }}
        >
          <CoinFace type="gold" size={66} glow={info.current > 0} />
        </View>
        <Text
          selectable
          style={[typography.numeral, { color: colors.gold, fontSize: 40 }]}
        >
          {info.current}
        </Text>
        <Text selectable style={[typography.eyebrow, { color: colors.textMuted }]}>
          DAY STREAK{info.playedToday ? " · SECURED TODAY" : " · PLAY TODAY TO KEEP IT"}
        </Text>
      </View>

      <View style={{ flexDirection: "row", gap: spacing.sm }}>
        <MetricCard label="Best Streak" value={info.best} accent={colors.gold} />
        <MetricCard label="Days Played" value={info.dates.length} accent={colors.emerald} />
      </View>

      {/* Calendar */}
      <View
        style={{
          backgroundColor: colors.surfaceGlass,
          borderColor: colors.border,
          borderRadius: radius.lg,
          borderWidth: 1,
          gap: spacing.sm,
          padding: spacing.md
        }}
      >
        <Text selectable style={[typography.eyebrow, { color: colors.cyan }]}>
          {monthLabel.toUpperCase()}
        </Text>
        <View style={{ flexDirection: "row" }}>
          {WEEKDAYS.map((day, index) => (
            <Text
              key={`${day}-${index}`}
              selectable={false}
              style={[
                typography.eyebrow,
                { color: colors.textMuted, flexBasis: "14.28%", fontSize: 9.5, textAlign: "center" }
              ]}
            >
              {day}
            </Text>
          ))}
        </View>
        <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
          {cells.map((key, index) => {
            if (!key) {
              return <View key={`empty-${index}`} style={{ aspectRatio: 1, flexBasis: "14.28%" }} />;
            }
            const isPlayed = played.has(key);
            const isToday = key === todayKey;
            const dayNumber = Number(key.slice(-2));
            return (
              <View
                key={key}
                style={{
                  alignItems: "center",
                  aspectRatio: 1,
                  flexBasis: "14.28%",
                  justifyContent: "center",
                  padding: 3
                }}
              >
                <View
                  style={{
                    alignItems: "center",
                    backgroundColor: isPlayed ? `${colors.gold}22` : "transparent",
                    borderColor: isToday ? colors.cyan : isPlayed ? `${colors.gold}77` : "transparent",
                    borderRadius: radius.pill,
                    borderWidth: 1.5,
                    flex: 1,
                    justifyContent: "center",
                    width: "100%"
                  }}
                >
                  {isPlayed ? (
                    <CoinFace type="gold" size={20} />
                  ) : (
                    <Text
                      selectable={false}
                      style={{ color: colors.textMuted, fontSize: 12, fontWeight: "700" }}
                    >
                      {dayNumber}
                    </Text>
                  )}
                </View>
              </View>
            );
          })}
        </View>
      </View>
      <Text
        selectable
        style={[typography.caption, { color: colors.textMuted, fontSize: 11.5, textAlign: "center" }]}
      >
        Streaks are tracked on this device only.
      </Text>
    </ScreenShell>
  );
}
