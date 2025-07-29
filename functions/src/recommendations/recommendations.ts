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
      await logToNtfy("=== getRecommendations FUNCTION START ===");
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
      // Try to find current user first to determine if we're using UID or email (for backward compatibility)
      await logToNtfy(
        `getRecommendations - Looking for current user: ${userId}`
      );
      const currentUserDoc = await db.collection("users").doc(userId).get();
      const currentUserByEmail = await db
        .collection("users")
        .where("email", "==", userId)
        .limit(1)
        .get();

      let usersSnapshot;
      if (currentUserDoc.exists) {
        // User found by UID, exclude by UID
        await logToNtfy(
          `getRecommendations - User found by UID, excluding by UID: ${userId}`
        );
        usersSnapshot = await db
          .collection("users")
          .where("uid", "!=", userId)
          .get();
      } else if (!currentUserByEmail.empty) {
        // User found by email (backward compatibility), exclude by email
        await logToNtfy(
          `getRecommendations - User found by email, excluding by email: ${userId}`
        );
        usersSnapshot = await db
          .collection("users")
          .where("email", "!=", userId)
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
        ...doc.data(),
      }));

      await logToNtfy(
        "getRecommendations - Found recommendations: " + recommendations.length
      );
      await logToNtfy("=== getRecommendations FUNCTION SUCCESS ===");
      return { recommendations };
    } catch (error: any) {
      await logToNtfy("=== getRecommendations FUNCTION ERROR ===");
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

export const recommendationFunctions = {
  getRecommendations,
};
