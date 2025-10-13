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
      const existingMatchesSnap = await db
        .collection("matches")
        .where("isActive", "==", true)
        .get();

      const existingMatchDoc = existingMatchesSnap.docs.find((doc) => {
        const data = doc.data() as any;
        return (
          (data.user1Id === user1Id && data.user2Id === user2Id) ||
          (data.user1Id === user2Id && data.user2Id === user1Id)
        );
      });

      if (existingMatchDoc) {
        const existingMatch = existingMatchDoc;
        return {
          message: "Match already exists",
          matchId: existingMatch.id,
          match: existingMatch.data(),
        };
      }

      // Create new match and update user availability in a transaction
      const matchRef = db.collection("matches").doc();
      const user1Ref = db.collection("users").doc(user1Id);
      const user2Ref = db.collection("users").doc(user2Id);

      const result = await db.runTransaction(async (transaction) => {
        // Create the match
        const matchData = {
          user1Id,
          user2Id,
          matchDate: admin.firestore.FieldValue.serverTimestamp(),
          isActive: true,
          messageCount: 0,
          user1Consented: false,
          user2Consented: false,
          user1Viewed: false,
          user2Viewed: false,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        } as any;

        transaction.set(matchRef, matchData);

        // Set both users as unavailable
        transaction.update(user1Ref, {
          isAvailable: false,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        transaction.update(user2Ref, {
          isAvailable: false,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        return { id: matchRef.id, ...matchData };
      });

      return {
        message: "Match created successfully",
        matchId: matchRef.id,
        match: result,
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
 * Gets unviewed matches for a user (for showing match modal on app open)
 */
export const getUnviewedMatches = functions.https.onCall(
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

      const { userId } = request.data;

      if (!userId) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "User ID is required"
        );
      }

      // SECURITY: Verify authenticated user is requesting their own matches
      if (request.auth.uid !== userId) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "User can only access their own unviewed matches"
        );
      }

      // Get unviewed matches for this user
      const allMatches = await db
        .collection("matches")
        .where("isActive", "==", true)
        .get();

      const unviewedMatches = allMatches.docs.filter((doc) => {
        const matchData = doc.data();
        const isParticipant =
          matchData.user1Id === userId || matchData.user2Id === userId;
        if (!isParticipant) return false;

        const hasViewed =
          matchData.user1Id === userId
            ? matchData.user1Viewed
            : matchData.user2Viewed;
        return hasViewed === false;
      });

      const matches = [] as any[];
      for (const doc of unviewedMatches) {
        const matchData = doc.data();

        const otherUserId =
          matchData.user1Id === userId ? matchData.user2Id : matchData.user1Id;
        const otherUserDoc = await db
          .collection("users")
          .doc(otherUserId)
          .get();

        if (otherUserDoc.exists) {
          // SECURITY: Filter out sensitive data (email and images) from matched profile
          const userData = otherUserDoc.data();
          if (userData) {
            const { images, email, ...userDataWithoutSensitiveInfo } = userData;
            matches.push({
              matchId: doc.id,
              match: matchData,
              matchedProfile: userDataWithoutSensitiveInfo,
            });
          }
        }
      }

      return { matches, count: matches.length };
    } catch (error: any) {
      console.error("Error getting unviewed matches:", error);
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }
      throw new functions.https.HttpsError(
        "internal",
        "Failed to get unviewed matches"
      );
    }
  }
);

/**
 * Marks a match as viewed by a user
 */
export const markMatchAsViewed = functions.https.onCall(
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
  async (request: CallableRequest<{ matchId: string; userId: string }>) => {
    try {
      if (!request.auth) {
        throw new functions.https.HttpsError(
          "unauthenticated",
          "User must be authenticated"
        );
      }

      const { matchId, userId } = request.data;

      if (!matchId || !userId) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Match ID and User ID are required"
        );
      }

      // SECURITY: Verify authenticated user is the one marking as viewed
      if (request.auth.uid !== userId) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "User can only mark their own matches as viewed"
        );
      }

      const matchRef = db.collection("matches").doc(matchId);
      const matchDoc = await matchRef.get();

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

      const isUser1 = matchData.user1Id === userId;
      const isUser2 = matchData.user2Id === userId;

      if (!isUser1 && !isUser2) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "User is not part of this match"
        );
      }

      const updateData: any = {
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      if (isUser1) {
        updateData.user1Viewed = true;
      } else {
        updateData.user2Viewed = true;
      }

      await matchRef.update(updateData);

      return { message: "Match marked as viewed", success: true };
    } catch (error: any) {
      console.error("Error marking match as viewed:", error);
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }
      throw new functions.https.HttpsError(
        "internal",
        "Failed to mark match as viewed"
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

      if (matchData.user1Id !== userId && matchData.user2Id !== userId) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "User not part of this match"
        );
      }

      await db.runTransaction(async (transaction) => {
        // Deactivate the match
        transaction.update(db.collection("matches").doc(matchId), {
          isActive: false,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        // Set both users as available again
        transaction.update(db.collection("users").doc(matchData.user1Id), {
          isAvailable: true,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
        transaction.update(db.collection("users").doc(matchData.user2Id), {
          isAvailable: true,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      });

      // Freeze chat and notify remains the same
      try {
        const { StreamChat } = await import("stream-chat");
        const { SecretManagerServiceClient } = await import(
          "@google-cloud/secret-manager"
        );

        const secretManager = new SecretManagerServiceClient();
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
          const otherId =
            matchData.user1Id === userId
              ? matchData.user2Id
              : matchData.user1Id;
          const channelId = [userId, otherId].sort().join("-");
          const channel = serverClient.channel("messaging", channelId);
          await channel.update({ frozen: true });
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
      }

      return { message: "Users unmatched successfully", matchId };
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

      // SECURITY: Verify authenticated user is part of the match
      const matchDoc = await db.collection("matches").doc(matchId).get();
      if (!matchDoc.exists) {
        throw new functions.https.HttpsError("not-found", "Match not found");
      }

      const matchData = matchDoc.data();
      if (
        matchData?.user1Id !== request.auth.uid &&
        matchData?.user2Id !== request.auth.uid
      ) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "User is not part of this match"
        );
      }

      await db.collection("matches").doc(matchId).update({
        channelId,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return { message: "Match channel updated successfully" };
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

      // SECURITY: Verify authenticated user is part of the match
      const matchDoc = await db.collection("matches").doc(matchId).get();
      if (!matchDoc.exists) {
        throw new functions.https.HttpsError("not-found", "Match not found");
      }

      const matchData = matchDoc.data();
      if (
        matchData?.user1Id !== request.auth.uid &&
        matchData?.user2Id !== request.auth.uid
      ) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "User is not part of this match"
        );
      }

      await db
        .collection("matches")
        .doc(matchId)
        .update({
          messageCount: admin.firestore.FieldValue.increment(1),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

      return { message: "Message count incremented successfully" };
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

      if (request.auth.uid !== userId1 && request.auth.uid !== userId2) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "User can only access their own matches"
        );
      }

      // Find existing match using user1Id and user2Id
      const allMatches = await db
        .collection("matches")
        .where("isActive", "==", true)
        .get();

      const foundDoc = allMatches.docs.find((doc) => {
        const data = doc.data() as any;
        return (
          (data.user1Id === userId1 && data.user2Id === userId2) ||
          (data.user1Id === userId2 && data.user2Id === userId1)
        );
      });

      if (foundDoc) {
        return { matchId: foundDoc.id };
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

      if (userId !== currentUserId) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "User can only update their own consent"
        );
      }

      const matchRef = db.collection("matches").doc(matchId);
      let bothConsented = false;
      let shouldSendMessage = false;

      await db.runTransaction(async (transaction) => {
        const matchDoc = await transaction.get(matchRef);

        if (!matchDoc.exists) {
          throw new functions.https.HttpsError("not-found", "Match not found");
        }

        const matchData = matchDoc.data() as any;

        const isUser1 = matchData.user1Id === userId;
        const isUser2 = matchData.user2Id === userId;

        if (!isUser1 && !isUser2) {
          throw new functions.https.HttpsError(
            "permission-denied",
            "User not part of this match"
          );
        }

        const updateData: any = {
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        if (isUser1) {
          updateData.user1Consented = consented;
          bothConsented = consented && matchData.user2Consented === true;
        } else {
          updateData.user2Consented = consented;
          bothConsented = consented && matchData.user1Consented === true;
        }

        const consentMessageSent = Boolean(matchData.consentMessageSent);

        transaction.update(matchRef, updateData);

        if (bothConsented && !consentMessageSent) {
          transaction.update(matchRef, { consentMessageSent: true });
          shouldSendMessage = true;
        }
      });

      if (shouldSendMessage) {
        try {
          // Get match data again for channel creation
          const matchDoc = await matchRef.get();
          const matchData = matchDoc.data() as any;

          const { StreamChat } = await import("stream-chat");
          const { SecretManagerServiceClient } = await import(
            "@google-cloud/secret-manager"
          );
          const secretManager = new SecretManagerServiceClient();
          const [streamApiKeyVersion, streamApiSecretVersion] =
            await Promise.all([
              secretManager.accessSecretVersion({
                name: "projects/harbor-ch/secrets/STREAM_API_KEY/versions/latest",
              }),
              secretManager.accessSecretVersion({
                name: "projects/harbor-ch/secrets/STREAM_API_SECRET/versions/latest",
              }),
            ]);

          const apiKey = streamApiKeyVersion[0].payload?.data?.toString() || "";
          const apiSecret =
            streamApiSecretVersion[0].payload?.data?.toString() || "";

          if (apiKey && apiSecret) {
            const serverClient = StreamChat.getInstance(apiKey, apiSecret);
            const channelId = [matchData.user1Id, matchData.user2Id]
              .sort()
              .join("-");
            const channel = serverClient.channel("messaging", channelId);
            await channel.sendMessage({
              text: "Both of you have decided to continue getting to know one another!",
              user_id: "system",
            });
          }
        } catch (streamErr) {
          console.error(
            "updateConsent: failed to send system message:",
            streamErr
          );
        }
      }

      return { success: true, bothConsented };
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

      const matchDoc = await db.collection("matches").doc(matchId).get();
      if (!matchDoc.exists) {
        throw new functions.https.HttpsError("not-found", "Match not found");
      }

      const matchData = matchDoc.data() as any;

      const isUser1 = matchData.user1Id === currentUserId;
      const isUser2 = matchData.user2Id === currentUserId;

      if (!isUser1 && !isUser2) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "User not part of this match"
        );
      }

      const user1Consented = matchData.user1Consented || false;
      const user2Consented = matchData.user2Consented || false;
      const bothConsented = user1Consented && user2Consented;
      const messageCount = matchData.messageCount || 0;

      const MESSAGE_THRESHOLD = 30;
      const shouldShowConsentScreen =
        messageCount >= MESSAGE_THRESHOLD && !bothConsented;

      const currentUserConsented = isUser1 ? user1Consented : user2Consented;
      const shouldShowConsentForUser =
        shouldShowConsentScreen && !currentUserConsented;

      const consentedCount =
        (user1Consented ? 1 : 0) + (user2Consented ? 1 : 0);
      const state = bothConsented
        ? "both_consented"
        : consentedCount > 0
        ? "one_consented"
        : "none_consented";

      return {
        user1Id: matchData.user1Id,
        user2Id: matchData.user2Id,
        user1Consented,
        user2Consented,
        bothConsented,
        messageCount,
        shouldShowConsentScreen,
        shouldShowConsentForUser,
        state,
        consent: {
          state,
          messageThreshold: MESSAGE_THRESHOLD,
          bothConsented,
          users: [
            {
              id: matchData.user1Id,
              hasConsented: user1Consented,
              shouldShow: shouldShowConsentScreen && !user1Consented,
            },
            {
              id: matchData.user2Id,
              hasConsented: user2Consented,
              shouldShow: shouldShowConsentScreen && !user2Consented,
            },
          ],
        },
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

export const matchFunctions = {
  createMatch,
  unmatchUsers,
  updateMatchChannel,
  getMatchId,
  updateConsent,
  getConsentStatus,
  getUnviewedMatches,
  markMatchAsViewed,
  incrementMatchMessages,
};
