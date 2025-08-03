import React, { useEffect, useRef } from "react";
import {
  View,
  StyleSheet,
  ActivityIndicator,
  Text,
  Image,
  Animated,
} from "react-native";
import Colors from "../constants/Colors";

interface LoadingScreenProps {
  loadingText: string;
  progressBar?: {
    progress: number; // 0 to 1
  };
}

export default function LoadingScreen({
  loadingText,
  progressBar,
}: LoadingScreenProps) {
  const animatedProgress = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    if (progressBar) {
      Animated.timing(animatedProgress, {
        toValue: Math.max(0, Math.min(1, progressBar.progress)),
        duration: 500, // Smooth animation over 500ms
        useNativeDriver: false,
      }).start();
    }
  }, [progressBar?.progress, animatedProgress]);

  const progressWidth = animatedProgress.interpolate({
    inputRange: [0, 1],
    outputRange: ["0%", "100%"],
  });

  const progressPercentage = animatedProgress.interpolate({
    inputRange: [0, 1],
    outputRange: [0, 100],
  });

  return (
    <View style={styles.container}>
      <Image
        tintColor={Colors.primary500}
        source={require("../assets/logo.png")}
        style={styles.logo}
        resizeMode="contain"
      />
      {progressBar ? (
        <View style={styles.progressBarContainer}>
          <View style={styles.progressBarBackground}>
            <Animated.View
              style={[
                styles.progressBarFill,
                {
                  width: progressWidth,
                },
              ]}
            />
          </View>
          <Animated.Text style={styles.progressText}>
            {Math.round(progressPercentage)}%
          </Animated.Text>
        </View>
      ) : (
        <ActivityIndicator
          size="large"
          color={Colors.primary500}
          style={styles.spinner}
        />
      )}
      <Text style={styles.text}>{loadingText}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.secondary100,
    justifyContent: "center",
    alignItems: "center",
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 20,
  },
  spinner: {
    marginBottom: 20,
  },
  progressBarContainer: {
    width: 220,
    alignItems: "center",
    marginBottom: 20,
  },
  progressBarBackground: {
    width: "100%",
    height: 16,
    backgroundColor: Colors.secondary200,
    borderRadius: 8,
    overflow: "hidden",
  },
  progressBarFill: {
    height: "100%",
    backgroundColor: Colors.primary500,
    borderRadius: 8,
  },
  progressText: {
    marginTop: 6,
    color: Colors.primary500,
    fontWeight: "bold",
    fontSize: 14,
  },
  text: {
    fontSize: 18,
    color: Colors.primary500,
    textAlign: "center",
  },
});
