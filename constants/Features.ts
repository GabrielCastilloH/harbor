export interface FeatureConfig {
  swipesPerDay: number;
  canSeeWhoSwipedOnThem: boolean;
  canSeeUnblurredImages: boolean;
  canSendUnlimitedMessages: boolean;
  canUseAdvancedFilters: boolean;
  canSeeReadReceipts: boolean;
  canUsePriorityMode: boolean;
  canSeeOnlineStatus: boolean;
  canUseSuperLikes: boolean;
  canUseRewind: boolean;
}

export const FREE_FEATURES: FeatureConfig = {
  swipesPerDay: 20,
  canSeeWhoSwipedOnThem: false,
  canSeeUnblurredImages: false,
  canSendUnlimitedMessages: false,
  canUseAdvancedFilters: false,
  canSeeReadReceipts: false,
  canUsePriorityMode: false,
  canSeeOnlineStatus: false,
  canUseSuperLikes: false,
  canUseRewind: false,
};

export const PREMIUM_FEATURES: FeatureConfig = {
  swipesPerDay: 40,
  canSeeWhoSwipedOnThem: true,
  canSeeUnblurredImages: true,
  canSendUnlimitedMessages: true,
  canUseAdvancedFilters: true,
  canSeeReadReceipts: true,
  canUsePriorityMode: true,
  canSeeOnlineStatus: true,
  canUseSuperLikes: true,
  canUseRewind: true,
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

export const canSeeUnblurredImages = (isPremium: boolean): boolean => {
  return isPremium
    ? PREMIUM_FEATURES.canSeeUnblurredImages
    : FREE_FEATURES.canSeeUnblurredImages;
};
