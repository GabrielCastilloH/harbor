# 🎭 Progressive Photo Reveal System

## Core Design Philosophy

The app uses a **progressive blur system** that creates intrigue while maintaining privacy:

### Phase 1: Pre-Consent (Theatrical Reveal)

- **Server-side**: `_blurred.jpg` images are pre-blurred to 80% server-side
- **Client-side**: Fake 100% → 0% blur applied on top of the already-blurred image
- **Effect**: Creates the illusion of gradual reveal while the image remains heavily obscured
- **Transition**: At 0% client blur, the image still appears 80% blurred due to server-side blur

### Phase 2: Post-Consent (Real Reveal)

- **Server-side**: Switch to `_original.jpg` (completely unblurred)
- **Client-side**: Start at 80% blur (matching Phase 1's final appearance) → 0% blur
- **Effect**: Seamless transition with actual image clarity improvement
- **Result**: Complete image reveal over 50 messages

## Technical Implementation

### Blur Configuration (`constants/blurConfig.ts`)

```typescript
export const BLUR_CONFIG = {
  SERVER_BLUR_PERCENT: 80, // Server-side blur for _blurred.jpg
  CLIENT_MAX_BLUR_RADIUS: 40, // Max React Native blur radius
  MESSAGES_TO_CLEAR_BLUR: 30, // Phase 1: 100% → 0% fake unblur
  MESSAGES_TO_CLEAR_ORIGINAL: 10, // Phase 2: 80% → 0% real unblur
};
```

### Unified Blur Calculation Logic

```typescript
export function getClientBlurLevel({
  messageCount,
  bothConsented,
}: {
  messageCount: number;
  bothConsented: boolean;
}): number {
  const percentageToBlurRadius = (percent: number) =>
    Math.round((percent / 100) * BLUR_CONFIG.CLIENT_MAX_BLUR_RADIUS);

  if (!bothConsented) {
    // Phase 1: Fake reveal on _blurred.jpg
    const progress = Math.min(
      messageCount / BLUR_CONFIG.MESSAGES_TO_CLEAR_BLUR,
      1
    );
    const blurPercent = 100 * (1 - progress); // 100% → 0%
    return percentageToBlurRadius(blurPercent);
  } else {
    // Phase 2: Real reveal on _original.jpg
    const progress = Math.min(
      messageCount / BLUR_CONFIG.MESSAGES_TO_CLEAR_ORIGINAL,
      1
    );
    const blurPercent = 80 * (1 - progress); // 80% → 0%
    return percentageToBlurRadius(blurPercent);
  }
}
```

## Consent State Management

### Match Document Structure (Optimized for 1-on-1 Matches)

```typescript
interface Match {
  type: "individual";
  user1Id: string; // First user's ID
  user2Id: string; // Second user's ID
  user1Consented: boolean; // User 1's consent status
  user2Consented: boolean; // User 2's consent status
  user1Viewed: boolean; // User 1's view status
  user2Viewed: boolean; // User 2's view status
  messageCount: number;
  isActive: boolean;
  matchDate: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
  consentMessageSent?: boolean;
  introMessageSent?: boolean;
}
```

### Server Response Shape

The `matchFunctions-getConsentStatus` callable returns:

- `user1Id` (first user's ID)
- `user2Id` (second user's ID)
- `user1Consented` (user 1's consent status)
- `user2Consented` (user 2's consent status)
- `bothConsented` (true when both users have consented)
- `messageCount`
- `shouldShowConsentScreen` (true when `messageCount >= threshold` and not both consented)
- `shouldShowConsentForUser` (per-user modal visibility)
- `state` ("none_consented" | "one_consented" | "both_consented")

### Client Detection Flow

1. **Message Counting**: Every new message increments `messageCount` via `chatFunctions-updateMessageCount`
2. **Consent Checking**: After each message, calls `getConsentStatus(matchId)`
3. **Modal Display**: Shows consent modal only when user's `shouldShowConsentForUser` is true
4. **Channel Management**: Freezes chat until all participants consent when threshold reached
