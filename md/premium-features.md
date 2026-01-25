# 💎 Premium Features (Currently Disabled)

## Current Status

All premium features are currently **disabled** throughout the codebase. The app functions as a free-tier only application with all users receiving the same features.

## Premium Feature Framework

- **Superwall integration**: Complete premium paywall system implemented but commented out
- **Swipe limits**: 5 swipes per day for all users (no premium advantage)
- **Feature flags**: Comprehensive feature configuration system in place but returns free tier values

## Disabled Premium Features

```typescript
// All premium features return false/free tier values
export const usePremium = () => {
  const isPremium = false; // Always false
  return {
    isPremium,
    features: getFeatureConfig(isPremium), // Always returns FREE_FEATURES
    swipesPerDay: getSwipesPerDay(isPremium), // Always returns 5
    canSeeWhoSwipedOnThem: canSeeWhoSwipedOnThem(isPremium), // Always returns false
  };
};

// Feature configuration always returns free tier
export const getFeatureConfig = (isPremium: boolean): FeatureConfig => {
  return FREE_FEATURES; // Always return free features
  // Original: return isPremium ? PREMIUM_FEATURES : FREE_FEATURES;
};
```

## Premium Infrastructure Ready

- **Payment processing**: Superwall SDK integrated but inactive
- **Feature gates**: Complete gating system throughout the app
- **Backend support**: Cloud Functions ready for premium user management
- **UI components**: Premium upgrade prompts implemented but show "coming soon" messages
- **API keys**: Superwall API keys stored in Google Secret Manager but unused
