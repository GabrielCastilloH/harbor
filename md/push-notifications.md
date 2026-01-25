# 🔔 Push Notifications System

Harbor implements a comprehensive push notification system using **React Native Firebase** for FCM token management and **Stream Chat** for message delivery.

## Implementation Flow

Push notifications are initialized in `TabNavigator.tsx` after account setup. FCM tokens are stored in Firestore `users` collection and cached in AsyncStorage. Tokens refresh automatically on sign-in, home screen entry, and FCM token changes. Stream Chat integration handles device registration with production APNs configuration ("HarborFirebasePush").

## Notification Types

- **Match notifications**: Silent notifications when two users match
- **Message notifications**: Configurable alerts for new messages in active conversations
- **System notifications**: App-level notifications for important events

## Technical Details

- **FCM integration**: Production-ready push notifications for matches and messages
- **Stream Chat delivery**: Notifications delivered through Stream Chat's reliable system
- **Smart notification management**: Silent match notifications, configurable message alerts
- **Cross-platform support**: Works on both iOS and Android devices
- **Token management**: Automatic refresh and synchronization with backend
- **Production APNs**: Properly configured APNs certificates for iOS push notifications
