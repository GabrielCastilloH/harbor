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
    console.log("🔍 [DEBUG] getRecommendations function called");
    console.log("🔍 [DEBUG] Request auth:", request.auth?.uid);
    console.log("🔍 [DEBUG] Request data:", request.data);

    try {
      if (!request.auth) {
        console.log("❌ [DEBUG] getRecommendations - User not authenticated");
        throw new functions.https.HttpsError(
          "unauthenticated",
          "User must be authenticated"
        );
      }

      const userId = request.auth.uid;
      console.log(
        "🔍 [DEBUG] getRecommendations - User authenticated with UID:",
        userId
      );

      if (!userId) {
        console.log("❌ [DEBUG] getRecommendations - No userId provided");
        throw new functions.https.HttpsError(
          "invalid-argument",
          "User ID is required"
        );
      }

      console.log("🔍 [DEBUG] getRecommendations - About to fetch user data");

      // Get the current user's data
      const userDoc = await db.collection("users").doc(userId).get();
      if (!userDoc.exists) {
        console.log("❌ [DEBUG] getRecommendations - Current user not found");
        throw new functions.https.HttpsError("not-found", "User not found");
      }

      console.log(
        "✅ [DEBUG] getRecommendations - Current user data retrieved"
      );

      // Get all other users
      const allUsersSnapshot = await db.collection("users").get();
      const allUsers = allUsersSnapshot.docs.map((doc) => ({
        uid: doc.id,
        ...doc.data(),
      }));

      console.log(
        "✅ [DEBUG] getRecommendations - All users fetched, count:",
        allUsers.length
      );

      // Filter out the current user and users they've already swiped on
      const otherUsers = allUsers.filter((user) => user.uid !== userId);
      console.log(
        "🔍 [DEBUG] getRecommendations - Other users count:",
        otherUsers.length
      );

      // Get swipes by the current user
      const swipesSnapshot = await db
        .collection("swipes")
        .where("swiperId", "==", userId)
        .get();

      const swipedUserIds = swipesSnapshot.docs.map(
        (doc) => doc.data().swipedId
      );

      console.log(
        "✅ [DEBUG] getRecommendations - Swipes fetched, count:",
        swipedUserIds.length
      );

      // Filter out users the current user has already swiped on
      const availableUsers = otherUsers.filter(
        (user) => !swipedUserIds.includes(user.uid)
      );

      console.log(
        "🔍 [DEBUG] getRecommendations - Available users count:",
        availableUsers.length
      );

      // Get all active matches to filter out users who are already matched
      const activeMatchesSnapshot = await db
        .collection("matches")
        .where("isActive", "==", true)
        .get();

      const matchedUserIds = new Set<string>();

      activeMatchesSnapshot.docs.forEach((doc) => {
        const matchData = doc.data();
        if (matchData.user1Id && matchData.user2Id) {
          matchedUserIds.add(matchData.user1Id);
          matchedUserIds.add(matchData.user2Id);
        }
      });

      console.log(
        "✅ [DEBUG] getRecommendations - Active matches fetched, count:",
        matchedUserIds.size
      );

      // Filter out users who are already in active matches
      const trulyAvailableUsers = availableUsers.filter(
        (user) => !matchedUserIds.has(user.uid)
      );

      console.log(
        "🔍 [DEBUG] getRecommendations - Truly available users count:",
        trulyAvailableUsers.length
      );

      if (trulyAvailableUsers.length === 0) {
        console.log("⚠️ [DEBUG] getRecommendations - No other users found");
        return { recommendations: [] };
      }

      console.log(
        "✅ [DEBUG] getRecommendations - Returning recommendations, count:",
        trulyAvailableUsers.length
      );

      return { recommendations: trulyAvailableUsers };
    } catch (error: any) {
      console.error("❌ [DEBUG] Error getting recommendations:", error);
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
