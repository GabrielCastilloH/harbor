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

      // Check if match already exists using participantIds
      // Firestore does not support multiple array-contains on the same field,
      // so we use array-contains-any and filter the results in memory.
      const potentialMatchesSnap = await db
        .collection("matches")
        .where("participantIds", "array-contains-any", [user1Id, user2Id])
        .where("isActive", "==", true)
        .get();

      const existingMatchDoc = potentialMatchesSnap.docs.find((doc) => {
        const data = doc.data() as any;
        const participants = data.participantIds || [];
        return participants.includes(user1Id) && participants.includes(user2Id);
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
          type: "individual",
          participantIds: [user1Id, user2Id],
          matchDate: admin.firestore.FieldValue.serverTimestamp(),
          isActive: true,
          messageCount: 0,
          participantConsent: { [user1Id]: false, [user2Id]: false },
          participantViewed: { [user1Id]: false, [user2Id]: false },
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

      // Get unviewed matches using participantIds and participantViewed
      const unviewedMatches = await db
        .collection("matches")
        .where("isActive", "==", true)
        .where("participantIds", "array-contains", userId)
        .get();

      const allUnviewedMatches = unviewedMatches.docs.filter((doc) => {
        const matchData = doc.data();
        return matchData.participantViewed?.[userId] === false;
      });

      const matches = [] as any[];
      for (const doc of allUnviewedMatches) {
        const matchData = doc.data();

        const otherUserId = matchData.participantIds.find(
          (id: string) => id !== userId
        );
        const otherUserDoc = await db
          .collection("users")
          .doc(otherUserId)
          .get();

        if (otherUserDoc.exists) {
          matches.push({
            matchId: doc.id,
            match: matchData,
            matchedProfile: otherUserDoc.data(),
          });
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

      const matchRef = db.collection("matches").doc(matchId);
      const matchDoc = await matchRef.get();

      if (!matchDoc.exists) {
        throw new functions.https.HttpsError("not-found", "Match not found");
      }

      const matchData = matchDoc.data();
      const updateData: any = {};

      if (matchData?.participantIds?.includes(userId)) {
        updateData[`participantViewed.${userId}`] = true;
      } else {
        throw new functions.https.HttpsError(
          "permission-denied",
          "User is not part of this match"
        );
      }

      updateData.updatedAt = admin.firestore.FieldValue.serverTimestamp();

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

      if (!matchData.participantIds?.includes(userId)) {
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

        // Set all participants as available again
        for (const participantId of matchData.participantIds) {
          const userRef = db.collection("users").doc(participantId);
          transaction.update(userRef, {
            isAvailable: true,
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          });
        }
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
          const otherId = matchData.participantIds.find(
            (id: string) => id !== userId
          );
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

      // Find existing match using participantIds
      // Firestore limitation: cannot use two array-contains on the same field.
      // Use array-contains-any and filter in memory to ensure both users present.
      const possibleSnap = await db
        .collection("matches")
        .where("participantIds", "array-contains-any", [userId1, userId2])
        .where("isActive", "==", true)
        .get();

      const foundDoc = possibleSnap.docs.find((doc) => {
        const data = doc.data() as any;
        const participants = data.participantIds || [];
        return participants.includes(userId1) && participants.includes(userId2);
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

        if (!matchData.participantIds?.includes(userId)) {
          throw new functions.https.HttpsError(
            "permission-denied",
            "User not part of this match"
          );
        }

        const updateData: any = {
          [`participantConsent.${userId}`]: consented,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        // Check if all participants have consented
        const updatedConsent = {
          ...matchData.participantConsent,
          [userId]: consented,
        };
        bothConsented = matchData.participantIds.every(
          (id: string) => updatedConsent[id] === true
        );

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
            const channelId = matchData.participantIds.sort().join("-");
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

      if (!matchData.participantIds?.includes(currentUserId)) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "User not part of this match"
        );
      }

      const participantConsent = matchData.participantConsent || {};
      const bothConsented = matchData.participantIds.every(
        (id: string) => participantConsent[id] === true
      );
      const messageCount = matchData.messageCount || 0;

      const MESSAGE_THRESHOLD = 30;
      const shouldShowConsentScreen =
        messageCount >= MESSAGE_THRESHOLD && !bothConsented;

      const shouldShowConsentForUser =
        shouldShowConsentScreen && !participantConsent[currentUserId];

      const consentedCount = matchData.participantIds.filter(
        (id: string) => participantConsent[id] === true
      ).length;
      const state = bothConsented
        ? "both_consented"
        : consentedCount > 0
        ? "one_consented"
        : "none_consented";

      return {
        participantIds: matchData.participantIds,
        participantConsent,
        bothConsented,
        messageCount,
        shouldShowConsentScreen,
        shouldShowConsentForUser,
        state,
        consent: {
          state,
          messageThreshold: MESSAGE_THRESHOLD,
          bothConsented,
          users: matchData.participantIds.map((id: string) => ({
            id,
            hasConsented: participantConsent[id] === true,
            shouldShow: shouldShowConsentScreen && !participantConsent[id],
          })),
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
  unmatchUsers,
  updateMatchChannel,
  getMatchId,
  updateConsent,
  getConsentStatus,
  migrateMatchConsent,
  getUnviewedMatches,
  markMatchAsViewed,
};
