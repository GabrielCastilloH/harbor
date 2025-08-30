import { registerRootComponent } from "expo";
// Import Firebase config first to ensure Firebase is initialized
import "./firebaseConfig";
import messaging from "@react-native-firebase/messaging";
import notifee from "@notifee/react-native";
import { StreamChat } from "stream-chat";

import App from "./App";

// Handle background messages for Stream Chat notifications (Android)
messaging().setBackgroundMessageHandler(async (remoteMessage) => {
  console.log("🔔 Background message received:", remoteMessage);

  // Only handle Stream Chat message notifications
  if (
    remoteMessage.data?.type === "message.new" &&
    remoteMessage.data?.sender === "stream.chat"
  ) {
    try {
      // For Stream Chat V2, we need to fetch the message from Stream
      // Initialize a temporary client to get message details
      const apiKey = remoteMessage.data?.channel_id ? "your-api-key" : null; // Replace with actual API key from your config

      if (apiKey) {
        const client = StreamChat.getInstance(apiKey);
        // Note: In production, you'd need to authenticate this client
        // For now, we'll display notification based on payload data

        // Create the android channel to send the notification to
        const channelId = await notifee.createChannel({
          id: "chat-messages",
          name: "Chat Messages",
        });

        // Display the notification
        await notifee.displayNotification({
          title: "New message",
          body: remoteMessage.data?.message || "You have a new message",
          data: remoteMessage.data,
          android: {
            channelId,
            // Add a press action to open the app on press
            pressAction: {
              id: "default",
            },
          },
        });
      }
    } catch (error) {
      console.error("🔔 Error handling background message:", error);
    }
  }
});

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
