# 🚫 Account Management & Banning System

Harbor implements a comprehensive account management system that handles account deletion, banning, and deactivation. This system ensures that users who violate community guidelines or have their accounts compromised cannot access the platform.

## Account Deletion System

### Database Structure

- **Collection**: `deletedAccounts`
- **Document ID**: `userId` (Firebase Auth UID)
- **Fields**:
  - `email` (string): User's email at time of deletion
  - `deletedAt` (timestamp): When account was deleted
  - `reason` (string): Internal note about deletion reason

### User Flow

1. **Deletion Request**: User requests account deletion in settings
2. **Comprehensive Data Cleanup**: All user data is removed from Firestore collections including:
   - User profile data
   - All matches and chat channels
   - Swipe history
   - Images from Firebase Storage
   - Stream Chat user data
3. **Account Marking**: User document is moved to `deletedAccounts` collection
4. **Access Restriction**: User is redirected to `DeletedAccountScreen`
5. **No Return**: Deleted accounts cannot be restored

## Account Banning System

### Database Structure

- **Collection Name**: `bannedAccounts`
- **Document ID**: `userId` (Firebase Authentication UID)
- **Required Fields**:
  - `bannedByEmail` (string): User's email address at time of ban
  - `unbanDate` (timestamp): When the ban expires (null for permanent bans)
  - `reason` (string): Internal note about why user was banned
  - `createdAt` (timestamp): When the ban was created

### Ban Management Functions

- **banUser**: Creates ban records with optional expiration dates
- **checkBannedStatus**: Checks if user is banned and returns ban details
- **Automatic Detection**: App checks ban status during authentication flow

### User Flow for Banned Accounts

1. **Ban Detection**: App checks `bannedAccounts` collection during authentication
2. **Access Restriction**: Banned users are immediately redirected to `BannedAccountScreen`
3. **No App Access**: Banned users cannot access any app features
4. **Contact Information**: Screen displays contact email for appeals: `tryharbor.app@gmail.com` (the dot is optional)

## Account Deactivation System

### Database Structure

- **User Document Field**: `isActive` (boolean)
- **Deactivation**: Set to `false` to deactivate account
- **Reactivation**: Set to `true` to reactivate account

### Management Functions

- **deactivateAccount**: Deactivates user account while preserving data
- **reactivateAccount**: Reactivates previously deactivated account
- **Flexible Control**: Allows temporary account suspension without data loss

## Implementation Details

The account status check is integrated into the main authentication flow:

- **State Management**: Account status variables track deletion, ban, and deactivation status
- **Database Checks**: After user authentication, check multiple collections for account status
- **Routing Logic**: Redirect to appropriate screen based on account status
- **Comprehensive Blocking**: All app functionality is disabled for restricted accounts

## Security Considerations

- **Client-Side Checks**: All interactive elements are disabled for restricted users
- **Server-Side Rules**: Firestore security rules check account status before allowing access
- **No Circumvention**: Restricted users cannot bypass restrictions through app manipulation
- **Appeal Process**: Clear contact information provided for legitimate appeals

## Account Status Priority

The app checks account status in this order: email verification → account deletion → account banning → account deactivation → profile setup → full access.
