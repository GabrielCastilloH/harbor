# ⚡ Swipe System Architecture

Harbor implements a **subcollection-based swipe tracking system** that provides efficient daily swipe management.

## Current Implementation

### 🚀 Performance Benefits

- **Subcollection Organization**: Swipes stored in `/swipes/{userId}/outgoing/` and `/swipes/{userId}/incoming/` for efficient querying
- **Counter-based Limits**: Daily swipe counts tracked in `/users/{userId}/swipeCounter/daily` subcollection
- **Atomic Operations**: All swipe data updates happen in transactions, preventing race conditions

### 🔒 Data Consistency

- **Transaction Safety**: Swipe count increments and limit checks happen atomically
- **No Race Conditions**: Prevents users from exceeding limits during rapid swiping
- **Automatic Reset**: Daily swipe counts reset automatically via scheduled function
- **Match Prevention**: Users with active matches cannot swipe until match is resolved

### 🏗️ Scalability Advantages

- **Efficient Querying**: Subcollections allow for fast retrieval of user's swipe history
- **Availability Tracking**: Index-based filtering prevents recommending users who are already in matches
- **Future-Proof**: Framework ready for premium tiers and advanced features

### 🎯 User Availability System

Harbor implements a scalable availability tracking system that prevents users currently in matches from being recommended to others. The system uses `isActive` (account status) and `isAvailable` (match availability) fields, automatically updating them when matches are created or deleted. Index-based filtering at the database level ensures efficient querying without expensive in-memory operations.

## Technical Implementation

The swipe system uses subcollections (`/swipes/{userId}/outgoing/` and `/swipes/{userId}/incoming/`) for efficient querying, with daily swipe counts tracked in `/users/{userId}/swipeCounter/daily`. All swipe operations use Firestore transactions to ensure atomic updates and prevent race conditions. A scheduled function runs daily to reset swipe counts.
