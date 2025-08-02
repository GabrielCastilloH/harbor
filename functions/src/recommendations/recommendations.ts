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
        throw new functions.https.HttpsError(
          "unauthenticated",
          "User must be authenticated"
        );
      }

      const userId = request.auth.uid;

      if (!userId) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "User ID is required"
        );
      }

      // Get the current user's data
      const userDoc = await db.collection("users").doc(userId).get();
      if (!userDoc.exists) {
        throw new functions.https.HttpsError("not-found", "User not found");
      }

      // Get all other users
      const allUsersSnapshot = await db.collection("users").get();
      const allUsers = allUsersSnapshot.docs.map((doc) => ({
        uid: doc.id,
        ...doc.data(),
      }));

      // Filter out the current user and users they've already swiped on
      const otherUsers = allUsers.filter((user) => user.uid !== userId);

      // Get swipes by the current user
      const swipesSnapshot = await db
        .collection("swipes")
        .where("swiperId", "==", userId)
        .get();

      const swipedUserIds = swipesSnapshot.docs.map(
        (doc) => doc.data().swipedId
      );

      // Filter out users the current user has already swiped on
      const availableUsers = otherUsers.filter(
        (user) => !swipedUserIds.includes(user.uid)
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

      // Filter out users who are already in active matches
      const trulyAvailableUsers = availableUsers.filter(
        (user) => !matchedUserIds.has(user.uid)
      );

      if (trulyAvailableUsers.length === 0) {
        return { recommendations: [] };
      }

      return { recommendations: trulyAvailableUsers };
    } catch (error: any) {
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
