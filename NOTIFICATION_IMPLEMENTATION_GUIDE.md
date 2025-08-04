# Push Notification Implementation Guide

## 🎯 **Hybrid Approach Implementation**

This guide outlines how to implement the hybrid approach for match notifications:

1. **Show match modal on app open** (✅ Implemented)
2. **Send push notifications** (📋 Groundwork laid)

## ✅ **Currently Implemented Features**

### **1. Unviewed Match Tracking**

- **Database Fields**: `user1Viewed`, `user2Viewed` in matches collection
- **Match Creation**: Both users start with `viewed: false`
- **Frontend Check**: `UnviewedMatchesHandler` component checks for unviewed matches on app open

### **2. Match Modal on App Open**

- **Component**: `UnviewedMatchesHandler.tsx`
- **Location**: Rendered in `App.tsx` when user is authenticated
- **Behavior**: Shows match modal for each unviewed match sequentially
- **Mark as Viewed**: Automatically marks matches as viewed when modal is closed

### **3. Backend Functions**

- `getUnviewedMatches`: Gets matches where user hasn't viewed
- `markMatchAsViewed`: Marks a match as viewed by a user
- **Location**: `functions/src/matches/matches.ts`

## 📋 **Push Notification Groundwork (Commented Out)**

### **Location**: `functions/src/swipes/swipes.ts` (lines ~250-290)

```typescript
// ========================================
// NOTIFICATION GROUNDWORK (COMMENTED OUT)
// ========================================
// TODO: When implementing push notifications, uncomment this section
//
// // Send push notification to the matched user
// try {
//   const matchedUserDoc = await db.collection("users").doc(swipedId).get();
//   const matchedUser = matchedUserDoc.data();
//
//   if (matchedUser?.fcmToken) {
//     // Send notification using Firebase Cloud Messaging
//     const message = {
//       token: matchedUser.fcmToken,
//       notification: {
//         title: "New Match! 💕",
//         body: `You matched with ${swiperUser?.firstName || "someone"}!`,
//       },
//       data: {
//         type: "new_match",
//         matchId: matchRef.id,
//         matchedUserId: swiperId,
//         click_action: "FLUTTER_NOTIFICATION_CLICK",
//       },
//       android: {
//         notification: {
//           channelId: "matches",
//           priority: "high",
//         },
//       },
//       apns: {
//         payload: {
//           aps: {
//             sound: "default",
//             badge: 1,
//           },
//         },
//       },
//     };
//
//     // Send using Firebase Admin SDK
//     await admin.messaging().send(message);
//     await logToNtfy(`[${requestId}] NOTIFICATION SENT: ${swipedId}`);
//   }
// } catch (notificationError) {
//   await logToNtfy(`[${requestId}] NOTIFICATION ERROR: ${notificationError}`);
//   // Don't fail the match creation if notification fails
// }
// ========================================
```

## 🚀 **Steps to Implement Push Notifications**

### **1. Frontend Setup**

#### **Install Dependencies**

```bash
npx expo install expo-notifications
npx expo install expo-device
```

#### **Add to app.json**

```json
{
  "expo": {
    "plugins": [
      [
        "expo-notifications",
        {
          "icon": "./assets/notification-icon.png",
          "color": "#ffffff",
          "sounds": ["./assets/notification-sound.wav"]
        }
      ]
    ]
  }
}
```

#### **Request Permissions**

```typescript
// In App.tsx or a dedicated notification service
import * as Notifications from "expo-notifications";
import * as Device from "expo-device";

const requestNotificationPermissions = async () => {
  if (Device.isDevice) {
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      // Failed to get push token for push notification
      return;
    }

    const token = await Notifications.getExpoPushTokenAsync({
      projectId: "your-expo-project-id",
    });

    return token.data;
  }
};
```

### **2. Backend Setup**

#### **Add FCM Token to User Profile**

```typescript
// In userFunctions-updateUser
interface UpdateUserData {
  // ... existing fields
  fcmToken?: string;
}
```

#### **Uncomment Notification Code**

1. Go to `functions/src/swipes/swipes.ts`
2. Find the commented notification section
3. Uncomment the entire section
4. Update the notification message as needed

#### **Add FCM Token Storage**

```typescript
// In userFunctions-updateUser
if (userData.fcmToken) {
  updateData.fcmToken = userData.fcmToken;
}
```

### **3. Notification Handling**

#### **Frontend Notification Handler**

```typescript
// In App.tsx or a dedicated service
Notifications.setNotificationHandler({
  handleNotification: async (notification) => {
    const data = notification.request.content.data;

    if (data.type === "new_match") {
      // Navigate to match modal or chat
      // You can use navigation.navigate() here
    }

    return {
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
    };
  },
});
```

#### **Background Notification Handler**

```typescript
// In App.tsx
useEffect(() => {
  const subscription = Notifications.addNotificationResponseReceivedListener(
    (response) => {
      const data = response.notification.request.content.data;

      if (data.type === "new_match") {
        // Handle notification tap
        // Navigate to appropriate screen
      }
    }
  );

  return () => subscription.remove();
}, []);
```

## 📱 **Notification Features to Implement**

### **1. Match Notifications**

- ✅ **Title**: "New Match! 💕"
- ✅ **Body**: "You matched with [Name]!"
- ✅ **Data**: Match ID, matched user ID
- ✅ **Action**: Navigate to match modal or chat

### **2. Message Notifications**

- 📋 **Title**: "New Message 💬"
- 📋 **Body**: "[Name]: [Message preview]"
- 📋 **Data**: Chat ID, sender ID
- 📋 **Action**: Navigate to specific chat

### **3. Profile View Notifications**

- 📋 **Title**: "Someone viewed your profile 👀"
- 📋 **Body**: "A new person checked out your profile!"
- 📋 **Data**: Viewer ID (optional)
- 📋 **Action**: Navigate to profile views screen

## 🔧 **Testing Notifications**

### **1. Development Testing**

```bash
# Send test notification
curl -H "Content-Type: application/json" \
     -H "Authorization: key=YOUR_SERVER_KEY" \
     -d '{
       "to": "DEVICE_TOKEN",
       "notification": {
         "title": "Test Notification",
         "body": "This is a test notification"
       }
     }' \
     https://fcm.googleapis.com/fcm/send
```

### **2. Production Testing**

- Use Expo's push notification service
- Test on both iOS and Android devices
- Verify notification permissions

## 📊 **Analytics & Tracking**

### **1. Notification Metrics**

- Track notification delivery rates
- Monitor user engagement with notifications
- A/B test notification content

### **2. User Preferences**

- Allow users to disable specific notification types
- Implement notification scheduling
- Add quiet hours functionality

## 🎯 **Next Steps**

1. **Set up Expo notifications** in the frontend
2. **Uncomment notification code** in backend
3. **Add FCM token storage** to user profiles
4. **Test notification flow** end-to-end
5. **Implement notification preferences** UI
6. **Add analytics tracking** for notification engagement

## 📝 **Notes**

- **FCM Token**: Each device gets a unique token for push notifications
- **Token Refresh**: Tokens can expire, handle token refresh
- **Permission Handling**: Gracefully handle permission denials
- **Background Processing**: Consider how notifications work when app is closed
- **Rate Limiting**: Implement notification rate limiting to prevent spam

---

**Status**: ✅ Match modal on app open implemented | 📋 Push notification groundwork laid
