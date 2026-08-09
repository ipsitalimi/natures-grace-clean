import React from "react";
import {
  View,
  ScrollView,
  StyleSheet,
  Platform,
  type ViewStyle,
  type StyleProp,
  type ScrollViewProps,
} from "react-native";

import { KeyboardAwareScrollViewCompat } from "@/components/KeyboardAwareScrollViewCompat";
import { useLayoutInsets } from "@/hooks/useLayoutInsets";
import { Colors } from "@/constants/theme";
import ScreenHeader, { type ScreenHeaderProps, type ScreenHeaderVariant } from "@/components/layout/ScreenHeader";
import PageTitle from "@/components/layout/PageTitle";
import PageSubtitle from "@/components/layout/PageSubtitle";
import { LayoutSpacing } from "@/constants/layout";

export type PageLayoutProps = {
  children: React.ReactNode;
  title?: string;
  subtitle?: string;
  titleMuted?: boolean;
  header?: ScreenHeaderVariant | "none";
  headerProps?: Partial<ScreenHeaderProps>;
  scrollable?: boolean;
  footerInset?: number;
  backgroundColor?: string;
  style?: StyleProp<ViewStyle>;
  contentContainerStyle?: StyleProp<ViewStyle>;
  scrollViewProps?: Omit<ScrollViewProps, "contentContainerStyle" | "children">;
  scrollRef?: React.RefObject<ScrollView | null>;
  /** When true, title renders on the header row (aligned with icons), not below it. */
  titleInHeader?: boolean;
  testID?: string;
};

export default function PageLayout({
  children,
  title,
  subtitle,
  titleMuted,
  header = "back",
  headerProps,
  scrollable = true,
  footerInset = 0,
  backgroundColor = Colors.light.backgroundRoot,
  style,
  contentContainerStyle,
  scrollViewProps,
  scrollRef,
  titleInHeader = false,
  testID = "page-layout",
}: PageLayoutProps) {
  const { scrollPaddingBottom, gutter } = useLayoutInsets(footerInset);

  const inlineTitle = titleInHeader && title;
  const headerNode =
    header === "none" ? null : (
      <ScreenHeader
        variant={header}
        title={inlineTitle ? title : undefined}
        {...headerProps}
      />
    );

  const titleBlock = !inlineTitle && (title || subtitle) ? (
    <View style={styles.titleBlock}>
      {title ? (
        <PageTitle muted={titleMuted}>{title}</PageTitle>
      ) : null}
      {subtitle ? <PageSubtitle>{subtitle}</PageSubtitle> : null}
    </View>
  ) : subtitle ? (
    <View style={styles.subtitleBlock}>
      <PageSubtitle>{subtitle}</PageSubtitle>
    </View>
  ) : null;

  const body = (
    <>
      {titleBlock}
      {children}
    </>
  );

  return (
    <View style={[styles.root, { backgroundColor }, style]} testID={testID}>
      {headerNode}
      {scrollable ? (
        <KeyboardAwareScrollViewCompat
          ref={scrollRef}
          style={styles.scroll}
          contentContainerStyle={[
            styles.content,
            { paddingHorizontal: gutter, paddingBottom: scrollPaddingBottom },
            contentContainerStyle,
          ]}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode={Platform.OS === "ios" ? "interactive" : "on-drag"}
          bottomOffset={footerInset}
          {...scrollViewProps}
        >
          {body}
        </KeyboardAwareScrollViewCompat>
      ) : (
        <View
          style={[
            styles.content,
            styles.bodyStatic,
            { paddingHorizontal: gutter, paddingBottom: scrollPaddingBottom },
            contentContainerStyle,
          ]}
        >
          {body}
        </View>
      )}
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
  bodyStatic: {
    flex: 1,
  },
  titleBlock: {
    alignItems: "center",
    paddingTop: LayoutSpacing.xs,
    marginBottom: LayoutSpacing.md,
    gap: LayoutSpacing.xs,
    width: "100%",
    overflow: "visible",
  },
  subtitleBlock: {
    alignItems: "center",
    marginBottom: LayoutSpacing.md,
    width: "100%",
    overflow: "visible",
  },
});
