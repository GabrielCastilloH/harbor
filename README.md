# 🌊 Harbor

A unique dating app that focuses on meaningful connections through progressive photo reveal and limited daily interactions.

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

### Security Rules

#### Firebase Function (`getImages`) Rules:

- **ALWAYS return blurred URLs when blur level >= 80** - This is a constant that never changes
- For string URLs: Convert `original.jpg` to `original-blurred.jpg` when blur level >= 80
- For object URLs: Use `blurredUrl` property when blur level >= 80
- **Never return unblurred URLs when blur level >= 80, regardless of consent**

#### Expo BlurView Rules:

- **Blur intensity = blurLevel (capped at 80)** - If blur level is 100, Expo should blur as much as possible
- **Blur level 100 = Maximum Expo blur** - This is not rocket science, 100% blur means maximum blur
- **Blur level 80+ = Always use blurred URLs + Expo blur** - Double protection
- **Blur level < 80 = Use consent logic** - Only show unblurred if both users consented

### Security Flow:

1. Firebase function determines blur level based on match data
2. If blur level >= 80: Return blurred URLs (server-side protection)
3. Expo applies additional blur based on blur level (client-side protection)
4. If blur level < 80: Use consent logic to determine URL type
5. **NEVER expose unblurred images without proper consent**

### In Progress 🚧

- [ ] Add button to go to chat under the match modal.
- [ ] Integrate Stripe for payment processing
- [ ] Premium features through Stripe integration
- [ ] Change number to only allow three swipes per day.
- [ ] Uncomment code to make sure onlly @cornell.edu allowed.
- [ ] Fix the weird swiping delay on home screen. (if possible lol)

## 🔜 Future Enhancements (not MVP)

- Enhanced matching algorithms
- Additional privacy features
- Profile customization options

Built with ❤️ using React Native, Expo, and Firebase
