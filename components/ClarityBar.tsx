import React from "react";
import { View, Text, StyleSheet } from "react-native";
import Colors from "../constants/Colors";

interface ClarityBarProps {
  clarityPercent?: number;
}

const ClarityBar: React.FC<ClarityBarProps> = ({ clarityPercent }) => {
  if (typeof clarityPercent !== "number") {
    return null; // Don't render if there's no clarity percentage
  }

  return (
    <View style={styles.clarityContainer}>
      <Text style={styles.clarityLabel}>
        {Math.round(clarityPercent)}% Clear
      </Text>
      <View style={styles.clarityTrack}>
        <View
          style={[
            styles.clarityFill,
            {
              width: `${Math.max(
                0,
                Math.min(100, Math.round(clarityPercent))
              )}%`,
            },
          ]}
        />
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  clarityContainer: {
    flexDirection: "row",
    alignItems: "center",
    paddingVertical: 8,
  },
  clarityLabel: {
    marginRight: 8,
    color: Colors.primary500,
    fontWeight: "600",
    fontSize: 14,
    minWidth: 72,
  },
  clarityTrack: {
    flex: 1,
    height: 8,
    borderRadius: 8,
    backgroundColor: "#e6eef1",
    overflow: "hidden",
  },
  clarityFill: {
    height: 8,
    borderRadius: 8,
    backgroundColor: Colors.primary500,
  },
});

export default ClarityBar;
