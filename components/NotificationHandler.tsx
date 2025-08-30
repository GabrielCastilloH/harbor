import React, { useEffect } from "react";
import messaging from "@react-native-firebase/messaging";
import notifee, { EventType } from "@notifee/react-native";
import { NavigationContainerRef } from "@react-navigation/native";
import { StreamChat } from "stream-chat";

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
        console.log(
          "🔔 [NOTIFICATION] App opened from background state on iOS:",
          remoteMessage.data
        );

        // Navigate to relevant channel screen for Stream Chat messages
        if (
          remoteMessage.data?.type === "message.new" &&
          remoteMessage.data?.channel_id
        ) {
          const channelId = remoteMessage.data.channel_id;
          console.log("🔔 [NOTIFICATION] Navigating to chat:", channelId);
          navigationRef.current?.navigate("ChatsTab", {
            screen: "ChatScreen",
            params: { channelId },
          });
        }
      }
    );

    // Handle notification opened app from quit state (iOS)
    messaging()
      .getInitialNotification()
      .then((remoteMessage) => {
        if (remoteMessage) {
          console.log(
            "🔔 Notification caused app to open from quit state on iOS"
          );

          // Navigate to relevant channel screen for Stream Chat messages
          if (
            remoteMessage.data?.type === "message.new" &&
            remoteMessage.data?.channel_id
          ) {
            const channelId = remoteMessage.data.channel_id;
            // Delay navigation to ensure navigation is ready
            setTimeout(() => {
              navigationRef.current?.navigate("ChatsTab", {
                screen: "ChatScreen",
                params: { channelId },
              });
            }, 1000);
          }
        }
      });

    // Handle notification opened app from quit state (Android)
    notifee.getInitialNotification().then((initialNotification) => {
      if (initialNotification) {
        console.log(
          "🔔 Notification caused app to open from quit state on Android"
        );

        const channelId = initialNotification.notification.data?.channel_id;
        if (channelId) {
          // Delay navigation to ensure navigation is ready
          setTimeout(() => {
            navigationRef.current?.navigate("ChatsTab", {
              screen: "ChatScreen",
              params: { channelId },
            });
          }, 1000);
        }
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
          console.log(
            "🔔 User pressed notification while app was on background on Android"
          );

          const channelId = detail.notification?.data?.channel_id;
          if (channelId) {
            navigationRef.current?.navigate("ChatsTab", {
              screen: "ChatScreen",
              params: { channelId },
            });
          }
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
          console.log(
            "🔔 User pressed notification while app was in foreground"
          );

          const channelId = detail.notification?.data?.channel_id;
          if (channelId) {
            navigationRef.current?.navigate("ChatsTab", {
              screen: "ChatScreen",
              params: { channelId },
            });
          }
        }
      }
    );

    return unsubscribeForegroundEvent;
  }, [navigationRef]);

  useEffect(() => {
    // Handle foreground messages for Stream Chat notifications
    const unsubscribeOnMessage = messaging().onMessage(
      async (remoteMessage) => {
        console.log("🔔 Foreground message received:", remoteMessage);

        // Only handle Stream Chat message notifications
        if (
          remoteMessage.data?.type === "message.new" &&
          remoteMessage.data?.sender === "stream.chat"
        ) {
          try {
            // Create the android channel to send the notification to
            const channelId = await notifee.createChannel({
              id: "chat-messages",
              name: "Chat Messages",
            });

            // Display the notification in foreground (optional - most chat apps don't show this)
            // Uncomment if you want to show notifications even when app is open
            /*
          await notifee.displayNotification({
            title: "New message",
            body: remoteMessage.data?.message || "You have a new message",
            data: remoteMessage.data,
            android: {
              channelId,
              pressAction: {
                id: "default",
              },
            },
          });
          */
          } catch (error) {
            console.error("🔔 Error handling foreground message:", error);
          }
        }
      }
    );

    return unsubscribeOnMessage;
  }, []);

  // This component doesn't render anything
  return null;
}
