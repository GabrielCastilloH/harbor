# 🌊 Harbor

A unique dating app that focuses on meaningful connections through progressive photo reveal and limited daily interactions.

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or higher)
- MongoDB account
- Xcode for iOS development
- npm or yarn package manager

### Backend Setup

1. Configure MongoDB:

   - Visit [MongoDB Atlas](https://mongodb.com)
   - Add your IP address to the allowlist
   - (Optional) Connect using MongoDB Compass for database monitoring

2. Install and Run Backend:
   ```bash
   cd backend
   npm install
   npm start
   ```

### Frontend Setup

1. Install Dependencies and Run:
   ```bash
   cd frontend
   npm install
   npx expo run:ios
   ```

## 🛠 Development Status

### Completed Features ✅

- StreamChat Integration
  - User creation and token generation
  - Backend route for user token fetching
- Match-based chat creation
- One-to-one conversation limit
- Fixed signup bug.
- Actually add user info to the top right corner of chats.

### In Progress 🚧

- [ ] Add pre-filled data in user settings and add name of the other person individual chats.
- [ ] Implement three swipes per day limit (configurable)
- [ ] Add photo blurring preview screen
- [ ] Implement authentication route protection
- [ ] Setup progressive photo unblurring
- [ ] Integrate RevenueCat for payment processing
- [ ] Uncomment code to make sure onlly @cornell.edu allowed.

## 🔜 Future Enhancements (not MVP)

- Premium features through RevenueCat integration
- Enhanced matching algorithms
- Additional privacy features
- Profile customization options

Built with ❤️ using React Native, Expo, and MongoDB
