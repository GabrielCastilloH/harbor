// Import Firebase config first to ensure Firebase is initialized
import "../firebaseConfig";
import messaging from "@react-native-firebase/messaging";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { StreamChat } from "stream-chat";

export const PUSH_TOKEN_KEY = "@current_push_token";

export class StreamNotificationService {
  private static instance: StreamNotificationService;
  private client: StreamChat | null = null;
  private unsubscribeTokenRefresh: (() => void) | null = null;

  static getInstance(): StreamNotificationService {
    if (!StreamNotificationService.instance) {
      StreamNotificationService.instance = new StreamNotificationService();
    }
    return StreamNotificationService.instance;
  }

  /**
   * Initialize Stream Chat client for notifications
   */
  setClient(client: StreamChat) {
    this.client = client;
  }

  /**
   * Request notification permissions and register for remote messages
   */
  async requestPermission(): Promise<boolean> {
    try {
      // Register device for remote messages first (essential for iOS)
      await messaging().registerDeviceForRemoteMessages();
      console.log("🔔 Device registered for remote messages.");

      const authStatus = await messaging().requestPermission();
      const enabled = authStatus === 1 || authStatus === 2; // AUTHORIZED || PROVISIONAL

      if (enabled) {
        console.log("Authorization status:", authStatus);
        return true;
      }
      return false;
    } catch (error) {
      console.error("🔔 Error requesting notification permission:", error);
      return false;
    }
  }

  /**
   * Register push token with Stream Chat following V2 pattern
   */
  async registerPushToken(userId: string): Promise<void> {
    if (!this.client) {
      throw new Error("Stream client not initialized");
    }

    try {
      // Unsubscribe any previous listener
      this.unsubscribeTokenRefresh?.();

      const token = await messaging().getToken();
      if (!token) {
        console.warn("🔔 No FCM token available");
        return;
      }

      const push_provider = "firebase";
      const push_provider_name = "HarborFirebasePush"; // name alias for push provider

      // Set local device BEFORE connecting user (Stream Chat V2 requirement)
      this.client.setLocalDevice({
        id: token,
        push_provider,
        push_provider_name,
      });

      // CRITICAL: Actually register the device with Stream after user is connected
      try {
        await this.client.addDevice(
          token,
          push_provider,
          userId,
          push_provider_name
        );
        console.log(
          "🔔 [NOTIFICATION] Device successfully registered with Stream Chat server"
        );
      } catch (deviceError) {
        console.error(
          "🔔 [NOTIFICATION] Error registering device with Stream:",
          deviceError
        );
        throw deviceError;
      }

      await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);

      const removeOldToken = async () => {
        const oldToken = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
        if (oldToken !== null) {
          await this.client!.removeDevice(oldToken);
        }
      };

      // Set up token refresh listener
      this.unsubscribeTokenRefresh = messaging().onTokenRefresh(
        async (newToken) => {
          await Promise.all([
            removeOldToken(),
            this.client!.addDevice(
              newToken,
              push_provider,
              userId,
              push_provider_name
            ),
            AsyncStorage.setItem(PUSH_TOKEN_KEY, newToken),
          ]);
        }
      );

      console.log(
        "🔔 [NOTIFICATION] Push token registered with Stream Chat - V2 notifications enabled"
      );
    } catch (error) {
      console.error("🔔 Error registering push token:", error);
      throw error;
    }
  }

  /**
   * Unregister device from Stream Chat
   */
  async unregisterDevice(): Promise<void> {
    if (!this.client) return;

    try {
      const token = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
      if (token) {
        await this.client.removeDevice(token);
        await AsyncStorage.removeItem(PUSH_TOKEN_KEY);
      }

      if (this.unsubscribeTokenRefresh) {
        this.unsubscribeTokenRefresh();
        this.unsubscribeTokenRefresh = null;
      }
    } catch (error) {
      console.error("🔔 Error unregistering device:", error);
    }
  }

  /**
   * Get current push token
   */
  async getCurrentToken(): Promise<string | null> {
    return await AsyncStorage.getItem(PUSH_TOKEN_KEY);
  }

  /**
   * Check if notifications are enabled
   */
  async areNotificationsEnabled(): Promise<boolean> {
    try {
      const authStatus = await messaging().hasPermission();
      return (
        authStatus === 1 || // AUTHORIZED
        authStatus === 2 // PROVISIONAL
      );
    } catch (error) {
      console.error("🔔 Error checking notification status:", error);
      return false;
    }
  }

  /**
   * Save FCM token to user profile and AsyncStorage
   */
  async saveUserToken(userId: string): Promise<void> {
    try {
      const token = await messaging().getToken();
      if (!token) {
        console.warn("🔔 No FCM token available");
        return;
      }

      // Store token locally for Stream Chat registration
      await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);

      console.log("🔔 FCM token saved for user:", userId);
    } catch (error) {
      console.error("🔔 Failed to save FCM token:", error);
      throw error;
    }
  }

  /**
   * Initialize notifications for a user following Stream Chat V2 pattern
   */
  async initializeForUser(userId: string): Promise<void> {
    try {
      await this.registerPushToken(userId);
      console.log(
        "🔔 [NOTIFICATION] Stream Chat V2 notifications initialized for user:",
        userId
      );
    } catch (error) {
      console.error("🔔 Error initializing notifications:", error);
      throw error;
    }
  }
}

// Export singleton instance
export const streamNotificationService =
  StreamNotificationService.getInstance();
