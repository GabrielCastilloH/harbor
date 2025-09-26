import React, { useEffect, useRef } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "react-native";
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
        console.log(
          "🔔 TabNavigator - About to call streamNotificationService.requestPermission()"
        );
        hasInitializedNotifications.current = true;
        // Request permission for Stream Chat notifications
        const granted = await streamNotificationService.requestPermission();
        console.log(
          "🔔 TabNavigator - streamNotificationService.requestPermission() result:",
          granted
        );
        if (granted) {
          // Note: Device registration with Stream happens in ChatNavigator when client is ready
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
