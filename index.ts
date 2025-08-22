import { registerRootComponent } from "expo";
// Import Firebase config first to ensure Firebase is initialized
import "./firebaseConfig";
import { getMessaging, onMessage, setBackgroundMessageHandler } from "@react-native-firebase/messaging";

import App from "./App";

// Handle background messages for Stream Chat notifications
try {
  const messaging = getMessaging();
  setBackgroundMessageHandler(messaging, async (remoteMessage: any) => {
    console.log("🔔 Background message received:", remoteMessage);

    // Stream Chat v2 payload format
    // The payload contains message_id and channel information
    // Firebase will automatically display the notification
    // We can optionally handle the data for custom logic
    if (remoteMessage.data?.type === "message.new") {
      console.log("🔔 New message notification:", {
        messageId: remoteMessage.data.message_id,
        channelId: remoteMessage.data.channel_id,
        channelType: remoteMessage.data.channel_type,
      });
    }
  });
} catch (error) {
  console.error("❌ Error setting up Firebase messaging:", error);
}

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
