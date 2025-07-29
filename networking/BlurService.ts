// Firebase Functions base URL
const FIREBASE_FUNCTIONS_BASE =
  "https://us-central1-harbor-ch.cloudfunctions.net";

/**
 * Blur Service - Handles blur-related API calls
 */
export class BlurService {
  static async updateBlurLevelForMessage(
    userId: string,
    matchedUserId: string
  ) {
    const response = await fetch(
      `${FIREBASE_FUNCTIONS_BASE}/blur-updateBlurLevelForMessage`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId, matchedUserId }),
      }
    );
    return response.json();
  }

  static async handleWarningResponse(
    matchId: string,
    userId: string,
    agreed: boolean
  ) {
    const response = await fetch(
      `${FIREBASE_FUNCTIONS_BASE}/blur-handleWarningResponse`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ matchId, userId, agreed }),
      }
    );
    return response.json();
  }

  static async getBlurLevel(userId: string, matchedUserId: string) {
    const response = await fetch(
      `${FIREBASE_FUNCTIONS_BASE}/blur-getBlurLevel/${userId}/${matchedUserId}`
    );
    return response.json();
  }
}
