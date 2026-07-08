import { ScreenShell } from "@/components/screen-shell";
import { updateSettings } from "@/storage";
import { useSaveProfile } from "@/storage/use-save-profile";
import { colors, radius, spacing, typography } from "@/theme";
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

export function GameplaySettingsScreen() {
  const [profile, setProfile] = useSaveProfile();

  return (
    <ScreenShell
      eyebrow="FEEL OF THE GAME"
      title="Gameplay Settings"
      lead="Sound, touch, and motion — tuned your way."
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
          detail="Removes larger movement, keeps color and score feedback."
          value={profile.settings.reducedMotion}
          last
          onValueChange={(value) =>
            setProfile((currentProfile) => updateSettings(currentProfile, { reducedMotion: value }))
          }
        />
      </View>
      <Text
        selectable
        style={[typography.caption, { color: colors.textMuted, fontSize: 11.5, textAlign: "center" }]}
      >
        Reduced Motion keeps pops satisfying with glow, color pulses, and score
        feedback while removing board-wide movement.
      </Text>
    </ScreenShell>
  );
}
