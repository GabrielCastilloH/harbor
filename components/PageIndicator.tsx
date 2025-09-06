import React from "react";
import { View, StyleSheet } from "react-native";
import Colors from "../constants/Colors";

export interface PageIndicatorProps {
  currentView: number;
}

export default function PageIndicator({ currentView }: PageIndicatorProps) {
  const totalViews = 2; // We now have 2 views: BasicInfo and PersonalView

  return (
    <View style={styles.pageIndicator}>
      {Array.from({ length: totalViews }, (_, idx) => (
        <View
          key={idx}
          style={[styles.dot, idx === currentView && styles.activeDot]}
        />
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  pageIndicator: {
    flexDirection: "row",
    justifyContent: "space-between",
    paddingTop: 16,
    paddingHorizontal: 15,
  },
  dot: {
    flex: 1,
    height: 4,
    borderRadius: 2,
    backgroundColor: "rgba(220, 240, 245, 0.8)",
    marginHorizontal: 2,
  },
  activeDot: {
    backgroundColor: Colors.primary500,
  },
});
