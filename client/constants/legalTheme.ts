import { Platform } from "react-native";

import type { LegalDocumentKey } from "@/types/legal";

/** Premium editorial tokens for legal document presentation. */
export const LegalTheme = {
  background: "#F7F5F0",
  backgroundWarm: "#EFEBE4",
  bodyText: "#3D4540",
  headingText: "#1A2E24",
  accentGreen: "#013220",
  sageLabel: "#7A9070",
  metaText: "#6B7568",
  divider: "rgba(1, 50, 32, 0.1)",
  link: "#013220",
  maxContentWidth: 820,
  contentPaddingMobile: 24,
  contentPaddingDesktop: 48,
  heroBottomGap: 80,
  sectionTopGap: 56,
  sectionBottomGap: 20,
  paragraphGap: 24,
  listItemGap: 12,
  dividerVertical: 48,
} as const;

export const LegalFonts = {
  serif: Platform.select({
    ios: "Georgia",
    android: "serif",
    default: "serif",
    web: "Georgia, 'Times New Roman', Times, serif",
  }) as string,
  sans: "Nunito_400Regular",
  sansMedium: "Nunito_600SemiBold",
  serifLight: Platform.select({
    ios: "Georgia",
    android: "serif",
    default: "serif",
    web: "Georgia, 'Times New Roman', Times, serif",
  }) as string,
};

export function getLegalCategoryLabel(key: LegalDocumentKey): "LEGAL" | "TRANSPARENCY" {
  if (
    key === "privacy_policy" ||
    key === "shipping_policy" ||
    key === "account_deletion_policy" ||
    key === "grievance_policy"
  ) {
    return "TRANSPARENCY";
  }
  return "LEGAL";
}

export function formatLegalLastUpdated(isoLabel: string): string {
  return isoLabel.replace(/^Last Updated:\s*/i, "").trim() || isoLabel;
}
