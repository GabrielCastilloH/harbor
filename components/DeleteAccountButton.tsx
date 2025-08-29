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
  const { setUserId } = useAppContext();
  const [isDeleting, setIsDeleting] = useState(false);

  const handleDeleteAccount = async () => {
    if (isDeleting) return; // Prevent multiple deletion attempts

    Alert.alert(
      "Delete Account",
      "Are you sure you want to permanently delete your account? This action cannot be undone and will remove all your data, matches, and conversations.",
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

                      // Delete account via Cloud Function
                      await UserService.deleteAccount();

                      // If successful, sign out and clear local data
                      await Promise.all([
                        signOut(auth),
                        AsyncStorage.multiRemove([
                          "@user",
                          "@authToken",
                          "@streamApiKey",
                          "@streamUserToken",
                        ]),
                      ]);

                      // Clear app context state
                      setUserId(null);

                      Alert.alert(
                        "Account Deleted",
                        "Your account has been permanently deleted. Thank you for using Harbor.",
                        [
                          {
                            text: "OK",
                            onPress: () => {
                              // The app will automatically redirect to sign-in screen
                            },
                          },
                        ]
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
        styles.deleteButton,
        disabled && styles.buttonDisabled,
        isDeleting && styles.buttonDisabled,
      ]}
      onPress={handleDeleteAccount}
      disabled={disabled || isDeleting}
    >
      {isDeleting ? (
        <ActivityIndicator color={Colors.secondary100} size="small" />
      ) : (
        <>
          <Ionicons
            name="trash-outline"
            size={20}
            color={Colors.secondary100}
            style={styles.icon}
          />
          <Text style={styles.deleteButtonText}>Delete Account</Text>
        </>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  deleteButton: {
    backgroundColor: Colors.strongRed, // Red color for destructive action
    paddingVertical: 16,
    paddingHorizontal: 30,
    borderRadius: 12,
    alignItems: "center",
    justifyContent: "center",
    flexDirection: "row",
    marginTop: 8,
  },
  deleteButtonText: {
    color: Colors.secondary100,
    fontWeight: "600",
    fontSize: 16,
  },
  icon: {
    marginRight: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
