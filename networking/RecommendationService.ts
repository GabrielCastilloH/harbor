import { getFunctions, httpsCallable } from "firebase/functions";
import app from "../firebaseConfig";
import { logToNtfy } from "../util/debugUtils";

const functions = getFunctions(app, "us-central1");

export class RecommendationService {
  static async getRecommendations(userId: string) {
    console.log(
      "RecommendationService - getRecommendations called with:",
      userId
    );
    await logToNtfy(
      `RecommendationService - getRecommendations called with userId: ${userId}`
    );
    await logToNtfy(`RecommendationService - userId type: ${typeof userId}`);
    await logToNtfy(`RecommendationService - userId length: ${userId?.length}`);

    try {
      const getRecommendations = httpsCallable(
        functions,
        "recommendations-getRecommendations"
      );

      await logToNtfy(
        `RecommendationService - Calling function with data: ${JSON.stringify({
          userId,
        })}`
      );

      const result = await getRecommendations({ userId });
      const data = result.data as { recommendations: any[] };

      console.log("RecommendationService - Recommendations fetched:", data);
      await logToNtfy(
        `RecommendationService - getRecommendations success for userId: ${userId}`
      );
      await logToNtfy(
        `RecommendationService - Found ${
          data.recommendations?.length || 0
        } recommendations`
      );
      return data.recommendations;
    } catch (error: any) {
      await logToNtfy(
        `RecommendationService - Error getting recommendations for ${userId}: ${error.message}`
      );
      await logToNtfy(`RecommendationService - Error code: ${error.code}`);
      await logToNtfy(
        `RecommendationService - Error details: ${JSON.stringify(error)}`
      );
      console.error(
        "RecommendationService - Error getting recommendations:",
        error
      );
      throw error;
    }
  }
}
