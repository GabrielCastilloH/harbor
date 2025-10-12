import React, { useState } from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { signOut } from "firebase/auth";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { auth } from "../firebaseConfig";
import Colors from "../constants/Colors";
import { useAppContext } from "../context/AppContext";
import { UserService } from "../networking/UserService";
import { ImageCache } from "../networking/ImageCache";

interface DeleteAccountButtonProps {
  onPress?: () => void;
  disabled?: boolean;
}

export default function DeleteAccountButton({
  onPress,
  disabled = false,
}: DeleteAccountButtonProps) {
  const { setUserId, setProfile, setStreamApiKey, setStreamUserToken } =
    useAppContext();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    if (isDeleting) return; // Prevent multiple deletion attempts

    Alert.alert(
      "Delete Account",
      "Are you sure you want to delete your account? Your profile data will be removed, and you will not be able to create a new account with the same email address.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Delete Account",
          style: "destructive",
          onPress: async () => {
            // Second confirmation
            Alert.alert(
              "Final Confirmation",
              "This is your final warning. Deleting your account will permanently remove all your data and cannot be undone. Are you absolutely sure?",
              [
                {
                  text: "Cancel",
                  style: "cancel",
                },
                {
                  text: "Yes, Delete My Account",
                  style: "destructive",
                  onPress: async () => {
                    setIsDeleting(true);
                    try {
                      // Clear image cache first
                      await ImageCache.clearAllCache();

                      // Only call the Cloud Function to delete account data
                      await UserService.deleteAccount();

                      // Clear local data and sign out
                      await AsyncStorage.multiRemove([
                        "@user",
                        "@authToken",
                        "@streamApiKey",
                        "@streamUserToken",
                        "@current_push_token",
                      ]);

                      // Clear all app context state
                      setUserId(null);
                      setProfile(null);
                      setStreamApiKey(null);
                      setStreamUserToken(null);

                      // Sign out the user from Firebase Auth
                      await signOut(auth);

                      Alert.alert(
                        "Account Deleted",
                        "Your account data has been deleted. You have been logged out. Thank you for using Harbor.",
                        [{ text: "OK" }]
                      );
                    } catch (error: any) {
                      console.error("❌ [DELETE ACCOUNT] Error:", error);
                      Alert.alert(
                        "Error",
                        "Failed to delete account. Please try again or contact support if the problem persists."
                      );
                    } finally {
                      setIsDeleting(false);
                    }
                  },
                },
              ]
            );
          },
        },
      ]
    );
  };

  return (
    <TouchableOpacity
      style={[
        styles.button,
        disabled && styles.buttonDisabled,
        isDeleting && styles.buttonDisabled,
      ]}
      onPress={handleDeleteAccount}
      disabled={disabled || isDeleting}
    >
      {isDeleting ? (
        <ActivityIndicator size="small" color="#FF3B30" />
      ) : (
        <Ionicons name="trash-outline" size={20} color="#FF3B30" />
      )}
      <Text style={styles.buttonText}>
        {isDeleting ? "Deleting account..." : "Delete Account"}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
    backgroundColor: Colors.secondary200,
  },
  buttonText: {
    fontSize: 16,
    marginLeft: 10,
    flex: 1,
    color: "#FF3B30",
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
