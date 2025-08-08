// import { useSuperwall } from "@superwall/react-native-superwall";
import {
  getFeatureConfig,
  getSwipesPerDay,
  canSeeWhoSwipedOnThem,
} from "../constants/Features";

export const usePremium = () => {
  // Temporarily mock Superwall functionality
  // const { isSubscribed } = useSuperwall();
  const isSubscribed = false; // Default to free user

  // Use Superwall's isSubscribed as the source of truth
  const isPremium = isSubscribed;

  return {
    isPremium,
    features: getFeatureConfig(isPremium),
    swipesPerDay: getSwipesPerDay(isPremium),
    canSeeWhoSwipedOnThem: canSeeWhoSwipedOnThem(isPremium),
  };
};
