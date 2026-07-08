import React from "react";
import { View, StyleSheet, Platform, type StyleProp, type ViewStyle } from "react-native";

import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useLayoutInsets } from "@/hooks/useLayoutInsets";
import { Colors } from "@/constants/theme";

export type KeyboardFormLayoutProps = {
  children: React.ReactNode;
  header?: React.ReactNode;
  footerInset?: number;
  backgroundColor?: string;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  testID?: string;
};

/** Scrollable form shell with keyboard avoidance and swipe/tap dismiss. */
export default function KeyboardFormLayout({
  children,
  header,
  footerInset = 0,
  backgroundColor = Colors.light.backgroundRoot,
  style,
  contentContainerStyle,
  testID = "keyboard-form-layout",
}: KeyboardFormLayoutProps) {
  const { scrollPaddingBottom, gutter } = useLayoutInsets(footerInset);

  return (
    <View style={[styles.root, { backgroundColor }, style]} testID={testID}>
      {header}
      <KeyboardAwareScrollViewCompat
        style={styles.scroll}
        contentContainerStyle={[
          styles.content,
          { paddingHorizontal: gutter, paddingBottom: scrollPaddingBottom },
          contentContainerStyle,
        ]}
        keyboardShouldPersistTaps="handled"
        keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
        bottomOffset={footerInset}
        showsVerticalScrollIndicator={false}
      >
        {children}
      </KeyboardAwareScrollViewCompat>
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
  },
  scroll: {
    flex: 1,
  },
  content: {
    flexGrow: 1,
  },
});
