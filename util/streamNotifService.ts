// Import Firebase config first to ensure Firebase is initialized
import "../firebaseConfig";
import {
  getMessaging,
  requestPermission,
  getToken,
  onTokenRefresh,
  hasPermission,
  AuthorizationStatus,
} from "@react-native-firebase/messaging";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { StreamChat } from "stream-chat";

const PUSH_TOKEN_KEY = "@stream_push_token";

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
   * Request notification permissions and register device
   */
  async requestPermission(): Promise<boolean> {
    try {
      const messaging = getMessaging();
      const authStatus = await requestPermission(messaging);
      const enabled =
        authStatus === AuthorizationStatus.AUTHORIZED ||
        authStatus === AuthorizationStatus.PROVISIONAL;

      if (enabled) {
        return true;
      }
      return false;
    } catch (error) {
      console.error("🔔 Error requesting notification permission:", error);
      return false;
    }
  }

  /**
   * Register device with Stream Chat for push notifications
   */
  async registerDevice(userId: string): Promise<void> {
    if (!this.client) {
      throw new Error("Stream client not initialized");
    }

    try {
      // Get current FCM token
      const messaging = getMessaging();
      const token = await getToken(messaging);

      // Register device with Stream Chat using the new v2 format
      await this.client.addDevice(
        token,
        "firebase",
        userId,
        "HarborFirebasePush"
      );

      // Store token locally
      await AsyncStorage.setItem(PUSH_TOKEN_KEY, token);

      // Set up token refresh listener
      this.unsubscribeTokenRefresh = onTokenRefresh(
        messaging,
        async (newToken) => {
          await this.handleTokenRefresh(newToken, userId);
        }
      );
    } catch (error) {
      console.error("🔔 Error registering device:", error);
      throw error;
    }
  }

  /**
   * Handle FCM token refresh
   */
  private async handleTokenRefresh(
    newToken: string,
    userId: string
  ): Promise<void> {
    if (!this.client) return;

    try {
      const oldToken = await AsyncStorage.getItem(PUSH_TOKEN_KEY);

      // Remove old device and add new one
      if (oldToken) {
        await this.client.removeDevice(oldToken);
      }

      await this.client.addDevice(
        newToken,
        "firebase",
        userId,
        "HarborFirebasePush"
      );
      await AsyncStorage.setItem(PUSH_TOKEN_KEY, newToken);
    } catch (error) {
      console.error("🔔 Error handling token refresh:", error);
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
      const messaging = getMessaging();
      const authStatus = await hasPermission(messaging);
      return (
        authStatus === AuthorizationStatus.AUTHORIZED ||
        authStatus === AuthorizationStatus.PROVISIONAL
      );
    } catch (error) {
      console.error("🔔 Error checking notification status:", error);
      return false;
    }
  }
}

// Export singleton instance
export const streamNotificationService =
  StreamNotificationService.getInstance();
