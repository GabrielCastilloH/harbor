import React, { useEffect, useRef } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { Image, AppState, AppStateStatus } from "react-native";
import { useAppContext } from "../context/AppContext";
import { streamNotificationService } from "../util/streamNotifService";
import HomeStack from "./HomeStack";
import SettingsStack from "./SettingsStack";
import ChatNavigator from "./ChatNavigator";
import Colors from "../constants/Colors";

const Tab = createBottomTabNavigator();

export default function TabNavigator() {
  const { currentUser, unreadCount } = useAppContext();
  const hasInitializedNotifications = useRef(false);

  // Initialize Stream notifications when TabNavigator loads (after account setup)
  useEffect(() => {
    if (!currentUser?.uid || hasInitializedNotifications.current) return;

    const initializeStreamNotifications = async () => {
      try {
        hasInitializedNotifications.current = true;
        // Request permission for Stream Chat notifications
        const granted = await streamNotificationService.requestPermission();
        if (granted) {
          // CRITICAL: Save the token to AsyncStorage so ChatNavigator can use it
          await streamNotificationService.saveUserToken(currentUser.uid);
        }
      } catch (error) {
        console.error(
          "TabNavigator - Error initializing Stream notifications:",
          error
        );
        // Don't block the app if notification setup fails
        hasInitializedNotifications.current = false; // Reset on error so it can retry
      }
    };

    initializeStreamNotifications();
  }, [currentUser]);

  // Re-check and save notification token when app comes to foreground
  // This handles the case where user enables notifications in system settings
  useEffect(() => {
    if (!currentUser?.uid) return;

    const subscription = AppState.addEventListener(
      "change",
      async (nextAppState: AppStateStatus) => {
        if (nextAppState === "active") {
          // App has come to foreground - check if notifications are now enabled
          try {
            const hasPermission =
              await streamNotificationService.areNotificationsEnabled();
            if (hasPermission) {
              // Permission is granted - save the token if we don't have it yet
              await streamNotificationService.saveUserToken(currentUser.uid);
            }
          } catch (error) {
            // Silent fail - don't interrupt user experience
          }
        }
      }
    );

    return () => {
      subscription.remove();
    };
  }, [currentUser]);

  return (
    <Tab.Navigator
      screenOptions={{
        tabBarStyle: { backgroundColor: Colors.secondary100 },
        tabBarActiveTintColor: Colors.primary500,
        tabBarInactiveTintColor: Colors.secondary500,
      }}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeStack}
        options={{
          title: "Home",
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="home" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="ChatsTab"
        component={ChatNavigator}
        options={{
          title: "Chats",
          headerShown: false,
          tabBarBadge: unreadCount > 0 ? unreadCount : undefined,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="chatbubbles" size={size} color={color} />
          ),
        }}
      />
      <Tab.Screen
        name="SettingsTab"
        component={SettingsStack}
        options={{
          title: "Settings",
          headerShown: false,
          tabBarIcon: ({ color, size }) => (
            <Ionicons name="settings" size={size} color={color} />
          ),
        }}
      />
    </Tab.Navigator>
  );
}
