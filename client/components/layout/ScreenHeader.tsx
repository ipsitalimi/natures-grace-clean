import React from "react";
import { View, StyleSheet, Pressable, Image, type ViewStyle } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";
import Svg, { Path, Circle } from "react-native-svg";

import { ThemedText } from "@/components/ThemedText";
import { Colors } from "@/constants/theme";
import { HeaderInlineTitleStyle, Layout, LayoutSpacing } from "@/constants/layout";
import { useLayoutInsets } from "@/hooks/useLayoutInsets";
import { useUnreadNotificationCount } from "@/hooks/useUnreadNotificationCount";
import logoImage from "../../../assets/images/natures-grace-logo.png";

const ICON_SIZE = Layout.headerIconSize;

export type ScreenHeaderVariant = "standard" | "compact" | "back" | "title" | "action";

export type ScreenHeaderProps = {
  variant?: ScreenHeaderVariant;
  title?: string;
  showLogo?: boolean;
  showNotifications?: boolean;
  onProfilePress?: () => void;
  onBackPress?: () => void;
  leftAction?: React.ReactNode;
  center?: React.ReactNode;
  rightAction?: React.ReactNode;
  style?: ViewStyle;
  testID?: string;
};

/** Unified header — safe-area top applied exactly once here. */
export default function ScreenHeader({
  variant = "standard",
  title,
  showLogo = variant === "standard",
  showNotifications = true,
  onProfilePress,
  onBackPress,
  leftAction,
  center,
  rightAction,
  style,
  testID = "screen-header",
}: ScreenHeaderProps) {
  const navigation = useNavigation();
  const { headerPaddingTop, headerPaddingTopCompact, gutter } = useLayoutInsets();
  const unreadCount = useUnreadNotificationCount();
  const compact = variant === "compact";
  const paddingTop = compact ? headerPaddingTopCompact : headerPaddingTop;
  const hasInlineTitle = Boolean(title && variant !== "standard");

  const handleBack = onBackPress ?? (() => navigation.goBack());
  const handleNotifications = () => navigation.navigate("Notifications" as never);

  const renderLeft = () => {
    if (leftAction) return leftAction;
    if (variant === "back" || variant === "title" || variant === "action") {
      return (
        <Pressable style={styles.iconButton} onPress={handleBack} testID="button-header-back">
          <Feather name="arrow-left" size={ICON_SIZE} color={Colors.light.accent} />
        </Pressable>
      );
    }
    return (
      <Pressable style={styles.iconButton} onPress={onProfilePress} testID="button-profile">
        <Svg width={ICON_SIZE} height={ICON_SIZE} viewBox="0 0 24 24" fill="none">
          <Circle cx="12" cy="8" r="4" fill={Colors.light.accent} opacity={0.8} />
          <Path
            d="M4 20C4 16 8 14 12 14C16 14 20 16 20 20"
            stroke={Colors.light.accent}
            strokeWidth="1.8"
            strokeLinecap="round"
            fill="none"
          />
        </Svg>
      </Pressable>
    );
  };

  const renderCenter = () => {
    if (center) return center;
    if (hasInlineTitle) {
      return (
        <ThemedText
          style={styles.headerTitle}
          numberOfLines={2}
          adjustsFontSizeToFit
          minimumFontScale={0.75}
          maxFontSizeMultiplier={1.25}
          testID="header-inline-title"
        >
          {title}
        </ThemedText>
      );
    }
    if (showLogo && variant === "standard") {
      return <Image source={logoImage} style={styles.centerLogo} resizeMode="contain" />;
    }
    return <View style={styles.centerSpacer} />;
  };

  const renderRight = () => {
    if (rightAction) return rightAction;
    if (!showNotifications) return <View style={styles.iconPlaceholder} />;
    return (
      <Pressable style={styles.iconButton} onPress={handleNotifications} testID="button-notifications">
        <Feather name="bell" size={ICON_SIZE} color={Colors.light.accent} />
        {unreadCount > 0 ? (
          <View style={styles.badge}>
            <ThemedText style={styles.badgeText}>
              {unreadCount > 9 ? "9+" : String(unreadCount)}
            </ThemedText>
          </View>
        ) : null}
      </Pressable>
    );
  };

  return (
    <View
      style={[
        styles.container,
        {
          paddingTop,
          paddingBottom: hasInlineTitle ? LayoutSpacing.xs : compact ? LayoutSpacing.xs : Layout.headerBottom,
          paddingHorizontal: gutter,
        },
        style,
      ]}
      testID={testID}
    >
      <View style={styles.row}>
        <View style={styles.side}>{renderLeft()}</View>
        <View style={styles.center}>{renderCenter()}</View>
        <View style={[styles.side, styles.sideRight]}>{renderRight()}</View>
      </View>
    </View>
  );
}

export function StandardHeader(props: Omit<ScreenHeaderProps, "variant">) {
  return <ScreenHeader variant="standard" {...props} />;
}

export function CompactHeader(props: Omit<ScreenHeaderProps, "variant">) {
  return <ScreenHeader variant="compact" showLogo={false} {...props} />;
}

export function BackHeader(props: Omit<ScreenHeaderProps, "variant">) {
  return <ScreenHeader variant="back" showLogo={false} {...props} />;
}

export function TitleHeader(props: Omit<ScreenHeaderProps, "variant"> & { title: string }) {
  return <ScreenHeader variant="title" showLogo={false} {...props} />;
}

export function ActionHeader(props: Omit<ScreenHeaderProps, "variant">) {
  return <ScreenHeader variant="action" showLogo={false} {...props} />;
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.light.backgroundRoot,
  },
  row: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    minHeight: Layout.headerRowHeight,
  },
  side: {
    width: Layout.headerSideWidth,
    flexShrink: 0,
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "flex-start",
  },
  sideRight: {
    justifyContent: "flex-end",
  },
  center: {
    flex: 1,
    flexShrink: 1,
    minWidth: 0,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: LayoutSpacing.xs,
    paddingVertical: LayoutSpacing.xs,
  },
  centerLogo: {
    width: 52,
    height: 52,
  },
  centerSpacer: {
    flex: 1,
  },
  iconButton: {
    padding: Layout.headerIconPadding,
    alignItems: "center",
    justifyContent: "center",
    position: "relative",
  },
  badge: {
    position: "absolute",
    top: 2,
    right: 2,
    minWidth: 16,
    height: 16,
    borderRadius: 8,
    backgroundColor: "#C0392B",
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 3,
  },
  badgeText: {
    fontSize: 9,
    fontWeight: "700",
    color: "#FFFFFF",
    lineHeight: 12,
  },
  iconPlaceholder: {
    width: ICON_SIZE + Layout.headerIconPadding * 2,
    height: ICON_SIZE + Layout.headerIconPadding * 2,
  },
  headerTitle: {
    ...HeaderInlineTitleStyle,
    width: "100%",
    flexShrink: 1,
  },
});
