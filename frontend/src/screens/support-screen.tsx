import { AdBanner } from "@/components/ad-banner";
import { ActionButton } from "@/components/action-button";
import { ActionLink } from "@/components/action-link";
import { ScreenShell } from "@/components/screen-shell";
import { StatusPill } from "@/components/status-pill";
import { hasPrioritySupport } from "@/monetization/entitlements";
import { useSaveProfile } from "@/storage/use-save-profile";
import {
  SUPPORT_CATEGORIES,
  validateSupportTicket,
  type SupportCategory,
  type SupportTicketInput
} from "@/support/support-model";
import { submitSupportTicket } from "@/support/support-service";
import { colors, spacing, typography } from "@/theme";
import * as Application from "expo-application";
import * as Device from "expo-device";
import { useLocalSearchParams } from "expo-router";
import { useState } from "react";
import { Linking, Pressable, Text, TextInput, View } from "react-native";

export function SupportScreen() {
  const params = useLocalSearchParams<{ from?: string }>();
  const [profile] = useSaveProfile();
  const [category, setCategory] = useState<SupportCategory>("Gameplay issue");
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [status, setStatus] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const validation = validateSupportTicket({ message, email });
  const priority = hasPrioritySupport(profile);

  const submit = async () => {
    if (!validation.valid) {
      setStatus(validation.messageError ?? validation.emailError ?? "Review the form.");
      return;
    }
    setSubmitting(true);
    const ticket: SupportTicketInput = {
      category,
      message: message.trim(),
      email: email.trim() || undefined,
      installId: profile.support.installId,
      appVersion: Application.nativeApplicationVersion ?? "1.0.0",
      buildNumber: Application.nativeBuildVersion ?? "1",
      deviceInfo: `${Device.manufacturer ?? "Apple"} ${Device.modelName ?? "iPhone"}`,
      priority,
      escalated: params.from === "assistant"
    };
    const result = await submitSupportTicket(ticket);
    if (result.delivered) {
      setStatus(`Ticket ${result.ticketId} submitted${priority ? " with Premium Support routing" : ""}.`);
      setMessage("");
      setSubmitting(false);
      return;
    }
    const body = [
      `Category: ${ticket.category}`,
      `Install ID: ${ticket.installId}`,
      `App: ${ticket.appVersion} (${ticket.buildNumber})`,
      `Device: ${ticket.deviceInfo}`,
      `Priority routing: ${ticket.priority ? "Yes" : "No"}`,
      "",
      ticket.message
    ].join("\n");
    setStatus("Opening email fallback.");
    setSubmitting(false);
    await Linking.openURL(
      `mailto:support@vaultpop.app?subject=${encodeURIComponent(`VaultPop: ${category}`)}&body=${encodeURIComponent(body)}`
    );
  };

  return (
    <ScreenShell
      eyebrow="WE'RE HERE"
      title="Support"
      lead="Tell us what happened and we’ll help."
      accent={colors.emerald}
    >
      <Text selectable style={[typography.button, { color: colors.emerald }]}>
        support@vaultpop.app
      </Text>
      <View style={{ flexDirection: "row", gap: spacing.sm }}>
        <View style={{ flex: 1 }}>
          <ActionLink href="/faq" label="Browse FAQ" accent={colors.violet} testID="support-faq-link" />
        </View>
        <View style={{ flex: 1 }}>
          <ActionLink
            href="/assistant"
            label="Support Assistant"
            accent={colors.cyan}
            testID="support-assistant-link"
          />
        </View>
      </View>
      {priority ? <StatusPill label="Premium Support · VaultPass routing" tone="gold" /> : null}
      <View style={{ gap: spacing.sm }}>
        <Text selectable style={typography.sectionTitle}>
          Category
        </Text>
        <View style={{ flexDirection: "row", flexWrap: "wrap", gap: spacing.xs }}>
          {SUPPORT_CATEGORIES.map((item) => (
            <Pressable
              key={item}
              accessibilityLabel={`Support category: ${item}`}
              accessibilityRole="button"
              accessibilityState={{ selected: category === item }}
              onPress={() => setCategory(item)}
              style={{
                backgroundColor: category === item ? colors.goldMuted : colors.surfaceRaised,
                borderColor: category === item ? colors.gold : colors.border,
                borderRadius: 8,
                borderWidth: 1,
                paddingHorizontal: spacing.sm,
                paddingVertical: spacing.sm
              }}
            >
              <Text selectable style={typography.caption}>
                {item}
              </Text>
            </Pressable>
          ))}
        </View>
      </View>
      <View style={{ gap: spacing.xs }}>
        <Text selectable style={typography.sectionTitle}>
          Message
        </Text>
        <TextInput
          accessibilityLabel="Support message"
          multiline
          maxLength={2_000}
          onChangeText={setMessage}
          placeholder="Tell us what happened."
          placeholderTextColor={colors.textSecondary}
          style={{
            backgroundColor: colors.surfaceRaised,
            borderColor: validation.messageError ? colors.ruby : colors.border,
            borderRadius: 8,
            borderWidth: 1,
            color: colors.textPrimary,
            minHeight: 140,
            padding: spacing.md,
            textAlignVertical: "top"
          }}
          value={message}
        />
        {validation.messageError ? (
          <Text selectable style={typography.caption}>
            {validation.messageError}
          </Text>
        ) : null}
      </View>
      <View style={{ gap: spacing.xs }}>
        <Text selectable style={typography.sectionTitle}>
          Email (Optional)
        </Text>
        <TextInput
          accessibilityLabel="Optional support email"
          autoCapitalize="none"
          autoCorrect={false}
          keyboardType="email-address"
          onChangeText={setEmail}
          placeholder="you@example.com"
          placeholderTextColor={colors.textSecondary}
          style={{
            backgroundColor: colors.surfaceRaised,
            borderColor: validation.emailError ? colors.ruby : colors.border,
            borderRadius: 8,
            borderWidth: 1,
            color: colors.textPrimary,
            padding: spacing.md
          }}
          value={email}
        />
        {validation.emailError ? (
          <Text selectable style={typography.caption}>
            {validation.emailError}
          </Text>
        ) : null}
      </View>
      {status ? <StatusPill label={status} tone="cyan" /> : null}
      <ActionButton
        label="Submit Support Request"
        detail="Uses secure ticket delivery when available, otherwise opens email."
        disabled={submitting}
        accent={colors.emerald}
        onPress={() => void submit()}
      />
      <AdBanner placement="support" />
    </ScreenShell>
  );
}
