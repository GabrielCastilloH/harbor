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
- **Daily swipe limits**: 20 swipes per day for free users (40 for premium, currently disabled)
- **Instant match detection**: Real-time matching when two users swipe right on each other
- **Swipe gesture controls**: Smooth card-based swiping with visual feedback

### 💬 Real-time Chat System

- **Stream Chat integration**: Production-ready chat with typing indicators, read receipts, and message history
- **Progressive unlock system**: Chat becomes available after matching, photos unlock through conversation
- **Consent modals**: Built-in consent flow ensures both users want to continue chatting
- **Channel freezing**: Automatic chat freeze when users unmatch or report

### 🔐 Security & Privacy

- **Cornell email verification**: Custom 6-digit code system designed for university email systems
- **Image moderation**: Automated content screening for inappropriate images
- **Report system**: Comprehensive reporting with automatic unmatching and chat freezing
- **Data protection**: Secure user data handling with Firebase security rules

### 📱 Push Notifications

- **FCM integration**: Production-ready push notifications for matches and messages
- **Stream Chat delivery**: Notifications delivered through Stream Chat's reliable system
- **Smart notification management**: Silent match notifications, configurable message alerts
- **Cross-platform support**: Works on both iOS and Android devices

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
└── TabNavigator (Main App)
    ├── HomeTab (HomeStack)
    │   ├── HomeScreen (Swiping)
    │   └── ReportScreen
    ├── ChatsTab (ChatNavigator)
    │   ├── ChatList
    │   ├── ChatScreen
    │   ├── ProfileScreen
    │   └── ReportScreen
    └── SettingsTab (SettingsStack)
        ├── SettingsScreen
        ├── EditProfile
        └── SelfProfile
```

### Core Screens

- **HomeScreen**: Card-based swiping interface with recommendations
- **ChatList**: List of active matches and conversations
- **ChatScreen**: Real-time messaging with progressive photo reveal
- **ProfileScreen**: View other users' profiles with blur effects
- **AccountSetupScreen**: Onboarding flow for new users
- **SettingsScreen**: App preferences and account management

### Component Architecture

- **AnimatedStack**: Gesture-based swiping with smooth animations
- **ImageCarousel**: Profile photo viewer with blur transitions
- **VerificationCodeInput**: Custom 6-digit code input for email verification
- **MatchModal**: Celebration screen when users match
- **SettingsButton**: Reusable settings interface component

## 🔧 Firebase Cloud Functions

### Authentication Functions (`authFunctions`)

- **sendVerificationCode**: Sends 6-digit codes via Mailgun
- **verifyVerificationCode**: Validates codes and marks emails as verified
- **signInWithEmail**: Custom sign-in flow with Firestore user checking

### Chat Functions (`chatFunctions`)

- **getStreamApiKey**: Provides Stream Chat API key to frontend
- **generateUserToken**: Creates Stream Chat tokens for authenticated users
- **createChatChannel**: Sets up messaging channels between matched users

### Image Functions (`imageFunctions`)

- **uploadImage**: Processes and stores original + blurred image versions
- **getImages**: Fetches user images with appropriate blur levels
- **generateBlurred**: Creates blurred versions of uploaded images

### Swipe Functions (`swipeFunctions`)

- **createSwipe**: Records swipes and detects mutual matches
- **getSwipeLimit**: Manages daily swipe limits (20 free, 40 premium)
- **incrementSwipeCount**: Tracks daily swipe usage

### Match Functions (`matchFunctions`)

- **createMatch**: Creates match records between users
- **getConsentStatus**: Manages consent flow for continued chatting
- **markMatchAsViewed**: Tracks when users view new matches

### Recommendation Functions (`recommendationsFunctions`)

- **getRecommendations**: Provides personalized user recommendations based on preferences

### Report Functions (`reportFunctions`)

- **reportAndUnmatch**: Handles user reports with automatic unmatching and chat freezing

### User Functions (`userFunctions`)

- **createUserProfile**: Sets up new user profiles in Firestore
- **updateUserProfile**: Manages profile updates
- **deleteAccount**: Complete account deletion with data cleanup

## 🔐 Authentication & Email Verification Flow

Harbor uses Firebase Auth with a **custom code-based email verification system** that replaces Firebase's default link-based verification. This system is specifically designed to work with university email systems that pre-fetch verification links.

### Flow Logic

The app has 4 distinct authentication states handled in `App.tsx`:

1. **User signed in but email NOT verified** → `EmailVerificationScreen`
2. **User verified but NO profile in database** → `AccountSetupScreen`
3. **User verified AND has profile** → Main App (`TabNavigator`)
4. **User not signed in** → Auth screens (`SignIn`/`CreateAccount`)

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
   const expiresAt = admin.firestore.Timestamp.now().toMillis() + 5 * 60 * 1000;

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
     to: email,
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

- **6-digit codes** with 5-minute expiration
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

## 📋 Profile Validation & Requirements

### Profile Creation Requirements

#### Images

- **Minimum**: 3 images required
- **Maximum**: 6 images allowed
- **Format**: JPEG only
- **Processing**: Auto-resized to 800x800 max, quality 80%
- **Moderation**: Automated content screening for inappropriate content
- **Storage**: Both original and 80% blurred versions stored

#### Required Fields

All fields must be completed before profile creation:

- **Your Name, Initial(s) or Nickname**: 1-50 characters
- **Age**: 18+ years old
- **Gender**: Must select from dropdown (Male, Female, Non-Binary)
- **Sexual Orientation**: Must select from dropdown (Heterosexual, Homosexual, Bisexual, Pansexual)
- **Year Level**: Must select from dropdown (Freshman, Sophomore, Junior, Senior)
- **Major**: Must select from dropdown (85+ options)

#### Text Field Limits

| Field                              | Min Length | Max Length | Description                       |
| ---------------------------------- | ---------- | ---------- | --------------------------------- |
| Your Name, Initial(s) or Nickname  | 1          | 50         | Your name, initial(s) or nickname |
| About Me                           | 5          | 180        | Personal description              |
| Q1: "This year, I really want to"  | 5          | 100        | Personal goal                     |
| Q2: "Together we could"            | 5          | 100        | Shared activity                   |
| Q3: "Favorite book, movie or song" | 5          | 100        | Cultural preference               |
| Q4: "I chose my major because"     | 5          | 100        | Academic motivation               |
| Q5: "My favorite study spot is"    | 5          | 100        | Study preference                  |
| Q6: "Some of my hobbies are"       | 5          | 100        | Personal interests                |

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
  q1: string; // "This year, I really want to:"
  q2: string; // "Together we could:"
  q3: string; // "Favorite book, movie or song:"
  q4: string; // "I chose my major because..."
  q5: string; // "My favorite study spot is:"
  q6: string; // "Some of my hobbies are:"
  currentMatches?: string[];
  paywallSeen?: boolean;
  fcmToken?: string;
  createdAt?: Timestamp;
  updatedAt?: Timestamp;
};
```

## 🎭 Progressive Photo Reveal System

### Core Design Philosophy

The app uses a **two-phase progressive blur system** that creates intrigue while maintaining privacy:

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
  MESSAGES_TO_CLEAR_ORIGINAL: 50, // Phase 2: 80% → 0% real unblur
};
```

#### Blur Calculation Logic

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

#### Firestore Match Document Structure

```typescript
interface Match {
  user1Id: string;
  user2Id: string;
  user1Consented: boolean;
  user2Consented: boolean;
  messageCount: number;
  isActive: boolean;
  matchDate: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  // Unviewed status tracking
  user1Viewed: boolean;
  user2Viewed: boolean;
}
```

#### Server Response Shape

The `matchFunctions-getConsentStatus` callable returns:

- `user1Id`, `user2Id`
- `user1Consented`, `user2Consented`, `bothConsented`
- `messageCount`
- `shouldShowConsentScreen` (true when `messageCount >= threshold` and not both consented)
- `shouldShowConsentForUser1`, `shouldShowConsentForUser2` (per-user modal visibility)
- `state` ("none_consented" | "one_consented" | "both_consented")

#### Client Detection Flow

1. **Message Counting**: Every new message increments `messageCount` via `chatFunctions-updateMessageCount`
2. **Consent Checking**: After each message, calls `getConsentStatus(matchId)`
3. **Modal Display**: Shows consent modal only when user's `shouldShowConsentForUserX` is true
4. **Channel Management**: Freezes chat until both users consent when threshold reached

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

All premium features are currently **disabled** throughout the codebase. The app functions as a free-tier only application.

### Premium Feature Framework

- **Superwall integration**: Complete premium paywall system implemented but commented out
- **Swipe limits**: Free tier (20/day) vs Premium tier (40/day) - currently locked to free
- **Feature flags**: Comprehensive feature configuration system in place

### Disabled Premium Features

```typescript
// All premium features return false/free tier values
export const usePremium = () => {
  const isPremium = false; // Always false
  return {
    isPremium,
    features: getFeatureConfig(isPremium), // Always returns FREE_FEATURES
    swipesPerDay: getSwipesPerDay(isPremium), // Always returns 20
    canSeeWhoSwipedOnThem: canSeeWhoSwipedOnThem(isPremium), // Always returns false
  };
};
```

### Premium Infrastructure Ready

- **Payment processing**: Superwall SDK integrated but inactive
- **Feature gates**: Complete gating system throughout the app
- **Backend support**: Cloud Functions ready for premium user management
- **UI components**: Premium upgrade prompts implemented but show "coming soon" messages

## 🛡️ Security & Moderation

### Image Moderation

- **Automated screening**: Content moderation for inappropriate images
- **Upload validation**: Server-side checks before storage
- **Rejection handling**: Clear error messages for failed moderation

### User Reporting System

- **Comprehensive reporting**: Multiple report categories with explanations
- **Automatic actions**: Immediate unmatching and chat freezing
- **Data collection**: Detailed report tracking for moderation review

### Data Security

- **Firebase Security Rules**: Comprehensive Firestore and Storage rules
- **Authentication checks**: All Cloud Functions require proper authentication
- **Data validation**: Server-side validation for all user inputs
- **Privacy protection**: Sensitive data filtering in recommendations

### Content Safety

- **Image processing**: Automatic blur generation for privacy
- **Chat monitoring**: Ability to freeze channels for violations
- **Account management**: Complete account deletion with data cleanup

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

### Technical Improvements

- **Performance optimization**: Image caching and loading improvements
- **Analytics integration**: User behavior tracking and app usage metrics
- **A/B testing**: Feature flag system for experimental features
- **Accessibility**: Enhanced accessibility features for all users

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
├── App.tsx                 # Main app entry point
├── components/             # Reusable UI components
├── constants/             # App configuration and features
├── context/               # React Context providers
├── functions/             # Firebase Cloud Functions
│   └── src/
│       ├── auth/          # Authentication functions
│       ├── chat/          # Stream Chat integration
│       ├── images/        # Image processing
│       ├── matches/       # Match management
│       ├── recommendations/ # User recommendations
│       ├── reports/       # Reporting system
│       ├── swipes/        # Swipe handling
│       └── users/         # User management
├── hooks/                 # Custom React hooks
├── navigation/            # Navigation configuration
├── networking/            # API service classes
├── screens/               # Screen components
├── types/                 # TypeScript type definitions
└── util/                  # Utility functions
```

---

**Built with ❤️ for the Cornell community**

_Harbor - Where meaningful connections begin_
