import React, { useState } from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import {
  signOut,
  deleteUser,
  reauthenticateWithCredential,
  EmailAuthProvider,
} from "firebase/auth";
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

                      // Delete account data via Cloud Function (except Firebase Auth user)
                      await UserService.deleteAccount();

                      // Delete Firebase Auth user (must be done client-side)
                      const currentUser = auth.currentUser;
                      if (currentUser) {
                        try {
                          await deleteUser(currentUser);
                        } catch (authError: any) {
                          // Handle requires-recent-login error
                          if (authError.code === "auth/requires-recent-login") {
                            Alert.alert(
                              "Re-authentication Required",
                              "For security reasons, please enter your password to confirm account deletion.",
                              [
                                {
                                  text: "Cancel",
                                  style: "cancel",
                                  onPress: () => setIsDeleting(false),
                                },
                                {
                                  text: "Continue",
                                  onPress: () => {
                                    // Prompt for password and re-authenticate
                                    Alert.prompt(
                                      "Enter Password",
                                      "Please enter your password to confirm deletion:",
                                      [
                                        {
                                          text: "Cancel",
                                          style: "cancel",
                                          onPress: () => setIsDeleting(false),
                                        },
                                        {
                                          text: "Delete Account",
                                          style: "destructive",
                                          onPress: async (password) => {
                                            if (!password) {
                                              setIsDeleting(false);
                                              return;
                                            }

                                            try {
                                              // Re-authenticate and then delete
                                              const credential =
                                                EmailAuthProvider.credential(
                                                  currentUser.email!,
                                                  password
                                                );
                                              await reauthenticateWithCredential(
                                                currentUser,
                                                credential
                                              );
                                              await deleteUser(currentUser);

                                              // Continue with success flow
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

                                              Alert.alert(
                                                "Account Deleted",
                                                "Your account has been permanently deleted. Thank you for using Harbor.",
                                                [{ text: "OK" }]
                                              );
                                            } catch (reauthError) {
                                              console.error(
                                                "❌ [DELETE ACCOUNT] Re-auth error:",
                                                reauthError
                                              );
                                              Alert.alert(
                                                "Authentication Failed",
                                                "Incorrect password. Account deletion cancelled."
                                              );
                                              setIsDeleting(false);
                                            }
                                          },
                                        },
                                      ],
                                      "secure-text"
                                    );
                                  },
                                },
                              ]
                            );
                            return; // Exit early, don't continue with normal flow
                          } else {
                            // Other auth errors
                            throw authError;
                          }
                        }
                      }

                      // Clear local data
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
