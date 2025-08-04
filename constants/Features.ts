export interface FeatureConfig {
  swipesPerDay: number;
  canSeeWhoSwipedOnThem: boolean;
}

export const FREE_FEATURES: FeatureConfig = {
  swipesPerDay: 20,
  canSeeWhoSwipedOnThem: false,
};

export const PREMIUM_FEATURES: FeatureConfig = {
  swipesPerDay: 40,
  canSeeWhoSwipedOnThem: true,
};

export const getFeatureConfig = (isPremium: boolean): FeatureConfig => {
  return isPremium ? PREMIUM_FEATURES : FREE_FEATURES;
};

export const getSwipesPerDay = (isPremium: boolean): number => {
  return isPremium ? PREMIUM_FEATURES.swipesPerDay : FREE_FEATURES.swipesPerDay;
};

export const canSeeWhoSwipedOnThem = (isPremium: boolean): boolean => {
  return isPremium
    ? PREMIUM_FEATURES.canSeeWhoSwipedOnThem
    : FREE_FEATURES.canSeeWhoSwipedOnThem;
};
