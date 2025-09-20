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
  runOnJS,
} from "react-native-reanimated";
import BasicInfoView from "./BasicInfoView";
import PersonalView from "./PersonalView";
import { Profile } from "../types/App";
import Colors from "../constants/Colors";
import { FontAwesome, Octicons } from "@expo/vector-icons";

const { width: screenWidth } = Dimensions.get("window");
const SWIPE_THRESHOLD = screenWidth * 0.15; // 15% of screen width - more sensitive
const SWIPE_SENSITIVITY = screenWidth * 0.25; // 25% threshold for switching views

// Define a smoother spring configuration
const SMOOTH_SPRING_CONFIG = {
  damping: 20, // Lower damping for more responsive feel
  stiffness: 300, // Higher stiffness for snappier animations
  mass: 0.8, // Lower mass for lighter feel
};

interface PostProps {
  profile: Profile;
}

const Post = ({ profile }: PostProps) => {
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(1);

  const [isLiked, setIsLiked] = useState(false);
  const [isDisliked, setIsDisliked] = useState(false);

  const gestureHandler = useAnimatedGestureHandler({
    onStart: (_, context: any) => {
      // Prevent swiping if a choice has already been made
      if (isLiked || isDisliked) {
        return;
      }
      context.startX = translateX.value;
    },
    onActive: (event, context: any) => {
      if (isLiked || isDisliked) {
        return;
      }
      const nextTranslateX = context.startX + event.translationX;
      translateX.value = nextTranslateX;
    },
    onEnd: (event) => {
      // Logic for swiping between views (card snapping) - much more sensitive
      const velocity = event.velocityX;
      const currentPosition = translateX.value;

      // Consider both position and velocity for more natural swiping
      const shouldSwitchToPersonal =
        currentPosition < -SWIPE_SENSITIVITY ||
        (currentPosition < -screenWidth * 0.1 && velocity < -500);

      if (shouldSwitchToPersonal) {
        // Snap to the "PersonalView" - only need to swipe 25% of screen width or fast swipe
        translateX.value = withSpring(-screenWidth, SMOOTH_SPRING_CONFIG);
      } else {
        // Snap back to the "BasicInfoView"
        translateX.value = withSpring(0, SMOOTH_SPRING_CONFIG);
      }
    },
  });

  const animatedStyle = useAnimatedStyle(() => {
    return {
      transform: [{ translateX: translateX.value }],
      opacity: opacity.value,
    };
  });

  const dot1Style = useAnimatedStyle(() => {
    // Determine if BasicInfoView is selected (within the sensitivity threshold)
    const isSelected = translateX.value > -SWIPE_SENSITIVITY;
    return {
      backgroundColor: isSelected ? Colors.primary500 : Colors.primary100,
    };
  });

  const dot2Style = useAnimatedStyle(() => {
    // Determine if PersonalView is selected
    const isSelected = translateX.value < -SWIPE_SENSITIVITY;
    return {
      backgroundColor: isSelected ? Colors.primary500 : Colors.primary100,
    };
  });

  const handleLike = () => {
    if (!isLiked && !isDisliked) {
      opacity.value = withSpring(0.5);
      runOnJS(setIsLiked)(true);
    }
  };

  const handleDislike = () => {
    if (!isLiked && !isDisliked) {
      opacity.value = withSpring(0.5);
      runOnJS(setIsDisliked)(true);
    }
  };

  return (
    <GestureHandlerRootView>
      <PanGestureHandler
        onGestureEvent={gestureHandler}
        activeOffsetX={[-5, 5]} // More sensitive horizontal detection
        activeOffsetY={[-15, 15]} // Slightly more sensitive vertical detection
        enabled={!isLiked && !isDisliked}
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
        style={styles.dislikeButton}
        onPress={handleDislike}
        disabled={isLiked || isDisliked}
      >
        <Octicons
          name={isDisliked ? "x-circle-fill" : "x-circle"}
          size={30}
          color={Colors.primary500}
        />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.thumbsUpButton}
        onPress={handleLike}
        disabled={isLiked || isDisliked}
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
  dislikeButton: {
    position: "absolute",
    bottom: 40,
    left: 25,
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
