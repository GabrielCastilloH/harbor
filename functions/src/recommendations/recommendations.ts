import * as functions from "firebase-functions/v2";
import * as admin from "firebase-admin";
import { CallableRequest } from "firebase-functions/v2/https";

async function logToNtfy(msg: string) {
  try {
    await fetch("https://ntfy.sh/harbor-debug-randomr", {
      method: "POST",
      body: `[${new Date().toISOString()}] ${msg}`,
    });
  } catch (error) {
    console.error("Failed to log to ntfy:", error);
  }
}

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
      await logToNtfy(
        "getRecommendations function called with: " +
          JSON.stringify(request.data)
      );
      await logToNtfy(
        "getRecommendations - request.auth: " + JSON.stringify(request.auth)
      );
      await logToNtfy(
        "getRecommendations - request.data: " + JSON.stringify(request.data)
      );
      await logToNtfy(
        "getRecommendations - request.data type: " + typeof request.data
      );
      await logToNtfy(
        "getRecommendations - request.data is null: " + (request.data === null)
      );
      await logToNtfy(
        "getRecommendations - request.data is undefined: " +
          (request.data === undefined)
      );

      if (!request.auth) {
        await logToNtfy("getRecommendations - User not authenticated");
        throw new functions.https.HttpsError(
          "unauthenticated",
          "User must be authenticated"
        );
      }

      await logToNtfy(
        "getRecommendations - About to destructure userId from request.data"
      );
      const { userId } = request.data;
      await logToNtfy("getRecommendations - Extracted userId: " + userId);
      await logToNtfy("getRecommendations - userId type: " + typeof userId);
      await logToNtfy(
        "getRecommendations - userId length: " + (userId?.length || 0)
      );
      await logToNtfy(
        "getRecommendations - userId is null: " + (userId === null)
      );
      await logToNtfy(
        "getRecommendations - userId is undefined: " + (userId === undefined)
      );
      await logToNtfy(
        "getRecommendations - userId is empty string: " + (userId === "")
      );
      await logToNtfy(
        "getRecommendations - Full request.data: " +
          JSON.stringify(request.data)
      );

      if (!userId) {
        await logToNtfy("getRecommendations - No userId provided");
        await logToNtfy(
          "getRecommendations - request.data keys: " +
            Object.keys(request.data || {}).join(", ")
        );
        await logToNtfy(
          "getRecommendations - request.data values: " +
            JSON.stringify(Object.values(request.data || {}))
        );
        await logToNtfy(
          "getRecommendations - request.data stringified: " +
            JSON.stringify(request.data)
        );
        throw new functions.https.HttpsError(
          "invalid-argument",
          "User ID is required"
        );
      }

      await logToNtfy(
        "getRecommendations - Getting recommendations for user: " + userId
      );

      // Get all users except the current user
      // Try to find current user first to determine if we're using email or UID
      await logToNtfy(
        `getRecommendations - Looking for current user: ${userId}`
      );
      const currentUserDoc = await db.collection("users").doc(userId).get();
      const currentUserByUid = await db
        .collection("users")
        .where("uid", "==", userId)
        .limit(1)
        .get();

      let usersSnapshot;
      if (currentUserDoc.exists) {
        // User found by email, exclude by email
        await logToNtfy(
          `getRecommendations - User found by email, excluding by email: ${userId}`
        );
        usersSnapshot = await db
          .collection("users")
          .where("_id", "!=", userId)
          .get();
      } else if (!currentUserByUid.empty) {
        // User found by UID, exclude by UID
        await logToNtfy(
          `getRecommendations - User found by UID, excluding by UID: ${userId}`
        );
        usersSnapshot = await db
          .collection("users")
          .where("uid", "!=", userId)
          .get();
      } else {
        // User not found, return empty recommendations
        await logToNtfy(
          `getRecommendations - Current user not found: ${userId}`
        );
        return { recommendations: [] };
      }

      if (usersSnapshot.empty) {
        await logToNtfy("getRecommendations - No other users found");
        return { recommendations: [] };
      }

      const recommendations = usersSnapshot.docs.map((doc) => ({
        _id: doc.id,
        ...doc.data(),
      }));

      await logToNtfy(
        "getRecommendations - Found recommendations: " + recommendations.length
      );
      return { recommendations };
    } catch (error: any) {
      await logToNtfy("getRecommendations - Error: " + error);
      await logToNtfy("getRecommendations - Error message: " + error.message);
      await logToNtfy("getRecommendations - Error code: " + error.code);
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
