import { getFunctions, httpsCallable } from "firebase/functions";
import app from "../firebaseConfig";
// import { logToNtfy } from "../util/debugUtils";

const functions = getFunctions(app, "us-central1");

export class RecommendationService {
  static async getRecommendations(userId: string) {
    // await logToNtfy(
    //   `RecommendationService - getRecommendations called with userId: ${userId}`
    // );
    // await logToNtfy(`RecommendationService - userId type: ${typeof userId}`);
    // await logToNtfy(`RecommendationService - userId length: ${userId?.length}`);

    try {
      const getRecommendations = httpsCallable(
        functions,
        "recommendationsFunctions-getRecommendations"
      );
      const result = await getRecommendations({ userId });
      const data = result.data as { recommendations: any[] };

      // await logToNtfy(
      //   `RecommendationService - Recommendations fetched successfully`
      // );
      // await logToNtfy(
      //   `RecommendationService - Number of recommendations: ${data.recommendations?.length || 0}`
      // );
      // console.log("RecommendationService - Recommendations fetched:", data);

      return data;
    } catch (error: any) {
      // await logToNtfy(
      //   `RecommendationService - Error fetching recommendations: ${error.message}`
      // );
      // await logToNtfy(`RecommendationService - Error code: ${error.code}`);
      // await logToNtfy(
      //   `RecommendationService - Error name: ${error.name}`
      // );
      // await logToNtfy(`RecommendationService - Error stack: ${error.stack}`);

      console.error("RecommendationService - Error:", error);
      throw error;
    }
  }
}
