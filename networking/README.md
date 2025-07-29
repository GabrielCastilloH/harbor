# Networking Layer

This directory contains all client-side networking functions that communicate with Firebase Functions.

## Structure

### Services

Each service is focused on a specific domain:

- **AuthService** - Authentication-related API calls
- **UserService** - User management API calls
- **SwipeService** - Swipe-related API calls
- **MatchService** - Match management API calls
- **ChatFunctions** - Chat-related API calls
- **ImageService** - Image upload API calls
- **BlurService** - Blur functionality API calls
- **RecommendationService** - Recommendation API calls

### Usage

Import from the main index file for unified access:

```typescript
import {
  AuthService,
  UserService,
  SwipeService,
  createMatch,
  fetchUserToken,
} from "../networking";
```

Or import specific services:

```typescript
import { AuthService } from "../networking/AuthService";
import { UserService } from "../networking/UserService";
```

## Firebase Functions

The server-side functions are organized in `functions/src/` with the same domain structure:

- `functions/src/auth/` - Authentication functions
- `functions/src/users/` - User management functions
- `functions/src/swipes/` - Swipe functions
- `functions/src/matches/` - Match functions
- `functions/src/chat/` - Chat functions
- `functions/src/images/` - Image functions
- `functions/src/blur/` - Blur functions
- `functions/src/recommendations/` - Recommendation functions

## Base URL

All API calls use the Firebase Functions base URL:
`https://us-central1-harbor-ch.cloudfunctions.net`
