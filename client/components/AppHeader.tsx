import React from "react";

import ScreenHeader, { type ScreenHeaderProps } from "@/components/layout/ScreenHeader";

export type AppHeaderProps = ScreenHeaderProps & {
  compact?: boolean;
  showBack?: boolean;
};

/** Thin wrapper — use ScreenHeader or PageLayout in new code. */
export default function AppHeader({
  compact,
  showBack,
  variant,
  ...props
}: AppHeaderProps) {
  const resolvedVariant = variant ?? (compact ? "compact" : showBack ? "back" : "standard");
  return <ScreenHeader variant={resolvedVariant} {...props} />;
}
