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
- Fixed signup bug.
- Actually add user info to the top right corner of chats.
- Add pre-filled data in user settings and add name of the other person individual chats.

### In Progress 🚧

- [ ] Make sure you get the matched! screen when matching
- [ ] Be able to match with multiple people but only create a chat with one.
      The other ones are matched with after you finish your current conversation
      (add a button for this in ProfileScreen) one at a time.
- [ ] Implement three swipes per day limit
- [ ] Add photo blurring preview screen
- [ ] Implement authentication route protection
- [ ] Setup progressive photo unblurring
- [ ] Force users to use a square picture in the image picker.
- [ ] Make the images higher quality.
- [ ] Integrate Stripe for payment processing
- [ ] Premium features through Stripe integration
- [ ] Uncomment code to make sure onlly @cornell.edu allowed.

## 🔜 Future Enhancements (not MVP)

- Enhanced matching algorithms
- Additional privacy features
- Profile customization options

Built with ❤️ using React Native, Expo, and MongoDB
