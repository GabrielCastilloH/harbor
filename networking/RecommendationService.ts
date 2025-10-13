import { getFunctions, httpsCallable } from "firebase/functions";
import app from "../firebaseConfig";

const functions = getFunctions(app, "us-central1");

export class RecommendationService {
  static async getRecommendations(userId: string) {
    try {
      const getRecommendations = httpsCallable(
        functions,
        "recommendationsFunctions-getRecommendations"
      );

      const result = await getRecommendations({ userId });
      const data = result.data as { recommendations: any[] };

      return data;
    } catch (error: any) {
      console.error("RecommendationService - Error:", error);
      throw error;
    }
  }
}
