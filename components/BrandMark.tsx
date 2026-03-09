import React from "react";
import { StyleSheet, Text, View } from "react-native";

type BrandMarkProps = {
  size?: number;
  showWordmark?: boolean;
  titleColor?: string;
  subtitleColor?: string;
  align?: "center" | "left";
};

export function BrandMark({
  size = 116,
  showWordmark = true,
  titleColor = "#AFC1D5",
  subtitleColor = "#91A5BC",
  align = "center",
}: BrandMarkProps) {
  const bubbleWidth = size * 0.45;
  const bubbleHeight = size * 0.45;
  const bubbleRadius = bubbleWidth / 2;
  const tailSize = size * 0.08;

  return (
    <View style={[styles.wrap, align === "left" ? styles.leftWrap : styles.centerWrap]}>
      <View style={[styles.logoFrame, { width: size, height: size * 0.82 }]}>
        <View
          style={[
            styles.bubble,
            styles.leftBubble,
            {
              width: bubbleWidth,
              height: bubbleHeight,
              borderRadius: bubbleRadius,
            },
          ]}
        >
          <View
            style={[
              styles.tail,
              styles.leftTail,
              { width: tailSize, height: tailSize, backgroundColor: "#1B95E0" },
            ]}
          />
        </View>

        <View
          style={[
            styles.bubble,
            styles.rightBubble,
            {
              width: bubbleWidth,
              height: bubbleHeight,
              borderRadius: bubbleRadius,
            },
          ]}
        >
          <View
            style={[
              styles.tail,
              styles.rightTail,
              { width: tailSize, height: tailSize, backgroundColor: "#19D5BF" },
            ]}
          />
        </View>

        <View
          style={[
            styles.overlapCut,
            {
              width: bubbleWidth * 0.9,
              height: bubbleHeight * 0.56,
              borderRadius: bubbleRadius,
            },
          ]}
        />
      </View>

      {showWordmark && (
        <View style={[styles.wordmark, align === "left" ? styles.leftWordmark : styles.centerWordmark]}>
          <Text style={[styles.title, { color: titleColor, fontSize: size * 0.34 }]}>Lingua</Text>
          <Text style={[styles.subtitle, { color: subtitleColor, fontSize: size * 0.16 }]}>Connect</Text>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    gap: 8,
  },
  centerWrap: {
    alignItems: "center",
  },
  leftWrap: {
    alignItems: "flex-start",
  },
  logoFrame: {
    position: "relative",
  },
  bubble: {
    position: "absolute",
    top: 10,
  },
  leftBubble: {
    left: 12,
    backgroundColor: "#1B95E0",
  },
  rightBubble: {
    right: 12,
    backgroundColor: "#19D5BF",
  },
  tail: {
    position: "absolute",
    bottom: 6,
    transform: [{ rotate: "45deg" }],
  },
  leftTail: {
    left: 10,
  },
  rightTail: {
    right: 10,
  },
  overlapCut: {
    position: "absolute",
    left: "35%",
    top: "31%",
    backgroundColor: "#052A52",
    transform: [{ rotate: "18deg" }],
    opacity: 0.95,
  },
  wordmark: {
    gap: 0,
  },
  centerWordmark: {
    alignItems: "center",
  },
  leftWordmark: {
    alignItems: "flex-start",
  },
  title: {
    fontFamily: "Nunito_800ExtraBold",
    lineHeight: 46,
    letterSpacing: 0.4,
  },
  subtitle: {
    fontFamily: "Nunito_700Bold",
    lineHeight: 24,
    letterSpacing: 0.6,
  },
});
