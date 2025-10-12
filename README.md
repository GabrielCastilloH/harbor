# 🌊 Harbor

**A unique dating app designed specifically for Cornell students that focuses on meaningful connections through progressive photo reveal and limited daily interactions.**

Harbor creates intrigue and encourages genuine conversations by gradually revealing profile photos as users chat, fostering deeper connections beyond superficial first impressions.

## ✨ Core Features

### 🎭 Progressive Photo Reveal System

- **Two-phase blur system**: Photos start heavily blurred and gradually become clear as users chat
- **Consent-based transitions**: Users must consent to continue chatting after 30 messages to see clearer photos
- **Server-side blur processing**: Secure image processing with 80% server-side blur for privacy
- **Seamless client animations**: Smooth blur transitions create engaging user experience
- **Group match support**: Unified blur system works for both individual and group matches

### 💫 Smart Matching & Swiping

- **Intelligent recommendations**: Algorithm considers sexual orientation, gender preferences, and mutual interest
- **Unified swipe system**: **Efficient daily swipe tracking using subcollections for optimal performance**
- **Daily swipe limits**: **5 swipes per day for all users (premium features currently disabled)**
- **Instant match detection**: Real-time matching when two users swipe right on each other
- **Group formation**: Automatic group match creation when multiple users with same group size preferences match
- **Swipe gesture controls**: Smooth card-based swiping with visual feedback

### 💬 Real-time Chat System

- **Stream Chat integration**: Production-ready chat with typing indicators, read receipts, and message history
- **Progressive unlock system**: Chat becomes available after matching, photos unlock through conversation
- **Consent modals**: Built-in consent flow ensures both users want to continue chatting
- **Channel freezing**: Automatic chat freeze when users unmatch or report
- **Group chat support**: Multi-user chat channels for group matches

### 🔐 Security & Privacy

- **Cornell email verification**: Custom 6-digit code system designed for university email systems
- **Image moderation**: Automated content screening for inappropriate images
- **Report system**: Comprehensive reporting with automatic unmatching and chat freezing
- **Account management**: Complete account deletion, banning, and deactivation systems
- **Data protection**: Secure user data handling with Firebase security rules

### 📱 Push Notifications

- **FCM integration**: Production-ready push notifications for matches and messages
- **Stream Chat delivery**: Notifications delivered through Stream Chat's reliable system
- **Smart notification management**: Silent match notifications, configurable message alerts
- **Cross-platform support**: Works on both iOS and Android devices

## ⚡ Swipe System Architecture

Harbor implements a **subcollection-based swipe tracking system** that provides efficient daily swipe management and group formation capabilities.

### Current Implementation

#### 🚀 Performance Benefits

- **Subcollection Organization**: Swipes stored in `/swipes/{userId}/outgoing/` and `/swipes/{userId}/incoming/` for efficient querying
- **Counter-based Limits**: Daily swipe counts tracked in `/users/{userId}/counters/swipes` subcollection
- **Atomic Operations**: All swipe data updates happen in transactions, preventing race conditions
- **Group Formation**: Automatic group match creation when multiple users with same group size preferences match

#### 🔒 Data Consistency

- **Transaction Safety**: Swipe count increments and limit checks happen atomically
- **No Race Conditions**: Prevents users from exceeding limits during rapid swiping
- **Automatic Reset**: Daily swipe counts reset automatically via scheduled function
- **Match Prevention**: Users with active matches cannot swipe until match is resolved

#### 🏗️ Scalability Advantages

- **Efficient Querying**: Subcollections allow for fast retrieval of user's swipe history
- **Group Support**: System supports both individual (2-person) and group (3-4 person) matches
- **Availability Tracking**: Index-based filtering prevents recommending users who are already in matches
- **Future-Proof**: Framework ready for premium tiers and advanced features

#### 🎯 User Availability System

Harbor implements a scalable **availability tracking system** that prevents users currently in matches from being recommended to others:

##### Database Fields

- **`isActive`**: Controls account status (enabled/disabled)
- **`isAvailable`**: Controls match availability (defaults to `true` if not set)
  - `true`: User is available for new matches
  - `false`: User is currently in an active match

##### Automatic State Management

- **Match Creation**: When users match, both/all participants are set to `isAvailable: false`
- **Match Deletion**: When users unmatch, all participants are set to `isAvailable: true`
- **Recommendation Filtering**: Only users with `isActive !== false` and `isAvailable !== false` are recommended

##### Scalability Benefits

- **Index-Based Filtering**: Firestore queries filter unavailable users at the database level
- **No Memory Filtering**: Eliminates expensive in-memory filtering operations
- **Composite Indexes**: Support efficient multi-field queries (orientation + gender + availability)
- **Real-Time Updates**: Availability status updates immediately upon match state changes

### Technical Implementation

#### Database Structure

```typescript
// User document in /users/{userId}
{
  // ... other user fields
  groupSize: 2,             // Preferred group size (2, 3, or 4)
  isActive: true,           // Account status (account enabled/disabled)
  isAvailable: true,        // Match availability (true = available to match, false = currently in a match)
  currentMatches: [],       // Array of active match IDs
}

// Swipe counter in /users/{userId}/counters/swipes
{
  count: 3,                 // Current day's swipe count
  resetDate: timestamp,     // Last reset timestamp
  updatedAt: timestamp,     // Last update timestamp
}

// Outgoing swipes in /swipes/{userId}/outgoing/{swipedUserId}
{
  direction: "right",       // "left" or "right"
  timestamp: timestamp,     // When swipe occurred
  swipedId: "user123",      // ID of swiped user
}

// Incoming swipes in /swipes/{userId}/incoming/{swiperId}
{
  direction: "right",       // "left" or "right"
  timestamp: timestamp,     // When swipe occurred
  swiperId: "user456",      // ID of swiper
}
```

#### Daily Reset Logic

```typescript
// Scheduled function runs daily to reset swipe counts
export const resetDailySwipes = onSchedule("0 0 * * *", async () => {
  // Reset all user swipe counters to 0
  // Send notifications to users who reached their limit
});
```

#### Transaction-Based Swipe Creation

```typescript
// Atomic swipe creation in createSwipe function
await db.runTransaction(async (transaction) => {
  // Check limits, record swipe, and increment count
  // All operations happen atomically
  transaction.update(countersRef, {
    count: admin.firestore.FieldValue.increment(1),
    updatedAt: admin.firestore.FieldValue.serverTimestamp(),
  });
});
```

## 🏗️ Technical Architecture

### Frontend Stack

- **React Native** (0.79.5) with Expo (53.0.22)
- **TypeScript** for type safety
- **React Navigation** for navigation management
- **Stream Chat React Native** for real-time messaging
- **React Native Firebase** for authentication and push notifications
- **Expo Blur** for progressive image reveal effects
- **React Native Reanimated** for smooth animations

### Backend Services

- **Firebase Authentication** with custom email verification
- **Cloud Firestore** for real-time data storage
- **Firebase Cloud Functions** (Node.js 22) for backend logic
- **Firebase Storage** for image hosting and processing
- **Stream Chat** for messaging infrastructure
- **Google Secret Manager** for secure API key storage
- **Mailgun** for reliable email delivery

### Key Dependencies

```json
{
  "stream-chat-react-native": "^8.3.3",
  "@react-native-firebase/messaging": "^23.0.0",
  "expo-blur": "~14.1.5",
  "react-native-reanimated": "~3.17.4",
  "firebase": "^12.0.0",
  "react-navigation": "^7.x"
}
```

## 📱 App Structure

### Navigation Architecture

```
App.tsx (Main Navigator)
├── AuthStack (Unauthenticated)
│   ├── SignIn
│   ├── CreateAccount
│   └── EmailVerification
├── AccountSetup (First-time users)
├── BannedAccountScreen (Banned users)
├── DeletedAccountScreen (Deleted users)
└── TabNavigator (Main App)
    ├── HomeTab (HomeStack)
    │   ├── HomeScreen (Swiping)
    │   └── ReportScreen
    ├── ChatsTab (ChatNavigator)
    │   ├── ChatList
    │   ├── ChatScreen
    │   ├── ProfileScreen
    │   ├── ReportScreen
    │   └── StudyGroupConnectionsScreen
    └── SettingsTab (SettingsStack)
        ├── SettingsScreen
        ├── EditProfile
        ├── SelfProfile
        └── GroupSizeScreen
```

### Core Screens

- **HomeScreen**: Card-based swiping interface with recommendations and group formation
- **ChatList**: List of active matches and conversations with unread count badges
- **ChatScreen**: Real-time messaging with progressive photo reveal and consent modals
- **ProfileScreen**: View other users' profiles with blur effects and reporting options
- **AccountSetupScreen**: Onboarding flow for new users with progress tracking
- **SettingsScreen**: App preferences, account management, and group size selection
- **BannedAccountScreen**: Screen shown to banned users with appeal contact
- **DeletedAccountScreen**: Screen shown to deleted users
- **StudyGroupConnectionsScreen**: Group match management and connections
- **GroupSizeScreen**: Group size preference selection (2, 3, or 4 people)

### Component Architecture

- **AnimatedStack**: Gesture-based swiping with smooth animations
- **ImageCarousel**: Profile photo viewer with blur transitions
- **VerificationCodeInput**: Custom 6-digit code input for email verification
- **MatchModal**: Celebration screen when users match
- **SettingsButton**: Reusable settings interface component
- **ClarityBar**: Visual progress indicator for photo reveal
- **DataPicker**: Custom picker components for form inputs
- **NotificationHandler**: Push notification management
- **UnviewedMatchesHandler**: Handles unviewed match notifications

## 🔧 Firebase Cloud Functions

### Authentication Functions (`authFunctions`)

- **sendVerificationCode**: Sends 6-digit codes via Mailgun with 2-minute cooldown
- **verifyVerificationCode**: Validates codes and marks emails as verified
- **getVerificationCooldown**: Returns remaining cooldown time for verification requests
- **signInWithEmail**: Custom sign-in flow with Firestore user checking

### Chat Functions (`chatFunctions`)

- **getStreamApiKey**: Provides Stream Chat API key to frontend
- **generateUserToken**: Creates Stream Chat tokens for authenticated users
- **generateToken**: Alias for generateUserToken
- **createChatChannel**: Sets up messaging channels between matched users
- **updateChannelChatStatus**: Freezes/unfreezes chat channels
- **updateMessageCount**: Increments message count for consent tracking

### Image Functions (`imageFunctions`)

- **uploadImage**: Processes and stores original + blurred image versions with content moderation
- **getImages**: Fetches user images with appropriate blur levels based on consent status
- **getPersonalImages**: Returns unblurred images for user's own profile editing
- **getOriginalImages**: Returns original images for current user's profile
- **generateBlurred**: Creates blurred versions of uploaded images

### Swipe Functions (`swipeFunctions`)

- **createSwipe**: Records swipes, detects mutual matches, and handles group formation
- **countRecentSwipes**: Fetches a user's daily swipe count from counters subcollection
- **getSwipesByUser**: Retrieves all swipes made by a specific user
- **savePushToken**: Saves Expo push tokens for notifications
- **resetDailySwipes**: Scheduled function that resets daily swipe counts

### Match Functions (`matchFunctions`)

- **createMatch**: Creates individual match records between two users
- **createGroupMatch**: Creates group match records between multiple users
- **getActiveMatches**: Retrieves all active matches for a user
- **getUnviewedMatches**: Gets unviewed matches for showing match modals
- **markMatchAsViewed**: Tracks when users view new matches
- **unmatchUsers**: Deactivates matches and freezes chat channels
- **updateMatchChannel**: Updates match channel ID
- **getMatchId**: Finds match ID between two users
- **updateConsent**: Updates user's consent status for continued chatting
- **getConsentStatus**: Manages consent flow for continued chatting
- **migrateMatchConsent**: Migrates old match documents to new consent schema
- **incrementMatchMessages**: Increments message count for matches

### Recommendation Functions (`recommendationsFunctions`)

- **getRecommendations**: Provides personalized user recommendations based on preferences, availability matching, and user availability status (excludes users currently in matches)

### Report Functions (`reportFunctions`)

- **createReport**: Creates user reports for moderation
- **getReports**: Retrieves all reports (admin function)
- **updateReportStatus**: Updates report status (admin function)
- **reportAndUnmatch**: Handles user reports with automatic unmatching and chat freezing
- **blockUser**: Blocks users and optionally unmatches them

### User Functions (`userFunctions`)

- **createUser**: Creates new user profiles with comprehensive validation
- **getAllUsers**: Retrieves all users (admin function)
- **getUserById**: Gets user by ID
- **updateUser**: Updates user profiles with transactional image cleanup
- **unmatchUser**: Unmatches a user from all their matches
- **markPaywallAsSeen**: Marks paywall as seen (premium feature)
- **deleteUser**: Complete account deletion with comprehensive data cleanup
- **deactivateAccount**: Deactivates user account
- **reactivateAccount**: Reactivates user account
- **checkDeletedAccount**: Checks if email belongs to deleted account
- **banUser**: Bans user account
- **checkBannedStatus**: Checks if user is banned

### Superwall Functions (`superwallFunctions`)

- **getSuperwallApiKeys**: Provides Superwall API keys for premium features (currently disabled)

## 🔐 Authentication & Email Verification Flow

Harbor uses Firebase Auth with a **custom code-based email verification system** that replaces Firebase's default link-based verification. This system is specifically designed to work with university email systems that pre-fetch verification links.

### Flow Logic

The app has 6 distinct authentication states handled in `App.tsx`:

1. **User signed in but email NOT verified** → `EmailVerificationScreen`
2. **User verified but NO profile in database** → `AccountSetupScreen`
3. **User verified AND has profile** → Main App (`TabNavigator`)
4. **User not signed in** → Auth screens (`SignIn`/`CreateAccount`)
5. **User account deleted** → `DeletedAccountScreen`
6. **User account banned** → `BannedAccountScreen`

### Email Verification System

#### Overview

Instead of using Firebase's built-in email verification links, Harbor implements a custom verification system using:

- **6-digit verification codes** sent via email
- **5-minute expiration** for security
- **Mailgun integration** for reliable email delivery
- **Google Secret Manager** for secure API key storage

#### Complete Verification Flow

1. **User Signs Up** (`CreateAccountScreen.tsx`)

   ```typescript
   // 1. Create user with Firebase Auth
   const userCredential = await createUserWithEmailAndPassword(
     auth,
     email,
     password
   );

   // 2. User automatically navigated to EmailVerificationScreen
   // 3. No manual email sending - handled by EmailVerificationScreen
   ```

2. **Code Generation & Sending** (`EmailVerificationScreen.tsx`)

   ```typescript
   // Screen loads → automatically calls sendVerificationCode Firebase Function
   useEffect(() => {
     if (currentUser && !initialEmailSent) {
       handleResendEmail(true); // Send initial verification code
       setInitialEmailSent(true);
     }
   }, [currentUser, initialEmailSent]);
   ```

3. **Backend Code Processing** (`functions/src/auth/emailVerification.ts`)

   ```typescript
   // Generate 6-digit code
   const code = Math.floor(100000 + Math.random() * 900000).toString();
   const expiresAt =
     admin.firestore.Timestamp.now().toMillis() + 10 * 60 * 1000;

   // Store in Firestore
   await db.collection("verificationCodes").doc(userId).set({
     code,
     email,
     expiresAt,
     createdAt: admin.firestore.FieldValue.serverTimestamp(),
   });

   // Send via Mailgun
   const msg = {
     from: `Harbor <noreply@tryharbor.app>`,
     subject: "Your Harbor Verification Code",
     html: `<div>Your verification code is: <h2>${code}</h2></div>`,
   };
   await mg.messages.create(domain, msg);
   ```

4. **User Enters Code** (`EmailVerificationScreen.tsx`)

   ```typescript
   // Modern 6-box input UI with paste functionality
   <VerificationCodeInput
     value={verificationCode}
     onChangeText={setVerificationCode}
     maxLength={6}
   />
   ```

5. **Code Verification** (`functions/src/auth/emailVerification.ts`)

   ```typescript
   // Verify code against Firestore
   const doc = await db.collection("verificationCodes").doc(userId).get();
   const storedData = doc.data();

   if (storedData?.code === code && storedData?.expiresAt > now) {
     // Mark email as verified using Firebase Admin SDK
     await admin.auth().updateUser(userId, { emailVerified: true });
     await doc.ref.delete(); // Clean up used code
     return { success: true };
   } else if (storedData?.expiresAt < now) {
     // Code expired - delete and require new code
     await doc.ref.delete();
     throw new functions.https.HttpsError("unauthenticated", "Code expired");
   } else {
     // Incorrect code - keep code active for retry
     throw new functions.https.HttpsError("unauthenticated", "Incorrect code");
   }
   ```

6. **Access Granted**
   - Once verified, app automatically navigates to `AccountSetupScreen`
   - User can now access full app features

#### Security Features

- **6-digit codes** with 10-minute expiration
- **One-time use** (deleted after verification)
- **Server-side verification** (cannot be bypassed)
- **Mailgun integration** with verified domain (`tryharbor.app`)
- **Google Secret Manager** for secure API key storage
- **Forgiving verification** (codes stay active for typos)

#### Cooldown & Rate Limiting

- **2-minute cooldown** enforced on both frontend and backend
- **Server-side protection** against abuse (cannot be bypassed)
- **Real-time countdown** showing remaining time
- **Smart button states** (disabled during cooldown)
- **Graceful error handling** for cooldown violations

#### Cornell Email Validation

- **Frontend validation**: Explicit rejection of emails containing `+` symbols
- **Backend normalization**: Strip `+` aliases in Cloud Functions (when needed)
- **Domain enforcement**: Only `@cornell.edu` emails accepted

## 🚫 Account Management & Banning System

Harbor implements a comprehensive account management system that handles account deletion, banning, and deactivation. This system ensures that users who violate community guidelines or have their accounts compromised cannot access the platform.

### Account Deletion System

#### Database Structure

- **Collection**: `deletedAccounts`
- **Document ID**: `userId` (Firebase Auth UID)
- **Fields**:
  - `email` (string): User's email at time of deletion
  - `deletedAt` (timestamp): When account was deleted
  - `reason` (string): Internal note about deletion reason

#### User Flow

1. **Deletion Request**: User requests account deletion in settings
2. **Comprehensive Data Cleanup**: All user data is removed from Firestore collections including:
   - User profile data
   - All matches and chat channels
   - Swipe history
   - Images from Firebase Storage
   - Stream Chat user data
3. **Account Marking**: User document is moved to `deletedAccounts` collection
4. **Access Restriction**: User is redirected to `DeletedAccountScreen`
5. **No Return**: Deleted accounts cannot be restored

### Account Banning System

#### Database Structure

- **Collection Name**: `bannedAccounts`
- **Document ID**: `userId` (Firebase Authentication UID)
- **Required Fields**:
  - `bannedByEmail` (string): User's email address at time of ban
  - `unbanDate` (timestamp): When the ban expires (null for permanent bans)
  - `reason` (string): Internal note about why user was banned
  - `createdAt` (timestamp): When the ban was created

#### Ban Management Functions

- **banUser**: Creates ban records with optional expiration dates
- **checkBannedStatus**: Checks if user is banned and returns ban details
- **Automatic Detection**: App checks ban status during authentication flow

#### User Flow for Banned Accounts

1. **Ban Detection**: App checks `bannedAccounts` collection during authentication
2. **Access Restriction**: Banned users are immediately redirected to `BannedAccountScreen`
3. **No App Access**: Banned users cannot access any app features
4. **Contact Information**: Screen displays contact email for appeals: `gabocastillo321@gmail.com`

### Account Deactivation System

#### Database Structure

- **User Document Field**: `isActive` (boolean)
- **Deactivation**: Set to `false` to deactivate account
- **Reactivation**: Set to `true` to reactivate account

#### Management Functions

- **deactivateAccount**: Deactivates user account while preserving data
- **reactivateAccount**: Reactivates previously deactivated account
- **Flexible Control**: Allows temporary account suspension without data loss

### Implementation Details

The account status check is integrated into the main authentication flow:

- **State Management**: Account status variables track deletion, ban, and deactivation status
- **Database Checks**: After user authentication, check multiple collections for account status
- **Routing Logic**: Redirect to appropriate screen based on account status
- **Comprehensive Blocking**: All app functionality is disabled for restricted accounts

### Security Considerations

- **Client-Side Checks**: All interactive elements are disabled for restricted users
- **Server-Side Rules**: Firestore security rules check account status before allowing access
- **No Circumvention**: Restricted users cannot bypass restrictions through app manipulation
- **Appeal Process**: Clear contact information provided for legitimate appeals

### Account Status Priority

The app checks account status in this order:

1. **Email Verification**: Must verify email before proceeding
2. **Account Deletion**: Deleted accounts cannot be restored
3. **Account Banning**: Banned accounts are completely restricted
4. **Account Deactivation**: Deactivated accounts are temporarily restricted
5. **Profile Setup**: New users must complete profile creation
6. **Full Access**: Verified users with complete profiles can access all features

## 📋 Profile Validation & Requirements

### Profile Creation Requirements

#### Images

- **Minimum**: 3 images required
- **Maximum**: 6 images allowed
- **Format**: JPEG only
- **Processing**: Auto-resized to 800x800 max, quality 80%
- **Moderation**: Automated content screening for inappropriate content
- **Storage**: Both original and 80% blurred versions stored in Firebase Storage

#### Required Fields

All fields must be completed before profile creation:

- **Your Name, Initial(s) or Nickname**: 1-11 characters (enforced on backend)
- **Age**: 18+ years old
- **Gender**: Must select from dropdown (Male, Female, Non-Binary)
- **Sexual Orientation**: Must select from dropdown (Heterosexual, Homosexual, Bisexual, Pansexual)
- **Year Level**: Must select from dropdown (Freshman, Sophomore, Junior, Senior)
- **Major**: Must select from dropdown (85+ options)
- **Group Size**: Must select from dropdown (2, 3, or 4 people)

#### Text Field Limits

| Field                              | Min Length | Max Length | Description                       |
| ---------------------------------- | ---------- | ---------- | --------------------------------- |
| Your Name, Initial(s) or Nickname  | 1          | 11         | Your name, initial(s) or nickname |
| About Me                           | 5          | 180        | Personal description              |
| Q1: "Together we could"            | 5          | 100        | Shared activity                   |
| Q2: "Favorite book, movie or song" | 5          | 100        | Cultural preference               |
| Q3: "Some of my hobbies are"       | 5          | 100        | Personal interests                |

#### Data Types Definition

```typescript
export type Profile = {
  uid?: string; // Firebase UID
  email: string;
  firstName: string;
  yearLevel: string;
  age: number;
  major: string;
  gender: string; // "Male", "Female", or "Non-Binary"
  sexualOrientation: string; // "Heterosexual", "Homosexual", "Bisexual", or "Pansexual"
  images: string[];
  aboutMe: string;
  q1: string; // "Together we could:"
  q2: string; // "Favorite book, movie or song:"
  q3: string; // "Some of my hobbies are:"
  groupSize: number; // 2, 3, or 4
  availability: number; // For matching algorithm
  currentMatches?: string[];
  paywallSeen?: boolean;
  fcmToken?: string;
  expoPushToken?: string;
  isActive?: boolean; // Account status (enabled/disabled)
  isAvailable?: boolean; // Match availability (defaults to true, false when in active match)
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};
```

## 🎭 Progressive Photo Reveal System

### Core Design Philosophy

The app uses a **unified progressive blur system** that works for both individual and group matches, creating intrigue while maintaining privacy:

#### Phase 1: Pre-Consent (Theatrical Reveal)

- **Server-side**: `_blurred.jpg` images are pre-blurred to 80% server-side
- **Client-side**: Fake 100% → 0% blur applied on top of the already-blurred image
- **Effect**: Creates the illusion of gradual reveal while the image remains heavily obscured
- **Transition**: At 0% client blur, the image still appears 80% blurred due to server-side blur

#### Phase 2: Post-Consent (Real Reveal)

- **Server-side**: Switch to `_original.jpg` (completely unblurred)
- **Client-side**: Start at 80% blur (matching Phase 1's final appearance) → 0% blur
- **Effect**: Seamless transition with actual image clarity improvement
- **Result**: Complete image reveal over 50 messages

### Technical Implementation

#### Blur Configuration (`constants/blurConfig.ts`)

```typescript
export const BLUR_CONFIG = {
  SERVER_BLUR_PERCENT: 80, // Server-side blur for _blurred.jpg
  CLIENT_MAX_BLUR_RADIUS: 50, // Max React Native blur radius
  MESSAGES_TO_CLEAR_BLUR: 30, // Phase 1: 100% → 0% fake unblur
  MESSAGES_TO_CLEAR_ORIGINAL: 10, // Phase 2: 80% → 0% real unblur
};
```

#### Unified Blur Calculation Logic

```typescript
export function getClientBlurLevel({
  messageCount,
  bothConsented,
}: {
  messageCount: number;
  bothConsented: boolean;
}): number {
  const percentageToBlurRadius = (percent: number) =>
    Math.round((percent / 100) * BLUR_CONFIG.CLIENT_MAX_BLUR_RADIUS);

  if (!bothConsented) {
    // Phase 1: Fake reveal on _blurred.jpg
    const progress = Math.min(
      messageCount / BLUR_CONFIG.MESSAGES_TO_CLEAR_BLUR,
      1
    );
    const blurPercent = 100 * (1 - progress); // 100% → 0%
    return percentageToBlurRadius(blurPercent);
  } else {
    // Phase 2: Real reveal on _original.jpg
    const progress = Math.min(
      messageCount / BLUR_CONFIG.MESSAGES_TO_CLEAR_ORIGINAL,
      1
    );
    const blurPercent = 80 * (1 - progress); // 80% → 0%
    return percentageToBlurRadius(blurPercent);
  }
}

// Group-specific blur calculation
export function getGroupClientBlurLevel({
  messageCount,
  allMembersConsented,
}: {
  messageCount: number;
  allMembersConsented: boolean;
}): number {
  // Similar logic but requires ALL group members to consent
}
```

### Consent State Management

#### Unified Match Document Structure

```typescript
interface Match {
  type: "individual" | "group";
  participantIds: string[]; // Unified field for both individual and group matches
  memberIds?: string[]; // For group matches only
  groupSize?: number; // For group matches only
  participantConsent: Record<string, boolean>; // Unified consent tracking
  participantViewed: Record<string, boolean>; // Unified view tracking
  messageCount: number;
  isActive: boolean;
  matchDate: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  consentMessageSent?: boolean;
  introMessageSent?: boolean;
}
```

#### Server Response Shape

The `matchFunctions-getConsentStatus` callable returns:

- `participantIds` (unified for both individual and group matches)
- `participantConsent` (unified consent map)
- `bothConsented` (for individual) / `allMembersConsented` (for group)
- `messageCount`
- `shouldShowConsentScreen` (true when `messageCount >= threshold` and not all consented)
- `shouldShowConsentForUser` (per-user modal visibility)
- `state` ("none_consented" | "one_consented" | "both_consented" | "all_consented")

#### Client Detection Flow

1. **Message Counting**: Every new message increments `messageCount` via `chatFunctions-updateMessageCount`
2. **Consent Checking**: After each message, calls `getConsentStatus(matchId)`
3. **Modal Display**: Shows consent modal only when user's `shouldShowConsentForUser` is true
4. **Channel Management**: Freezes chat until all participants consent when threshold reached
5. **Group Support**: For group matches, requires ALL members to consent before Phase 2 begins

## 🔔 Push Notifications System

Harbor implements a comprehensive push notification system using **React Native Firebase** for FCM token management and **Stream Chat** for message delivery.

### Implementation Flow

#### 1. Permission Request Timing

**Location**: `TabNavigator.tsx` (after account setup completion)  
**Timing**: When user first enters the main app after account creation

```typescript
const initializeStreamNotifications = async () => {
  const granted = await streamNotificationService.requestPermission();
  if (granted) {
    await streamNotificationService.saveUserToken(currentUser.uid);
  }
};
```

#### 2. FCM Token Storage System

**Primary Storage**: Firestore `users` collection

```typescript
// Stored in: /users/{userId}
{
  fcmToken: "device-specific-fcm-token",
  updatedAt: serverTimestamp()
}
```

**Local Cache**: AsyncStorage key `"@stream_push_token"` for change detection

#### 3. Token Update Triggers

**New Users**: Account creation → Email verification → Account setup → TabNavigator → Permission request → Token save

**Existing Users**: Multiple refresh points:

- `SignIn.tsx`: When existing user signs in
- `HomeScreen.tsx`: Every time user enters home screen
- `AccountSetupScreen.tsx`: When new user completes profile setup
- Automatic refresh when FCM token changes

#### 4. Stream Chat Integration

1. **Device Registration**: Register device for remote messages (iOS requirement)
2. **Get FCM Token**: Fetch current device token
3. **Clean Previous Devices**: Remove existing devices for clean state
4. **Register with Stream**: Add device with production config "HarborFirebasePush"
5. **Store Tokens**: Save in both AsyncStorage and Firestore

#### 5. Production Configuration

**iOS Entitlements** (`app.json`):

```json
"ios": {
  "entitlements": {
    "aps-environment": "production"
  }
}
```

**Stream Chat Setup**:

- Production APNs .p8 key uploaded to Stream dashboard
- Environment set to "Production"
- Push configuration name: "HarborFirebasePush"

## 💎 Premium Features (Currently Disabled)

### Current Status

All premium features are currently **disabled** throughout the codebase. The app functions as a free-tier only application with all users receiving the same features.

### Premium Feature Framework

- **Superwall integration**: Complete premium paywall system implemented but commented out
- **Swipe limits**: 5 swipes per day for all users (no premium advantage)
- **Feature flags**: Comprehensive feature configuration system in place but returns free tier values

### Disabled Premium Features

```typescript
// All premium features return false/free tier values
export const usePremium = () => {
  const isPremium = false; // Always false
  return {
    isPremium,
    features: getFeatureConfig(isPremium), // Always returns FREE_FEATURES
    swipesPerDay: getSwipesPerDay(isPremium), // Always returns 5
    canSeeWhoSwipedOnThem: canSeeWhoSwipedOnThem(isPremium), // Always returns false
  };
};

// Feature configuration always returns free tier
export const getFeatureConfig = (isPremium: boolean): FeatureConfig => {
  return FREE_FEATURES; // Always return free features
  // Original: return isPremium ? PREMIUM_FEATURES : FREE_FEATURES;
};
```

### Premium Infrastructure Ready

- **Payment processing**: Superwall SDK integrated but inactive
- **Feature gates**: Complete gating system throughout the app
- **Backend support**: Cloud Functions ready for premium user management
- **UI components**: Premium upgrade prompts implemented but show "coming soon" messages
- **API keys**: Superwall API keys stored in Google Secret Manager but unused

## 🛡️ Security & Moderation

### Image Moderation

- **Automated screening**: Content moderation for inappropriate images with file size and type validation
- **Upload validation**: Server-side checks before storage including JPEG/PNG validation
- **Rejection handling**: Clear error messages for failed moderation
- **Storage security**: Images stored in Firebase Storage with proper access controls

### User Reporting System

- **Comprehensive reporting**: Multiple report categories with detailed explanations
- **Automatic actions**: Immediate unmatching and chat freezing upon report submission
- **Data collection**: Detailed report tracking for moderation review
- **Block functionality**: Users can block other users without full reporting
- **Duplicate prevention**: System prevents duplicate reports from same user

### Account Management

- **Account deletion**: Complete removal with comprehensive data cleanup including:
  - User profile data
  - All matches and chat channels
  - Swipe history
  - Images from Firebase Storage
  - Stream Chat user data
- **Account banning**: Comprehensive banning system for policy violations with optional expiration dates
- **Account deactivation**: Temporary account suspension without data loss
- **Status tracking**: Real-time monitoring of account states
- **Appeal process**: Clear contact information for legitimate appeals

### Data Security

- **Firebase Security Rules**: Comprehensive Firestore and Storage rules
- **Authentication checks**: All Cloud Functions require proper authentication
- **Data validation**: Server-side validation for all user inputs with comprehensive error handling
- **Privacy protection**: Sensitive data filtering in recommendations
- **Email normalization**: Prevents email alias abuse and duplicate accounts

### Content Safety

- **Image processing**: Automatic blur generation for privacy with 80% server-side blur
- **Chat monitoring**: Ability to freeze channels for violations
- **Account management**: Complete account deletion with data cleanup
- **Ban enforcement**: Comprehensive blocking of banned users
- **Consent system**: Progressive photo reveal requires explicit user consent

## ⚠️ Potential Security Breaches

### Critical Security Concerns

#### 1. **Original Image Access Without Consent**

- **Risk**: Users could potentially access `_original.jpg` images without proper consent validation
- **Location**: `functions/src/images/images.ts` - `getImages` function
- **Mitigation**: Function properly validates match existence and consent status before serving original images
- **Status**: ✅ **SECURE** - Consent validation is enforced server-side

#### 2. **Email Address Exposure in Matches**

- **Risk**: User emails could be exposed to matched users, allowing identity discovery
- **Location**: `functions/src/users/users.ts` - `getUserById` function
- **Mitigation**: Email addresses are explicitly filtered out from user data responses
- **Code**: `const { images, email, ...userDataWithoutSensitiveInfo } = userData;`
- **Status**: ✅ **SECURE** - Emails are never returned in user lookups

#### 3. **Unauthorized User Data Access**

- **Risk**: Users could access other users' profile data without proper authorization
- **Location**: Multiple functions including `getUserById`, `getRecommendations`
- **Mitigation**: All functions require authentication and validate user permissions
- **Status**: ✅ **SECURE** - Authentication required for all data access

#### 4. **Image Bypass Through Direct Storage Access**

- **Risk**: Users could potentially access images directly through Firebase Storage URLs
- **Location**: `storage.rules` and image serving functions
- **Mitigation**: Images are served through signed URLs with expiration, not direct access
- **Status**: ✅ **SECURE** - All image access goes through Cloud Functions with consent validation

#### 5. **Match Data Manipulation**

- **Risk**: Users could potentially manipulate match consent or view status
- **Location**: `functions/src/matches/matches.ts` - consent and view functions
- **Mitigation**: Firestore security rules restrict updates to only consent/view fields for authenticated users
- **Status**: ✅ **SECURE** - Limited update permissions enforced

#### 6. **Recommendation Data Leakage**

- **Risk**: Sensitive user data could be exposed in recommendation responses
- **Location**: `functions/src/recommendations/recommendations.ts`
- **Mitigation**: Email addresses and images are filtered out from recommendation responses
- **Code**: `const { images, email, ...userDataWithoutSensitiveInfo } = userData;`
- **Status**: ✅ **SECURE** - Sensitive data filtered from recommendations

#### 7. **Report System Abuse**

- **Risk**: Users could potentially access reported user emails or sensitive data
- **Location**: `functions/src/reports/reports.ts`
- **Mitigation**: Reports only store necessary data, emails are fetched securely from Firebase Auth
- **Status**: ✅ **SECURE** - Limited data exposure in reports

#### 8. **Authentication Bypass**

- **Risk**: Unauthenticated users could access protected functions
- **Location**: All Cloud Functions
- **Mitigation**: Every function checks `request.auth` and throws `unauthenticated` error if missing
- **Status**: ✅ **SECURE** - Authentication required for all functions

#### 9. **Account Status Bypass**

- **Risk**: Banned or deleted users could access the app
- **Location**: `App.tsx` authentication flow and Firestore security rules
- **Mitigation**: Multiple layers of protection including client-side checks and server-side rules
- **Status**: ✅ **SECURE** - Account status enforced at multiple levels

#### 10. **Cross-User Data Access**

- **Risk**: Users could access data from users they're not matched with
- **Location**: `functions/src/images/images.ts` - `getImages` function
- **Mitigation**: Function validates active match existence before serving any user data
- **Code**: `if (!hasValidMatch) { throw new functions.https.HttpsError("permission-denied", "No active match found between users"); }`
- **Status**: ✅ **SECURE** - Match validation enforced

### Security Architecture Strengths

- **Multi-layer validation**: Authentication, authorization, and data filtering at multiple levels
- **Server-side enforcement**: All security checks happen in Cloud Functions, not client-side
- **Firestore security rules**: Additional layer of protection at database level
- **Consent-based access**: Progressive photo reveal requires explicit user consent
- **Data minimization**: Only necessary data is exposed in API responses
- **Signed URL system**: Images served through time-limited signed URLs
- **Comprehensive logging**: All security events are logged for monitoring

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- iOS Development: Xcode and iOS Simulator
- Firebase project with all services enabled
- Stream Chat account with production configuration

### Firebase Setup

1. **Create Firebase Project**

   - Enable Authentication, Firestore, Storage, Functions, and Cloud Messaging
   - Upload APNs authentication key for iOS push notifications

2. **Configure Google Secret Manager**

   - Create secrets for `STREAM_API_KEY` and `STREAM_API_SECRET`
   - Set up Mailgun API credentials for email verification

3. **Deploy Cloud Functions**
   ```bash
   cd functions
   npm install
   npm run build
   firebase deploy --only functions
   ```

### Stream Chat Setup

1. Create Stream Chat application
2. Configure push notifications with Firebase integration
3. Upload production APNs certificate
4. Set up notification preferences and templates

### Frontend Setup

1. **Install Dependencies**

   ```bash
   npm install
   ```

2. **Configure Firebase**

   - Place `GoogleService-Info.plist` in iOS directory
   - Place `google-services.json` in Android directory
   - Firebase configuration is set up in `firebaseConfig.ts`

3. **Run the App**
   ```bash
   npx expo run:ios  # For iOS
   npx expo run:android  # For Android
   ```

### Development Notes

- **Physical Device Required**: Push notifications don't work in simulators
- **Production Certificates**: Ensure APNs certificates are uploaded to both Firebase and Stream
- **Environment Setup**: All API keys managed through Google Secret Manager
- **Testing**: Use real devices for full notification testing

## 📈 Future Enhancements

### Planned Features

- **Premium subscription system**: Reactivate Superwall integration for paid features
- **Enhanced matching**: Ability to see profiles that swiped on you
- **Advanced filters**: Additional matching criteria and preferences
- **Social features**: Group activities and events for Cornell students
- **Group match improvements**: Enhanced group formation algorithms
- **Availability matching**: More sophisticated compatibility scoring

### Technical Improvements

- **Performance optimization**: Image caching and loading improvements
- **Analytics integration**: User behavior tracking and app usage metrics
- **A/B testing**: Feature flag system for experimental features
- **Accessibility**: Enhanced accessibility features for all users
- **Offline support**: Basic offline functionality for viewing matches
- **Push notification improvements**: More granular notification controls

## 🔧 Development Commands

### Frontend Commands

```bash
npm start          # Start Expo development server
npx expo run:ios   # Run on iOS device/simulator
npm run android    # Run on Android device/emulator
```

### Backend Commands

```bash
cd functions
npm run build      # Compile TypeScript
npm run deploy     # Deploy to Firebase
npm run logs       # View function logs
```

### Deployment Process

```bash
# Always build before deploying (from project root)
cd functions
npm run build
npm run deploy --only

# Full deployment
firebase deploy
```

## 📚 Project Structure

```
harbor/
├── App.tsx                 # Main app entry point with authentication flow
├── components/             # Reusable UI components
│   ├── AnimatedStack.tsx   # Gesture-based swiping component
│   ├── ImageCarousel.tsx   # Profile photo viewer with blur transitions
│   ├── VerificationCodeInput.tsx # Custom 6-digit code input
│   ├── ClarityBar.tsx      # Visual progress indicator for photo reveal
│   ├── DataPicker.tsx      # Custom picker components
│   ├── NotificationHandler.tsx # Push notification management
│   └── UnviewedMatchesHandler.tsx # Unviewed match notifications
├── constants/             # App configuration and features
│   ├── blurConfig.ts      # Progressive photo reveal configuration
│   ├── Features.ts        # Premium feature configuration (disabled)
│   ├── Colors.ts          # App color scheme
│   └── Data.ts            # Static data (majors, etc.)
├── context/               # React Context providers
│   ├── AppContext.tsx     # Main app state management
│   └── NotificationContext.tsx # Notification state management
├── functions/             # Firebase Cloud Functions
│   └── src/
│       ├── auth/          # Authentication functions
│       ├── chat/          # Stream Chat integration
│       ├── images/        # Image processing and moderation
│       ├── matches/       # Match management (individual & group)
│       ├── recommendations/ # User recommendations with availability matching
│       ├── reports/       # Reporting and blocking system
│       ├── swipes/        # Swipe handling and group formation
│       ├── superwall/     # Premium features (disabled)
│       └── users/         # User management and account operations
├── hooks/                 # Custom React hooks
│   └── usePremium.ts      # Premium feature hook (disabled)
├── navigation/            # Navigation configuration
│   ├── TabNavigator.tsx   # Main tab navigation
│   ├── HomeStack.tsx      # Home screen stack
│   ├── ChatNavigator.tsx  # Chat navigation with Stream Chat integration
│   └── SettingsStack.tsx  # Settings navigation
├── networking/            # API service classes
│   ├── AuthService.ts     # Authentication API calls
│   ├── ChatFunctions.ts   # Stream Chat API integration
│   ├── ImageService.ts    # Image upload and retrieval
│   ├── MatchService.ts    # Match management API calls
│   ├── RecommendationService.ts # User recommendations
│   ├── SwipeService.ts    # Swipe operations
│   ├── UserService.ts     # User profile management
│   └── ReportService.ts   # Reporting and blocking
├── screens/               # Screen components
│   ├── HomeScreen.tsx     # Card-based swiping interface
│   ├── ChatList.tsx       # List of active matches
│   ├── ChatScreen.tsx     # Real-time messaging with photo reveal
│   ├── ProfileScreen.tsx  # View other users' profiles
│   ├── AccountSetupScreen.tsx # Onboarding flow
│   ├── SettingsScreen.tsx # App preferences and account management
│   ├── GroupSizeScreen.tsx # Group size preference selection
│   ├── StudyGroupConnectionsScreen.tsx # Group match management
│   ├── BannedAccountScreen.tsx # Banned user screen
│   ├── DeletedAccountScreen.tsx # Deleted user screen
│   └── ReportScreen.tsx   # User reporting interface
├── types/                 # TypeScript type definitions
│   ├── App.d.ts          # Global type definitions
│   └── navigation.ts     # Navigation type definitions
└── util/                  # Utility functions
    ├── imageUtils.ts     # Image processing utilities
    ├── chatPreloader.ts  # Chat data preloading
    ├── SocketService.tsx # WebSocket management
    └── streamNotifService.ts # Stream Chat notifications
```

---

**Built with ❤️ for the Cornell community**

_Harbor - Where meaningful connections begin_
