import * as functions from "firebase-functions/v2";
import * as admin from "firebase-admin";
import { CallableRequest } from "firebase-functions/v2/https";

const db = admin.firestore();

/**
 * Creates a match between two users
 */
export const createMatch = functions.https.onCall(
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
  async (request: CallableRequest<{ user1Id: string; user2Id: string }>) => {
    try {
      if (!request.auth) {
        throw new functions.https.HttpsError(
          "unauthenticated",
          "User must be authenticated"
        );
      }

      const { user1Id, user2Id } = request.data;

      if (!user1Id || !user2Id) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Both user IDs are required"
        );
      }

      console.log("Creating match for users:", { user1Id, user2Id });

      // Check if users exist
      const [user1Doc, user2Doc] = await Promise.all([
        db.collection("users").doc(user1Id).get(),
        db.collection("users").doc(user2Id).get(),
      ]);

      if (!user1Doc.exists || !user2Doc.exists) {
        throw new functions.https.HttpsError(
          "not-found",
          "One or both users not found"
        );
      }

      const user1 = user1Doc.data();
      const user2 = user2Doc.data();

      console.log("Current matches for users:", {
        user1Matches: user1?.currentMatches || [],
        user2Matches: user2?.currentMatches || [],
      });

      // Check if a match already exists between these users
      const existingMatch = await findMatchByUsers(user1Id, user2Id);

      if (existingMatch) {
        console.log("Match already exists, returning existing match");
        return {
          message: "Match already exists",
          matchId: existingMatch.id,
        };
      }

      // Check if users can add new matches
      const [canUser1Match, canUser2Match] = await Promise.all([
        canAddMatch(user1Id),
        canAddMatch(user2Id),
      ]);

      if (!canUser1Match || !canUser2Match) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "One or both users cannot add more matches"
        );
      }

      // Create the match
      const matchData = {
        user1Id,
        user2Id,
        messageCount: 0,
        matchDate: admin.firestore.FieldValue.serverTimestamp(),
        isActive: true,
        blurPercentage: 100,
        warningShown: false,
        user1Agreed: false,
        user2Agreed: false,
      };

      const matchRef = await db.collection("matches").add(matchData);

      // Update both users' currentMatches arrays
      await Promise.all([
        db
          .collection("users")
          .doc(user1Id)
          .update({
            currentMatches: admin.firestore.FieldValue.arrayUnion(matchRef.id),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          }),
        db
          .collection("users")
          .doc(user2Id)
          .update({
            currentMatches: admin.firestore.FieldValue.arrayUnion(matchRef.id),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          }),
      ]);

      return {
        message: "Match created successfully",
        matchId: matchRef.id,
      };
    } catch (error: any) {
      console.error("Error creating match:", error);

      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      throw new functions.https.HttpsError(
        "internal",
        "Failed to create match"
      );
    }
  }
);

/**
 * Gets active matches for a user
 */
export const getActiveMatches = functions.https.onCall(
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
  async (request: CallableRequest<{ id: string }>) => {
    try {
      if (!request.auth) {
        throw new functions.https.HttpsError(
          "unauthenticated",
          "User must be authenticated"
        );
      }

      const { id } = request.data;

      if (!id) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "User ID is required"
        );
      }

      // Get user's current matches
      const userDoc = await db.collection("users").doc(id).get();
      if (!userDoc.exists) {
        throw new functions.https.HttpsError("not-found", "User not found");
      }

      const userData = userDoc.data();
      const currentMatches = userData?.currentMatches || [];

      if (currentMatches.length === 0) {
        return { matches: [] };
      }

      // Get the actual match documents
      const matchDocs = await Promise.all(
        currentMatches.map((matchId: string) =>
          db.collection("matches").doc(matchId).get()
        )
      );

      const matches = matchDocs
        .filter((doc) => doc.exists)
        .map((doc) => ({
          _id: doc.id,
          ...doc.data(),
        }))
        .filter((match) => match.isActive);

      return { matches };
    } catch (error: any) {
      console.error("Error getting active matches:", error);

      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      throw new functions.https.HttpsError(
        "internal",
        "Failed to get active matches"
      );
    }
  }
);

/**
 * Unmatches two users
 */
export const unmatchUsers = functions.https.onCall(
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
  async (request: CallableRequest<{ user1Id: string; user2Id: string }>) => {
    try {
      if (!request.auth) {
        throw new functions.https.HttpsError(
          "unauthenticated",
          "User must be authenticated"
        );
      }

      const { user1Id, user2Id } = request.data;

      if (!user1Id || !user2Id) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Both user IDs are required"
        );
      }

      // Find the match between these users
      const match = await findMatchByUsers(user1Id, user2Id);

      if (!match) {
        throw new functions.https.HttpsError("not-found", "Match not found");
      }

      // Deactivate the match
      await db.collection("matches").doc(match.id).update({
        isActive: false,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Remove match from both users' currentMatches arrays
      await Promise.all([
        db
          .collection("users")
          .doc(user1Id)
          .update({
            currentMatches: admin.firestore.FieldValue.arrayRemove(match.id),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          }),
        db
          .collection("users")
          .doc(user2Id)
          .update({
            currentMatches: admin.firestore.FieldValue.arrayRemove(match.id),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          }),
      ]);

      return {
        message: "Users unmatched successfully",
        matchId: match.id,
      };
    } catch (error: any) {
      console.error("Error unmatching users:", error);

      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      throw new functions.https.HttpsError(
        "internal",
        "Failed to unmatch users"
      );
    }
  }
);

/**
 * Updates match channel ID
 */
export const updateMatchChannel = functions.https.onCall(
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
  async (request: CallableRequest<{ matchId: string; channelId: string }>) => {
    try {
      if (!request.auth) {
        throw new functions.https.HttpsError(
          "unauthenticated",
          "User must be authenticated"
        );
      }

      const { matchId, channelId } = request.data;

      if (!matchId || !channelId) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Match ID and channel ID are required"
        );
      }

      await db.collection("matches").doc(matchId).update({
        channelId,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return {
        message: "Match channel updated successfully",
      };
    } catch (error: any) {
      console.error("Error updating match channel:", error);

      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      throw new functions.https.HttpsError(
        "internal",
        "Failed to update match channel"
      );
    }
  }
);

/**
 * Increments message count for a match
 */
export const incrementMatchMessages = functions.https.onCall(
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
  async (request: CallableRequest<{ matchId: string }>) => {
    try {
      if (!request.auth) {
        throw new functions.https.HttpsError(
          "unauthenticated",
          "User must be authenticated"
        );
      }

      const { matchId } = request.data;

      if (!matchId) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Match ID is required"
        );
      }

      await db
        .collection("matches")
        .doc(matchId)
        .update({
          messageCount: admin.firestore.FieldValue.increment(1),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

      return {
        message: "Message count incremented successfully",
      };
    } catch (error: any) {
      console.error("Error incrementing message count:", error);

      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      throw new functions.https.HttpsError(
        "internal",
        "Failed to increment message count"
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

/**
 * Helper function to check if a user can add more matches
 * @param userId User ID to check
 * @returns Promise<boolean> Whether user can add more matches
 */
async function canAddMatch(userId: string): Promise<boolean> {
  const userDoc = await db.collection("users").doc(userId).get();
  if (!userDoc.exists) return false;

  const userData = userDoc.data();
  const currentMatches = userData?.currentMatches || [];

  // Premium users can have unlimited matches
  if (userData?.isPremium) return true;

  // Non-premium users can only have 1 match
  return currentMatches.length < 1;
}

export const matchFunctions = {
  createMatch,
  getActiveMatches,
  unmatchUsers,
  updateMatchChannel,
  incrementMatchMessages,
};
