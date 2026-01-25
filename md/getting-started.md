# 🚀 Getting Started

## Prerequisites

- Node.js (v18 or higher)
- iOS Development: Xcode and iOS Simulator
- Firebase project with all services enabled
- Stream Chat account with production configuration

## Firebase Setup

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

## Stream Chat Setup

1. Create Stream Chat application
2. Configure push notifications with Firebase integration
3. Upload production APNs certificate
4. Set up notification preferences and templates

## Frontend Setup

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

## Development Notes

- **Physical Device Required**: Push notifications don't work in simulators
- **Production Certificates**: Ensure APNs certificates are uploaded to both Firebase and Stream
- **Environment Setup**: All API keys managed through Google Secret Manager
- **Testing**: Use real devices for full notification testing

## Development Commands

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
