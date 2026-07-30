import {
  getAdsDiagnostics,
  subscribeToAdsDiagnostics
} from "@/ads/ad-service";
import { getStoreDiagnostics } from "@/monetization/purchase-service";
import { colors, radius, spacing, typography } from "@/theme";
import { useSyncExternalStore } from "react";
import { Text, View } from "react-native";

/**
 * Owner-only diagnostics: ads initialization/consent/ATT state, per-placement
 * banner results, and StoreKit catalog results. Rendered exclusively for the
 * admin role — contains no tokens, receipts, or personal data.
 */
export function OwnerDiagnosticsCard() {
  const ads = useSyncExternalStore(
    subscribeToAdsDiagnostics,
    getAdsDiagnostics,
    getAdsDiagnostics
  );
  const store = getStoreDiagnostics();

  const rows: [string, string][] = [
    ["Ads platform", ads.supported ? (ads.devBuild ? "iOS (dev build — ads off)" : "iOS") : "unsupported (web/Android preview)"],
    ["Ads initialized", ads.initialized ? "YES" : "NO"],
    ["Consent status", ads.consentStatus ?? "not gathered yet"],
    ["Can request ads", ads.canRequestAds === null ? "unknown" : ads.canRequestAds ? "YES" : "NO"],
    ["ATT status", ads.attStatus ?? "not requested yet"],
    ["Last ads error", ads.lastError ?? "none"]
  ];
  const placements = Object.entries(ads.placements);

  return (
    <View
      testID="owner-diagnostics-card"
      style={{
        backgroundColor: colors.surface,
        borderColor: colors.border,
        borderRadius: radius.md,
        borderWidth: 1,
        gap: spacing.xs,
        padding: spacing.md
      }}
    >
      <Text selectable style={[typography.eyebrow, { color: colors.gold }]}>
        OWNER DIAGNOSTICS
      </Text>
      {rows.map(([label, value]) => (
        <Text
          key={label}
          selectable
          style={[typography.caption, { color: colors.textSecondary, fontSize: 11.5 }]}
        >
          {label}: <Text style={{ color: colors.textPrimary }}>{value}</Text>
        </Text>
      ))}
      <Text selectable style={[typography.caption, { color: colors.textMuted, fontSize: 11 }]}>
        Banner placements:{" "}
        {placements.length === 0
          ? "no attempts yet"
          : placements.map(([name, state]) => `${name}=${state}`).join(" · ")}
      </Text>
      <Text selectable style={[typography.eyebrow, { color: colors.cyan, marginTop: spacing.xs }]}>
        STOREKIT
      </Text>
      {store.map((line, index) => (
        <Text
          key={index}
          selectable
          style={[typography.caption, { color: colors.textSecondary, fontSize: 11.5 }]}
        >
          {line}
        </Text>
      ))}
    </View>
  );
}
