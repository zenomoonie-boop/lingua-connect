import React from "react";
import { StyleSheet, View } from "react-native";

type ScreenBackdropProps = {
  primaryColor?: string;
  secondaryColor?: string;
  accentColor?: string;
};

export function ScreenBackdrop({
  primaryColor = "rgba(33, 160, 255, 0.12)",
  secondaryColor = "rgba(31, 219, 199, 0.10)",
  accentColor = "rgba(255,255,255,0.05)",
}: ScreenBackdropProps) {
  return (
    <View style={styles.wrap} pointerEvents="none">
      <View style={[styles.halo, styles.haloOne, { backgroundColor: primaryColor }]} />
      <View style={[styles.halo, styles.haloTwo, { backgroundColor: secondaryColor }]} />
      <View style={[styles.bubble, styles.bubbleOne, { backgroundColor: accentColor }]} />
      <View style={[styles.bubble, styles.bubbleTwo, { backgroundColor: "rgba(255,255,255,0.04)" }]} />
      <View style={[styles.bubble, styles.bubbleThree, { backgroundColor: "rgba(255,255,255,0.03)" }]} />
    </View>
  );
}

const styles = StyleSheet.create({
  wrap: {
    ...StyleSheet.absoluteFillObject,
    overflow: "hidden",
  },
  halo: {
    position: "absolute",
    borderRadius: 999,
  },
  haloOne: {
    width: 300,
    height: 300,
    top: 48,
    left: -120,
  },
  haloTwo: {
    width: 280,
    height: 280,
    bottom: 40,
    right: -110,
  },
  bubble: {
    position: "absolute",
    borderRadius: 999,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.12)",
  },
  bubbleOne: {
    width: 138,
    height: 138,
    top: 150,
    right: -26,
  },
  bubbleTwo: {
    width: 86,
    height: 86,
    top: 380,
    left: -18,
  },
  bubbleThree: {
    width: 112,
    height: 112,
    bottom: 150,
    right: 30,
  },
});
