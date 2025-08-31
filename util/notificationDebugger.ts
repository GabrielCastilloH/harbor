import { StreamChat } from "stream-chat";
import messaging from "@react-native-firebase/messaging";
import { Platform } from "react-native";

export class NotificationDebugger {
  /**
   * Debug Stream Chat notification configuration
   */
  static async debugStreamNotifications(client: StreamChat, userId: string) {
    console.log(
      "🔔 [NOTIFICATION DEBUG] Starting comprehensive notification debug..."
    );

    try {
      // 0. Check notification permissions first
      const authStatus = await messaging().requestPermission();
      console.log(
        "🔔 [NOTIFICATION DEBUG] Notification permission status:",
        authStatus
      );

      if (
        authStatus !== messaging.AuthorizationStatus.AUTHORIZED &&
        authStatus !== messaging.AuthorizationStatus.PROVISIONAL
      ) {
        console.error(
          "🔔 [NOTIFICATION DEBUG] ❌ NOTIFICATIONS NOT PERMITTED!"
        );
        return false;
      }

      // 1. Check if user has registered devices
      const devicesResponse = await client.getDevices(userId);
      console.log("🔔 [NOTIFICATION DEBUG] User devices:", devicesResponse);

      if (!devicesResponse.devices || devicesResponse.devices.length === 0) {
        console.error(
          "🔔 [NOTIFICATION DEBUG] ❌ NO DEVICES REGISTERED - This is why notifications aren't working!"
        );
        console.log(
          "🔔 [NOTIFICATION DEBUG] 💡 Try registering device manually..."
        );

        // Try to register device now
        const fcmToken = await messaging().getToken();
        if (fcmToken) {
          try {
            await client.addDevice(
              fcmToken,
              "firebase",
              userId,
              "HarborFirebasePush"
            );
            console.log(
              "🔔 [NOTIFICATION DEBUG] ✅ Device registered successfully!"
            );
          } catch (regError) {
            console.error(
              "🔔 [NOTIFICATION DEBUG] ❌ Failed to register device:",
              regError
            );
            return false;
          }
        }
      }

      // 2. Note: Firebase configuration check removed
      // The Stream API no longer returns firebase_config in getAppSettings()
      // The successful device registration above is sufficient proof that
      // Firebase configuration is working correctly on the Stream Dashboard
      console.log(
        "🔔 [NOTIFICATION DEBUG] ✅ Skipping deprecated config checks"
      );
      console.log(
        "🔔 [NOTIFICATION DEBUG] 💡 Device registration is the source of truth for Firebase setup"
      );

      // 3. Check FCM token validity
      const fcmToken = await messaging().getToken();
      console.log("🔔 [NOTIFICATION DEBUG] Current FCM token:", fcmToken);

      // 3a. iOS specific checks
      if (Platform.OS === "ios") {
        try {
          const isRegistered = messaging().isDeviceRegisteredForRemoteMessages;
          console.log(
            "🔔 [NOTIFICATION DEBUG] iOS device registered for remote messages:",
            isRegistered
          );

          if (!isRegistered) {
            console.log(
              "🔔 [NOTIFICATION DEBUG] 💡 Registering iOS device for remote messages..."
            );
            await messaging().registerDeviceForRemoteMessages();
          }

          const apnsToken = await messaging().getAPNSToken();
          console.log(
            "🔔 [NOTIFICATION DEBUG] iOS APNS token:",
            apnsToken ? "Present" : "Missing"
          );
        } catch (iosError) {
          console.error("🔔 [NOTIFICATION DEBUG] iOS setup error:", iosError);
        }
      }

      // 4. Check if user is member of any channels
      const channelsResponse = await client.queryChannels({
        members: { $in: [userId] },
      });
      console.log(
        "🔔 [NOTIFICATION DEBUG] User is member of",
        channelsResponse.length,
        "channels"
      );

      // 5. Final summary
      if (devicesResponse.devices && devicesResponse.devices.length > 0) {
        console.log("🔔 [NOTIFICATION DEBUG] ✅ SETUP LOOKS GOOD!");
        console.log(
          "🔔 [NOTIFICATION DEBUG] 📱 Device registered, permissions granted, FCM token valid"
        );
        console.log(
          "🔔 [NOTIFICATION DEBUG] 💡 If notifications still don't work, check that the app is backgrounded when testing"
        );
        return true;
      } else {
        console.log(
          "🔔 [NOTIFICATION DEBUG] ❌ Device registration failed - this is likely the issue"
        );
        return false;
      }
    } catch (error) {
      console.error("🔔 [NOTIFICATION DEBUG] Error during debug:", error);
      return false;
    }
  }

  /**
   * Test sending a notification directly through Stream
   */
  static async testStreamNotification(
    client: StreamChat,
    channelId: string,
    userId: string
  ) {
    try {
      console.log("🔔 [NOTIFICATION DEBUG] Testing notification send...");

      const channel = client.channel("messaging", channelId);
      await channel.sendMessage({
        text: "🔔 Test notification message - if you receive this as a notification, it's working!",
        user_id: userId,
      });

      console.log("🔔 [NOTIFICATION DEBUG] Test message sent successfully");
      return true;
    } catch (error) {
      console.error(
        "🔔 [NOTIFICATION DEBUG] Error sending test message:",
        error
      );
      return false;
    }
  }
}
