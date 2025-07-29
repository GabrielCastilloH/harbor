# Networking Layer

This directory contains all client-side networking functions that communicate with Firebase Functions using callable functions (v2).

## Structure

### Services

Each service is focused on a specific domain and uses Firebase callable functions:

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

## Firebase Functions (v2 Callable Functions)

The server-side functions are organized in `functions/src/` with the same domain structure and use Firebase Functions v2 callable functions:

- `functions/src/auth/` - Authentication functions
- `functions/src/users/` - User management functions
- `functions/src/swipes/` - Swipe functions
- `functions/src/matches/` - Match functions
- `functions/src/chat/` - Chat functions
- `functions/src/images/` - Image functions
- `functions/src/blur/` - Blur functions
- `functions/src/recommendations/` - Recommendation functions

## Key Features

### Authentication

All functions require user authentication. The client automatically includes the Firebase Auth token in requests.

### Error Handling

Functions use proper Firebase Functions v2 error types:

- `unauthenticated` - User not authenticated
- `invalid-argument` - Missing or invalid parameters
- `not-found` - Resource not found
- `permission-denied` - User lacks permission
- `internal` - Server error

### Type Safety

All functions include TypeScript interfaces for request and response data.

### Configuration

All functions use consistent configuration:

- Region: `us-central1`
- Memory: `256MiB`
- Timeout: `60 seconds`
- Min instances: `0`
- Max instances: `10`
- Concurrency: `80`
- CPU: `1`
- Ingress: `ALLOW_ALL`
- Invoker: `public`

## Migration from HTTP Functions

This networking layer has been migrated from HTTP functions to callable functions for:

- Better authentication handling
- Improved error handling
- Type safety
- Automatic retry logic
- Better performance
