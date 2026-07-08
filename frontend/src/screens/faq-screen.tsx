import { ActionLink } from "@/components/action-link";
import { ScreenShell } from "@/components/screen-shell";
import { FAQ_CATEGORIES, FAQ_ENTRIES, type FaqCategory } from "@/support/faq-data";
import { colors, radius, spacing, typography } from "@/theme";
import { useState } from "react";
import { Pressable, ScrollView, Text, View } from "react-native";

export function FaqScreen() {
  const [category, setCategory] = useState<FaqCategory | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const entries = category
    ? FAQ_ENTRIES.filter((entry) => entry.category === category)
    : FAQ_ENTRIES;

  return (
    <ScreenShell
      eyebrow="ANSWERS FAST"
      title="FAQ"
      lead="Gameplay, purchases, accounts, and more."
      accent={colors.violet}
    >
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={{ flexGrow: 0 }}
        contentContainerStyle={{ gap: spacing.xs, paddingVertical: 2 }}
      >
        {[null, ...FAQ_CATEGORIES].map((item) => {
          const selected = item === category;
          return (
            <Pressable
              key={item ?? "all"}
              testID={`faq-category-${(item ?? "all").toLowerCase().replace(/[^a-z]+/g, "-")}`}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => setCategory(item)}
              style={{
                backgroundColor: selected ? colors.violet : colors.surfaceGlass,
                borderColor: selected ? colors.violet : colors.border,
                borderRadius: radius.pill,
                borderWidth: 1,
                paddingHorizontal: spacing.md,
                paddingVertical: 7
              }}
            >
              <Text
                selectable={false}
                style={{
                  color: selected ? "#0B0919" : colors.textSecondary,
                  fontSize: 12.5,
                  fontWeight: "800"
                }}
              >
                {item ?? "All"}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <View style={{ gap: spacing.xs }}>
        {entries.map((entry) => {
          const open = openId === entry.id;
          return (
            <Pressable
              key={entry.id}
              testID={`faq-item-${entry.id}`}
              accessibilityRole="button"
              accessibilityState={{ expanded: open }}
              onPress={() => setOpenId(open ? null : entry.id)}
              style={{
                backgroundColor: colors.surfaceGlass,
                borderColor: open ? `${colors.violet}66` : colors.border,
                borderCurve: "continuous",
                borderRadius: radius.md,
                borderWidth: 1,
                gap: spacing.xs,
                padding: spacing.md
              }}
            >
              <View style={{ alignItems: "center", flexDirection: "row", gap: spacing.sm }}>
                <Text selectable style={[typography.button, { flex: 1, fontSize: 14.5 }]}>
                  {entry.question}
                </Text>
                <Text selectable={false} style={{ color: colors.violet, fontSize: 16, fontWeight: "900" }}>
                  {open ? "−" : "+"}
                </Text>
              </View>
              {open ? (
                <Text selectable style={[typography.caption, { color: colors.textSecondary, fontSize: 12.5 }]}>
                  {entry.answer}
                </Text>
              ) : null}
            </Pressable>
          );
        })}
      </View>

      <ActionLink
        href="/assistant"
        label="Ask the Support Assistant"
        detail="Search answers instantly, escalate to a human anytime."
        accent={colors.cyan}
        testID="faq-assistant-link"
      />
      <ActionLink
        href="/support"
        label="Contact Support"
        detail="support@vaultpop.app"
        accent={colors.emerald}
        testID="faq-support-link"
      />
    </ScreenShell>
  );
}
