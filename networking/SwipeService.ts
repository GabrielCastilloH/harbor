import { getFunctions, httpsCallable } from "firebase/functions";
import app from "../firebaseConfig";

const functions = getFunctions(app, "us-central1");

export class SwipeService {
  static async createSwipe(
    swiperId: string,
    swipedId: string,
    direction: "left" | "right"
  ) {
    console.log("SwipeService - createSwipe called with:", {
      swiperId,
      swipedId,
      direction,
    });

    try {
      const createSwipe = httpsCallable(functions, "swipes-createSwipe");
      const result = await createSwipe({ swiperId, swipedId, direction });
      const data = result.data as {
        message: string;
        swipe: any;
        match: boolean;
        matchId?: string;
      };

      console.log("SwipeService - Swipe created:", data);
      return data;
    } catch (error) {
      console.error("SwipeService - Error creating swipe:", error);
      throw error;
    }
  }

  static async countRecentSwipes(id: string) {
    console.log("SwipeService - countRecentSwipes called with:", id);

    try {
      const countRecentSwipes = httpsCallable(
        functions,
        "swipes-countRecentSwipes"
      );
      const result = await countRecentSwipes({ id });
      const data = result.data as {
        swipeCount: number;
        dailyLimit: number;
        canSwipe: boolean;
      };

      console.log("SwipeService - Swipe count:", data);
      return data;
    } catch (error) {
      console.error("SwipeService - Error counting swipes:", error);
      throw error;
    }
  }

  static async getSwipesByUser(id: string) {
    console.log("SwipeService - getSwipesByUser called with:", id);

    try {
      const getSwipesByUser = httpsCallable(
        functions,
        "swipes-getSwipesByUser"
      );
      const result = await getSwipesByUser({ id });
      const data = result.data as { swipes: any[] };

      console.log("SwipeService - User swipes:", data);
      return data.swipes;
    } catch (error) {
      console.error("SwipeService - Error getting user swipes:", error);
      throw error;
    }
  }
}
