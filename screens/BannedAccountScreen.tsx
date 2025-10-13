import React from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { signOut } from "firebase/auth";
import { auth } from "../firebaseConfig";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Colors from "../constants/Colors";

export default function BannedAccountScreen() {
  const handleBackToSignIn = async () => {
    try {
      // Use the EXACT same logic as SettingsScreen
      await Promise.all([
        // Sign out from Firebase Auth
        signOut(auth),
        // Clear AsyncStorage
        AsyncStorage.multiRemove([
          "@user",
          "@authToken",
          "@streamApiKey",
          "@streamUserToken",
        ]),
      ]);
    } catch (error) {
      console.error("❌ [BANNED SCREEN] Error during sign out:", error);
    }
  };
  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.content}>
        {/* Icon */}
        <View style={styles.iconContainer}>
          <Ionicons name="ban" size={80} color={Colors.strongRed} />
        </View>

        {/* Title */}
        <Text style={styles.title}>Account Suspended</Text>

        {/* Message */}
        <Text style={styles.message}>
          Your account has been suspended due to a violation of our community
          guidelines.
        </Text>

        {/* Sub message */}
        <Text style={styles.subMessage}>
          If you believe this is an error or would like to appeal this decision,
          please contact our support team at tryharborapp@gmail.com.
        </Text>

        {/* Back to Sign In Button */}
        <TouchableOpacity
          style={styles.backButton}
          onPress={handleBackToSignIn}
        >
          <Text style={styles.backButtonText}>Back to Sign In</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
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
    padding: 20,
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.strongRed + "20",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 30,
  },
  title: {
    fontSize: 28,
    fontWeight: "bold",
    color: Colors.strongRed,
    marginBottom: 20,
    textAlign: "center",
  },
  message: {
    fontSize: 18,
    color: Colors.black,
    textAlign: "center",
    marginBottom: 15,
    lineHeight: 24,
    paddingHorizontal: 10,
  },
  subMessage: {
    fontSize: 16,
    color: Colors.secondary500,
    textAlign: "center",
    marginBottom: 40,
    lineHeight: 22,
    paddingHorizontal: 10,
  },
  brandingContainer: {
    alignItems: "center",
    marginTop: 20,
  },
  brandingText: {
    fontSize: 20,
    fontWeight: "bold",
    color: Colors.primary500,
    marginBottom: 5,
  },
  brandingSubtext: {
    fontSize: 14,
    color: Colors.secondary500,
    fontStyle: "italic",
  },
  backButton: {
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary500,
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    marginBottom: 40,
    elevation: 2,
    shadowColor: Colors.black,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
  },
  backButtonText: {
    color: Colors.secondary100,
    fontSize: 16,
    fontWeight: "600",
  },
});
