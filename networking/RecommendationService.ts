import { getFunctions, httpsCallable } from "firebase/functions";
import app from "../firebaseConfig";

const functions = getFunctions(app, "us-central1");

export class RecommendationService {
  static async getRecommendations(id: string) {
    console.log("RecommendationService - getRecommendations called with:", id);

    try {
      const getRecommendations = httpsCallable(functions, "getRecommendations");
      const result = await getRecommendations({ id });
      const data = result.data as {
        recommendations: any[];
        swipeCount: number;
        dailyLimit: number;
      };

      console.log("RecommendationService - Recommendations:", data);
      return data;
    } catch (error) {
      console.error(
        "RecommendationService - Error getting recommendations:",
        error
      );
      throw error;
    }
  }
}
