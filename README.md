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

## 🛠 Development Status

### Completed Features ✅

- StreamChat Integration
  - User creation and token generation
  - Backend route for user token fetching
- Match-based chat creation
- Fixed signup bug.
- Actually add user info to the top right corner of chats.
- Add pre-filled data in user settings and add name of the other person individual chats.
- Make sure you get the matched! screen when matching
- Only able to talk to one person at a time.
- Add photo blurring preview screen.
- Setup progressive photo unblurring
- Implement authentication route protection
- Force users to use a square picture in the image picker.
- Make the images higher quality.

## 🔒 Image Blur Security Logic

### Firebase Function (`getImages`) Rules:

- **ALWAYS return blurred URLs when blur level >= 80** - This is a constant that never changes
- For string URLs: Convert `original.jpg` to `original-blurred.jpg` when blur level >= 80
- For object URLs: Use `blurredUrl` property when blur level >= 80
- **Never return unblurred URLs when blur level >= 80, regardless of consent**

### Expo BlurView Rules:

- **Blur intensity = blurLevel (capped at 100)** - If blur level is 100, Expo should blur as much as possible
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
