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
      const createSwipe = httpsCallable(functions, "swipes-createSwipe");
      const result = await createSwipe({ swiperId, swipedId, direction });
      const data = result.data as any;

      return data;
    } catch (error) {
      console.error("SwipeService - Error creating swipe:", error);
      throw error;
    }
  }

  static async countRecentSwipes(id: string) {
    try {
      const countRecentSwipes = httpsCallable(functions, "swipes-countRecentSwipes");
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
      const getSwipesByUser = httpsCallable(functions, "swipes-getSwipesByUser");
      const result = await getSwipesByUser({ id });
      const data = result.data as any;

      return data;
    } catch (error) {
      console.error("SwipeService - Error getting swipes by user:", error);
      throw error;
    }
  }
}
