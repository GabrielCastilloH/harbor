import React from "react";
import { View, Text, StyleSheet, Pressable, Alert } from "react-native";
import { useNavigation } from "@react-navigation/native";
import { usePlacement, useUser } from "expo-superwall";
import Colors from "../constants/Colors";
import { useAppContext } from "../context/AppContext";
import AsyncStorage from "@react-native-async-storage/async-storage";

export default function PaywallScreen() {
  const navigation = useNavigation();
  const { userId } = useAppContext();
  const { subscriptionStatus } = useUser();

  const { registerPlacement, state: placementState } = usePlacement({
    onError: (err) => {
      console.error("Paywall Error:", err);
      Alert.alert("Error", "Failed to load paywall. Please try again.");
    },
    onPresent: (info) => {
      console.log("Paywall Presented:", info);
    },
    onDismiss: (info, result) => {
      console.log("Paywall Dismissed:", info, "Result:", result);

      // Handle different dismissal results
      if (result.type === "purchased") {
        // User purchased, continue to app
        markPaywallAsSeen();
        navigation.navigate("HomeTab" as never);
      } else if (result.type === "restored") {
        // User restored purchase, continue to app
        markPaywallAsSeen();
        navigation.navigate("HomeTab" as never);
      } else {
        // User dismissed without purchasing, show option to continue
        Alert.alert(
          "Continue to App",
          "You can continue using the app with limited features, or upgrade to premium for full access.",
          [
            {
              text: "Continue with Limited Features",
              onPress: () => {
                markPaywallAsSeen();
                navigation.navigate("HomeTab" as never);
              },
            },
            {
              text: "Show Paywall Again",
              onPress: () => handleShowPaywall(),
            },
          ]
        );
      }
    },
    onSkip: (reason) => {
      console.log("Paywall Skipped:", reason);
      // User was allowed through without paywall (e.g., already subscribed)
      markPaywallAsSeen();
      navigation.navigate("HomeTab" as never);
    },
  });

  const markPaywallAsSeen = async () => {
    if (userId) {
      try {
        await AsyncStorage.setItem(`@paywall_seen_${userId}`, "true");
      } catch (error) {
        console.error("Error marking paywall as seen:", error);
      }
    }
  };

  const handleShowPaywall = async () => {
    try {
      await registerPlacement({
        placement: "onboarding_paywall", // This should match your Superwall dashboard placement
        feature: () => {
          // This runs if no paywall is shown (user already has access)
          markPaywallAsSeen();
          navigation.navigate("HomeTab" as never);
        },
      });
    } catch (error) {
      console.error("Error showing paywall:", error);
      Alert.alert("Error", "Failed to show paywall. Please try again.");
    }
  };

  const handleSkipForNow = () => {
    Alert.alert(
      "Skip Paywall",
      "You can upgrade to premium anytime from the settings screen.",
      [
        {
          text: "Continue to App",
          onPress: () => {
            markPaywallAsSeen();
            navigation.navigate("HomeTab" as never);
          },
        },
        {
          text: "Show Paywall",
          onPress: handleShowPaywall,
        },
      ]
    );
  };

  // Check if user is already subscribed
  if (subscriptionStatus?.status === "ACTIVE") {
    // User is already subscribed, go directly to app
    markPaywallAsSeen();
    navigation.navigate("HomeTab" as never);
    return null;
  }

  return (
    <View style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Welcome to Harbor</Text>
        <Text style={styles.subtitle}>
          Connect with other Cornell students and find meaningful relationships
        </Text>

        <View style={styles.featuresContainer}>
          <Text style={styles.featuresTitle}>Premium Features:</Text>
          <Text style={styles.feature}>• Unlimited matches</Text>
          <Text style={styles.feature}>• Advanced filters</Text>
          <Text style={styles.feature}>• Priority support</Text>
          <Text style={styles.feature}>• Enhanced privacy controls</Text>
        </View>

        <Pressable style={styles.primaryButton} onPress={handleShowPaywall}>
          <Text style={styles.primaryButtonText}>Upgrade to Premium</Text>
        </Pressable>

        <Pressable style={styles.secondaryButton} onPress={handleSkipForNow}>
          <Text style={styles.secondaryButtonText}>
            Continue with Limited Features
          </Text>
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.secondary100,
  },
  content: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    paddingHorizontal: 24,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: Colors.primary500,
    textAlign: "center",
    marginBottom: 12,
  },
  subtitle: {
    fontSize: 16,
    color: Colors.secondary500,
    textAlign: "center",
    marginBottom: 40,
    lineHeight: 24,
  },
  featuresContainer: {
    marginBottom: 40,
    alignItems: "center",
  },
  featuresTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.primary500,
    marginBottom: 16,
  },
  feature: {
    fontSize: 16,
    color: Colors.secondary500,
    marginBottom: 8,
  },
  primaryButton: {
    backgroundColor: Colors.primary500,
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 8,
    marginBottom: 16,
    width: "100%",
    alignItems: "center",
  },
  primaryButtonText: {
    color: Colors.secondary100,
    fontSize: 16,
    fontWeight: "bold",
  },
  secondaryButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 8,
    width: "100%",
    alignItems: "center",
  },
  secondaryButtonText: {
    color: Colors.primary500,
    fontSize: 16,
    fontWeight: "600",
  },
});
