import React, { useEffect, useRef, useState } from "react";
import {
  View,
  StyleSheet,
  Pressable,
  Animated,
  Dimensions,
  Modal,
  PanResponder,
  BackHandler,
  type ViewStyle,
} from "react-native";

const { width: SCREEN_WIDTH } = Dimensions.get("window");
const DEFAULT_DRAWER_WIDTH = SCREEN_WIDTH * 0.8;

type SideDrawerShellProps = {
  visible: boolean;
  onClose: () => void;
  children: React.ReactNode;
  width?: number;
  drawerStyle?: ViewStyle;
  testID?: string;
};

/**
 * Shared left-side drawer shell: backdrop dismiss, swipe-to-close, hardware back.
 * Keeps the modal mounted until the close animation finishes.
 */
export default function SideDrawerShell({
  visible,
  onClose,
  children,
  width = DEFAULT_DRAWER_WIDTH,
  drawerStyle,
  testID,
}: SideDrawerShellProps) {
  const [mounted, setMounted] = useState(visible);
  const slideAnim = useRef(new Animated.Value(-width)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const onCloseRef = useRef(onClose);
  onCloseRef.current = onClose;

  useEffect(() => {
    if (visible) {
      setMounted(true);
      Animated.parallel([
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 250,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 250,
          useNativeDriver: true,
        }),
      ]).start();
      return;
    }

    if (!mounted) return;

    Animated.parallel([
      Animated.timing(slideAnim, {
        toValue: -width,
        duration: 200,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnim, {
        toValue: 0,
        duration: 200,
        useNativeDriver: true,
      }),
    ]).start(({ finished }) => {
      if (finished) setMounted(false);
    });
  }, [visible, mounted, slideAnim, fadeAnim, width]);

  useEffect(() => {
    if (!mounted || !visible) return;

    const subscription = BackHandler.addEventListener("hardwareBackPress", () => {
      onCloseRef.current();
      return true;
    });

    return () => subscription.remove();
  }, [mounted, visible]);

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_, gesture) =>
        gesture.dx < -6 && Math.abs(gesture.dy) < 28,
      onPanResponderMove: (_, gesture) => {
        if (gesture.dx < 0) {
          slideAnim.setValue(Math.max(gesture.dx, -width));
        }
      },
      onPanResponderRelease: (_, gesture) => {
        if (gesture.dx < -width * 0.22 || gesture.vx < -0.45) {
          onCloseRef.current();
          return;
        }
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }).start();
      },
      onPanResponderTerminate: () => {
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: 180,
          useNativeDriver: true,
        }).start();
      },
    })
  ).current;

  if (!mounted) return null;

  return (
    <Modal
      transparent
      visible={mounted}
      animationType="none"
      onRequestClose={onClose}
      statusBarTranslucent
    >
      <View style={styles.overlay} testID={testID}>
        <Animated.View style={[styles.backdrop, { opacity: fadeAnim }]}>
          <Pressable
            style={StyleSheet.absoluteFill}
            onPress={onClose}
            accessibilityRole="button"
            accessibilityLabel="Close menu"
            testID="drawer-backdrop"
          />
        </Animated.View>

        <Animated.View
          style={[
            styles.drawer,
            { width, transform: [{ translateX: slideAnim }] },
            drawerStyle,
          ]}
          {...panResponder.panHandlers}
        >
          {children}
        </Animated.View>
      </View>
    </Modal>
  );
}

export { DEFAULT_DRAWER_WIDTH, SCREEN_WIDTH as SIDE_DRAWER_SCREEN_WIDTH };

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: "rgba(0, 0, 0, 0.45)",
  },
  drawer: {
    position: "absolute",
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: "transparent",
  },
});
