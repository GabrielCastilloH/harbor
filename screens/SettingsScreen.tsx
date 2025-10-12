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
import { useNavigation, useFocusEffect } from "@react-navigation/native";
import Ionicons from "@expo/vector-icons/Ionicons";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { signOut } from "firebase/auth";
import { auth } from "../firebaseConfig";
import Colors from "../constants/Colors";
import { useAppContext } from "../context/AppContext";
import { streamNotificationService } from "../util/streamNotifService";
import { requestInAppReview } from "../util/inAppReviewUtils";
// PREMIUM DISABLED: Superwall imports commented out
// import { usePlacement, useUser } from "expo-superwall";
// import { useUser } from "expo-superwall"; // PREMIUM DISABLED
import SettingsButton from "../components/SettingsButton";
import MainHeading from "../components/MainHeading";
import DeleteAccountButton from "../components/DeleteAccountButton";
import DeactivateAccountButton from "../components/DeactivateAccountButton";
import { UserService } from "../networking/UserService";

export default function SettingsScreen() {
  const navigation = useNavigation();
  const { setUserId, userId } = useAppContext();
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [userProfile, setUserProfile] = useState<any>(null);

  const [isLoadingProfile, setIsLoadingProfile] = useState(true);
  const [notificationPermissionStatus, setNotificationPermissionStatus] =
    useState<boolean | null>(null);
  const [darkMode, setDarkMode] = useState(false);
  const [locationServices, setLocationServices] = useState(true);
  // PREMIUM DISABLED: useUser commented out
  // const { user } = useUser();

  // Check notification permission status
  const checkNotificationPermission = React.useCallback(async () => {
    try {
      const hasPermission =
        await streamNotificationService.areNotificationsEnabled();
      setNotificationPermissionStatus(hasPermission);
    } catch (error) {
      console.error("Error checking notification permission:", error);
      setNotificationPermissionStatus(false);
    }
  }, []);

  // Fetch user profile to get isActive status and group size
  const fetchUserProfile = React.useCallback(async () => {
    if (!userId) return;

    setIsLoadingProfile(true);
    try {
      const profile = await UserService.getUserById(userId);

      // Handle the nested structure returned by UserService
      const userData = profile.user || profile;
      setUserProfile(userData);
    } catch (error) {
      console.error("Error fetching user profile:", error);
    } finally {
      setIsLoadingProfile(false);
    }
  }, [userId]);

  // Fetch profile and check notification permission on mount
  React.useEffect(() => {
    fetchUserProfile();
    checkNotificationPermission();
  }, [fetchUserProfile, checkNotificationPermission]);

  // Refresh profile data and notification status when screen comes into focus
  useFocusEffect(
    React.useCallback(() => {
      fetchUserProfile();
      checkNotificationPermission();
    }, [fetchUserProfile, checkNotificationPermission])
  );

  const handleAccountStatusChange = (isActive: boolean) => {
    setUserProfile((prev: any) => ({ ...prev, isActive }));
  };

  const handleNotificationSettingsTap = () => {
    if (notificationPermissionStatus === false) {
      Alert.alert(
        "Enable Notifications",
        "To receive notifications, please enable them in your device settings.\n\nGo to Settings > Notifications > Harbor and turn on Allow Notifications.",
        [
          {
            text: "Open Settings",
            onPress: () => {
              if (Platform.OS === "ios") {
                Linking.openURL("app-settings:");
              } else {
                Linking.openSettings();
              }
            },
          },
          { text: "Cancel", style: "cancel" },
        ]
      );
    } else {
      Alert.alert(
        "Notifications Enabled",
        "You're currently receiving notifications. To change this, go to your device settings.",
        [
          {
            text: "Open Settings",
            onPress: () => {
              if (Platform.OS === "ios") {
                Linking.openURL("app-settings:");
              } else {
                Linking.openSettings();
              }
            },
          },
          { text: "OK", style: "cancel" },
        ]
      );
    }
  };

  // PREMIUM DISABLED: Superwall paywall placement commented out
  // const { registerPlacement } = usePlacement({
  //   onError: (err) => {
  //     console.error("Premium Paywall Error:", err);
  //     Alert.alert("Error", "Failed to load premium options. Please try again.");
  //   },
  //   onPresent: (info) => {
  //     // Premium paywall presented
  //   },
  //   onDismiss: (info, result) => {
  //     // Handle dismissal - user can continue using the app
  //   },
  //   onSkip: (reason) => {
  //     // User was allowed through without paywall (e.g., already subscribed)
  //   },
  // });

  // PREMIUM DISABLED: Premium upgrade function commented out
  const handlePremiumUpgrade = async () => {
    // Premium functionality disabled
    Alert.alert(
      "Feature Unavailable",
      "Premium features are currently unavailable."
    );

    // Original implementation commented out:
    // try {
    //   await registerPlacement({
    //     placement: "settings_premium", // This should match your Superwall dashboard placement
    //     feature: () => {
    //       // This runs if no paywall is shown (user already has access)
    //       // Check if user actually has premium or if it's due to no products
    //       if (user?.subscriptionStatus === "ACTIVE") {
    //         Alert.alert("Premium", "You already have premium access!");
    //       } else {
    //         Alert.alert(
    //           "Premium",
    //           "Premium features are not yet available. Please check back later!"
    //         );
    //       }
    //     },
    //   });
    // } catch (error) {
    //   console.error("Error showing premium paywall:", error);
    //   Alert.alert("Error", "Failed to show premium options. Please try again.");
    // }
  };

  const handleSignOut = async () => {
    if (isSigningOut) return; // Prevent multiple sign out attempts

    Alert.alert("Sign Out", "Are you sure you want to sign out?", [
      {
        text: "Cancel",
        style: "cancel",
      },
      {
        text: "Sign Out",
        onPress: async () => {
          setIsSigningOut(true);
          try {
            // Run operations in parallel for better performance
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

            // Clear app context state (this happens instantly)
            setUserId(null);
          } catch (error) {
            console.error("❌ [SETTINGS] Error signing out:", error);
            Alert.alert("Error", "Failed to sign out. Please try again.");
          } finally {
            setIsSigningOut(false);
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

  const handleSupport = () => {
    Linking.openURL("https://www.tryharbor.app/support");
  };

  const handleAppReview = async () => {
    await requestInAppReview();
  };

  // PREMIUM DISABLED: Always set premium to false
  const isPremium = false;
  // Original: const isPremium = user?.subscriptionStatus === "ACTIVE";

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
            onPress={handleNotificationSettingsTap}
            status={{
              text:
                notificationPermissionStatus === null
                  ? "Checking..."
                  : notificationPermissionStatus
                  ? "Enabled"
                  : "Disabled",
              color:
                notificationPermissionStatus === null
                  ? Colors.secondary500
                  : notificationPermissionStatus
                  ? Colors.green
                  : Colors.red,
            }}
          />
        </View>

        {/* Profile Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profile</Text>

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

          {/* PREMIUM DISABLED: Premium button commented out */}
          {/* <SettingsButton
            icon="star-outline"
            text={isPremium ? "Premium Active" : "Upgrade to Premium"}
            onPress={handlePremiumUpgrade}
          /> */}
        </View>

        {/* Help & Legal Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Help & Legal</Text>

          <SettingsButton
            icon="help-circle-outline"
            text="Support"
            onPress={handleSupport}
          />

          <SettingsButton
            icon="star-outline"
            text="Rate Harbor"
            onPress={handleAppReview}
          />

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

        {/* Account Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>

          {/* Deactivate/Reactivate Account Button - Always shown */}
          <DeactivateAccountButton
            isActive={userProfile?.isActive !== false} // Default to true if undefined or null
            onStatusChange={handleAccountStatusChange}
            isLoading={isLoadingProfile}
          />

          {/* Sign Out Button */}
          <SettingsButton
            icon="log-out-outline"
            text="Sign Out"
            onPress={handleSignOut}
            isDestructive={false}
            isLoading={isSigningOut}
            disabled={isSigningOut}
          />
        </View>

        {/* Delete Account Section */}
        <View style={styles.section}>
          <DeleteAccountButton />
        </View>

        {/* Footer */}
        <View style={styles.footer}>
          <Text style={styles.footerText}>
            Made with ❤️ by Gabriel Castillo & Co.
          </Text>
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
  footer: {
    marginBottom: 20,
    paddingVertical: 20,
    alignItems: "center",
    justifyContent: "center",
  },
  footerText: {
    fontSize: 14,
    color: "#788a87",
    textAlign: "center",
    fontStyle: "italic",
  },
});
