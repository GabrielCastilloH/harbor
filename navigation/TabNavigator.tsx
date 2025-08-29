import React, { useEffect, useState } from "react";
import { createBottomTabNavigator } from "@react-navigation/bottom-tabs";
import { Ionicons } from "@expo/vector-icons";
import { Image } from "react-native";
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";
import { getFirestore, doc, setDoc } from "firebase/firestore";
import { StreamChat } from "stream-chat";
import { EXPO_PROJECT_ID, STREAM_API_KEY } from "../firebaseConfig";
import { useAppContext } from "../context/AppContext";
import HomeStack from "./HomeStack";
import SettingsStack from "./SettingsStack";
import ChatNavigator from "./ChatNavigator";
import Colors from "../constants/Colors";

const Tab = createBottomTabNavigator();

export default function TabNavigator() {
  const { currentUser } = useAppContext();
  const [hasRequestedPermissions, setHasRequestedPermissions] = useState(false);

  // Request notification permissions and setup FCM token when TabNavigator loads
  useEffect(() => {
    if (!currentUser || hasRequestedPermissions) return;

    const requestNotificationPermissionsAndSetupToken = async () => {
      try {
        let token;
        if (Device.isDevice) {
          const { status: existingStatus } =
            await Notifications.getPermissionsAsync();
          let finalStatus = existingStatus;

          if (existingStatus !== "granted") {
            const { status } = await Notifications.requestPermissionsAsync();
            finalStatus = status;
          }

          if (finalStatus !== "granted") {
            console.log("Notification permission denied");
            setHasRequestedPermissions(true);
            return;
          }

          // Get Expo push token
          token = (
            await Notifications.getExpoPushTokenAsync({
              projectId: EXPO_PROJECT_ID,
            })
          ).data;

          // Save token to Firestore
          if (currentUser?.uid) {
            const db = getFirestore();
            await setDoc(
              doc(db, "users", currentUser.uid),
              { fcmToken: token },
              { merge: true }
            );
          }

          // Register token with Stream Chat
          try {
            const streamClient = StreamChat.getInstance(STREAM_API_KEY);
            await streamClient.addDevice(token, "firebase");
          } catch (e) {
            console.error("Error registering device with Stream Chat", e);
          }
        }

        setHasRequestedPermissions(true);
      } catch (error) {
        console.error("Error setting up notifications:", error);
        setHasRequestedPermissions(true);
      }
    };

    requestNotificationPermissionsAndSetupToken();
  }, [currentUser, hasRequestedPermissions]);

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
