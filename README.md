# 🌊 Harbor

A unique dating app that focuses on meaningful connections through progressive photo reveal and limited daily interactions.

TODO:

- Add push notifications to the app (and make the you've matched system notification silent)
- Make blurry photo lower quality on backend to make it harder to makeout face.
- button to view profile in the settings.
- show difference between basic and premium plan.
- by signing up you agree to terms & conditions (put this in the first page).
- Make other person see the match modal even if they didn't click on the swipe that made the match.
- work with user1 viewed.
- CANT GO TO PROFILE WHEN USING ON PHONE FOR SOME REASON.
- Send a message when both people accept to reload the chat.
- Make the continue modal a bit more opaque.
- Make sure they can't send a message if one user hasn't allowed to continue (actually not MVP)

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
| About Me                           | 5          | 300        | Personal description           |
| Q1: "This year, I really want to"  | 5          | 150        | Personal goal                  |
| Q2: "Together we could"            | 5          | 150        | Shared activity                |
| Q3: "Favorite book, movie or song" | 5          | 150        | Cultural preference            |
| Q4: "I chose my major because"     | 5          | 150        | Academic motivation            |
| Q5: "My favorite study spot is"    | 5          | 150        | Study preference               |
| Q6: "Some of my hobbies are"       | 5          | 150        | Personal interests             |

#### Backend Enforcement

- **Client-side validation**: Immediate feedback for user experience
- **Backend validation**: Server-side enforcement to prevent bypass
- **ACID compliance**: All validations enforced in transactions
- **Error handling**: Graceful failure with clear error messages

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- Firebase project
- Google Cloud project (for Secret Manager)
- Xcode for iOS development
- npm or yarn package manager

### Firebase Setup

1. **Create Firebase Project:**

   - Visit [Firebase Console](https://console.firebase.google.com)
   - Create a new project
   - Enable Firestore, Storage, and Functions

2. **Set up Google Secret Manager:**

   - Go to [Google Cloud Console](https://console.cloud.google.com)
   - Navigate to Secret Manager
   - Create secrets for `STREAM_API_KEY` and `STREAM_API_SECRET`

3. **Configure Firebase Functions:**

   ```bash
   npm install -g firebase-tools
   firebase login
   firebase init functions
   ```

4. **Deploy Functions:**
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
