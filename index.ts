import { registerRootComponent } from "expo";
// import messaging from "@react-native-firebase/messaging";

import App from "./App";

// TODO: Uncomment when you have a paid Apple Developer account
// Handle background messages for Stream Chat notifications
// messaging().setBackgroundMessageHandler(async (remoteMessage) => {
//   console.log("🔔 Background message received:", remoteMessage);

//   // Stream Chat v2 payload format
//   // The payload contains message_id and channel information
//   // Firebase will automatically display the notification
//   // We can optionally handle the data for custom logic
//   if (remoteMessage.data?.type === "message.new") {
//     console.log("🔔 New message notification:", {
//       messageId: remoteMessage.data.message_id,
//       channelId: remoteMessage.data.channel_id,
//       channelType: remoteMessage.data.channel_type,
//     });
//   }
// });

// registerRootComponent calls AppRegistry.registerComponent('main', () => App);
// It also ensures that whether you load the app in Expo Go or in a native build,
// the environment is set up appropriately
registerRootComponent(App);
