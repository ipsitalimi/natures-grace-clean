import { CardTokens, LayoutSpacing } from "@/constants/layout";
import { Shadows } from "@/constants/theme";

export const DASHBOARD_CARD_SHADOW = {
  borderRadius: CardTokens.radius,
  ...Shadows.soft,
};

export const dashboardSpacing = {
  sectionGap: LayoutSpacing.md,
  cardGap: LayoutSpacing.sm,
  contentPadding: LayoutSpacing.md,
} as const;

export function getTimeGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}
