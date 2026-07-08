import React, { useEffect, useRef } from "react";
import {
  View,
  StyleSheet,
  ScrollView,
  Pressable,
  Animated,
  useWindowDimensions,
  type ViewStyle,
} from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { Feather } from "@expo/vector-icons";

import { ThemedText } from "@/components/ThemedText";
import ScreenHeader from "@/components/layout/ScreenHeader";
import { BorderRadius } from "@/constants/theme";
import { LegalTheme } from "@/constants/legalTheme";
import { getLegalDocument } from "@/constants/legalDocuments";
import LegalFormattedBody from "@/components/legal/LegalFormattedBody";
import LegalPageHero from "@/components/legal/LegalPageHero";
import type { LegalDocumentKey } from "@/types/legal";
import { getScrollBottomPadding } from "@/lib/layoutInsets";

interface LegalDocumentReaderProps {
  docKey: LegalDocumentKey;
  onBack?: () => void;
  showBack?: boolean;
  footer?: React.ReactNode;
  containerStyle?: ViewStyle;
  onScrolledToBottom?: () => void;
  requireScrollToBottom?: boolean;
  /** Embedded mode for application flows — tighter hero, no outer chrome. */
  embedded?: boolean;
}

export default function LegalDocumentReader({
  docKey,
  onBack,
  showBack = true,
  footer,
  containerStyle,
  onScrolledToBottom,
  requireScrollToBottom = false,
  embedded = false,
}: LegalDocumentReaderProps) {
  const insets = useSafeAreaInsets();
  const { width } = useWindowDimensions();
  const doc = getLegalDocument(docKey);
  const [scrolledToBottom, setScrolledToBottom] = React.useState(!requireScrollToBottom);
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const isWide = width >= 768;
  const horizontalPadding = isWide
    ? LegalTheme.contentPaddingDesktop
    : LegalTheme.contentPaddingMobile;

  useEffect(() => {
    Animated.timing(fadeAnim, {
      toValue: 1,
      duration: 420,
      useNativeDriver: true,
    }).start();
  }, [fadeAnim, docKey]);

  const handleScroll = (event: {
    nativeEvent: {
      layoutMeasurement: { height: number };
      contentOffset: { y: number };
      contentSize: { height: number };
    };
  }) => {
    if (!requireScrollToBottom || scrolledToBottom) return;
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const atBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 48;
    if (atBottom) {
      setScrolledToBottom(true);
      onScrolledToBottom?.();
    }
  };

  return (
    <View style={[styles.container, containerStyle]} accessibilityLabel={`${doc.title} document`}>
      {!embedded && showBack && onBack ? (
        <ScreenHeader variant="back" title={doc.title} onBackPress={onBack} />
      ) : null}

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          {
            paddingHorizontal: horizontalPadding,
            paddingBottom: footer ? 16 : getScrollBottomPadding(insets.bottom, 32),
          },
        ]}
        showsVerticalScrollIndicator
        onScroll={handleScroll}
        scrollEventThrottle={16}
      >
        <View style={styles.readingColumn}>
          <LegalPageHero
            docKey={docKey}
            title={doc.title}
            lastUpdated={doc.lastUpdated}
            version={doc.version}
            compact={embedded}
          />

          <Animated.View style={{ opacity: fadeAnim }}>
            <LegalFormattedBody body={doc.body} />
          </Animated.View>
        </View>
      </ScrollView>

      {footer ? (
        <View
          style={[
            styles.footer,
            { paddingBottom: getScrollBottomPadding(insets.bottom, 16), paddingHorizontal: horizontalPadding },
          ]}
        >
          {footer}
        </View>
      ) : null}
    </View>
  );
}

export function LegalCheckboxRow({
  label,
  checked,
  onToggle,
  onView,
  disabled,
  hideViewLink,
  testID,
}: {
  label: string;
  checked: boolean;
  onToggle: () => void;
  onView: () => void;
  disabled?: boolean;
  hideViewLink?: boolean;
  testID?: string;
}) {
  return (
    <View style={styles.checkboxRow}>
      <Pressable
        style={styles.checkboxHit}
        onPress={disabled ? undefined : onToggle}
        testID={testID}
        accessibilityRole="checkbox"
        accessibilityState={{ checked, disabled: Boolean(disabled) }}
        hitSlop={6}
      >
        <View style={[styles.checkbox, checked && styles.checkboxChecked, disabled && styles.checkboxDisabled]}>
          {checked ? <Feather name="check" size={14} color="#FFFFFF" /> : null}
        </View>
      </Pressable>
      <View style={styles.checkboxTextWrap}>
        {hideViewLink ? (
          <ThemedText style={[styles.checkboxLabel, disabled && styles.checkboxLabelDisabled]}>
            I have read and agree to the {label}.
          </ThemedText>
        ) : (
          <ThemedText style={styles.checkboxLabel}>
            I have read and agree to the{" "}
            <ThemedText style={styles.linkText} onPress={onView}>
              {label}
            </ThemedText>
            .
          </ThemedText>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: LegalTheme.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    flexGrow: 1,
  },
  readingColumn: {
    width: "100%",
    maxWidth: LegalTheme.maxContentWidth,
    alignSelf: "center",
  },
  footer: {
    borderTopWidth: 1,
    borderTopColor: LegalTheme.divider,
    paddingTop: 20,
    backgroundColor: LegalTheme.background,
    maxWidth: LegalTheme.maxContentWidth + LegalTheme.contentPaddingDesktop * 2,
    alignSelf: "center",
    width: "100%",
  },
  checkboxRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 12,
    marginBottom: 12,
  },
  checkboxHit: {
    paddingTop: 2,
    minWidth: 44,
    minHeight: 44,
    justifyContent: "flex-start",
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: BorderRadius.xs,
    borderWidth: 1.5,
    borderColor: LegalTheme.accentGreen,
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "transparent",
  },
  checkboxChecked: {
    backgroundColor: LegalTheme.accentGreen,
  },
  checkboxDisabled: {
    opacity: 0.4,
  },
  checkboxLabelDisabled: {
    color: LegalTheme.metaText,
  },
  checkboxTextWrap: {
    flex: 1,
    paddingTop: 2,
  },
  checkboxLabel: {
    fontSize: 15,
    lineHeight: 24,
    color: LegalTheme.bodyText,
    fontFamily: "Nunito_400Regular",
  },
  linkText: {
    color: LegalTheme.link,
    fontWeight: "600",
    fontFamily: "Nunito_600SemiBold",
  },
});
