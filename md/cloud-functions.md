# 🔧 Firebase Cloud Functions

## Authentication Functions (`authFunctions`)

- **signInWithEmail**: Legacy custom sign-in flow (now uses Google Sign-In)

## Chat Functions (`chatFunctions`)

- **getStreamApiKey**: Provides Stream Chat API key to frontend
- **generateUserToken**: Creates Stream Chat tokens for authenticated users
- **generateToken**: Alias for generateUserToken
- **createChatChannel**: Sets up messaging channels between matched users
- **updateChannelChatStatus**: Freezes/unfreezes chat channels
- **updateMessageCount**: Increments message count for consent tracking

## Image Functions (`imageFunctions`)

- **uploadImage**: Processes and stores original + blurred image versions with content moderation
- **getImages**: Fetches user images with appropriate blur levels based on consent status
- **getPersonalImages**: Returns unblurred images for user's own profile editing
- **getOriginalImages**: Returns original images for current user's profile
- **generateBlurred**: Creates blurred versions of uploaded images

## Swipe Functions (`swipeFunctions`)

- **createSwipe**: Records swipes and detects mutual matches
- **countRecentSwipes**: Fetches a user's daily swipe count from counters subcollection
- **getSwipesByUser**: Retrieves all swipes made by a specific user
- **savePushToken**: Saves Expo push tokens for notifications
- **resetDailySwipes**: Scheduled function that resets daily swipe counts

## Match Functions (`matchFunctions`)

- **createMatch**: Creates individual match records between two users
- **getUnviewedMatches**: Gets unviewed matches for showing match modals
- **markMatchAsViewed**: Tracks when users view new matches
- **unmatchUsers**: Deactivates matches and freezes chat channels
- **updateMatchChannel**: Updates match channel ID
- **getMatchId**: Finds match ID between two users
- **updateConsent**: Updates user's consent status for continued chatting
- **getConsentStatus**: Manages consent flow for continued chatting
- **incrementMatchMessages**: Increments message count for matches

## Recommendation Functions (`recommendationsFunctions`)

- **getRecommendations**: Provides personalized user recommendations based on preferences and availability status (excludes users currently in matches)

## Report Functions (`reportFunctions`)

- **createReport**: Creates user reports for moderation
- **getReports**: Retrieves all reports (admin function)
- **updateReportStatus**: Updates report status (admin function)
- **reportAndUnmatch**: Handles user reports with automatic unmatching and chat freezing
- **blockUser**: Blocks users and optionally unmatches them

## User Functions (`userFunctions`)

- **createUser**: Creates new user profiles with comprehensive validation
- **getAllUsers**: Retrieves all users (admin function)
- **getUserById**: Gets user by ID
- **updateUser**: Updates user profiles with transactional image cleanup
- **deleteUser**: Complete account deletion with comprehensive data cleanup
- **deactivateAccount** / **reactivateAccount**: Account status management
- **banUser** / **checkBannedStatus**: Ban management
- **checkDeletedAccount**: Checks if email belongs to deleted account

## Superwall Functions (`superwallFunctions`)

- **getSuperwallApiKeys**: Provides Superwall API keys (premium features currently disabled)
