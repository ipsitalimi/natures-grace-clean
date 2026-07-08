import React from "react";
import { type ViewStyle } from "react-native";

import ScreenHeader, { type ScreenHeaderProps } from "@/components/layout/ScreenHeader";

type ScreenHeaderBarProps = Omit<ScreenHeaderProps, "variant"> & {
  showBack?: boolean;
};

/** Thin wrapper — use ScreenHeader or PageLayout in new code. */
export default function ScreenHeaderBar({
  onBackPress,
  showBack,
  onProfilePress,
  center,
  ...rest
}: ScreenHeaderBarProps) {
  const useBack = showBack ?? Boolean(onBackPress);
  const variant = useBack ? "back" : onProfilePress ? "standard" : "action";

  return (
    <ScreenHeader
      variant={variant}
      onBackPress={onBackPress}
      onProfilePress={onProfilePress}
      center={center}
      {...rest}
    />
  );
}
