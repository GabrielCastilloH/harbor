import { registerRootComponent } from "expo";
// Import Firebase config first to ensure Firebase is initialized
import "./firebaseConfig";
import messaging from "@react-native-firebase/messaging";
import notifee from "@notifee/react-native";
import { StreamChat } from "stream-chat";
import AsyncStorage from "@react-native-async-storage/async-storage";

import App from "./App";

// Handle background messages for Stream Chat V2 notifications
messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  console.log("🔔 [NOTIFICATION] Background message received:", remoteMessage);

  // Only handle Stream Chat message notifications
  if (
    remoteMessage.data?.type === "message.new" &&
    remoteMessage.data?.sender === "stream.chat"
  ) {
    try {
      console.log("🔔 [NOTIFICATION] Processing Stream Chat message notification");
      
      // Get stored Stream API key from AsyncStorage
      const storedApiKey = await AsyncStorage.getItem("@streamApiKey");
      
      if (storedApiKey && remoteMessage.data?.id) {
        console.log("🔔 [NOTIFICATION] Found API key, creating notification");
        
        // Create the android channel to send the notification to
        const channelId = await notifee.createChannel({
          id: "chat-messages",
          name: "Chat Messages",
          importance: 4, // High importance
        });

        // Extract sender name and message text from the notification payload
        const senderName = remoteMessage.data?.sender_name || "Someone";
        const messageText = remoteMessage.data?.message || "You have a new message";

        // Display the notification
        await notifee.displayNotification({
          title: `New message from ${senderName}`,
          body: messageText,
          data: {
            ...remoteMessage.data,
            // Add channel info for navigation
            channel_id: remoteMessage.data?.channel_id,
            channel_type: remoteMessage.data?.channel_type,
          },
          android: {
            channelId,
            // Add a press action to open the app on press
            pressAction: {
              id: "default",
            },
            // Show notification even when app is in foreground
            showWhen: true,
            when: Date.now(),
          },
        });
        
        console.log("🔔 [NOTIFICATION] Notification displayed successfully");
      } else {
        console.log("🔔 [NOTIFICATION] Missing API key or message ID, skipping notification");
      }
    } catch (error) {
      console.error("🔔 [NOTIFICATION] Error handling background message:", error);
    }
  } else {
    console.log("🔔 [NOTIFICATION] Non-Stream Chat message, ignoring");
  }
});

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
