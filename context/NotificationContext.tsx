import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  ReactNode,
} from "react";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { streamNotificationService } from "../util/streamNotifService";
import { StreamChat } from "stream-chat";

interface NotificationContextType {
  isNotificationsEnabled: boolean;
  isLoading: boolean;
  error: Error | null;
  enableNotifications: () => Promise<void>;
  disableNotifications: () => Promise<void>;
}

const NotificationContext = createContext<NotificationContextType | undefined>(
  undefined
);

export const useNotification = () => {
  const context = useContext(NotificationContext);
  if (context === undefined) {
    throw new Error(
      "useNotification must be used within a NotificationProvider"
    );
  }
  return context;
};

interface NotificationProviderProps {
  children: ReactNode;
}

export const NotificationProvider: React.FC<NotificationProviderProps> = ({
  children,
}) => {
  // Default to true - this represents user preference, not system permission
  const [isNotificationsEnabled, setIsNotificationsEnabled] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // Check if we have a saved preference on mount
  useEffect(() => {
    loadNotificationPreference();
  }, []);

  const loadNotificationPreference = async () => {
    try {
      // Load user's notification preference from AsyncStorage
      const savedPreference = await AsyncStorage.getItem(
        "@notification_preference"
      );
      if (savedPreference !== null) {
        setIsNotificationsEnabled(JSON.parse(savedPreference));
      }
      // If no saved preference, keep default (true)
    } catch (error) {
      console.error("🔔 Error loading notification preference:", error);
    }
  };

  const saveNotificationPreference = async (enabled: boolean) => {
    try {
      await AsyncStorage.setItem(
        "@notification_preference",
        JSON.stringify(enabled)
      );
    } catch (error) {
      console.error("🔔 Error saving notification preference:", error);
    }
  };

  const enableNotifications = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // First check if we already have system permission
      const hasPermission =
        await streamNotificationService.areNotificationsEnabled();

      if (!hasPermission) {
        // No system permission, request it
        const granted = await streamNotificationService.requestPermission();

        if (!granted) {
          // User denied system permission, but we still save their preference as ON
          // They'll get an alert that they need to allow notifications in system settings
          setIsNotificationsEnabled(true);
          await saveNotificationPreference(true);
          throw new Error(
            "Please allow notifications in your device settings to receive notifications."
          );
        }
      }

      // Either we had permission or just got it - enable notifications
      setIsNotificationsEnabled(true);
      await saveNotificationPreference(true);
    } catch (error) {
      console.error("🔔 Error enabling notifications:", error);
      setError(error as Error);
    } finally {
      setIsLoading(false);
    }
  };

  const disableNotifications = async () => {
    setIsLoading(true);
    setError(null);

    try {
      await streamNotificationService.unregisterDevice();
      setIsNotificationsEnabled(false);
      await saveNotificationPreference(false);
    } catch (error) {
      console.error("🔔 Error disabling notifications:", error);
      setError(error as Error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <NotificationContext.Provider
      value={{
        isNotificationsEnabled,
        isLoading,
        error,
        enableNotifications,
        disableNotifications,
      }}
    >
      {children}
    </NotificationContext.Provider>
  );
};
