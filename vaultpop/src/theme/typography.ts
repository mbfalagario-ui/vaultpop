import { colors } from "@/theme/colors";

export const typography = {
  title: {
    color: colors.textPrimary,
    fontSize: 34,
    fontWeight: "800" as const,
    letterSpacing: 0
  },
  sectionTitle: {
    color: colors.textPrimary,
    fontSize: 22,
    fontWeight: "700" as const,
    letterSpacing: 0
  },
  body: {
    color: colors.textSecondary,
    fontSize: 16,
    lineHeight: 24,
    letterSpacing: 0
  },
  button: {
    color: colors.textPrimary,
    fontSize: 17,
    fontWeight: "700" as const,
    letterSpacing: 0
  },
  caption: {
    color: colors.textSecondary,
    fontSize: 13,
    lineHeight: 18,
    letterSpacing: 0
  },
  eyebrow: {
    color: colors.cyan,
    fontSize: 12,
    fontWeight: "800" as const,
    letterSpacing: 0,
    textTransform: "uppercase" as const
  }
} as const;
