import React, { useState } from "react";
import {
  TouchableOpacity,
  Text,
  StyleSheet,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "../constants/Colors";
import { UserService } from "../networking/UserService";

interface DeactivateAccountButtonProps {
  isActive: boolean;
  onStatusChange?: (isActive: boolean) => void;
  disabled?: boolean;
  isLoading?: boolean;
}

export default function DeactivateAccountButton({
  isActive,
  onStatusChange,
  disabled = false,
  isLoading = false,
}: DeactivateAccountButtonProps) {
  const [isProcessing, setIsProcessing] = useState(false);

  const handleDeactivate = async () => {
    if (isProcessing) return;

    Alert.alert(
      "Deactivate Account",
      "Your account won't be shown to other people when deactivated and you won't be able to match with anyone. You can still chat with existing matches. You can reactivate anytime.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Deactivate",
          style: "destructive",
          onPress: async () => {
            setIsProcessing(true);
            try {
              await UserService.deactivateAccount();
              onStatusChange?.(false);
              Alert.alert(
                "Account Deactivated",
                "Your account has been deactivated. Please restart the app for changes to take effect."
              );
            } catch (error: any) {
              console.error("❌ [DEACTIVATE] Error:", error);
              Alert.alert(
                "Error",
                "Failed to deactivate account. Please try again."
              );
            } finally {
              setIsProcessing(false);
            }
          },
        },
      ]
    );
  };

  const handleReactivate = async () => {
    if (isProcessing) return;

    Alert.alert(
      "Reactivate Account",
      "Your account will be shown to other people again and you'll be able to match with new people.",
      [
        {
          text: "Cancel",
          style: "cancel",
        },
        {
          text: "Reactivate",
          onPress: async () => {
            setIsProcessing(true);
            try {
              await UserService.reactivateAccount();
              onStatusChange?.(true);
              Alert.alert(
                "Account Reactivated",
                "Welcome back! Please restart the app for changes to take effect."
              );
            } catch (error: any) {
              console.error("❌ [REACTIVATE] Error:", error);
              Alert.alert(
                "Error",
                "Failed to reactivate account. Please try again."
              );
            } finally {
              setIsProcessing(false);
            }
          },
        },
      ]
    );
  };

  const iconName = isActive ? "pause-circle-outline" : "play-circle-outline";
  const buttonText = isActive ? "Deactivate Account" : "Reactivate Account";

  // Show loading state when fetching user data or processing
  const isButtonDisabled = disabled || isProcessing || isLoading;

  return (
    <TouchableOpacity
      style={[styles.button, isButtonDisabled && styles.buttonDisabled]}
      onPress={isActive ? handleDeactivate : handleReactivate}
      disabled={isButtonDisabled}
    >
      {isLoading ? (
        <ActivityIndicator size="small" color={Colors.primary500} />
      ) : isProcessing ? (
        <ActivityIndicator size="small" color={Colors.primary500} />
      ) : (
        <Ionicons name={iconName} size={20} color={Colors.primary500} />
      )}
      <Text style={styles.buttonText}>
        {isLoading
          ? "Loading..."
          : isProcessing
          ? isActive
            ? "Deactivating..."
            : "Reactivating..."
          : buttonText}
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
    fontWeight: "400",
    color: Colors.primary500,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
