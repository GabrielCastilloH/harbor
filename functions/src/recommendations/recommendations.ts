import * as functions from "firebase-functions/v2";
import * as admin from "firebase-admin";
import { CallableRequest } from "firebase-functions/v2/https";

const db = admin.firestore();
const RECOMMENDED_COUNT = 3;
const DAILY_SWIPES = 100;

/**
 * Gets user recommendations for swiping
 */
export const getRecommendations = functions.https.onCall(
  {
    region: "us-central1",
    memory: "256MiB",
    timeoutSeconds: 60,
    minInstances: 0,
    maxInstances: 10,
    concurrency: 80,
    cpu: 1,
    ingressSettings: "ALLOW_ALL",
    invoker: "public",
  },
  async (request: CallableRequest<{ userId: string }>) => {
    try {
      console.log("getRecommendations function called with:", request.data);

      if (!request.auth) {
        console.log("getRecommendations - User not authenticated");
        throw new functions.https.HttpsError(
          "unauthenticated",
          "User must be authenticated"
        );
      }

      const { userId } = request.data;
      if (!userId) {
        console.log("getRecommendations - No userId provided");
        throw new functions.https.HttpsError(
          "invalid-argument",
          "User ID is required"
        );
      }

      console.log(
        "getRecommendations - Getting recommendations for user:",
        userId
      );

      // Get all users except the current user
      const usersSnapshot = await db
        .collection("users")
        .where("_id", "!=", userId)
        .get();

      if (usersSnapshot.empty) {
        console.log("getRecommendations - No other users found");
        return { recommendations: [] };
      }

      const recommendations = usersSnapshot.docs.map((doc) => ({
        _id: doc.id,
        ...doc.data(),
      }));

      console.log(
        "getRecommendations - Found recommendations:",
        recommendations.length
      );
      return { recommendations };
    } catch (error: any) {
      console.error("getRecommendations - Error:", error);
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }
      throw new functions.https.HttpsError(
        "internal",
        "Failed to get recommendations"
      );
    }
  }
);

/**
 * Helper function to check if a user can add more matches
 * @param userId User ID to check
 * @returns Promise<boolean> Whether user can add more matches
 */
async function canUserAddMatch(userId: string): Promise<boolean> {
  const userDoc = await db.collection("users").doc(userId).get();
  if (!userDoc.exists) return false;

  const userData = userDoc.data() as any;
  const currentMatches = userData?.currentMatches || [];

  // Premium users can have unlimited matches
  if (userData?.isPremium) return true;

  // Non-premium users can only have 1 match
  return currentMatches.length < 1;
}

/**
 * Helper function to count recent swipes for a user
 * @param userId User ID to count swipes for
 * @returns Promise<number> Number of swipes in last 24 hours
 */
async function countRecentSwipes(userId: string): Promise<number> {
  const twentyFourHoursAgo = new Date();
  twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

  const swipesSnapshot = await db
    .collection("swipes")
    .where("swiperId", "==", userId)
    .where("timestamp", ">=", twentyFourHoursAgo)
    .get();

  return swipesSnapshot.size;
}

export const recommendationFunctions = {
  getRecommendations,
};
