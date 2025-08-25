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
      await this.setupDevice(userId);
    } catch (error) {
      console.error("🔔 Error registering device:", error);
      throw error;
    }
  }

  /**
   * Robust device setup with clean state management
   */
  private async setupDevice(userId: string): Promise<void> {
    const messaging = getMessaging();
    const fcmToken = await getToken(messaging);

    if (!fcmToken) {
      return;
    }

    try {
      // First, remove all existing devices for the user to ensure a clean state
      const devices = await this.client!.getDevices(userId);
      if (devices?.devices && devices.devices.length > 0) {
        for (const device of devices.devices) {
          await this.client!.removeDevice(device.id);
        }
      }

      // Then, add the fresh, valid token
      await this.client!.addDevice(
        fcmToken,
        "firebase",
        userId,
        "HarborFirebasePush" // Ensure this matches the config name in Stream dashboard
      );

      // Store token locally
      await AsyncStorage.setItem(PUSH_TOKEN_KEY, fcmToken);

      // Set up token refresh listener
      this.unsubscribeTokenRefresh = onTokenRefresh(
        messaging,
        async (newToken) => {
          await this.handleTokenRefresh(newToken, userId);
        }
      );
    } catch (error) {
      console.error("🔔 Error in setupDevice:", error);
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
      // Update Firestore user profile with new token
      await this.updateUserFCMToken(userId, newToken);

      // Remove old device and add new one
      const oldToken = await AsyncStorage.getItem(PUSH_TOKEN_KEY);
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
   * Update user's FCM token in Firestore
   */
  private async updateUserFCMToken(
    userId: string,
    fcmToken: string
  ): Promise<void> {
    try {
      const { doc, updateDoc, serverTimestamp } = await import(
        "firebase/firestore"
      );
      const { db } = await import("../firebaseConfig");

      await updateDoc(doc(db, "users", userId), {
        fcmToken: fcmToken,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      console.error("🔔 Error updating FCM token in Firestore:", error);
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

  /**
   * Save FCM token to user profile (call this during user setup/sign-in)
   */
  async saveUserToken(userId: string): Promise<void> {
    try {
      const messaging = getMessaging();
      const token = await getToken(messaging);

      if (!token) {
        return;
      }

      await this.updateUserFCMToken(userId, token);
    } catch (error) {
      console.error("🔔 Failed to save FCM token to user profile:", error);
    }
  }

  /**
   * Initialize notifications for a user (complete setup)
   */
  async initializeForUser(userId: string): Promise<void> {
    try {
      // First save token to user profile
      await this.saveUserToken(userId);

      // Then register with Stream Chat
      await this.registerDevice(userId);
    } catch (error) {
      console.error("🔔 Error initializing notifications:", error);
      throw error;
    }
  }
}

// Export singleton instance
export const streamNotificationService =
  StreamNotificationService.getInstance();
