export interface FeatureConfig {
  swipesPerDay: number;
  canSeeWhoSwipedOnThem: boolean;
}

export const FREE_FEATURES: FeatureConfig = {
  swipesPerDay: 5,
  canSeeWhoSwipedOnThem: false,
};

export const PREMIUM_FEATURES: FeatureConfig = {
  swipesPerDay: 5, // Same as free tier
  canSeeWhoSwipedOnThem: false, // Same as free tier
};

// PREMIUM DISABLED: Always return free features
export const getFeatureConfig = (isPremium: boolean): FeatureConfig => {
  return FREE_FEATURES; // Always return free features
  // Original: return isPremium ? PREMIUM_FEATURES : FREE_FEATURES;
};

// PREMIUM DISABLED: Always return free tier swipes
export const getSwipesPerDay = (isPremium: boolean): number => {
  return FREE_FEATURES.swipesPerDay; // Always return free tier limit
  // Original: return isPremium ? PREMIUM_FEATURES.swipesPerDay : FREE_FEATURES.swipesPerDay;
};

// PREMIUM DISABLED: Always return free tier setting
export const canSeeWhoSwipedOnThem = (isPremium: boolean): boolean => {
  return FREE_FEATURES.canSeeWhoSwipedOnThem; // Always return free tier setting (false)
  // Original: return isPremium ? PREMIUM_FEATURES.canSeeWhoSwipedOnThem : FREE_FEATURES.canSeeWhoSwipedOnThem;
};
