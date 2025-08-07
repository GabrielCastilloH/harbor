import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Platform,
  Alert,
  Linking,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import React, { useState } from "react";
import { useNavigation } from "@react-navigation/native";
import Ionicons from "@expo/vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { GoogleSignin } from "@react-native-google-signin/google-signin";
import { signOut } from "firebase/auth";
import { auth } from "../firebaseConfig";
import Colors from "../constants/Colors";
import { useAppContext } from "../context/AppContext";
import { usePlacement, useUser } from "expo-superwall";
import SettingsButton from "../components/SettingsButton";
import MainHeading from "../components/MainHeading";

export default function SettingsScreen() {
  const navigation = useNavigation();
  const { setIsAuthenticated, setUserId, userId } = useAppContext();
  const [notifications, setNotifications] = useState(true);
  const [darkMode, setDarkMode] = useState(false);
  const [locationServices, setLocationServices] = useState(true);
  const { subscriptionStatus } = useUser();

  const { registerPlacement } = usePlacement({
    onError: (err) => {
      console.error("Premium Paywall Error:", err);
      Alert.alert("Error", "Failed to load premium options. Please try again.");
    },
    onPresent: (info) => {
      // Premium paywall presented
    },
    onDismiss: (info, result) => {
      // Handle dismissal - user can continue using the app
    },
    onSkip: (reason) => {
      // User was allowed through without paywall (e.g., already subscribed)
    },
  });

  const handlePremiumUpgrade = async () => {
    try {
      await registerPlacement({
        placement: "settings_premium", // This should match your Superwall dashboard placement
        feature: () => {
          // This runs if no paywall is shown (user already has access)
          // Check if user actually has premium or if it's due to no products
          if (subscriptionStatus?.status === "ACTIVE") {
            Alert.alert("Premium", "You already have premium access!");
          } else {
            Alert.alert(
              "Premium",
              "Premium features are not yet available. Please check back later!"
            );
          }
        },
      });
    } catch (error) {
      console.error("Error showing premium paywall:", error);
      Alert.alert("Error", "Failed to show premium options. Please try again.");
    }
  };

  const handleSignOut = async () => {
    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Sign Out",
        onPress: async () => {
          try {
            // Sign out from Google Sign-In
            await GoogleSignin.signOut();

            // Sign out from Firebase Auth
            await signOut(auth);

            // Clear AsyncStorage
            await AsyncStorage.multiRemove([
              "@user",
              "@authToken",
              "@streamApiKey",
              "@streamUserToken",
            ]);

            // Clear app context state
            setIsAuthenticated(false);
            setUserId(null); // Use null instead of empty string
          } catch (error) {
            console.error("❌ [SETTINGS] Error signing out:", error);
          }
        },
      },
    ]);
  };

  const handleViewProfile = () => {
    // Navigate to view own profile (with blurred photos)
    navigation.navigate("SelfProfile" as never);
  };

  const handlePrivacyPolicy = () => {
    Linking.openURL("https://www.tryharbor.app/privacy");
  };

  const handleTermsAndConditions = () => {
    Linking.openURL("https://www.tryharbor.app/terms");
  };

  const isPremium = subscriptionStatus?.status === "ACTIVE";

  return (
    <>
      <MainHeading title="App Settings" />
      <ScrollView style={styles.container}>
        {/* Preferences Section */}
        <View style={[styles.section, styles.firstSection]}>
          <Text style={styles.sectionTitle}>Preferences</Text>

          <SettingsButton
            icon="notifications-outline"
            text="Notifications"
            switchProps={{
              value: notifications,
              onValueChange: setNotifications,
            }}
          />
        </View>

        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>

          <SettingsButton
            icon="person-outline"
            text="Edit Profile"
            onPress={() => navigation.navigate("Profile" as never)}
          />

          <SettingsButton
            icon="eye-outline"
            text="View Profile"
            onPress={handleViewProfile}
          />

          <SettingsButton
            icon="star-outline"
            text={isPremium ? "Premium Active" : "Upgrade to Premium"}
            onPress={handlePremiumUpgrade}
          />
        </View>

        {/* Legal Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Legal</Text>

          <SettingsButton
            icon="shield-outline"
            text="Privacy Policy"
            onPress={handlePrivacyPolicy}
          />

          <SettingsButton
            icon="document-text-outline"
            text="Terms & Conditions"
            onPress={handleTermsAndConditions}
          />
        </View>

        {/* Sign Out Section */}
        <View style={styles.section}>
          <SettingsButton
            icon="log-out-outline"
            text="Sign Out"
            onPress={handleSignOut}
            isDestructive={true}
          />
        </View>
      </ScrollView>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.secondary100,
  },
  section: {
    paddingHorizontal: 20,
    paddingTop: 10,
    paddingBottom: 0,
    marginBottom: 14, // Middle ground spacing between sections
  },
  firstSection: {
    marginTop: 10, // Moderate space from top for Preferences
  },
  sectionTitle: {
    fontSize: 20, // Larger
    fontWeight: "500", // Medium boldness
    color: Colors.primary500,
    marginBottom: 8,
    marginTop: 0,
  },
  lastButton: {
    marginBottom: 0, // Remove extra space below last button
  },
});
