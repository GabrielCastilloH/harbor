# 🌊 [Harbor](https://www.tryharbor.app/)

**A unique dating app designed specifically for Cornell students that focuses on meaningful connections through progressive photo reveal and limited daily interactions.**

Harbor creates intrigue and encourages genuine conversations by gradually revealing profile photos as users chat, fostering deeper connections beyond superficial first impressions.

## 📚 Documentation

This README provides a high-level overview of Harbor. For detailed information about specific aspects of the app, please refer to the documentation in the `md/` directory:

- **[Core Features](md/core-features.md)** - Progressive photo reveal, smart matching, real-time chat, security, and push notifications
- **[Swipe System Architecture](md/swipe-system.md)** - Subcollection-based swipe tracking, performance benefits, and user availability
- **[Database Schema](md/database-schema.md)** - Complete Firestore database structure with all collections and subcollections
- **[Technical Architecture](md/technical-architecture.md)** - Frontend stack, backend services, app structure, and project organization
- **[Firebase Cloud Functions](md/cloud-functions.md)** - Complete reference of all Cloud Functions (auth, chat, images, matches, etc.)
- **[Authentication & Google Sign-In](md/authentication.md)** - Authentication flow and Google Sign-In implementation
- **[Account Management & Banning](md/account-management.md)** - Account deletion, banning, deactivation, and security
- **[Profile Validation & Requirements](md/profile-validation.md)** - Profile creation requirements and data type definitions
- **[Progressive Photo Reveal System](md/photo-reveal-system.md)** - Two-phase blur system and consent management
- **[Push Notifications System](md/push-notifications.md)** - FCM integration and Stream Chat delivery
- **[Premium Features (Currently Disabled)](md/premium-features.md)** - Premium feature framework (currently inactive)
- **[Security & Moderation](md/security.md)** - Image moderation, user reporting, and multi-layer security architecture
- **[Getting Started](md/getting-started.md)** - Setup guide, prerequisites, and development commands
- **[Future Enhancements](md/future-enhancements.md)** - Planned features and technical improvements

## 🎯 Quick Overview

Harbor is a React Native dating app built with:

- **Frontend**: React Native, Expo, TypeScript, Stream Chat
- **Backend**: Firebase (Auth, Firestore, Functions, Storage), Stream Chat
- **Key Features**: Progressive photo reveal, smart matching, real-time chat, Cornell-only access

## 🏗️ Project Structure

```
harbor/
├── App.tsx                 # Main entry point
├── components/             # Reusable UI components
├── constants/             # App configuration
├── context/               # React Context providers
├── functions/             # Firebase Cloud Functions
├── hooks/                 # Custom React hooks
├── navigation/            # Navigation configuration
├── networking/            # API service classes
├── screens/               # Screen components
├── types/                 # TypeScript definitions
└── util/                  # Utility functions
```

## 🚀 Quick Start

```bash
# Install dependencies
npm install

# Run on iOS
npx expo run:ios

# Run on Android
npx expo run:android

# Deploy Cloud Functions
cd functions && npm run build && firebase deploy --only functions
```

## 📞 Contact

For questions or support, contact: **tryharbor.app@gmail.com**

---

**Built with ❤️ for the Cornell community**

_Harbor - Where meaningful connections begin_
