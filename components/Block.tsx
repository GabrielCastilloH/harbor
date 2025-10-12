import React, { useState } from "react";
import {
  StyleSheet,
  Dimensions,
  View,
  TouchableOpacity,
  Alert,
  ScrollView,
} from "react-native";
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
import MatchModal from "./MatchModal";
import { Profile } from "../types/App";
import Colors from "../constants/Colors";
import { FontAwesome, Octicons } from "@expo/vector-icons";
import { useAppContext } from "../context/AppContext";
import { SwipeService } from "../networking/SwipeService";

const { width: screenWidth } = Dimensions.get("window");
const SWIPE_THRESHOLD = screenWidth * 0.15; // 15% of screen width - more sensitive
const SWIPE_SENSITIVITY = screenWidth * 0.12; // Lower threshold for easier switching

// Define a spring configuration with reduced bounce/overshoot
const SMOOTH_SPRING_CONFIG = {
  damping: 26,
  stiffness: 240,
  mass: 0.9,
  overshootClamping: true,
  restDisplacementThreshold: 0.5,
  restSpeedThreshold: 0.5,
};

// Require stronger horizontal intent before activating page swipe
const VERTICAL_SCROLL_PRIORITY_SLOP = 20;

interface PostProps {
  profile: Profile;
  onUserRemoved?: (userId: string) => void;
}

const Post = ({ profile, onUserRemoved }: PostProps) => {
  const { userId, profile: currentUserProfile } = useAppContext();
  const translateX = useSharedValue(0);
  const opacity = useSharedValue(1);

  const [isLiked, setIsLiked] = useState(false);
  const [isDisliked, setIsDisliked] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [matchedProfile, setMatchedProfile] = useState<Profile | null>(null);
  const [matchId, setMatchId] = useState<string | null>(null);

  const gestureHandler = useAnimatedGestureHandler({
    onStart: (_, context: any) => {
      if (isLiked || isDisliked || isProcessing) {
        return;
      }
      context.startX = translateX.value;
    },
    onActive: (event, context: any) => {
      if (isLiked || isDisliked || isProcessing) {
        return;
      }
      const proposed = context.startX + event.translationX;
      // Clamp between 0 (BasicInfoView) and -screenWidth (PersonalView)
      const clamped = Math.max(-screenWidth, Math.min(0, proposed));
      translateX.value = clamped;
    },
    onEnd: (event) => {
      const velocity = event.velocityX;
      const currentPosition = translateX.value;

      const fastLeft = velocity < -300;
      const fastRight = velocity > 300;

      if (fastLeft) {
        translateX.value = withSpring(-screenWidth, SMOOTH_SPRING_CONFIG);
        return;
      }
      if (fastRight) {
        translateX.value = withSpring(0, SMOOTH_SPRING_CONFIG);
        return;
      }

      // Snap to whichever view we're closer to
      const halfwayPoint = -screenWidth / 2;
      if (currentPosition < halfwayPoint) {
        translateX.value = withSpring(-screenWidth, SMOOTH_SPRING_CONFIG);
      } else {
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

  const handleLike = async () => {
    if (!isLiked && !isDisliked && !isProcessing && userId && profile.uid) {
      setIsProcessing(true);
      try {
        const result = await SwipeService.createSwipe(
          userId,
          profile.uid,
          "right"
        );

        // Update UI state
        opacity.value = withSpring(0.5);
        setIsLiked(true);

        // Handle match result if there's a match
        if (result.match) {
          setMatchedProfile(profile);
          setMatchId(result.matchId || null);
          setShowMatchModal(true);
        }
      } catch (error: any) {
        console.error("Error creating like swipe:", error);

        // Show user-friendly error message
        if (error.code === "resource-exhausted") {
          Alert.alert(
            "Daily Limit Reached",
            "You've reached your daily swipe limit. Come back tomorrow!"
          );
        } else if (error.code === "permission-denied") {
          Alert.alert(
            "Cannot Swipe",
            error.message || "You cannot swipe on this user right now."
          );
        } else {
          Alert.alert("Error", "Failed to record swipe. Please try again.");
        }

        // Reset UI state on error
        opacity.value = withSpring(1);
      } finally {
        setIsProcessing(false);
      }
    }
  };

  const handleDislike = async () => {
    if (!isLiked && !isDisliked && !isProcessing && userId && profile.uid) {
      setIsProcessing(true);
      try {
        await SwipeService.createSwipe(userId, profile.uid, "left");

        // Update UI state
        opacity.value = withSpring(0.5);
        setIsDisliked(true);
      } catch (error: any) {
        console.error("Error creating dislike swipe:", error);

        // Show user-friendly error message
        if (error.code === "resource-exhausted") {
          Alert.alert(
            "Daily Limit Reached",
            "You've reached your daily swipe limit. Come back tomorrow!"
          );
        } else if (error.code === "permission-denied") {
          Alert.alert(
            "Cannot Swipe",
            error.message || "You cannot swipe on this user right now."
          );
        } else {
          Alert.alert("Error", "Failed to record swipe. Please try again.");
        }

        // Reset UI state on error
        opacity.value = withSpring(1);
      } finally {
        setIsProcessing(false);
      }
    }
  };

  return (
    <GestureHandlerRootView>
      <PanGestureHandler
        onGestureEvent={gestureHandler}
        // Prioritize vertical scroll by requiring stronger horizontal movement
        activeOffsetX={[
          -VERTICAL_SCROLL_PRIORITY_SLOP,
          VERTICAL_SCROLL_PRIORITY_SLOP,
        ]}
        enabled={!isLiked && !isDisliked && !isProcessing}
      >
        <Animated.View style={[styles.container, animatedStyle]}>
          <ScrollView style={styles.viewContainer}>
            <BasicInfoView profile={profile} />
          </ScrollView>
          <ScrollView style={styles.viewContainer}>
            <PersonalView
              profile={profile}
              showFlag={true}
              onUserRemoved={onUserRemoved}
            />
          </ScrollView>
        </Animated.View>
      </PanGestureHandler>

      <View style={styles.indicatorContainer}>
        <Animated.View style={[styles.dot, dot1Style]} />
        <Animated.View style={[styles.dot, dot2Style]} />
      </View>

      <TouchableOpacity
        style={styles.dislikeButton}
        onPress={handleDislike}
        disabled={isLiked || isDisliked || isProcessing}
      >
        <Octicons
          name={isDisliked ? "x-circle-fill" : "x-circle"}
          size={30}
          color={isProcessing ? Colors.secondary500 : Colors.primary500}
        />
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.thumbsUpButton}
        onPress={handleLike}
        disabled={isLiked || isDisliked || isProcessing}
      >
        <FontAwesome
          name={isLiked ? "thumbs-up" : "thumbs-o-up"}
          size={30}
          color={isProcessing ? Colors.secondary500 : Colors.primary500}
        />
      </TouchableOpacity>

      <MatchModal
        visible={showMatchModal}
        onClose={() => setShowMatchModal(false)}
        matchedProfile={matchedProfile}
        currentProfile={currentUserProfile}
        matchId={matchId || undefined}
      />
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
