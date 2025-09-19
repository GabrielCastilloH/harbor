import * as functions from "firebase-functions/v2";
import * as admin from "firebase-admin";
import { CallableRequest } from "firebase-functions/v2/https";

const db = admin.firestore();

/**
 * Helper function to check if a group can be formed based on swipes
 */
async function checkForGroupFormation(
  swiperId: string,
  swipedId: string,
  groupSize: number
): Promise<{ canFormGroup: boolean; memberIds: string[] }> {
  if (groupSize === 2) {
    // For group size 2, use the existing individual matching logic
    return { canFormGroup: false, memberIds: [] };
  }

  // Get all users with the same group size preference
  const usersWithSameGroupSize = await db
    .collection("users")
    .where("groupSize", "==", groupSize)
    .where("isActive", "!=", false)
    .get();

  const candidateUserIds = usersWithSameGroupSize.docs
    .map((doc) => doc.id)
    .filter((id) => id !== swiperId && id !== swipedId);

  // Get all right swipes involving the swiper and swiped user
  const swiperSwipes = await db
    .collection("swipes")
    .where("swiperId", "==", swiperId)
    .where("direction", "==", "right")
    .get();

  const swipedSwipes = await db
    .collection("swipes")
    .where("swiperId", "==", swipedId)
    .where("direction", "==", "right")
    .get();

  // Create sets of who each user has swiped right on
  const swiperLikes = new Set(
    swiperSwipes.docs.map((doc) => doc.data().swipedId)
  );
  const swipedLikes = new Set(
    swipedSwipes.docs.map((doc) => doc.data().swipedId)
  );

  // Check if swiper and swiped have mutual interest
  if (!swiperLikes.has(swipedId) || !swipedLikes.has(swiperId)) {
    return { canFormGroup: false, memberIds: [] };
  }

  // For groups larger than 2, find other users who have swiped on enough members
  if (groupSize > 2) {
    const potentialMembers = [swiperId, swipedId];

    // Find additional members who have swiped on at least 2 of the current members
    for (const candidateId of candidateUserIds) {
      const candidateSwipes = await db
        .collection("swipes")
        .where("swiperId", "==", candidateId)
        .where("direction", "==", "right")
        .get();

      const candidateLikes = new Set(
        candidateSwipes.docs.map((doc) => doc.data().swipedId)
      );

      // Count how many current members this candidate has swiped on
      const mutualLikes = potentialMembers.filter((memberId) =>
        candidateLikes.has(memberId)
      );

      // Also check if current members have swiped on this candidate
      const reverseLikes = potentialMembers.filter((memberId) => {
        if (memberId === swiperId) return swiperLikes.has(candidateId);
        if (memberId === swipedId) return swipedLikes.has(candidateId);
        return false;
      });

      // For a group of 3, we need at least 2 mutual connections
      // For a group of 4, we need at least 2 mutual connections
      const minConnections = Math.max(2, Math.floor(groupSize / 2));

      if (
        mutualLikes.length >= minConnections &&
        reverseLikes.length >= minConnections
      ) {
        potentialMembers.push(candidateId);

        if (potentialMembers.length === groupSize) {
          return { canFormGroup: true, memberIds: potentialMembers };
        }
      }
    }
  }

  return { canFormGroup: false, memberIds: [] };
}

// A single constant that tracks the max swipes per day for all users.
// We've forgotten about the 'isPremium' thing for now.
const MAX_SWIPES_PER_DAY = 5;

/**
 * Records a swipe and checks for matches
 */
export const createSwipe = functions.https.onCall(
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
      swiperId: string;
      swipedId: string;
      direction: "left" | "right";
    }>
  ) => {
    try {
      if (!request.auth) {
        throw new functions.https.HttpsError(
          "unauthenticated",
          "User must be authenticated"
        );
      }

      const { swiperId, swipedId, direction } = request.data;

      if (!swiperId || !swipedId || !direction) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Swiper ID, swiped ID, and direction are required"
        );
      }

      const result = await db.runTransaction(async (transaction) => {
        const swiperUserRef = db.collection("users").doc(swiperId);
        const swipedUserRef = db.collection("users").doc(swipedId);
        const [swiperUserDoc, swipedUserDoc] = await transaction.getAll(
          swiperUserRef,
          swipedUserRef
        );

        if (!swiperUserDoc.exists || !swipedUserDoc.exists) {
          throw new functions.https.HttpsError(
            "not-found",
            "Swiper or swiped user not found"
          );
        }

        const swiperUser = swiperUserDoc.data();

        // 1. Check for swipe limits based on the unified system
        const today = new Date().toISOString().split("T")[0];
        let swipesToday = swiperUser?.swipesToday ?? 0;
        const resetDate = swiperUser?.resetDate ?? today;

        if (resetDate !== today) {
          swipesToday = 0;
        }

        if (swipesToday >= MAX_SWIPES_PER_DAY) {
          throw new functions.https.HttpsError(
            "resource-exhausted",
            "Daily swipe limit reached"
          );
        }

        // 2. Check if users have unmatched before
        const unmatchedCheck = await db
          .collection("matches")
          .where("user1Id", "in", [swiperId, swipedId])
          .where("user2Id", "in", [swiperId, swipedId])
          .where("isActive", "==", false)
          .limit(1)
          .get();

        if (!unmatchedCheck.empty) {
          // This part of the code could be simplified, but we'll leave it for now.
          // It's not directly related to the swipe limit change.
          return {
            message: "Users have unmatched before, cannot match again",
            swipe: null,
            match: false,
          };
        }

        // 3. Check if users can match by looking at their actual active matches
        const [
          swiperActiveMatches1,
          swiperActiveMatches2,
          swipedActiveMatches1,
          swipedActiveMatches2,
        ] = await Promise.all([
          db
            .collection("matches")
            .where("user1Id", "==", swiperId)
            .where("isActive", "==", true)
            .get(),
          db
            .collection("matches")
            .where("user2Id", "==", swiperId)
            .where("isActive", "==", true)
            .get(),
          db
            .collection("matches")
            .where("user1Id", "==", swipedId)
            .where("isActive", "==", true)
            .get(),
          db
            .collection("matches")
            .where("user2Id", "==", swipedId)
            .where("isActive", "==", true)
            .get(),
        ]);

        const swiperMatches = [
          ...swiperActiveMatches1.docs,
          ...swiperActiveMatches2.docs,
        ];
        const swipedMatches = [
          ...swipedActiveMatches1.docs,
          ...swipedActiveMatches2.docs,
        ];

        // Since we're forgetting about premium for now, these checks are not strictly necessary,
        // but we'll leave them in case you want to use them later.
        if (swiperMatches.length >= 1) {
          throw new functions.https.HttpsError(
            "permission-denied",
            "Users cannot swipe while they have an active match"
          );
        }
        if (swipedMatches.length >= 1) {
          throw new functions.https.HttpsError(
            "permission-denied",
            "Cannot swipe on users who have active matches"
          );
        }

        // 4. Check if swipe already exists
        const existingSwipe = await db
          .collection("swipes")
          .where("swiperId", "==", swiperId)
          .where("swipedId", "==", swipedId)
          .where("direction", "==", direction)
          .limit(1)
          .get();

        if (!existingSwipe.empty) {
          return {
            message: "Swipe already exists",
            swipe: existingSwipe.docs[0].data(),
            match: false,
          };
        }

        const swipeData = {
          swiperId,
          swipedId,
          direction,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
        };

        // 5. Check for mutual swipe and create a match if it exists
        let match = false;
        let matchId = null;
        let isGroupMatch = false;

        if (direction === "right") {
          // Get the group size preference of the swiper
          const swiperGroupSize = swiperUser?.groupSize || 2;

          // Check if we can form a group match
          const groupFormation = await checkForGroupFormation(
            swiperId,
            swipedId,
            swiperGroupSize
          );

          if (
            groupFormation.canFormGroup &&
            groupFormation.memberIds.length > 2
          ) {
            // Create a group match
            match = true;
            const matchRef = db.collection("matches").doc();
            matchId = matchRef.id;
            isGroupMatch = true;

            const matchData = {
              type: "group",
              memberIds: groupFormation.memberIds,
              groupSize: swiperGroupSize,
              matchDate: admin.firestore.FieldValue.serverTimestamp(),
              isActive: true,
              messageCount: 0,
              // Track consent for each member
              memberConsent: groupFormation.memberIds.reduce((acc, id) => {
                acc[id] = false;
                return acc;
              }, {} as Record<string, boolean>),
              // Track view status for each member
              memberViewed: groupFormation.memberIds.reduce((acc, id) => {
                acc[id] = id === swiperId; // Only the swiper has viewed it initially
                return acc;
              }, {} as Record<string, boolean>),
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            };

            transaction.set(matchRef, matchData);

            // Update all member users to include this match in their currentMatches
            for (const memberId of groupFormation.memberIds) {
              const memberRef = db.collection("users").doc(memberId);
              transaction.update(memberRef, {
                currentMatches: admin.firestore.FieldValue.arrayUnion(matchId),
              });
            }
          } else {
            // Check for traditional individual match (group size 2 or no group formation possible)
            const mutualSwipe = await db
              .collection("swipes")
              .where("swiperId", "==", swipedId)
              .where("swipedId", "==", swiperId)
              .where("direction", "==", "right")
              .limit(1)
              .get();

            if (!mutualSwipe.empty) {
              match = true;
              const matchRef = db.collection("matches").doc();
              matchId = matchRef.id;

              const matchData = {
                type: "individual",
                user1Id: swiperId,
                user2Id: swipedId,
                matchDate: admin.firestore.FieldValue.serverTimestamp(),
                isActive: true,
                messageCount: 0,
                user1Consented: false,
                user2Consented: false,
                // The user who swiped (swiperId) has now viewed the match
                user1Viewed: true,
                // The user who was swiped on (swipedId) has NOT yet viewed it
                user2Viewed: false,
                createdAt: admin.firestore.FieldValue.serverTimestamp(),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              };

              transaction.set(matchRef, matchData);
              transaction.update(swiperUserRef, {
                currentMatches: admin.firestore.FieldValue.arrayUnion(matchId),
              });
              transaction.update(swipedUserRef, {
                currentMatches: admin.firestore.FieldValue.arrayUnion(matchId),
              });
            }
          }
        }

        // 6. Record the swipe and update the swipe count
        const swipeRef = db.collection("swipes").doc();
        transaction.set(swipeRef, swipeData);
        transaction.update(swiperUserRef, {
          swipesToday: admin.firestore.FieldValue.increment(1),
          resetDate: today,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        return {
          message: "Swipe recorded",
          swipe: swipeData,
          match,
          matchId,
          isGroupMatch,
          groupSize: isGroupMatch ? swiperUser?.groupSize || 2 : 2,
        };
      });

      // Create chat channel after transaction if there's a match
      if (result.match && result.matchId) {
        try {
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

            // Create channel ID based on match type
            let channelId: string;
            let channelMembers: string[];

            if (result.isGroupMatch) {
              // For group matches, use match ID
              channelId = `group-${result.matchId}`;
              // Get member IDs from the match document
              const matchDoc = await db
                .collection("matches")
                .doc(result.matchId)
                .get();
              const matchData = matchDoc.data();
              channelMembers = matchData?.memberIds || [];
            } else {
              // For individual matches, use sorted user IDs
              channelId = [swiperId, swipedId].sort().join("-");
              channelMembers = [swiperId, swipedId];
            }

            // Create or get the channel
            const channel = serverClient.channel("messaging", channelId, {
              members: channelMembers,
              created_by_id: swiperId,
            });

            try {
              await channel.create();
            } catch (err: any) {
              if (err && err.code === 16) {
                // Channel already exists, just use it
                await channel.watch();
              } else {
                throw err;
              }
            }

            // Update channel with matchId
            try {
              await channel.update({
                // @ts-ignore - Adding custom field to channel data
                matchId: result.matchId,
              });

              // Send system message for new matches
              try {
                await channel.sendMessage({
                  text: "You've matched! Start chatting now.",
                  user_id: "system",
                });

                // Mark that intro message has been sent in the match document
                await db.collection("matches").doc(result.matchId).update({
                  introMessageSent: true,
                  updatedAt: admin.firestore.FieldValue.serverTimestamp(),
                });
              } catch (messageErr) {
                // Don't fail the channel creation if system message fails
              }
            } catch (updateErr) {
              // Don't fail the match creation if channel update fails
            }

            console.log(
              `✅ [SWIPES] Chat channel created successfully: ${channelId} (${
                result.isGroupMatch ? "group" : "individual"
              })`
            );
          } else {
            console.error("❌ [SWIPES] Missing Stream API credentials");
          }
        } catch (chatError) {
          console.error(
            "Backend Error: Failed to create chat channel:",
            chatError
          );
          // Don't throw here, as we still want the match to be created
        }
      }

      return result;
    } catch (error: any) {
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }
      throw new functions.https.HttpsError(
        "internal",
        "Failed to create swipe"
      );
    }
  }
);

/**
 * Counts a user's swipes from their user document.
 */
export const countRecentSwipes = functions.https.onCall(
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
      if (request.auth.uid !== id) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "User can only access their own swipe count"
        );
      }

      const userDoc = await db.collection("users").doc(id).get();
      if (!userDoc.exists) {
        throw new functions.https.HttpsError("not-found", "User not found");
      }

      const userData = userDoc.data();
      if (!userData) {
        throw new functions.https.HttpsError(
          "not-found",
          "User data not found"
        );
      }

      const today = new Date().toISOString().split("T")[0];
      const resetDate = userData.resetDate ?? today;
      let swipesToday = userData.swipesToday ?? 0;

      // Check if we need to reset the count for the day
      if (resetDate !== today) {
        swipesToday = 0;
      }

      return {
        swipeCount: swipesToday,
        dailyLimit: MAX_SWIPES_PER_DAY,
        canSwipe: swipesToday < MAX_SWIPES_PER_DAY,
      };
    } catch (error: any) {
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }
      throw new functions.https.HttpsError(
        "internal",
        "Failed to count recent swipes"
      );
    }
  }
);

/**
 * Gets all swipes by a user
 */
export const getSwipesByUser = functions.https.onCall(
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

      if (request.auth.uid !== userId) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "User can only access their own swipes"
        );
      }

      const swipesSnapshot = await db
        .collection("swipes")
        .where("swiperId", "==", userId)
        .orderBy("timestamp", "desc")
        .get();

      const swipes = swipesSnapshot.docs.map((doc) => ({
        id: doc.id,
        ...doc.data(),
      }));

      return { swipes };
    } catch (error: any) {
      console.error("Error getting swipes by user:", error);
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }
      throw new functions.https.HttpsError(
        "internal",
        "Failed to get swipes by user"
      );
    }
  }
);

/**
 * Saves the Expo push token to the user's Firestore document
 */
export const savePushToken = functions.https.onCall(
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
    request: CallableRequest<{ userId: string; expoPushToken: string }>
  ) => {
    try {
      if (!request.auth) {
        throw new functions.https.HttpsError(
          "unauthenticated",
          "User must be authenticated"
        );
      }

      const { userId, expoPushToken } = request.data;

      if (!userId || !expoPushToken) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "User ID and Expo push token are required"
        );
      }

      if (request.auth.uid !== userId) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "User can only update their own push token"
        );
      }

      await db.collection("users").doc(userId).update({
        expoPushToken,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return { message: "Push token saved successfully" };
    } catch (error: any) {
      console.error("Error saving push token:", error);
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }
      throw new functions.https.HttpsError(
        "internal",
        "Failed to save push token"
      );
    }
  }
);

export const swipeFunctions = {
  createSwipe,
  countRecentSwipes,
  getSwipesByUser,
  savePushToken,
};
