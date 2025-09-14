import React, { useState } from "react";
import { StyleSheet, Dimensions, View, TouchableOpacity } from "react-native";
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
import { FontAwesome } from "@expo/vector-icons";

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
  const [isLiked, setIsLiked] = useState(false);

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

  const dot1Style = useAnimatedStyle(() => {
    const isSelected = translateX.value > -screenWidth / 2;
    return {
      backgroundColor: isSelected ? Colors.primary500 : Colors.primary100,
    };
  });

  const dot2Style = useAnimatedStyle(() => {
    const isSelected = translateX.value < -screenWidth / 2;
    return {
      backgroundColor: isSelected ? Colors.primary500 : Colors.primary100,
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

      <View style={styles.indicatorContainer}>
        <Animated.View style={[styles.dot, dot1Style]} />
        <Animated.View style={[styles.dot, dot2Style]} />
      </View>

      <TouchableOpacity
        style={styles.thumbsUpButton}
        onPress={() => setIsLiked(!isLiked)}
      >
        <FontAwesome
          name={isLiked ? "thumbs-up" : "thumbs-o-up"}
          size={30}
          color={Colors.primary500}
        />
      </TouchableOpacity>
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
  thumbsUpButton: {
    position: "absolute",
    bottom: 40,
    right: 25,
    padding: 10,
  },
  indicatorContainer: {
    position: "absolute",
    bottom: 40,
    left: "50%",
    transform: [{ translateX: -15 }],
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
    gap: 10,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
});

export default Post;
