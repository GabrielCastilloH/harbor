import React from "react";
import { StyleSheet, Dimensions, View } from "react-native";
import {
  PanGestureHandler,
  GestureHandlerRootView,
} from "react-native-gesture-handler";
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  useAnimatedGestureHandler,
  withSpring,
} from "react-native-reanimated";
import BasicInfoView from "./BasicInfoView";
import PersonalView from "./PersonalView";
import { Profile } from "../types/App";
import Colors from "../constants/Colors";

const { width: screenWidth } = Dimensions.get("window");
const SWIPE_THRESHOLD = screenWidth * 0.2; // 20% of screen width

// Define a strict spring configuration
const STRICT_SPRING_CONFIG = {
  damping: 30, // Lower values make it more bouncy, higher values make it more strict
  stiffness: 200, // Higher values make the spring 'tighter' and faster
};

interface PostProps {
  profile: Profile;
}

const Post = ({ profile }: PostProps) => {
  const translateX = useSharedValue(0);

  const gestureHandler = useAnimatedGestureHandler({
    onStart: (_, context: any) => {
      context.startX = translateX.value;
    },
    onActive: (event, context: any) => {
      const nextTranslateX = context.startX + event.translationX;
      // Clamp the value to prevent swiping too far off-screen
      translateX.value = Math.max(
        Math.min(nextTranslateX, 0), // Swiping starts from the left (red square), so max is 0
        -screenWidth // Swipe left to the blue square
      );
    },
    onEnd: (event) => {
      if (event.translationX > SWIPE_THRESHOLD) {
        // Swipe right: move to the red square
        translateX.value = withSpring(0, STRICT_SPRING_CONFIG);
      } else if (event.translationX < -SWIPE_THRESHOLD) {
        // Swipe left: move to the blue square
        translateX.value = withSpring(-screenWidth, STRICT_SPRING_CONFIG);
      } else {
        // Not enough of a swipe, snap back to the current position
        translateX.value = withSpring(
          translateX.value > -screenWidth / 2 ? 0 : -screenWidth,
          STRICT_SPRING_CONFIG
        );
      }
    },
  });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
    };
  });

  return (
    <GestureHandlerRootView>
      <PanGestureHandler
        onGestureEvent={gestureHandler}
        activeOffsetX={[-10, 10]}
        activeOffsetY={[-20, 20]}
      >
        <Animated.View style={[styles.container, animatedStyle]}>
          <View style={styles.viewContainer}>
            <BasicInfoView profile={profile} />
          </View>
          <View style={styles.viewContainer}>
            <PersonalView profile={profile} />
          </View>
        </Animated.View>
      </PanGestureHandler>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
  container: {
    marginVertical: 20,
    flexDirection: "row", // Arrange children horizontally
    width: screenWidth * 2, // Container needs to be twice the screen width
    height: screenWidth * 1.2,
    backgroundColor: Colors.secondary100,
  },
  viewContainer: {
    padding: 30,
    width: screenWidth,
    height: "100%",
    borderRadius: 12,
  },
});

export default Post;
