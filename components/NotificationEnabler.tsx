import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { useAppContext } from "../context/AppContext";
import { streamNotificationService } from "../util/streamNotifService";
import { auth } from "../firebaseConfig";
import Colors from "../constants/Colors";

export default function NotificationEnabler() {
  const { profileExists, isInitialized, isAuthenticated } = useAppContext();
  const [permissionStatus, setPermissionStatus] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    // Check permission status only after the app is initialized and the user has a profile
    if (isInitialized && isAuthenticated && profileExists) {
      checkPermissionStatus();
    }
  }, [isInitialized, isAuthenticated, profileExists]);

  const checkPermissionStatus = async () => {
    try {
      const isEnabled =
        await streamNotificationService.areNotificationsEnabled();
      setPermissionStatus(isEnabled ? "granted" : "denied");
      if (isEnabled) {
        await saveFCMToken();
      }
    } catch (error) {
      console.error(
        "❌ [NOTIFICATIONS] Error checking permission status:",
        error
      );
      setPermissionStatus("error");
    }
  };

  const saveFCMToken = async () => {
    const currentUser = auth.currentUser;
    if (!currentUser) return;
    setIsProcessing(true);
    try {
      await streamNotificationService.saveUserToken(currentUser.uid);
    } catch (error) {
      console.error("❌ [NOTIFICATIONS] Failed to save FCM token:", error);
      Alert.alert(
        "Error",
        "Failed to enable notifications. Please try again later."
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const requestNotificationPermission = async () => {
    setIsProcessing(true);
    try {
      const granted = await streamNotificationService.requestPermission();
      setPermissionStatus(granted ? "granted" : "denied");
      if (granted) {
        await saveFCMToken();
      } else {
        Alert.alert(
          "Notifications Disabled",
          "Notifications are required for chat alerts. You can enable them later in your phone's Settings app."
        );
      }
    } catch (error) {
      console.error("❌ [NOTIFICATIONS] Error requesting permission:", error);
      setPermissionStatus("error");
      Alert.alert(
        "Error",
        "Failed to enable notifications. Please check your phone settings and try again."
      );
    } finally {
      setIsProcessing(false);
    }
  };

  if (permissionStatus === "granted") {
    return null; // Don't show anything if notifications are enabled
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Stay in the loop</Text>
      <Text style={styles.text}>
        Enable push notifications to get alerts for new matches and messages.
      </Text>
      <TouchableOpacity
        style={styles.button}
        onPress={requestNotificationPermission}
        disabled={isProcessing}
      >
        {isProcessing ? (
          <ActivityIndicator size="small" color="#fff" />
        ) : (
          <Ionicons name="notifications-outline" size={24} color="#fff" />
        )}
        <Text style={styles.buttonText}>
          {isProcessing ? "Enabling..." : "Enable Notifications"}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 20,
    backgroundColor: Colors.secondary100,
    borderTopWidth: 1,
    borderTopColor: Colors.gray200,
    alignItems: "center",
    marginBottom: 20,
  },
  title: {
    fontSize: 18,
    fontWeight: "bold",
    marginBottom: 5,
  },
  text: {
    textAlign: "center",
    marginBottom: 15,
  },
  button: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: Colors.primary500,
    paddingVertical: 12,
    paddingHorizontal: 25,
    borderRadius: 8,
  },
  buttonText: {
    color: "#fff",
    fontSize: 16,
    fontWeight: "bold",
    marginLeft: 10,
  },
});
