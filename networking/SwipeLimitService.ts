import { functions } from "../firebaseConfig";
import { httpsCallable } from "firebase/functions";

export interface SwipeLimitData {
  userId: string;
  swipesToday: number;
  maxSwipesPerDay: number;
  canSwipe: boolean;
  resetDate: string; // ISO date string
}

export class SwipeLimitService {
  static async getSwipeLimit(userId: string): Promise<SwipeLimitData> {
    try {
      const getSwipeLimit = httpsCallable(
        functions,
        "swipeFunctions-getSwipeLimit"
      );
      const result = await getSwipeLimit({ userId });
      return result.data as SwipeLimitData;
    } catch (error) {
      console.error("Error getting swipe limit:", error);
      throw error;
    }
  }

  static async incrementSwipeCount(userId: string): Promise<SwipeLimitData> {
    try {
      const incrementSwipeCount = httpsCallable(
        functions,
        "swipeFunctions-incrementSwipeCount"
      );
      const result = await incrementSwipeCount({ userId });
      return result.data as SwipeLimitData;
    } catch (error) {
      console.error("Error incrementing swipe count:", error);
      throw error;
    }
  }
}
