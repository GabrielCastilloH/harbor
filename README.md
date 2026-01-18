# 🌊 Harbor

**A unique dating app designed specifically for Cornell students that focuses on meaningful connections through progressive photo reveal and limited daily interactions.**

Harbor creates intrigue and encourages genuine conversations by gradually revealing profile photos as users chat, fostering deeper connections beyond superficial first impressions.

## ✨ Core Features

### 🎭 Progressive Photo Reveal System

- **Two-phase blur system**: Photos start heavily blurred and gradually become clear as users chat
- **Consent-based transitions**: Users must consent to continue chatting after 30 messages to see clearer photos
- **Server-side blur processing**: Secure image processing with 80% server-side blur for privacy
- **Seamless client animations**: Smooth blur transitions create engaging user experience

### 💫 Smart Matching & Swiping

- **Intelligent recommendations**: Algorithm considers sexual orientation, gender preferences, and mutual interest
- **Unified swipe system**: **Efficient daily swipe tracking using subcollections for optimal performance**
- **Daily swipe limits**: **5 swipes per day for all users (premium features currently disabled)**
- **Instant match detection**: Real-time matching when two users swipe right on each other
- **Swipe gesture controls**: Smooth card-based swiping with visual feedback

### 💬 Real-time Chat System

- **Stream Chat integration**: Production-ready chat with typing indicators, read receipts, and message history
- **Progressive unlock system**: Chat becomes available after matching, photos unlock through conversation
- **Consent modals**: Built-in consent flow ensures both users want to continue chatting
- **Channel freezing**: Automatic chat freeze when users unmatch or report

### 🔐 Security & Privacy

- **Google Sign-In authentication**: Secure authentication through Google's verified system
- **Cornell email validation**: Ensures only Cornell students can join the platform
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

Harbor implements a **subcollection-based swipe tracking system** that provides efficient daily swipe management.

### Current Implementation

#### 🚀 Performance Benefits

- **Subcollection Organization**: Swipes stored in `/swipes/{userId}/outgoing/` and `/swipes/{userId}/incoming/` for efficient querying
- **Counter-based Limits**: Daily swipe counts tracked in `/users/{userId}/swipeCounter/daily` subcollection
- **Atomic Operations**: All swipe data updates happen in transactions, preventing race conditions

#### 🔒 Data Consistency

- **Transaction Safety**: Swipe count increments and limit checks happen atomically
- **No Race Conditions**: Prevents users from exceeding limits during rapid swiping
- **Automatic Reset**: Daily swipe counts reset automatically via scheduled function
- **Match Prevention**: Users with active matches cannot swipe until match is resolved

#### 🏗️ Scalability Advantages

- **Efficient Querying**: Subcollections allow for fast retrieval of user's swipe history
- **Availability Tracking**: Index-based filtering prevents recommending users who are already in matches
- **Future-Proof**: Framework ready for premium tiers and advanced features

#### 🎯 User Availability System

Harbor implements a scalable availability tracking system that prevents users currently in matches from being recommended to others. The system uses `isActive` (account status) and `isAvailable` (match availability) fields, automatically updating them when matches are created or deleted. Index-based filtering at the database level ensures efficient querying without expensive in-memory operations.

### Technical Implementation

The swipe system uses subcollections (`/swipes/{userId}/outgoing/` and `/swipes/{userId}/incoming/`) for efficient querying, with daily swipe counts tracked in `/users/{userId}/swipeCounter/daily`. All swipe operations use Firestore transactions to ensure atomic updates and prevent race conditions. A scheduled function runs daily to reset swipe counts.

## 🗄️ Database Schema

Harbor uses **Firebase Firestore** as its primary database with a well-structured collection hierarchy designed for scalability and efficient querying.

### Recent Schema Updates (October 2025)

Match schema uses explicit `user1Id`/`user2Id` fields and consent/view booleans for cleaner queries. Swipe counters moved to `/users/{userId}/swipeCounter/daily` subcollection for better organization.

### Main Collections

#### 📊 **users** Collection

**Primary user profile data and account management**

```typescript
// Document: /users/{userId}
{
  // Profile Information
  firstName: string;           // 1-11 characters
  email: string;              // Cornell email only
  age: number;                // 18+ years old
  yearLevel: string;          // Freshman, Sophomore, Junior, Senior
  major: string;              // 85+ major options
  gender: string;             // Male, Female, Non-Binary
  sexualOrientation: string;  // Heterosexual, Homosexual, Bisexual, Pansexual

  // Profile Content
  images: string[];           // Array of image filenames (3-6 images)
  aboutMe: string;            // 5-180 characters
  q1: string;                 // "Together we could" (5-100 chars)
  q2: string;                 // "Favorite book, movie or song" (5-100 chars)
  q3: string;                 // "Some of my hobbies are" (5-100 chars)

  // Account Status
  isActive: boolean;          // Account enabled/disabled (default: true)
  isAvailable: boolean;       // Match availability (default: true, false when in active match)
  currentMatches: string[];   // Array of active match IDs

  // System Fields
  paywallSeen: boolean;       // Premium feature tracking (disabled)
  fcmToken?: string;          // Firebase Cloud Messaging token
  expoPushToken?: string;     // Expo push notification token
  availability: number;       // For matching algorithm (-1 default)
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

#### 🔄 **matches** Collection

**Match records between two users**

```typescript
// Document: /matches/{matchId}
{
  user1Id: string;            // First user's ID
  user2Id: string;            // Second user's ID
  user1Consented: boolean;    // User 1's consent status
  user2Consented: boolean;    // User 2's consent status
  user1Viewed: boolean;       // User 1's view status
  user2Viewed: boolean;       // User 2's view status
  messageCount: number;       // Total messages in chat
  isActive: boolean;          // Match status
  matchDate: Timestamp;       // When match was created
  consentMessageSent?: boolean; // Consent notification sent
  introMessageSent?: boolean;   // Intro message sent
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

#### 👆 **swipes** Collection

**Swipe tracking with subcollections for efficient querying**

```typescript
// Document: /swipes/{userId}/outgoing/{swipedUserId}
{
  direction: "left" | "right"; // Swipe direction
  createdAt: Timestamp; // When swipe occurred
}

// Document: /swipes/{userId}/incoming/{swiperId}
{
  direction: "left" | "right"; // Swipe direction
  createdAt: Timestamp; // When swipe occurred
}
```

#### 📝 **reports** Collection

**User reports for moderation**

```typescript
// Document: /reports/{reportId}
{
  reporterId: string; // ID of user making report
  reporterEmail: string; // Email of reporter
  reportedUserId: string; // ID of reported user
  reportedUserEmail: string; // Email of reported user
  reportedUserName: string; // Name of reported user
  reason: string; // Report category
  explanation: string; // Detailed explanation
  status: "pending" | "resolved" | "dismissed";
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

#### 🚫 **bannedAccounts** Collection

**Banned user records**

```typescript
// Document: /bannedAccounts/{userId}
{
  bannedByEmail: string; // User's email at time of ban
  unbanDate: Timestamp | null; // Ban expiration (null for permanent)
  reason: string; // Internal ban reason
  createdAt: Timestamp; // When ban was created
}
```

#### 🗑️ **deletedAccounts** Collection

**Deleted user tracking**

```typescript
// Document: /deletedAccounts/{userId}
{
  email: string; // User's email at time of deletion
  deletedAt: Timestamp; // When account was deleted
  deletedBy: string; // User ID who deleted account
  firstName: string; // User's first name
  lastName: string; // User's last name
}
```

### Subcollections

#### 📊 **users/{userId}/swipeCounter** Subcollection

**Daily swipe count tracking**

```typescript
// Document: /users/{userId}/swipeCounter/daily
{
  count: number; // Current day's swipe count
  resetDate: Timestamp; // Last reset timestamp (Firestore Timestamp)
  updatedAt: Timestamp; // Last update timestamp (Firestore Timestamp)
}
```

#### 🚫 **users/{userId}/blocked** Subcollection

**User blocking system**

```typescript
// Document: /users/{userId}/blocked/{blockedUserId}
{
  blockedUserId: string;        // ID of blocked user
  blockedAt: Timestamp;         // When user was blocked
  reason: string;               // "manual_block" | "report_block"
  matchId?: string;             // Optional match ID if blocking from match
  reportId?: string;            // Optional report ID if blocking from report
}
```

### Database Design Principles

Harbor's database architecture emphasizes performance, consistency, and scalability:

- **Performance**: Subcollection-based organization for efficient querying, counter-based daily limits, and index-based filtering
- **Consistency**: Atomic transactions prevent race conditions, automatic daily resets, and match-based swipe prevention
- **Scalability**: Composite indexes support efficient multi-field queries, ready for premium features and advanced matching

#### 🎯 **User Availability System**

Harbor implements a scalable availability tracking system using `isActive` (account status) and `isAvailable` (match availability) fields. When users match, both participants are set to `isAvailable: false`, and when they unmatch, status is reset to `true`. Only users with `isActive !== false` and `isAvailable !== false` are recommended.

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

- **Firebase Authentication** with Google Sign-In provider
- **Cloud Firestore** for real-time data storage
- **Firebase Cloud Functions** (Node.js 22) for backend logic
- **Firebase Storage** for image hosting and processing
- **Stream Chat** for messaging infrastructure
- **Google Secret Manager** for secure API key storage

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
│   └── SignIn (Google Sign-In)
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
    └── SettingsTab (SettingsStack)
        ├── SettingsScreen
        ├── EditProfile
        ├── SelfProfile
```

### Core Screens

- **HomeScreen**: Card-based swiping interface with recommendations
- **ChatList**: List of active matches and conversations with unread count badges
- **ChatScreen**: Real-time messaging with progressive photo reveal and consent modals
- **ProfileScreen**: View other users' profiles with blur effects and reporting options
- **AccountSetupScreen**: Onboarding flow for new users with progress tracking
- **SettingsScreen**: App preferences and account management
- **BannedAccountScreen**: Screen shown to banned users with appeal contact
- **DeletedAccountScreen**: Screen shown to deleted users

### Component Architecture

- **AnimatedStack**: Gesture-based swiping with smooth animations
- **ImageCarousel**: Profile photo viewer with blur transitions
- **MatchModal**: Celebration screen when users match
- **SettingsButton**: Reusable settings interface component
- **ClarityBar**: Visual progress indicator for photo reveal
- **DataPicker**: Custom picker components for form inputs
- **NotificationHandler**: Push notification management
- **UnviewedMatchesHandler**: Handles unviewed match notifications

## 🔧 Firebase Cloud Functions

### Authentication Functions (`authFunctions`)

- **signInWithEmail**: Legacy custom sign-in flow (now uses Google Sign-In)

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

- **createSwipe**: Records swipes and detects mutual matches
- **countRecentSwipes**: Fetches a user's daily swipe count from counters subcollection
- **getSwipesByUser**: Retrieves all swipes made by a specific user
- **savePushToken**: Saves Expo push tokens for notifications
- **resetDailySwipes**: Scheduled function that resets daily swipe counts

### Match Functions (`matchFunctions`)

- **createMatch**: Creates individual match records between two users
- **getUnviewedMatches**: Gets unviewed matches for showing match modals
- **markMatchAsViewed**: Tracks when users view new matches
- **unmatchUsers**: Deactivates matches and freezes chat channels
- **updateMatchChannel**: Updates match channel ID
- **getMatchId**: Finds match ID between two users
- **updateConsent**: Updates user's consent status for continued chatting
- **getConsentStatus**: Manages consent flow for continued chatting
- **incrementMatchMessages**: Increments message count for matches

### Recommendation Functions (`recommendationsFunctions`)

- **getRecommendations**: Provides personalized user recommendations based on preferences and availability status (excludes users currently in matches)

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
- **deleteUser**: Complete account deletion with comprehensive data cleanup
- **deactivateAccount** / **reactivateAccount**: Account status management
- **banUser** / **checkBannedStatus**: Ban management
- **checkDeletedAccount**: Checks if email belongs to deleted account

### Superwall Functions (`superwallFunctions`)

- **getSuperwallApiKeys**: Provides Superwall API keys (premium features currently disabled)

## 🔐 Authentication & Google Sign-In Flow

Harbor uses **Google Sign-In** for streamlined authentication, eliminating the need for email verification codes and providing a seamless user experience.

### Current Authentication Flow

The app has 4 distinct authentication states handled in `App.tsx`:

1. **User not signed in** → Auth screens (`SignIn` with Google Sign-In)
2. **User signed in but NO profile in database** → `AccountSetupScreen`
3. **User signed in AND has profile** → Main App (`TabNavigator`)
4. **User account deleted** → `DeletedAccountScreen`
5. **User account banned** → `BannedAccountScreen`

### Google Sign-In Implementation

#### Overview

Harbor implements Google Sign-In using:

- **Firebase Auth Google provider** for secure authentication
- **Automatic email verification** through Google's verified email system
- **Seamless user experience** with one-tap sign-in
- **Cornell email validation** to ensure only Cornell students can join

#### Authentication Flow

1. **User Signs In** (`SignIn.tsx`)

   ```typescript
   // Google Sign-In button triggers authentication
   const handleGoogleSignIn = async () => {
     const result = await GoogleSignin.signIn();
     const googleCredential = GoogleAuthProvider.credential(result.idToken);
     return signInWithCredential(auth, googleCredential);
   };
   ```

2. **Automatic Profile Creation**

   - User is automatically redirected to `AccountSetupScreen` if no profile exists
   - Profile creation process begins immediately after successful authentication

3. **Access Granted**
   - Once profile is complete, user can access full app features
   - No additional verification steps required

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
4. **Contact Information**: Screen displays contact email for appeals: `tryharbor.app@gmail.com` (the dot is optional)

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

The app checks account status in this order: email verification → account deletion → account banning → account deactivation → profile setup → full access.

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

The app uses a **progressive blur system** that creates intrigue while maintaining privacy:

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
  CLIENT_MAX_BLUR_RADIUS: 40, // Max React Native blur radius
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
```

### Consent State Management

#### Match Document Structure (Optimized for 1-on-1 Matches)

```typescript
interface Match {
  type: "individual";
  user1Id: string; // First user's ID
  user2Id: string; // Second user's ID
  user1Consented: boolean; // User 1's consent status
  user2Consented: boolean; // User 2's consent status
  user1Viewed: boolean; // User 1's view status
  user2Viewed: boolean; // User 2's view status
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

- `user1Id` (first user's ID)
- `user2Id` (second user's ID)
- `user1Consented` (user 1's consent status)
- `user2Consented` (user 2's consent status)
- `bothConsented` (true when both users have consented)
- `messageCount`
- `shouldShowConsentScreen` (true when `messageCount >= threshold` and not both consented)
- `shouldShowConsentForUser` (per-user modal visibility)
- `state` ("none_consented" | "one_consented" | "both_consented")

#### Client Detection Flow

1. **Message Counting**: Every new message increments `messageCount` via `chatFunctions-updateMessageCount`
2. **Consent Checking**: After each message, calls `getConsentStatus(matchId)`
3. **Modal Display**: Shows consent modal only when user's `shouldShowConsentForUser` is true
4. **Channel Management**: Freezes chat until all participants consent when threshold reached

## 🔔 Push Notifications System

Harbor implements a comprehensive push notification system using **React Native Firebase** for FCM token management and **Stream Chat** for message delivery.

### Implementation Flow

### Implementation Flow

Push notifications are initialized in `TabNavigator.tsx` after account setup. FCM tokens are stored in Firestore `users` collection and cached in AsyncStorage. Tokens refresh automatically on sign-in, home screen entry, and FCM token changes. Stream Chat integration handles device registration with production APNs configuration ("HarborFirebasePush").

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

## 🔒 Additional Security Measures

### Security Architecture Overview

#### 1. **Image Access Control**

Original images are only served after validating match existence and consent status server-side. All image access goes through Cloud Functions with signed URLs, preventing direct storage access.

#### 2. **Data Privacy Protection**

Email addresses and sensitive data are explicitly filtered from all user data responses (`getUserById`, `getRecommendations`). Only necessary profile information is exposed to authorized users.

#### 3. **Authentication & Authorization**

All Cloud Functions require authentication via `request.auth` checks. Firestore security rules provide an additional layer of protection, ensuring users can only access data they're authorized to view.

#### 4. **Match Data Security**

Match consent and view status updates are restricted to authenticated users with proper permissions. Firestore rules limit updates to only consent/view fields, preventing unauthorized manipulation.

#### 5. **Account Status Enforcement**

Banned and deleted accounts are blocked at multiple levels: client-side checks in `App.tsx`, server-side Firestore rules, and Cloud Function validation. This multi-layer approach prevents circumvention.

#### 6. **Cross-User Access Prevention**

All user data access functions validate active match existence before serving data. Users cannot access information from users they're not matched with, enforced through server-side validation.

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
│       ├── matches/       # Match management
│       ├── recommendations/ # User recommendations with availability matching
│       ├── reports/       # Reporting and blocking system
│       ├── swipes/        # Swipe handling
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
