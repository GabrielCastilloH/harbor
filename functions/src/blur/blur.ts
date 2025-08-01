import * as functions from "firebase-functions/v2";
import * as admin from "firebase-admin";
import { CallableRequest } from "firebase-functions/v2/https";

const db = admin.firestore();

/**
 * Updates blur level for a match based on message count
 */
export const updateBlurLevelForMessage = functions.https.onCall(
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
  async (
    request: CallableRequest<{ userId: string; matchedUserId: string }>
  ) => {
    try {
      if (!request.auth) {
        throw new functions.https.HttpsError(
          "unauthenticated",
          "User must be authenticated"
        );
      }

      const { userId, matchedUserId } = request.data;

      if (!userId || !matchedUserId) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "User ID and matched user ID are required"
        );
      }

      // Find the match between these users
      const match = await findMatchByUsers(userId, matchedUserId);

      if (!match) {
        throw new functions.https.HttpsError("not-found", "Match not found");
      }

      const matchData = match as any;
      const messageCount = matchData.messageCount || 0;
      const blurPercentage = matchData.blurPercentage || 100;
      const warningShown = matchData.warningShown || false;

      // Calculate new blur level based on message count
      let newBlurPercentage = blurPercentage;
      let shouldShowWarning = false;
      let hasShownWarning = warningShown;

      if (messageCount >= 10 && blurPercentage > 0) {
        newBlurPercentage = Math.max(0, blurPercentage - 20);
        shouldShowWarning = true;
        hasShownWarning = true;
      } else if (messageCount >= 20 && blurPercentage > 0) {
        newBlurPercentage = Math.max(0, blurPercentage - 20);
        shouldShowWarning = true;
        hasShownWarning = true;
      } else if (messageCount >= 30 && blurPercentage > 0) {
        newBlurPercentage = 0; // Fully unblurred
        shouldShowWarning = true;
        hasShownWarning = true;
      }

      // Update the match with new blur level
      await db.collection("matches").doc(match.id).update({
        blurPercentage: newBlurPercentage,
        warningShown: hasShownWarning,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return {
        blurPercentage: newBlurPercentage,
        shouldShowWarning,
        hasShownWarning,
        messageCount,
      };
    } catch (error: any) {
      console.error("Error updating blur level:", error);

      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      throw new functions.https.HttpsError(
        "internal",
        "Failed to update blur level"
      );
    }
  }
);

/**
 * Handles user response to blur warning
 */
export const handleWarningResponse = functions.https.onCall(
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
  async (
    request: CallableRequest<{
      matchId: string;
      userId: string;
      agreed: boolean;
    }>
  ) => {
    try {
      if (!request.auth) {
        throw new functions.https.HttpsError(
          "unauthenticated",
          "User must be authenticated"
        );
      }

      const { matchId, userId, agreed } = request.data;

      if (!matchId || !userId || agreed === undefined) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Match ID, user ID, and agreed status are required"
        );
      }

      const matchDoc = await db.collection("matches").doc(matchId).get();
      if (!matchDoc.exists) {
        throw new functions.https.HttpsError("not-found", "Match not found");
      }

      const matchData = matchDoc.data() as any;
      const user1Id = matchData.user1Id;
      const user2Id = matchData.user2Id;

      // Determine which user this is and update their agreement status
      let updateData: any = {};

      if (userId === user1Id) {
        updateData.user1Agreed = agreed;
      } else if (userId === user2Id) {
        updateData.user2Agreed = agreed;
      } else {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "User is not part of this match"
        );
      }

      updateData.updatedAt = admin.firestore.FieldValue.serverTimestamp();

      await db.collection("matches").doc(matchId).update(updateData);

      return {
        message: "Warning response recorded successfully",
      };
    } catch (error: any) {
      console.error("Error handling warning response:", error);

      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      throw new functions.https.HttpsError(
        "internal",
        "Failed to handle warning response"
      );
    }
  }
);

/**
 * Gets blur level for a match
 */
export const getBlurLevel = functions.https.onCall(
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
  async (
    request: CallableRequest<{ userId: string; matchedUserId: string }>
  ) => {
    try {
      if (!request.auth) {
        throw new functions.https.HttpsError(
          "unauthenticated",
          "User must be authenticated"
        );
      }

      const { userId, matchedUserId } = request.data;

      if (!userId || !matchedUserId) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "User ID and matched user ID are required"
        );
      }

      // Find the match between these users
      const match = await findMatchByUsers(userId, matchedUserId);

      if (!match) {
        throw new functions.https.HttpsError("not-found", "Match not found");
      }

      const matchData = match as any;

      return {
        blurPercentage: matchData.blurPercentage || 100,
        hasShownWarning: matchData.warningShown || false,
        messageCount: matchData.messageCount || 0,
      };
    } catch (error: any) {
      console.error("Error getting blur level:", error);

      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      throw new functions.https.HttpsError(
        "internal",
        "Failed to get blur level"
      );
    }
  }
);

/**
 * Helper function to find a match between two users
 * @param user1Id First user ID
 * @param user2Id Second user ID
 * @returns Promise<any> Match document or null
 */
async function findMatchByUsers(user1Id: string, user2Id: string) {
  // Check both possible combinations
  const match1 = await db
    .collection("matches")
    .where("user1Id", "==", user1Id)
    .where("user2Id", "==", user2Id)
    .where("isActive", "==", true)
    .limit(1)
    .get();

  if (!match1.empty) {
    return { id: match1.docs[0].id, ...match1.docs[0].data() };
  }

  const match2 = await db
    .collection("matches")
    .where("user1Id", "==", user2Id)
    .where("user2Id", "==", user1Id)
    .where("isActive", "==", true)
    .limit(1)
    .get();

  if (!match2.empty) {
    return { id: match2.docs[0].id, ...match2.docs[0].data() };
  }

  return null;
}

export const blurFunctions = {
  updateBlurLevelForMessage,
  handleWarningResponse,
  getBlurLevel,
};
