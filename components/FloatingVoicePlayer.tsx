import React, { useRef, useEffect } from "react";
import { View, Text, Pressable, StyleSheet, Animated, PanResponder, Dimensions, Platform, Easing } from "react-native";
import { Ionicons } from "@expo/vector-icons";

interface FloatingVoicePlayerProps {
  roomName: string;
  language: string;
  isMuted: boolean;
  isSpeaking?: boolean;
  onRestore: () => void;
  onLeave: () => void;
}

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get("window");
const PLAYER_WIDTH = 190;
const PLAYER_HEIGHT = 60;

function Waveform({ color }: { color: string }) {
  const scale1 = useRef(new Animated.Value(0.4)).current;
  const scale2 = useRef(new Animated.Value(0.4)).current;
  const scale3 = useRef(new Animated.Value(0.4)).current;
  const scale4 = useRef(new Animated.Value(0.4)).current;

  useEffect(() => {
    const createAnimate = (anim: Animated.Value, delay: number) => {
      return Animated.loop(
        Animated.sequence([
          Animated.timing(anim, {
            toValue: 1,
            duration: 500,
            delay,
            useNativeDriver: Platform.OS !== 'web',
            easing: Easing.inOut(Easing.ease),
          }),
          Animated.timing(anim, {
            toValue: 0.4,
            duration: 500,
            useNativeDriver: Platform.OS !== 'web',
            easing: Easing.inOut(Easing.ease),
          }),
        ])
      );
    };

    const loops = [
      createAnimate(scale1, 0),
      createAnimate(scale2, 250),
      createAnimate(scale3, 100),
      createAnimate(scale4, 350),
    ];

    loops.forEach(loop => loop.start());

    // Return a cleanup function to stop the animations
    return () => {
      loops.forEach(loop => loop.stop());
    };
  }, [scale1, scale2, scale3, scale4]);

  const barStyle = { width: 3, backgroundColor: color, borderRadius: 1.5, height: 16 };

  return (
    <View style={{ flexDirection: 'row', alignItems: 'center', gap: 3, height: 16, justifyContent: 'center' }}>
      <Animated.View style={[barStyle, { transform: [{ scaleY: scale1 }] }]} />
      <Animated.View style={[barStyle, { transform: [{ scaleY: scale2 }] }]} />
      <Animated.View style={[barStyle, { transform: [{ scaleY: scale3 }] }]} />
      <Animated.View style={[barStyle, { transform: [{ scaleY: scale4 }] }]} />
    </View>
  );
}

export default function FloatingVoicePlayer({
  roomName,
  language,
  isMuted,
  isSpeaking,
  onRestore,
  onLeave,
}: FloatingVoicePlayerProps) {
  const pan = useRef(new Animated.ValueXY({ x: SCREEN_WIDTH - PLAYER_WIDTH - 20, y: SCREEN_HEIGHT - 150 })).current;
  const scale = useRef(new Animated.Value(1)).current;
  
  const panResponder = useRef(
    PanResponder.create({
      onStartShouldSetPanResponder: () => true,
      onMoveShouldSetPanResponder: () => true,
      onPanResponderGrant: () => {
        pan.extractOffset();
        Animated.spring(scale, { toValue: 0.95, useNativeDriver: false }).start();
      },
      onPanResponderMove: Animated.event(
        [null, { dx: pan.x, dy: pan.y }],
        { useNativeDriver: false }
      ),
      onPanResponderRelease: (e, gestureState) => {
        pan.flattenOffset();
        Animated.spring(scale, { toValue: 1, useNativeDriver: false }).start();
        
        // Snap to left or right edge
        let targetX = 20;
        if (gestureState.moveX > SCREEN_WIDTH / 2) {
          targetX = SCREEN_WIDTH - PLAYER_WIDTH - 20;
        }
        
        // Keep within vertical bounds
        let targetY = (pan.y as any)._value;
        if (targetY < 60) targetY = 60;
        if (targetY > SCREEN_HEIGHT - 100) targetY = SCREEN_HEIGHT - 100;
        
        Animated.spring(pan, {
          toValue: { x: targetX, y: targetY },
          useNativeDriver: false,
          friction: 7,
          tension: 40
        }).start();
      },
    })
  ).current;

  return (
    <Animated.View
      style={[
        styles.container,
        {
          transform: [
            { translateX: pan.x },
            { translateY: pan.y },
            { scale },
          ],
        },
      ]}
      {...panResponder.panHandlers}
    >
      <Pressable onPress={onRestore} style={styles.innerContainer}>
        {/* Status Icon */}
        <View style={[styles.iconContainer, isMuted ? styles.mutedBg : styles.activeBg]}>
          {isSpeaking ? (
            <Waveform color="#fff" />
          ) : (
            <Ionicons 
              name={isMuted ? "mic-off" : "mic"} 
              size={20} 
              color="#fff" 
            />
          )}
        </View>
        
        {/* Info */}
        <View style={styles.infoContainer}>
          <Text style={styles.label}>Speaking in</Text>
          <Text style={styles.roomName} numberOfLines={1}>
            {roomName}
          </Text>
        </View>
      </Pressable>
      
      {/* Leave Button */}
      <Pressable 
        onPress={onLeave} 
        style={styles.leaveButton}
        hitSlop={10}
      >
        <Ionicons name="close" size={18} color="#fff" />
      </Pressable>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    position: "absolute",
    width: PLAYER_WIDTH,
    height: PLAYER_HEIGHT,
    backgroundColor: "#1E293B",
    borderRadius: 30,
    flexDirection: "row",
    alignItems: "center",
    padding: 6,
    borderWidth: 1,
    borderColor: "rgba(255,255,255,0.15)",
    ...Platform.select({
      android: { elevation: 10 },
      ios: { 
        shadowColor: "#000", 
        shadowOffset: { width: 0, height: 4 }, 
        shadowOpacity: 0.3, 
        shadowRadius: 10 
      },
    }),
    zIndex: 1000,
  },
  innerContainer: {
    flex: 1,
    flexDirection: "row",
    alignItems: "center",
    gap: 10,
  },
  iconContainer: {
    width: 44,
    height: 44,
    borderRadius: 22,
    alignItems: "center",
    justifyContent: "center",
  },
  activeBg: {
    backgroundColor: "#2563EB", // Blue
  },
  mutedBg: {
    backgroundColor: "#EF4444", // Red
  },
  infoContainer: {
    flex: 1,
    justifyContent: "center",
  },
  label: {
    color: "rgba(255,255,255,0.5)",
    fontSize: 10,
    fontFamily: "Nunito_600SemiBold",
  },
  roomName: {
    color: "#fff",
    fontSize: 13,
    fontFamily: "Nunito_700Bold",
  },
  leaveButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: "rgba(255,255,255,0.1)",
    alignItems: "center",
    justifyContent: "center",
    marginRight: 2,
  },
});
