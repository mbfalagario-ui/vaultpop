import { ActionLink } from "@/components/action-link";
import { ScreenShell } from "@/components/screen-shell";
import {
  FAQ_CATEGORIES,
  searchFaq,
  type FaqCategory
} from "@/support/faq-data";
import { colors, radius, spacing, typography } from "@/theme";
import { useMemo, useState } from "react";
import { Pressable, ScrollView, Text, TextInput, View } from "react-native";

/**
 * Structured VaultPop Support Assistant.
 * FAQ intent matching only — no external AI/LLM service is used, so no player
 * text ever leaves the device from this screen.
 */
export function AssistantScreen() {
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<FaqCategory | null>(null);
  const [openId, setOpenId] = useState<string | null>(null);
  const results = useMemo(() => searchFaq(query, category), [query, category]);
  const searched = query.trim().length > 2;

  return (
    <ScreenShell
      eyebrow="INSTANT HELP"
      title="Support Assistant"
      lead="Describe the issue — I'll suggest answers instantly."
      accent={colors.cyan}
    >
      <TextInput
        accessibilityLabel="Describe your issue"
        testID="assistant-search-input"
        autoCapitalize="none"
        autoCorrect={false}
        onChangeText={setQuery}
        placeholder="e.g. purchase missing, cancel VaultPass, no reward..."
        placeholderTextColor={colors.textMuted}
        style={{
          backgroundColor: "#04030C",
          borderColor: `${colors.cyan}44`,
          borderRadius: radius.md,
          borderWidth: 1,
          color: colors.textPrimary,
          fontSize: 15,
          minHeight: 52,
          paddingHorizontal: spacing.md
        }}
        value={query}
      />

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
              testID={`assistant-category-${(item ?? "all").toLowerCase().replace(/[^a-z]+/g, "-")}`}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              onPress={() => setCategory(item)}
              style={{
                backgroundColor: selected ? colors.cyan : colors.surfaceGlass,
                borderColor: selected ? colors.cyan : colors.border,
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
                {item ?? "All topics"}
              </Text>
            </Pressable>
          );
        })}
      </ScrollView>

      <Text selectable style={[typography.eyebrow, { color: colors.textMuted }]}>
        {searched ? `SUGGESTED ANSWERS (${results.length})` : "BROWSE ANSWERS"}
      </Text>

      {results.length === 0 ? (
        <View
          style={{
            alignItems: "center",
            backgroundColor: colors.surfaceGlass,
            borderColor: colors.border,
            borderRadius: radius.md,
            borderWidth: 1,
            gap: spacing.xs,
            padding: spacing.lg
          }}
        >
          <Text selectable style={[typography.button, { fontSize: 15 }]}>
            No instant answer for that one.
          </Text>
          <Text selectable style={[typography.caption, { textAlign: "center" }]}>
            {"This looks like something a human should handle — send a support request below and we'll follow up."}
          </Text>
        </View>
      ) : (
        <View style={{ gap: spacing.xs }}>
          {results.slice(0, 6).map((entry) => {
            const open = openId === entry.id;
            return (
              <Pressable
                key={entry.id}
                testID={`assistant-answer-${entry.id}`}
                accessibilityRole="button"
                accessibilityState={{ expanded: open }}
                onPress={() => setOpenId(open ? null : entry.id)}
                style={{
                  backgroundColor: colors.surfaceGlass,
                  borderColor: open ? `${colors.cyan}66` : colors.border,
                  borderCurve: "continuous",
                  borderRadius: radius.md,
                  borderWidth: 1,
                  gap: spacing.xs,
                  padding: spacing.md
                }}
              >
                <View style={{ alignItems: "center", flexDirection: "row", gap: spacing.sm }}>
                  <Text
                    selectable={false}
                    style={[typography.eyebrow, { color: colors.cyan, fontSize: 8.5 }]}
                  >
                    {entry.category.toUpperCase()}
                  </Text>
                </View>
                <View style={{ alignItems: "center", flexDirection: "row", gap: spacing.sm }}>
                  <Text selectable style={[typography.button, { flex: 1, fontSize: 14.5 }]}>
                    {entry.question}
                  </Text>
                  <Text selectable={false} style={{ color: colors.cyan, fontSize: 16, fontWeight: "900" }}>
                    {open ? "−" : "+"}
                  </Text>
                </View>
                {open ? (
                  <Text
                    selectable
                    style={[typography.caption, { color: colors.textSecondary, fontSize: 12.5 }]}
                  >
                    {entry.answer}
                  </Text>
                ) : null}
              </Pressable>
            );
          })}
        </View>
      )}

      <View
        style={{
          backgroundColor: `${colors.emerald}0E`,
          borderColor: `${colors.emerald}44`,
          borderRadius: radius.md,
          borderWidth: 1,
          gap: spacing.sm,
          padding: spacing.md
        }}
      >
        <Text selectable style={[typography.button, { color: colors.emerald, fontSize: 14 }]}>
          Still need a human?
        </Text>
        <Text selectable style={[typography.caption, { fontSize: 12 }]}>
          {"Some issues — refunds, account recovery, or bugs — need a real person. Send a support request or email support@vaultpop.app and we'll follow up."}
        </Text>
        <ActionLink
          href="/support?from=assistant"
          label="Submit a Support Request"
          accent={colors.emerald}
          testID="assistant-escalate-link"
        />
      </View>
    </ScreenShell>
  );
}
