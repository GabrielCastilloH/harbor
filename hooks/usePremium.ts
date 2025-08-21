import { useUser } from "expo-superwall";
import {
  getFeatureConfig,
  getSwipesPerDay,
  canSeeWhoSwipedOnThem,
} from "../constants/Features";

export const usePremium = () => {
  // Use Superwall's user status
  const { user } = useUser();

  // Check if user has active subscription
  const isPremium = user?.subscriptionStatus === "ACTIVE";

  return {
    isPremium,
    features: getFeatureConfig(isPremium),
    swipesPerDay: getSwipesPerDay(isPremium),
    canSeeWhoSwipedOnThem: canSeeWhoSwipedOnThem(isPremium),
  };
};
