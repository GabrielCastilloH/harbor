# 🌊 Harbor

A unique dating app that focuses on meaningful connections through progressive photo reveal and limited daily interactions.

TODO:

- ✅ Add push notifications to the app (and make the you've matched system notification silent)

## Future Enhancements:

- Add the ability to see profiles that swiped on you and swipe on them.
- show difference between basic and premium plan on payment page

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
   // Modern 6-box input UI
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

#### Resend Functionality

- **2-minute countdown** between resend attempts
- **Rate limiting** prevents abuse
- **Automatic retry** with exponential backoff for failed sends

### Key Design Principles

- **Custom verification system**: Replaces Firebase's link-based verification
- **University email compatibility**: Works with pre-fetching email systems
- **Secure code generation**: Server-side generation and validation
- **User-friendly UI**: Modern 6-box input with real-time feedback
- **Automatic flow**: Seamless navigation between verification states
- **Production-ready**: Proper error handling and logging

### Cornell Email Validation

- **Frontend validation**: Explicit rejection of emails containing `+` symbols
- **Backend normalization**: Strip `+` aliases in Cloud Functions (when needed)
- **Domain enforcement**: Only `@cornell.edu` emails accepted

## 📋 Validation Rules

### Profile Validation Requirements

#### Images

- **Minimum**: 3 images required
- **Maximum**: 6 images allowed
- **Format**: JPEG only
- **Size**: Auto-resized to 800x800 max, quality 80%

#### Required Fields

All fields must be completed before profile creation:

- **First Name**: 2-50 characters
- **Age**: 18+ years old
- **Gender**: Must select from dropdown (Male, Female, Non-Binary)
- **Sexual Orientation**: Must select from dropdown (Heterosexual, Homosexual, Bisexual, Pansexual)
- **Year Level**: Must select from dropdown (Freshman, Sophomore, Junior, Senior)
- **Major**: Must select from dropdown (85+ options)

#### Text Field Limits

| Field                              | Min Length | Max Length | Description                    |
| ---------------------------------- | ---------- | ---------- | ------------------------------ |
| First Name                         | 2          | 50         | First name or initial/nickname |
| About Me                           | 5          | 200        | Personal description           |
| Q1: "This year, I really want to"  | 5          | 120        | Personal goal                  |
| Q2: "Together we could"            | 5          | 120        | Shared activity                |
| Q3: "Favorite book, movie or song" | 5          | 120        | Cultural preference            |
| Q4: "I chose my major because"     | 5          | 120        | Academic motivation            |
| Q5: "My favorite study spot is"    | 5          | 120        | Study preference               |
| Q6: "Some of my hobbies are"       | 5          | 120        | Personal interests             |

#### Backend Enforcement

- **Client-side validation**: Immediate feedback for user experience
- **Backend validation**: Server-side enforcement to prevent bypass
- **ACID compliance**: All validations enforced in transactions
- **Error handling**: Graceful failure with clear error messages

## 🔔 Push Notifications

Harbor uses **Stream Chat** for messaging and **React Native Firebase** specifically for push notifications. This hybrid approach allows us to use the Firebase JS SDK for all other Firebase services while leveraging React Native Firebase's native capabilities for reliable push notifications.

### Notification Features

- **Stream Chat Integration**: Notifications are automatically sent when users receive new messages
- **Settings Toggle**: Users can enable/disable notifications in the app settings
- **Background Support**: Notifications work when the app is in the background or closed
- **Permission Management**: Automatic permission requests with graceful fallbacks

### Technical Implementation

- **React Native Firebase**: Used exclusively for push notifications (messaging module)
- **Firebase JS SDK**: Used for all other Firebase services (Auth, Firestore, Functions, etc.)
- **Stream Chat**: Handles message delivery and notification triggers
- **Background Handler**: Processes notifications when app is not in foreground

### Setup Requirements

1. **Firebase Project**: Must have Cloud Messaging enabled
2. **Stream Dashboard**: Firebase credentials must be uploaded to Stream Chat dashboard
3. **Native Configuration**: React Native Firebase requires native project configuration

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- Firebase project with Cloud Messaging enabled
- Google Cloud project (for Secret Manager)
- Xcode for iOS development
- npm or yarn package manager

### Firebase Setup

1. **Create Firebase Project:**

   - Visit [Firebase Console](https://console.firebase.google.com)
   - Create a new project
   - Enable Firestore, Storage, Functions, and **Cloud Messaging**

2. **Configure Cloud Messaging:**

   - In Firebase Console, go to Project Settings > Cloud Messaging
   - Upload your APNs authentication key for iOS
   - Note your Server Key for Stream Chat configuration

3. **Set up Google Secret Manager:**

   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Navigate to Secret Manager
   - Create secrets for `STREAM_API_KEY` and `STREAM_API_SECRET`

4. **Configure Firebase Functions:**

   ```bash
   npm install -g firebase-tools
   firebase login
   firebase init functions
   ```

5. **Configure Stream Chat Notifications:**

   - Go to [Stream Chat Dashboard](https://dashboard.getstream.io)
   - Navigate to your app's Chat Overview → Push Configuration
   - Enable "Push Notifications" toggle
   - Select "Firebase" as push provider
   - Upload your Firebase service account credentials JSON file
   - Configure notification types (new messages, edits, reactions)
   - Set default push preferences for users

6. **Deploy Functions:**
   ```bash
   cd functions
   npm install
   npm run build
   firebase deploy --only functions
   ```

### Frontend Setup

1. **Install Dependencies:**

   ```bash
   npm install
   ```

2. **Configure Environment Variables:**

   - Add your Firebase config to `firebaseConfig.ts`
   - Set up Google Sign-In credentials

3. **Run the App:**
   ```bash
   npx expo run:ios
   ```

### Notification Testing

- **Physical Device Required**: Push notifications don't work in simulators
- **Background Testing**: Send messages while app is in background to test notifications
- **Permission Testing**: Test notification permission flow in settings
- **Token Refresh**: Verify tokens are properly refreshed when FCM tokens change

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

### Consent State Implementation

#### How consent is stored (Firestore)

- Each match document contains explicit, per-user consent fields and message count:
  - `user1Id`, `user2Id`
  - `user1Consented: boolean`
  - `user2Consented: boolean`
  - `messageCount: number`
  - Other metadata (timestamps, isActive, etc.)

#### Server response shape

- The `matchFunctions-getConsentStatus` callable returns a structured, edge-case–aware payload:
  - `user1Id`, `user2Id`
  - `user1Consented`, `user2Consented`, `bothConsented`
  - `messageCount`
  - `shouldShowConsentScreen` (true when `messageCount >= threshold` and not both have consented)
  - `shouldShowConsentForUser1`, `shouldShowConsentForUser2` (per-user modal visibility flags)
  - `state` ("none_consented" | "one_consented" | "both_consented")
  - `consent` block summarizing current state and threshold

#### Client detection (ChatScreen)

- The client resolves `matchId` authoritatively from the other channel member via backend and caches it.
- On every new message and on mount:
  - Increments `messageCount` via `chatFunctions-updateMessageCount`.
  - Calls `getConsentStatus(matchId)` and applies:
    - If channel is frozen: hide modal, freeze chat
    - Else: show modal only for the current user if their `shouldShowConsentForUserX` is true
    - When both users consent: hide modal and unfreeze chat

#### Edge-case handling

- If `messageCount` exceeds the threshold (due to duplicate updates or race conditions), the server still returns `shouldShowConsentScreen = true` until both have explicitly consented.
  - This ensures we never skip the continue screen.

#### Assumptions

- Message threshold is currently `30` (kept in sync on server and client).
- A match can be frozen due to unmatch; in that state, the consent modal is suppressed.

## Known Security Problems (not MVP to Fix)

- When on the consent screen the channel is only client side forzen. This means on a jailbroken iPhone or Android device someone could send more messages on the channel if the like. However, on the actual app the modal will never be dismissed and it will always be client side frozen making it impossible for regular users to do this. Even if they do receive messages they will be hard to see through the modal and there's not much point to this hack lol.
