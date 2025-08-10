import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  ReactNode,
} from "react";
// import { streamNotificationService } from "../util/streamNotifService";
// import { StreamChat } from "stream-chat";

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
  const [isNotificationsEnabled, setIsNotificationsEnabled] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  // TODO: Uncomment when you have a paid Apple Developer account
  // Check notification status on mount
  // useEffect(() => {
  //   checkNotificationStatus();
  // }, []);

  // const checkNotificationStatus = async () => {
  //   try {
  //     const enabled = await streamNotificationService.areNotificationsEnabled();
  //     setIsNotificationsEnabled(enabled);
  //   } catch (error) {
  //     console.error("🔔 Error checking notification status:", error);
  //     setError(error as Error);
  //   }
  // };

  const enableNotifications = async () => {
    setIsLoading(true);
    setError(null);

    try {
      // TODO: Uncomment when you have a paid Apple Developer account
      // const granted = await streamNotificationService.requestPermission();
      // setIsNotificationsEnabled(granted);

      // if (!granted) {
      //   throw new Error("Notification permission denied");
      // }

      // Temporary: just set to false for now
      setIsNotificationsEnabled(false);
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
      // TODO: Uncomment when you have a paid Apple Developer account
      // await streamNotificationService.unregisterDevice();
      setIsNotificationsEnabled(false);
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
