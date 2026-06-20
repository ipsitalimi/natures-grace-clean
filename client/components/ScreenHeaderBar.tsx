import React from "react";
import { View, StyleSheet, Pressable, ViewStyle } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { Feather } from "@expo/vector-icons";

import { useLayoutInsets } from "@/hooks/useLayoutInsets";
import { LAYOUT } from "@/lib/layoutInsets";
import { Colors, Spacing } from "@/constants/theme";

type ScreenHeaderBarProps = {
  /** Back arrow (stack screens). If omitted and onProfilePress is set, shows profile icon. */
  onBackPress?: () => void;
  showBack?: boolean;
  onProfilePress?: () => void;
  onNotificationsPress?: () => void;
  center?: React.ReactNode;
  style?: ViewStyle;
};

/**
 * Standard top bar: safe-area top + profile or back (left) + optional center + bell (right).
 * Matches AppHeader vertical spacing and icon alignment.
 */
export default function ScreenHeaderBar({
  onBackPress,
  showBack,
  onProfilePress,
  onNotificationsPress,
  center,
  style,
}: ScreenHeaderBarProps) {
  const navigation = useNavigation();
  const { headerRowStyle: safeTop, horizontal } = useLayoutInsets();

  const useBack = showBack ?? Boolean(onBackPress);
  const handleBack = onBackPress ?? (() => navigation.goBack());
  const handleNotifications =
    onNotificationsPress ?? (() => navigation.navigate("Notifications" as never));

  return (
    <View style={[styles.row, safeTop, { paddingHorizontal: horizontal }, style]}>
      <View style={styles.side}>
        {useBack ? (
          <Pressable style={styles.iconBtn} onPress={handleBack} testID="button-header-back">
            <Feather name="arrow-left" size={22} color={Colors.light.accent} />
          </Pressable>
        ) : onProfilePress ? (
          <Pressable style={styles.iconBtn} onPress={onProfilePress} testID="button-profile">
            <Feather name="user" size={22} color={Colors.light.accent} />
          </Pressable>
        ) : (
          <View style={styles.iconPlaceholder} />
        )}
      </View>

      <View style={styles.center}>{center ?? null}</View>

      <View style={[styles.side, styles.sideRight]}>
        <Pressable style={styles.iconBtn} onPress={handleNotifications} testID="button-notifications">
          <Feather name="bell" size={22} color={Colors.light.accent} />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  row: {
    flexDirection: "row",
    alignItems: "center",
    paddingBottom: LAYOUT.headerBottom,
    backgroundColor: Colors.light.backgroundRoot,
  },
  side: {
    width: 80,
    flexDirection: "row",
    justifyContent: "flex-start",
  },
  sideRight: {
    justifyContent: "flex-end",
  },
  center: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
  },
  iconBtn: {
    padding: 8,
  },
  iconPlaceholder: {
    width: 38,
    height: 38,
  },
});
