import * as functions from "firebase-functions/v2";
import * as admin from "firebase-admin";
import { CallableRequest } from "firebase-functions/v2/https";

// Keep the logToNtfy function available for future use
// @ts-ignore
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
      if (!request.auth) {
        // await logToNtfy("getRecommendations - User not authenticated");
        throw new functions.https.HttpsError(
          "unauthenticated",
          "User must be authenticated"
        );
      }

      const userId = request.auth.uid;
      // await logToNtfy("getRecommendations - User authenticated with UID: " + userId);
      // await logToNtfy("getRecommendations - Extracted userId: " + userId);
      // await logToNtfy("getRecommendations - userId type: " + typeof userId);
      // await logToNtfy("getRecommendations - userId length: " + userId.length);

      if (!userId) {
        // await logToNtfy("getRecommendations - No userId provided");
        throw new functions.https.HttpsError(
          "invalid-argument",
          "User ID is required"
        );
      }

      // await logToNtfy("getRecommendations - About to fetch user data");
      // await logToNtfy("getRecommendations - About to query Firestore");

      // Get the current user's data
      const userDoc = await db.collection("users").doc(userId).get();
      if (!userDoc.exists) {
        // await logToNtfy("getRecommendations - Current user not found");
        throw new functions.https.HttpsError("not-found", "User not found");
      }

      // await logToNtfy("getRecommendations - Current user data retrieved");

      // Get all other users
      const allUsersSnapshot = await db.collection("users").get();
      const allUsers = allUsersSnapshot.docs.map((doc) => ({
        uid: doc.id,
        ...doc.data(),
      }));

      // await logToNtfy("getRecommendations - All users fetched");

      // Filter out the current user and users they've already swiped on
      const otherUsers = allUsers.filter((user) => user.uid !== userId);

      // await logToNtfy("getRecommendations - Filtered other users");

      // Get swipes by the current user
      const swipesSnapshot = await db
        .collection("swipes")
        .where("swiperId", "==", userId)
        .get();

      const swipedUserIds = swipesSnapshot.docs.map(
        (doc) => doc.data().swipedId
      );

      // await logToNtfy("getRecommendations - Swipes fetched");

      // Filter out users the current user has already swiped on
      const availableUsers = otherUsers.filter(
        (user) => !swipedUserIds.includes(user.uid)
      );

      // await logToNtfy("getRecommendations - Available users filtered");

      if (availableUsers.length === 0) {
        // await logToNtfy("getRecommendations - No other users found");
        return { recommendations: [] };
      }

      // For now, return all available users
      // In the future, you can implement more sophisticated recommendation logic
      // await logToNtfy("getRecommendations - Returning recommendations");
      // await logToNtfy("getRecommendations - Number of recommendations: " + availableUsers.length);

      return { recommendations: availableUsers };
    } catch (error: any) {
      // await logToNtfy("=== getRecommendations FUNCTION ERROR ===");
      // await logToNtfy("getRecommendations - Error: " + error);
      // await logToNtfy("getRecommendations - Error message: " + error.message);
      // await logToNtfy("getRecommendations - Error code: " + error.code);

      console.error("Error getting recommendations:", error);
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

export const recommendationsFunctions = {
  getRecommendations,
};
