// Firebase Functions base URL
const FIREBASE_FUNCTIONS_BASE =
  "https://us-central1-harbor-ch.cloudfunctions.net";

/**
 * Recommendation Service - Handles recommendation-related API calls
 */
export class RecommendationService {
  static async getRecommendations(id: string) {
    const response = await fetch(
      `${FIREBASE_FUNCTIONS_BASE}/recommendations-getRecommendations/${id}`
    );
    return response.json();
  }
}
