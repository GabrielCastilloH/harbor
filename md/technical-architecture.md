# 🏗️ Technical Architecture

## Frontend Stack

- **React Native** (0.79.5) with Expo (53.0.22)
- **TypeScript** for type safety
- **React Navigation** for navigation management
- **Stream Chat React Native** for real-time messaging
- **React Native Firebase** for authentication and push notifications
- **Expo Blur** for progressive image reveal effects
- **React Native Reanimated** for smooth animations

## Backend Services

- **Firebase Authentication** with Google Sign-In provider
- **Cloud Firestore** for real-time data storage
- **Firebase Cloud Functions** (Node.js 22) for backend logic
- **Firebase Storage** for image hosting and processing
- **Stream Chat** for messaging infrastructure
- **Google Secret Manager** for secure API key storage

## Key Dependencies

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

## App Structure

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

## Project Structure

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
