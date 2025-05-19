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
- Make sure you get the matched! screen when matching
- Only able to talk to one person at a time.
- Add photo blurring preview screen.
- Setup progressive photo unblurring
- Implement authentication route protection
- Force users to use a square picture in the image picker.
- Make the images higher quality.

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

Built with ❤️ using React Native, Expo, and MongoDB
