import React, { useState } from "react";
import { View, StyleSheet, ScrollView, Animated } from "react-native";

import { ThemedText } from "@/components/ThemedText";
import { LegalTheme } from "@/constants/legalTheme";
import { getLegalDocument } from "@/constants/legalDocuments";
import { LegalCheckboxRow } from "@/components/legal/LegalDocumentReader";
import LegalFormattedBody from "@/components/legal/LegalFormattedBody";
import LegalPageHero from "@/components/legal/LegalPageHero";
import type { LegalDocumentKey } from "@/types/legal";

type RoleAgreementKey = Extract<LegalDocumentKey, "practitioner_agreement" | "seller_agreement">;

const AGREEMENT_LABELS: Record<RoleAgreementKey, string> = {
  practitioner_agreement: "Practitioner Agreement",
  seller_agreement: "Seller Agreement",
};

interface RoleAgreementSectionProps {
  docKey: RoleAgreementKey;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

export default function RoleAgreementSection({
  docKey,
  checked,
  onCheckedChange,
}: RoleAgreementSectionProps) {
  const doc = getLegalDocument(docKey);
  const [scrolledToBottom, setScrolledToBottom] = useState(false);
  const fadeAnim = React.useRef(new Animated.Value(0)).current;

  React.useEffect(() => {
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
    if (scrolledToBottom) return;
    const { layoutMeasurement, contentOffset, contentSize } = event.nativeEvent;
    const atBottom = layoutMeasurement.height + contentOffset.y >= contentSize.height - 32;
    if (atBottom) setScrolledToBottom(true);
  };

  return (
    <View style={styles.section}>
      <ScrollView
        style={styles.docScroll}
        contentContainerStyle={styles.docScrollContent}
        showsVerticalScrollIndicator
        onScroll={handleScroll}
        scrollEventThrottle={16}
        nestedScrollEnabled
      >
        <LegalPageHero
          docKey={docKey}
          title={doc.title}
          lastUpdated={doc.lastUpdated}
          version={doc.version}
          compact
        />
        <Animated.View style={{ opacity: fadeAnim }}>
          <LegalFormattedBody body={doc.body} />
        </Animated.View>
      </ScrollView>

      {!scrolledToBottom ? (
        <ThemedText style={styles.scrollHint}>
          Scroll to the bottom of the agreement to enable acceptance.
        </ThemedText>
      ) : null}

      <LegalCheckboxRow
        label={AGREEMENT_LABELS[docKey]}
        checked={checked}
        onToggle={() => onCheckedChange(!checked)}
        onView={() => {}}
        disabled={!scrolledToBottom}
        hideViewLink
        testID={`checkbox-${docKey}`}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  section: {
    marginTop: 8,
  },
  docScroll: {
    maxHeight: 420,
    backgroundColor: LegalTheme.background,
    borderRadius: 4,
  },
  docScrollContent: {
    padding: 20,
    paddingBottom: 32,
  },
  scrollHint: {
    fontSize: 13,
    lineHeight: 20,
    color: LegalTheme.metaText,
    fontStyle: "italic",
    marginTop: 12,
    marginBottom: 8,
    fontFamily: "Nunito_400Regular",
  },
});
