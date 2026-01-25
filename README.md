# 🌊 [Harbor](https://www.tryharbor.app/)

**A unique dating app designed specifically for Cornell students that focuses on meaningful connections through progressive photo reveal and limited daily interactions.**

Harbor creates intrigue and encourages genuine conversations by gradually revealing profile photos as users chat, fostering deeper connections beyond superficial first impressions.

## 📚 Documentation

This README provides a high-level overview of Harbor. For detailed information about specific aspects of the app, please refer to the documentation in the `md/` directory:

<details>
<summary><b>Core Features</b></summary>

Learn about Harbor's key features including the progressive photo reveal system, smart matching, real-time chat, security features, and push notifications.

📖 [Read more about Core Features](md/core-features.md)

</details>

<details>
<summary><b>Swipe System Architecture</b></summary>

Understand Harbor's subcollection-based swipe tracking system, performance benefits, data consistency, and user availability system.

📖 [Read more about Swipe System](md/swipe-system.md)

</details>

<details>
<summary><b>Database Schema</b></summary>

Explore the complete Firestore database structure including users, matches, swipes, reports, and all subcollections with data types and design principles.

📖 [Read more about Database Schema](md/database-schema.md)

</details>

<details>
<summary><b>Technical Architecture</b></summary>

Review the frontend stack, backend services, app structure, navigation architecture, and complete project file structure.

📖 [Read more about Technical Architecture](md/technical-architecture.md)

</details>

<details>
<summary><b>Firebase Cloud Functions</b></summary>

Complete reference of all Cloud Functions including authentication, chat, images, swipes, matches, recommendations, reports, and user management functions.

📖 [Read more about Cloud Functions](md/cloud-functions.md)

</details>

<details>
<summary><b>Authentication & Google Sign-In</b></summary>

Learn about Harbor's authentication flow, Google Sign-In implementation, and the different authentication states.

📖 [Read more about Authentication](md/authentication.md)

</details>

<details>
<summary><b>Account Management & Banning</b></summary>

Understand the comprehensive account management system including deletion, banning, deactivation, and security considerations.

📖 [Read more about Account Management](md/account-management.md)

</details>

<details>
<summary><b>Profile Validation & Requirements</b></summary>

Review all profile creation requirements, image specifications, required fields, text field limits, and data type definitions.

📖 [Read more about Profile Validation](md/profile-validation.md)

</details>

<details>
<summary><b>Progressive Photo Reveal System</b></summary>

Deep dive into the two-phase blur system, technical implementation, blur configuration, and consent state management.

📖 [Read more about Photo Reveal System](md/photo-reveal-system.md)

</details>

<details>
<summary><b>Push Notifications System</b></summary>

Learn about the push notification implementation, FCM integration, Stream Chat delivery, and notification types.

📖 [Read more about Push Notifications](md/push-notifications.md)

</details>

<details>
<summary><b>Premium Features (Currently Disabled)</b></summary>

Information about the premium feature framework that's currently disabled but ready for future activation.

📖 [Read more about Premium Features](md/premium-features.md)

</details>

<details>
<summary><b>Security & Moderation</b></summary>

Comprehensive overview of security measures including image moderation, user reporting, account management, data security, and multi-layer security architecture.

📖 [Read more about Security](md/security.md)

</details>

<details>
<summary><b>Getting Started</b></summary>

Complete setup guide including prerequisites, Firebase setup, Stream Chat setup, frontend setup, and development commands.

📖 [Read more about Getting Started](md/getting-started.md)

</details>

<details>
<summary><b>Future Enhancements</b></summary>

Planned features and technical improvements for Harbor's roadmap.

📖 [Read more about Future Enhancements](md/future-enhancements.md)

</details>

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
