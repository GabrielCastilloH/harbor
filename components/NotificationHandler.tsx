import React, { useEffect } from "react";
import messaging from "@react-native-firebase/messaging";
import notifee, { EventType, AndroidImportance } from "@notifee/react-native";
import { NavigationContainerRef } from "@react-navigation/native";

interface NotificationHandlerProps {
  navigationRef: React.RefObject<NavigationContainerRef<any> | null>;
}

/**
 * Component to handle notification interactions for Stream Chat
 * Supports both iOS and Android notification press events
 */
export default function NotificationHandler({
  navigationRef,
}: NotificationHandlerProps) {
  useEffect(() => {
    // Handle notification opened app from background state (iOS)
    const unsubscribeOnNotificationOpen = messaging().onNotificationOpenedApp(
      (remoteMessage) => {
        // Only open the app, do not navigate anywhere
        // This prevents the "failed to fetch user profile" error
      }
    );

    // Handle notification opened app from quit state (iOS)
    messaging()
      .getInitialNotification()
      .then((remoteMessage) => {
        if (remoteMessage) {
          // App launched from iOS notification (quit state). Do not navigate.
        }
      });

    // Handle notification opened app from quit state (Android)
    notifee.getInitialNotification().then((initialNotification) => {
      if (initialNotification) {
        // App launched from Android notification (quit state). Do not navigate.
      }
    });

    return () => {
      unsubscribeOnNotificationOpen();
    };
  }, [navigationRef]);

  useEffect(() => {
    // Handle notification interactions when app is in background (Android)
    const unsubscribeBackgroundEvent = notifee.onBackgroundEvent(
      async ({ detail, type }) => {
        if (type === EventType.PRESS) {
          // Only open the app, do not navigate anywhere
          // This prevents the "failed to fetch user profile" error
          await Promise.resolve();
        }
      }
    );

    return unsubscribeBackgroundEvent;
  }, [navigationRef]);

  useEffect(() => {
    // Handle notification interactions when app is in foreground (Android)
    const unsubscribeForegroundEvent = notifee.onForegroundEvent(
      ({ detail, type }) => {
        if (type === EventType.PRESS) {
          // Only open the app, do not navigate anywhere
          // This prevents the "failed to fetch user profile" error
        }
      }
    );

    return unsubscribeForegroundEvent;
  }, [navigationRef]);

  useEffect(() => {
    // Handle foreground messages for Stream Chat notifications
    const unsubscribeOnMessage = messaging().onMessage(
      async (remoteMessage) => {
        // Only handle Stream Chat message notifications
        if (
          remoteMessage.data?.type === "message.new" &&
          remoteMessage.data?.sender === "stream.chat"
        ) {
          try {
            const isMatchNotification =
              remoteMessage.data?.message ===
              "You've connected! Start chatting now.";

            // Create the android channel to send the notification to
            const channelId = await notifee.createChannel({
              id: "chat-messages",
              name: "Chat Messages",
            });

            // Only show an in-app banner for the specific match message
            if (isMatchNotification) {
              await notifee.displayNotification({
                title: "🎉 It's a Match!",
                body: "You've connected! Start chatting now.",
                data: remoteMessage.data,
                android: {
                  channelId,
                  importance: AndroidImportance.HIGH,
                  pressAction: { id: "default" },
                },
              });
            }
          } catch (error) {
            console.error(
              "🔔 Error handling foreground match notification:",
              error
            );
          }
        }
      }
    );

    return unsubscribeOnMessage;
  }, []);

  // This component doesn't render anything
  return null;
}
