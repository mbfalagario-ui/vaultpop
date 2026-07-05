import { colors } from "@/theme/colors";
import type { FontVariant } from "react-native";

const tabularNums: FontVariant[] = ["tabular-nums"];

export const typography = {
  display: {
    color: colors.textPrimary,
    fontSize: 40,
    fontWeight: "900" as const,
    letterSpacing: -0.8
  },
  title: {
    color: colors.textPrimary,
    fontSize: 30,
    fontWeight: "900" as const,
    letterSpacing: -0.4
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 20,
    fontWeight: "800" as const,
    letterSpacing: -0.2
  },
  body: {
    color: colors.textSecondary,
    fontSize: 15,
    lineHeight: 22,
    letterSpacing: 0
  },
  button: {
    color: colors.textPrimary,
    fontSize: 16,
    fontWeight: "800" as const,
    letterSpacing: 0.2
  },
  caption: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0
  },
  eyebrow: {
    color: colors.cyan,
    fontSize: 11,
    fontWeight: "800" as const,
    letterSpacing: 2.2,
    textTransform: "uppercase" as const
  },
  numeral: {
    color: colors.textPrimary,
    fontSize: 24,
    fontVariant: tabularNums,
    fontWeight: "900" as const,
    letterSpacing: -0.5
  }
} as const;
