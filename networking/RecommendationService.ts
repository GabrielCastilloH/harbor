import { getFunctions, httpsCallable } from "firebase/functions";
import app from "../firebaseConfig";

const functions = getFunctions(app, "us-central1");

export class RecommendationService {
  static async getRecommendations(userId: string) {
    console.log("🔥 RecommendationService: Starting getRecommendations");
    console.log("🔥 RecommendationService: userId =", userId);

    try {
      console.log(
        "🔥 RecommendationService: Creating httpsCallable for recommendationsFunctions-getRecommendations"
      );
      const getRecommendations = httpsCallable(
        functions,
        "recommendationsFunctions-getRecommendations"
      );

      console.log(
        "🔥 RecommendationService: Calling function with userId:",
        userId
      );
      const result = await getRecommendations({ userId });
      console.log(
        "🔥 RecommendationService: Got result from function:",
        result
      );
      console.log("🔥 RecommendationService: Result data:", result.data);

      const data = result.data as { recommendations: any[] };
      console.log("🔥 RecommendationService: Parsed data:", data);
      console.log(
        "🔥 RecommendationService: Recommendations count:",
        data.recommendations?.length || 0
      );
      console.log(
        "🔥 RecommendationService: Full recommendations:",
        data.recommendations
      );

      return data;
    } catch (error: any) {
      console.error("🔥 RecommendationService: Error occurred:", error);
      console.error("🔥 RecommendationService: Error message:", error.message);
      console.error("🔥 RecommendationService: Error code:", error.code);
      console.error("🔥 RecommendationService: Error details:", error.details);
      throw error;
    }
  }
}
