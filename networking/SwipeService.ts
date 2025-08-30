import { getFunctions, httpsCallable } from "firebase/functions";
import app from "../firebaseConfig";

const functions = getFunctions(app, "us-central1");

export class SwipeService {
  static async createSwipe(
    swiperId: string,
    swipedId: string,
    direction: "left" | "right"
  ) {
    try {
      const createSwipe = httpsCallable(
        functions,
        "swipeFunctions-createSwipe"
      );
      const result = await createSwipe({ swiperId, swipedId, direction });
      const data = result.data as any;
      
      return data;
    } catch (error: any) {
      console.error("SwipeService - Error creating swipe:", error);
      console.error("SwipeService - Error details:", {
        code: error.code,
        message: error.message,
        details: error.details,
      });
      throw error;
    }
  }

  static async countRecentSwipes(id: string) {
    try {
      const countRecentSwipes = httpsCallable(
        functions,
        "swipeFunctions-countRecentSwipes"
      );
      const result = await countRecentSwipes({ id });
      const data = result.data as any;

      return data;
    } catch (error) {
      console.error("SwipeService - Error counting recent swipes:", error);
      throw error;
    }
  }

  static async getSwipesByUser(id: string) {
    try {
      const getSwipesByUser = httpsCallable(
        functions,
        "swipeFunctions-getSwipesByUser"
      );
      const result = await getSwipesByUser({ id });
      const data = result.data as any;

      return data;
    } catch (error) {
      console.error("SwipeService - Error getting swipes by user:", error);
      throw error;
    }
  }
}
