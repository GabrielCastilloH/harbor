// Firebase Functions base URL
const FIREBASE_FUNCTIONS_BASE =
  "https://us-central1-harbor-ch.cloudfunctions.net";

/**
 * Swipe Service - Handles swipe-related API calls
 */
export class SwipeService {
  static async createSwipe(
    swiperId: string,
    swipedId: string,
    direction: "left" | "right"
  ) {
    const response = await fetch(
      `${FIREBASE_FUNCTIONS_BASE}/swipes-createSwipe`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ swiperId, swipedId, direction }),
      }
    );
    return response.json();
  }

  static async countRecentSwipes(id: string) {
    const response = await fetch(
      `${FIREBASE_FUNCTIONS_BASE}/swipes-countRecentSwipes/${id}`
    );
    return response.json();
  }

  static async getSwipesByUser(id: string) {
    const response = await fetch(
      `${FIREBASE_FUNCTIONS_BASE}/swipes-getSwipesByUser/${id}`
    );
    return response.json();
  }
}
