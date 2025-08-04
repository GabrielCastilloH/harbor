import { useSuperwall } from "expo-superwall";
import {
  getFeatureConfig,
  getSwipesPerDay,
  canSeeWhoSwipedOnThem,
} from "../constants/FeaturesConfig";

export const usePremium = () => {
  const { isSubscribed } = useSuperwall();

  // Use Superwall's isSubscribed as the source of truth
  const isPremium = isSubscribed;

  return {
    isPremium,
    features: getFeatureConfig(isPremium),
    swipesPerDay: getSwipesPerDay(isPremium),
    canSeeWhoSwipedOnThem: canSeeWhoSwipedOnThem(isPremium),
  };
};
