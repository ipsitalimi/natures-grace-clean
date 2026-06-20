import { View, type ViewProps } from "react-native";

import { useTheme } from "@/hooks/useTheme";

export type ThemedViewProps = ViewProps & {
  backgroundColor?: string;
};

export function ThemedView({
  style,
  backgroundColor,
  ...otherProps
}: ThemedViewProps) {
  const { theme } = useTheme();

  return (
    <View
      style={[{ backgroundColor: backgroundColor ?? theme.backgroundRoot }, style]}
      {...otherProps}
    />
  );
}
