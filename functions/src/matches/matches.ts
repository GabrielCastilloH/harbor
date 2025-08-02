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

      // Check if match already exists
      const existingMatches = await db
        .collection("matches")
        .where("user1Id", "in", [user1Id, user2Id])
        .where("user2Id", "in", [user1Id, user2Id])
        .where("isActive", "==", true)
        .get();

      if (!existingMatches.empty) {
        const existingMatch = existingMatches.docs[0];
        return {
          message: "Match already exists",
          matchId: existingMatch.id,
          match: existingMatch.data(),
        };
      }

      // Create new match
      const matchData = {
        user1Id,
        user2Id,
        matchDate: admin.firestore.FieldValue.serverTimestamp(),
        isActive: true,
        messageCount: 0,
        user1Consented: false,
        user2Consented: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      const matchRef = await db.collection("matches").add(matchData);

      return {
        message: "Match created successfully",
        matchId: matchRef.id,
        match: { id: matchRef.id, ...matchData },
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
 * Unmatches two users and freezes their chat
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
  async (request: CallableRequest<{ userId: string; matchId: string }>) => {
    try {
      if (!request.auth) {
        throw new functions.https.HttpsError(
          "unauthenticated",
          "User must be authenticated"
        );
      }

      const { userId, matchId } = request.data;

      if (!userId || !matchId) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "User ID and match ID are required"
        );
      }

      // Get the match document
      const matchDoc = await db.collection("matches").doc(matchId).get();
      if (!matchDoc.exists) {
        throw new functions.https.HttpsError("not-found", "Match not found");
      }

      const matchData = matchDoc.data();
      if (!matchData) {
        throw new functions.https.HttpsError(
          "not-found",
          "Match data not found"
        );
      }

      // Verify the requesting user is part of this match
      if (userId !== matchData.user1Id && userId !== matchData.user2Id) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "User not part of this match"
        );
      }

      // Deactivate the match
      await db.collection("matches").doc(matchId).update({
        isActive: false,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      // Remove match from both users' currentMatches arrays
      await Promise.all([
        db
          .collection("users")
          .doc(matchData.user1Id)
          .update({
            currentMatches: admin.firestore.FieldValue.arrayRemove(matchId),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          }),
        db
          .collection("users")
          .doc(matchData.user2Id)
          .update({
            currentMatches: admin.firestore.FieldValue.arrayRemove(matchId),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          }),
      ]);

      // Freeze the chat channel and send system message
      try {
        const { StreamChat } = await import("stream-chat");
        const { SecretManagerServiceClient } = await import(
          "@google-cloud/secret-manager"
        );

        const secretManager = new SecretManagerServiceClient();

        // Get Stream API credentials from Secret Manager
        const [streamApiKeyVersion, streamApiSecretVersion] = await Promise.all(
          [
            secretManager.accessSecretVersion({
              name: "projects/harbor-ch/secrets/STREAM_API_KEY/versions/latest",
            }),
            secretManager.accessSecretVersion({
              name: "projects/harbor-ch/secrets/STREAM_API_SECRET/versions/latest",
            }),
          ]
        );

        const apiKey = streamApiKeyVersion[0].payload?.data?.toString() || "";
        const apiSecret =
          streamApiSecretVersion[0].payload?.data?.toString() || "";

        if (apiKey && apiSecret) {
          const serverClient = StreamChat.getInstance(apiKey, apiSecret);

          // Create channel ID (sorted to ensure consistency)
          const channelId = [matchData.user1Id, matchData.user2Id]
            .sort()
            .join("-");
          const channel = serverClient.channel("messaging", channelId);

          // Freeze the channel
          await channel.update({ frozen: true });

          // Send system message about unmatch
          await channel.sendMessage({
            text: "This chat has been frozen because one of the users unmatched.",
            user_id: "system",
          });
        }
      } catch (streamError) {
        console.error(
          "Error freezing chat or sending system message:",
          streamError
        );
        // Don't fail the unmatch operation if Stream Chat operations fail
      }

      return {
        message: "Users unmatched successfully",
        matchId: matchId,
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
 * Get match ID between two users
 */
export const getMatchId = functions.https.onCall(
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
  async (request: CallableRequest<{ userId1: string; userId2: string }>) => {
    try {
      if (!request.auth) {
        throw new functions.https.HttpsError(
          "unauthenticated",
          "User must be authenticated"
        );
      }

      const { userId1, userId2 } = request.data;

      if (!userId1 || !userId2) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Missing userId1 or userId2"
        );
      }

      // Verify the requesting user is one of the users in the match
      if (request.auth.uid !== userId1 && request.auth.uid !== userId2) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "User can only access their own matches"
        );
      }

      // Find the active match between these users
      const matchQuery = await db
        .collection("matches")
        .where("user1Id", "in", [userId1, userId2])
        .where("user2Id", "in", [userId1, userId2])
        .where("isActive", "==", true)
        .limit(1)
        .get();

      if (!matchQuery.empty) {
        return { matchId: matchQuery.docs[0].id };
      }

      return { matchId: null };
    } catch (error: any) {
      console.error("Error getting match ID:", error);
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }
      throw new functions.https.HttpsError(
        "internal",
        "Failed to get match ID"
      );
    }
  }
);

/**
 * Updates user's consent status for a match
 */
export const updateConsent = functions.https.onCall(
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
      consented: boolean;
    }>
  ) => {
    try {
      if (!request.auth) {
        throw new functions.https.HttpsError(
          "unauthenticated",
          "User must be authenticated"
        );
      }

      const { matchId, userId, consented } = request.data;
      const currentUserId = request.auth.uid;

      if (!matchId || !userId || consented === undefined) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Match ID, user ID, and consent status are required"
        );
      }

      // Verify the requesting user is updating their own consent
      if (userId !== currentUserId) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "User can only update their own consent"
        );
      }

      // Get the match document
      const matchDoc = await db.collection("matches").doc(matchId).get();
      if (!matchDoc.exists) {
        throw new functions.https.HttpsError("not-found", "Match not found");
      }

      const matchData = matchDoc.data();
      if (!matchData) {
        throw new functions.https.HttpsError(
          "not-found",
          "Match data not found"
        );
      }
      const user1Id = matchData.user1Id;
      const user2Id = matchData.user2Id;

      // Verify the user is part of this match
      if (userId !== user1Id && userId !== user2Id) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "User not part of this match"
        );
      }

      // Update the appropriate consent field
      const updateData: any = {};
      if (userId === user1Id) {
        updateData.user1Consented = consented;
      } else {
        updateData.user2Consented = consented;
      }

      await db
        .collection("matches")
        .doc(matchId)
        .update({
          ...updateData,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

      // Check if both users have consented
      const updatedMatchDoc = await db.collection("matches").doc(matchId).get();
      const updatedMatchData = updatedMatchDoc.data();
      if (!updatedMatchData) {
        throw new functions.https.HttpsError(
          "not-found",
          "Updated match data not found"
        );
      }
      const bothConsented =
        updatedMatchData.user1Consented && updatedMatchData.user2Consented;

      return {
        success: true,
        bothConsented,
      };
    } catch (error: any) {
      console.error("Error updating consent:", error);
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }
      throw new functions.https.HttpsError(
        "internal",
        "Failed to update consent"
      );
    }
  }
);

/**
 * Gets consent status for a match
 */
export const getConsentStatus = functions.https.onCall(
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
      const currentUserId = request.auth.uid;

      if (!matchId) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Match ID is required"
        );
      }

      // Get the match document
      const matchDoc = await db.collection("matches").doc(matchId).get();
      if (!matchDoc.exists) {
        throw new functions.https.HttpsError("not-found", "Match not found");
      }

      const matchData = matchDoc.data();
      if (!matchData) {
        throw new functions.https.HttpsError(
          "not-found",
          "Match data not found"
        );
      }
      const user1Id = matchData.user1Id;
      const user2Id = matchData.user2Id;

      // Verify the requesting user is part of this match
      if (currentUserId !== user1Id && currentUserId !== user2Id) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "User not part of this match"
        );
      }

      const user1Consented = matchData.user1Consented || false;
      const user2Consented = matchData.user2Consented || false;
      const bothConsented = user1Consented && user2Consented;
      const messageCount = matchData.messageCount || 0;

      // Check if consent screen should be shown (30 messages threshold)
      const shouldShowConsentScreen = messageCount >= 30 && !bothConsented;

      return {
        user1Id,
        user2Id,
        user1Consented,
        user2Consented,
        bothConsented,
        messageCount,
        shouldShowConsentScreen,
      };
    } catch (error: any) {
      console.error("Error getting consent status:", error);
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }
      throw new functions.https.HttpsError(
        "internal",
        "Failed to get consent status"
      );
    }
  }
);

/**
 * Migrates existing match documents to use new consent fields
 */
export const migrateMatchConsent = functions.https.onCall(
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

      // Get the match document
      const matchDoc = await db.collection("matches").doc(matchId).get();
      if (!matchDoc.exists) {
        throw new functions.https.HttpsError("not-found", "Match not found");
      }

      const matchData = matchDoc.data();
      if (!matchData) {
        throw new functions.https.HttpsError(
          "not-found",
          "Match data not found"
        );
      }

      // Check if migration is needed (has old fields)
      const needsMigration =
        matchData.hasOwnProperty("blurPercentage") ||
        matchData.hasOwnProperty("user1Agreed") ||
        matchData.hasOwnProperty("user2Agreed") ||
        matchData.hasOwnProperty("warningShown");

      if (!needsMigration) {
        return { message: "Match already uses new consent fields" };
      }

      // Migrate to new consent fields
      const updateData: any = {
        user1Consented: matchData.user1Agreed || false,
        user2Consented: matchData.user2Agreed || false,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      // Remove old fields
      updateData.blurPercentage = admin.firestore.FieldValue.delete();
      updateData.user1Agreed = admin.firestore.FieldValue.delete();
      updateData.user2Agreed = admin.firestore.FieldValue.delete();
      updateData.warningShown = admin.firestore.FieldValue.delete();

      await db.collection("matches").doc(matchId).update(updateData);

      return {
        message: "Match migrated successfully",
        oldFields: {
          blurPercentage: matchData.blurPercentage,
          user1Agreed: matchData.user1Agreed,
          user2Agreed: matchData.user2Agreed,
          warningShown: matchData.warningShown,
        },
        newFields: {
          user1Consented: updateData.user1Consented,
          user2Consented: updateData.user2Consented,
        },
      };
    } catch (error: any) {
      console.error("Error migrating match consent:", error);
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }
      throw new functions.https.HttpsError(
        "internal",
        "Failed to migrate match consent"
      );
    }
  }
);

export const matchFunctions = {
  createMatch,
  getActiveMatches,
  unmatchUsers,
  updateMatchChannel,
  getMatchId,
  updateConsent,
  getConsentStatus,
  migrateMatchConsent,
};
