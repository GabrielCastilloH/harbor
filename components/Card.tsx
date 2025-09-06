import React, { useState } from "react";
import {
  View,
  StyleSheet,
  Animated,
  Image,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "../constants/Colors";
import { Profile } from "../types/App";
import BasicInfoView from "./BasicInfoView";
import PersonalView from "./PersonalView";
import { getImageSource } from "../util/imageUtils";

type CardProps = {
  profile: Profile;
  getCardStyle: () => any;
  panHandlers: any;
  isTopCard: boolean;
  currentView: number;
  setCurrentView: (view: number) => void;
};

export default function Card({
  profile,
  getCardStyle,
  panHandlers,
  isTopCard,
  currentView,
  setCurrentView,
}: CardProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Handle cycling through profile images
  const nextImage = () => {
    if (profile.images && profile.images.length > 0) {
      setCurrentImageIndex((prev) => (prev + 1) % profile.images.length);
    }
  };

  return (
    <Animated.View
      style={[
        styles.cardStyle,
        isTopCard ? getCardStyle() : {},
        { zIndex: isTopCard ? 1 : 0 },
      ]}
      {...(isTopCard ? panHandlers : {})}
    >
      <View style={styles.contentContainer}>
        {currentView === 0 ? (
          <BasicInfoView profile={profile} />
        ) : (
          <PersonalView profile={profile} />
        )}
      </View>

      {/* Navigation arrows - only show on top card */}
      {isTopCard && (
        <View style={styles.navigationContainer}>
          {/* Left arrow - show if we can go back */}
          {currentView > 0 && (
            <View style={styles.leftArrowContainer}>
              <Ionicons name="arrow-back" size={24} color={Colors.primary500} />
            </View>
          )}

          {/* Right arrow - show if we can go forward - always position on right */}
          {currentView < 1 && (
            <View style={styles.rightArrowContainer}>
              <Ionicons
                name="arrow-forward"
                size={24}
                color={Colors.primary500}
              />
            </View>
          )}
        </View>
      )}
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  cardStyle: {
    position: "absolute",
    width: "92%",
    height: "96%",
    backgroundColor: Colors.secondary100,
    borderRadius: 24,
    marginHorizontal: 0,
    marginVertical: 0,
    borderWidth: 3,
    borderColor: `${Colors.primary500}50`,
    overflow: "hidden",
  },
  gradient: {
    position: "absolute",
    left: 0,
    right: 0,
    top: 0,
    height: "100%",
  },
  contentContainer: {
    flex: 1,
    padding: 24,
  },
  imageContainer: {
    width: "100%",
    alignItems: "center",
    marginTop: 10,
  },
  image: {
    width: 200,
    height: 200,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.primary500,
  },
  navigationContainer: {
    position: "absolute",
    bottom: 20,
    left: 24,
    right: 24,
    flexDirection: "row",
    justifyContent: "space-between",
    pointerEvents: "none", // Allow taps to pass through to the gesture handler
  },
  leftArrowContainer: {
    backgroundColor: `${Colors.secondary100}E6`, // Semi-transparent background
    borderRadius: 20,
    padding: 8,
    alignSelf: "flex-start",
  },
  rightArrowContainer: {
    backgroundColor: `${Colors.secondary100}E6`, // Semi-transparent background
    borderRadius: 20,
    padding: 8,
    alignSelf: "flex-end",
    marginLeft: "auto", // Push to the right even when left arrow is hidden
  },
});
