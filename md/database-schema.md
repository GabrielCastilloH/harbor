# 🗄️ Database Schema

Harbor uses **Firebase Firestore** as its primary database with a well-structured collection hierarchy designed for scalability and efficient querying.

## Recent Schema Updates (October 2025)

Match schema uses explicit `user1Id`/`user2Id` fields and consent/view booleans for cleaner queries. Swipe counters moved to `/users/{userId}/swipeCounter/daily` subcollection for better organization.

## Main Collections

### 📊 **users** Collection

**Primary user profile data and account management**

```typescript
// Document: /users/{userId}
{
  // Profile Information
  firstName: string;           // 1-11 characters
  email: string;              // Cornell email only
  age: number;                // 18+ years old
  yearLevel: string;          // Freshman, Sophomore, Junior, Senior
  major: string;              // 85+ major options
  gender: string;             // Male, Female, Non-Binary
  sexualOrientation: string;  // Heterosexual, Homosexual, Bisexual, Pansexual

  // Profile Content
  images: string[];           // Array of image filenames (3-6 images)
  aboutMe: string;            // 5-180 characters
  q1: string;                 // "Together we could" (5-100 chars)
  q2: string;                 // "Favorite book, movie or song" (5-100 chars)
  q3: string;                 // "Some of my hobbies are" (5-100 chars)

  // Account Status
  isActive: boolean;          // Account enabled/disabled (default: true)
  isAvailable: boolean;       // Match availability (default: true, false when in active match)
  currentMatches: string[];   // Array of active match IDs

  // System Fields
  paywallSeen: boolean;       // Premium feature tracking (disabled)
  fcmToken?: string;          // Firebase Cloud Messaging token
  expoPushToken?: string;     // Expo push notification token
  availability: number;       // For matching algorithm (-1 default)
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### 🔄 **matches** Collection

**Match records between two users**

```typescript
// Document: /matches/{matchId}
{
  user1Id: string;            // First user's ID
  user2Id: string;            // Second user's ID
  user1Consented: boolean;    // User 1's consent status
  user2Consented: boolean;    // User 2's consent status
  user1Viewed: boolean;       // User 1's view status
  user2Viewed: boolean;       // User 2's view status
  messageCount: number;       // Total messages in chat
  isActive: boolean;          // Match status
  matchDate: Timestamp;       // When match was created
  consentMessageSent?: boolean; // Consent notification sent
  introMessageSent?: boolean;   // Intro message sent
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### 👆 **swipes** Collection

**Swipe tracking with subcollections for efficient querying**

```typescript
// Document: /swipes/{userId}/outgoing/{swipedUserId}
{
  direction: "left" | "right"; // Swipe direction
  createdAt: Timestamp; // When swipe occurred
}

// Document: /swipes/{userId}/incoming/{swiperId}
{
  direction: "left" | "right"; // Swipe direction
  createdAt: Timestamp; // When swipe occurred
}
```

### 📝 **reports** Collection

**User reports for moderation**

```typescript
// Document: /reports/{reportId}
{
  reporterId: string; // ID of user making report
  reporterEmail: string; // Email of reporter
  reportedUserId: string; // ID of reported user
  reportedUserEmail: string; // Email of reported user
  reportedUserName: string; // Name of reported user
  reason: string; // Report category
  explanation: string; // Detailed explanation
  status: "pending" | "resolved" | "dismissed";
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

### 🚫 **bannedAccounts** Collection

**Banned user records**

```typescript
// Document: /bannedAccounts/{userId}
{
  bannedByEmail: string; // User's email at time of ban
  unbanDate: Timestamp | null; // Ban expiration (null for permanent)
  reason: string; // Internal ban reason
  createdAt: Timestamp; // When ban was created
}
```

### 🗑️ **deletedAccounts** Collection

**Deleted user tracking**

```typescript
// Document: /deletedAccounts/{userId}
{
  email: string; // User's email at time of deletion
  deletedAt: Timestamp; // When account was deleted
  deletedBy: string; // User ID who deleted account
  firstName: string; // User's first name
  lastName: string; // User's last name
}
```

## Subcollections

### 📊 **users/{userId}/swipeCounter** Subcollection

**Daily swipe count tracking**

```typescript
// Document: /users/{userId}/swipeCounter/daily
{
  count: number; // Current day's swipe count
  resetDate: Timestamp; // Last reset timestamp (Firestore Timestamp)
  updatedAt: Timestamp; // Last update timestamp (Firestore Timestamp)
}
```

### 🚫 **users/{userId}/blocked** Subcollection

**User blocking system**

```typescript
// Document: /users/{userId}/blocked/{blockedUserId}
{
  blockedUserId: string;        // ID of blocked user
  blockedAt: Timestamp;         // When user was blocked
  reason: string;               // "manual_block" | "report_block"
  matchId?: string;             // Optional match ID if blocking from match
  reportId?: string;            // Optional report ID if blocking from report
}
```

## Database Design Principles

Harbor's database architecture emphasizes performance, consistency, and scalability:

- **Performance**: Subcollection-based organization for efficient querying, counter-based daily limits, and index-based filtering
- **Consistency**: Atomic transactions prevent race conditions, automatic daily resets, and match-based swipe prevention
- **Scalability**: Composite indexes support efficient multi-field queries, ready for premium features and advanced matching

### 🎯 **User Availability System**

Harbor implements a scalable availability tracking system using `isActive` (account status) and `isAvailable` (match availability) fields. When users match, both participants are set to `isAvailable: false`, and when they unmatch, status is reset to `true`. Only users with `isActive !== false` and `isAvailable !== false` are recommended.
