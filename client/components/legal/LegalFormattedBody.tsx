import React from "react";
import { View, StyleSheet, Linking, Pressable, Platform } from "react-native";

import { ThemedText } from "@/components/ThemedText";
import { LegalFonts, LegalTheme } from "@/constants/legalTheme";

const LINK_PATTERN = /([\w.+-]+@[\w.-]+\.[a-zA-Z]{2,}|https?:\/\/[^\s]+)/g;
const BOLD_PATTERN = /(\*\*[^*]+\*\*)/g;

type TextStyle = object;

function stripMarkdownHeading(line: string): string {
  return line.replace(/^#+\s*/, "").trim();
}

function parseNumberedSection(
  heading: string
): { number: string; title: string } | null {
  const match = heading.match(/^(\d+)\.\s*(.+)$/);
  if (!match) return null;
  return { number: match[1], title: match[2] };
}

function openLink(url: string) {
  const target = url.startsWith("http") ? url : `mailto:${url}`;
  void Linking.openURL(target);
}

function isLinkToken(token: string): boolean {
  return /^[\w.+-]+@[\w.-]+\.[a-zA-Z]{2,}$/.test(token) || /^https?:\/\//.test(token);
}

function formatInline(text: string, baseStyle: TextStyle, keyPrefix: string): React.ReactNode {
  const boldParts = text.split(BOLD_PATTERN);

  return (
    <ThemedText style={baseStyle}>
      {boldParts.map((segment, segIndex) => {
        if (!segment) return null;

        const isBold = segment.startsWith("**") && segment.endsWith("**");
        const content = isBold ? segment.slice(2, -2) : segment;
        const segmentStyle = isBold ? [baseStyle, styles.inlineBold] : baseStyle;

        const tokens = content.split(LINK_PATTERN);
        return tokens.map((token, tokenIndex) => {
          if (!token) return null;
          const key = `${keyPrefix}-${segIndex}-${tokenIndex}`;

          if (isLinkToken(token)) {
            return (
              <ThemedText
                key={key}
                style={[segmentStyle, styles.link]}
                onPress={() => openLink(token)}
                accessibilityRole="link"
              >
                {token}
              </ThemedText>
            );
          }

          return (
            <ThemedText key={key} style={segmentStyle}>
              {token}
            </ThemedText>
          );
        });
      })}
    </ThemedText>
  );
}

export default function LegalFormattedBody({ body }: { body: string }) {
  const lines = body.split("\n");
  const blocks: React.ReactNode[] = [];
  let paragraphBuffer: string[] = [];
  let key = 0;
  let isFirstSection = true;

  const sectionSpacing = (isFirst: boolean) =>
    isFirst ? { marginTop: 8 } : { marginTop: LegalTheme.sectionTopGap };

  const flushParagraph = () => {
    if (paragraphBuffer.length === 0) return;
    const text = paragraphBuffer.join(" ").trim();
    paragraphBuffer = [];
    if (!text) return;
    blocks.push(
      <View key={`p-${key++}`} style={styles.paragraphWrap}>
        {formatInline(text, styles.paragraph, `p-${key}`)}
      </View>
    );
  };

  for (const rawLine of lines) {
    const trimmed = rawLine.trim();

    if (!trimmed) {
      flushParagraph();
      continue;
    }

    if (trimmed === "---") {
      flushParagraph();
      blocks.push(<View key={`hr-${key++}`} style={styles.sectionDivider} />);
      continue;
    }

    if (trimmed.startsWith("# ") && !trimmed.startsWith("## ")) {
      flushParagraph();
      blocks.push(
        <ThemedText key={`h1-${key++}`} style={styles.documentSubheading} accessibilityRole="header">
          {stripMarkdownHeading(trimmed)}
        </ThemedText>
      );
      continue;
    }

    if (trimmed.startsWith("## ")) {
      flushParagraph();
      const headingText = stripMarkdownHeading(trimmed);
      const numbered = parseNumberedSection(headingText);

      if (numbered) {
        const first = isFirstSection;
        isFirstSection = false;
        blocks.push(
          <View
            key={`h2-${key++}`}
            style={[styles.sectionBlock, sectionSpacing(first)]}
            accessibilityRole="header"
          >
            <ThemedText style={styles.sectionNumber}>{numbered.number}.</ThemedText>
            <ThemedText style={styles.sectionHeading}>{numbered.title}</ThemedText>
          </View>
        );
      } else {
        const first = isFirstSection;
        isFirstSection = false;
        blocks.push(
          <ThemedText
            key={`h2-${key++}`}
            style={[
              styles.sectionHeading,
              styles.sectionHeadingStandalone,
              sectionSpacing(first),
            ]}
            accessibilityRole="header"
          >
            {headingText}
          </ThemedText>
        );
      }
      continue;
    }

    if (trimmed.startsWith("- ") || trimmed.startsWith("* ")) {
      flushParagraph();
      const bulletText = trimmed.replace(/^[-*]\s+/, "");
      blocks.push(
        <View key={`li-${key++}`} style={styles.bulletRow}>
          <View style={styles.bulletDot} />
          <View style={styles.bulletContent}>
            {formatInline(bulletText, styles.bulletText, `li-${key}`)}
          </View>
        </View>
      );
      continue;
    }

    if (/^\d+\.\s/.test(trimmed)) {
      flushParagraph();
      const stepMatch = trimmed.match(/^(\d+)\.\s+(.+)$/);
      if (stepMatch) {
        blocks.push(
          <View key={`ol-${key++}`} style={styles.numberedRow}>
            <ThemedText style={styles.numberedIndex}>{stepMatch[1]}.</ThemedText>
            <View style={styles.numberedContent}>
              {formatInline(stepMatch[2], styles.numberedText, `ol-${key}`)}
            </View>
          </View>
        );
      } else {
        blocks.push(
          <View key={`ol-${key++}`} style={styles.numberedRow}>
            {formatInline(trimmed, styles.numberedText, `ol-${key}`)}
          </View>
        );
      }
      continue;
    }

    paragraphBuffer.push(trimmed);
  }

  flushParagraph();

  return <View style={styles.container}>{blocks}</View>;
}

const styles = StyleSheet.create({
  container: {
    width: "100%",
  },
  documentSubheading: {
    fontSize: 22,
    fontWeight: "500",
    lineHeight: 30,
    color: LegalTheme.headingText,
    fontFamily: LegalFonts.serif,
    marginTop: LegalTheme.sectionTopGap,
    marginBottom: LegalTheme.sectionBottomGap,
  },
  sectionBlock: {
    marginBottom: LegalTheme.sectionBottomGap,
    gap: 8,
  },
  sectionNumber: {
    fontSize: 15,
    fontWeight: "400",
    lineHeight: 20,
    color: LegalTheme.sageLabel,
    fontFamily: LegalFonts.serif,
    letterSpacing: 1,
  },
  sectionHeading: {
    fontSize: 26,
    fontWeight: "500",
    lineHeight: 34,
    color: LegalTheme.headingText,
    fontFamily: LegalFonts.serif,
    letterSpacing: -0.3,
  },
  sectionHeadingStandalone: {
    marginBottom: LegalTheme.sectionBottomGap,
  },
  sectionDivider: {
    height: 1,
    backgroundColor: LegalTheme.divider,
    marginVertical: LegalTheme.dividerVertical,
    width: "100%",
  },
  paragraphWrap: {
    marginBottom: LegalTheme.paragraphGap,
    maxWidth: "100%",
  },
  paragraph: {
    fontSize: 17,
    lineHeight: 31,
    color: LegalTheme.bodyText,
    fontFamily: LegalFonts.sans,
    textAlign: "left",
  },
  inlineBold: {
    fontWeight: "600",
    fontFamily: LegalFonts.sansMedium,
    color: LegalTheme.headingText,
  },
  link: {
    color: LegalTheme.link,
    textDecorationLine: Platform.OS === "web" ? "none" : "underline",
  },
  bulletRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: LegalTheme.listItemGap,
    paddingLeft: 4,
    gap: 14,
  },
  bulletDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: LegalTheme.sageLabel,
    marginTop: 12,
    opacity: 0.7,
  },
  bulletContent: {
    flex: 1,
  },
  bulletText: {
    fontSize: 17,
    lineHeight: 31,
    color: LegalTheme.bodyText,
    fontFamily: LegalFonts.sans,
  },
  numberedRow: {
    flexDirection: "row",
    alignItems: "flex-start",
    marginBottom: LegalTheme.listItemGap,
    paddingLeft: 4,
    gap: 12,
  },
  numberedIndex: {
    fontSize: 17,
    lineHeight: 31,
    color: LegalTheme.sageLabel,
    fontFamily: LegalFonts.serif,
    minWidth: 24,
  },
  numberedContent: {
    flex: 1,
  },
  numberedText: {
    fontSize: 17,
    lineHeight: 31,
    color: LegalTheme.bodyText,
    fontFamily: LegalFonts.sans,
  },
});
