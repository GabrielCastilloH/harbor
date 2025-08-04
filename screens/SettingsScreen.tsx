import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Switch,
  Platform,
  Alert,
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

export default function SettingsScreen() {
  const navigation = useNavigation();
  const { setIsAuthenticated, setUserId } = useAppContext();
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

  const isPremium = subscriptionStatus?.status === "ACTIVE";

  return (
    <>
      <SafeAreaView
        edges={["top"]}
        style={{ backgroundColor: Colors.primary100 }}
      >
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            paddingTop: 24, // Increased space from the top
            paddingBottom: 16, // Increased from 8 to add more space below the text
            paddingHorizontal: 16,
            backgroundColor: Colors.primary100,
          }}
        >
          <Text
            style={{
              fontSize: 24, // Increased from 20 to make text larger
              fontWeight: "bold",
              color: Colors.primary500,
            }}
          >
            App Settings
          </Text>
        </View>
      </SafeAreaView>
      <ScrollView style={styles.container}>
        <View style={[styles.section, { paddingTop: 5 }]}>
          <View style={styles.setting}>
            <Text style={styles.settingText}>Notifications</Text>
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ false: Colors.primary500, true: Colors.primary500 }}
              thumbColor={Colors.secondary100}
            />
          </View>
          <TouchableOpacity
            style={styles.profileButton}
            onPress={() => navigation.navigate("Profile" as never)}
          >
            <Ionicons
              name="person-circle"
              size={24}
              color={Colors.primary500}
            />
            <Text style={styles.profileButtonText}>Edit Profile</Text>
          </TouchableOpacity>
        </View>

        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Account</Text>

          {/* Premium Button */}
          <TouchableOpacity
            style={[styles.button, isPremium && styles.premiumActiveButton]}
            onPress={handlePremiumUpgrade}
          >
            <Ionicons name="star" size={20} color={Colors.primary500} />
            <Text
              style={[styles.buttonText, isPremium && styles.premiumActiveText]}
            >
              {isPremium ? "Premium Active" : "Upgrade to Premium"}
            </Text>
            {isPremium && (
              <Ionicons
                name="checkmark-circle"
                size={20}
                color={Colors.primary500}
                style={styles.checkmark}
              />
            )}
          </TouchableOpacity>

          <TouchableOpacity style={styles.button}>
            <Ionicons name="lock-closed" size={20} color={Colors.primary500} />
            <Text style={styles.buttonText}>Privacy Policy</Text>
          </TouchableOpacity>
          <TouchableOpacity style={styles.button}>
            <Ionicons
              name="document-text"
              size={20}
              color={Colors.primary500}
            />
            <Text style={styles.buttonText}>Terms of Service</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.button, styles.logoutButton]}
            onPress={handleSignOut}
          >
            <Ionicons name="log-out" size={20} color={Colors.primary500} />
            <Text style={[styles.buttonText, styles.logoutText]}>Sign Out</Text>
          </TouchableOpacity>
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
  profileButton: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.primary100,
    padding: 15,
    marginTop: 10,
    borderRadius: 10,
    justifyContent: "center",
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: {
          width: 0,
          height: 2,
        },
        shadowOpacity: 0.2,
        shadowRadius: 1,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  profileButtonText: {
    color: Colors.primary500,
    fontSize: 18,
    fontWeight: "bold",
    marginLeft: 10,
  },
  section: {
    padding: 20,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: Colors.primary500,
    marginBottom: 10,
  },
  setting: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingVertical: 15,
  },
  settingText: {
    fontSize: 18,
    color: Colors.primary500,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    backgroundColor: Colors.secondary200,
    borderRadius: 8,
    marginBottom: 10,
  },
  buttonText: {
    color: Colors.primary500,
    fontSize: 16,
    marginLeft: 10,
  },
  logoutButton: {
    backgroundColor: Colors.primary100,
    marginTop: 20,
    ...Platform.select({
      ios: {
        shadowColor: "#000",
        shadowOffset: {
          width: 0,
          height: 2,
        },
        shadowOpacity: 0.2,
        shadowRadius: 1,
      },
      android: {
        elevation: 5,
      },
    }),
  },
  logoutText: {
    color: Colors.primary500,
    fontWeight: "bold",
  },
  premiumActiveButton: {
    backgroundColor: Colors.secondary200,
    borderColor: Colors.primary500,
    borderWidth: 1,
  },
  premiumActiveText: {
    color: Colors.primary500,
    fontWeight: "bold",
  },
  checkmark: {
    marginLeft: 10,
  },
});
