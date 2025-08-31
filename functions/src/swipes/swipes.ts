import * as functions from "firebase-functions/v2";
import * as admin from "firebase-admin";
import { CallableRequest } from "firebase-functions/v2/https";

const db = admin.firestore();
const DAILY_SWIPES = 100;

// Minimal ntfy logger for debugging
// @ts-ignore
async function logToNtfy(msg: string) {
  try {
    await fetch("https://ntfy.sh/harbor-debug-randomr", {
      method: "POST",
      body: msg,
    });
  } catch (error) {
    // Don't throw
  }
}

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
    // Generate unique request ID
    const requestId = `${Date.now()}-${Math.random()
      .toString(36)
      .substr(2, 9)}`;

    try {
      await logToNtfy(
        `[${requestId}] SWIPE START: ${JSON.stringify(request.data)}`
      );
      // Force new deployment
      if (!request.auth) {
        await logToNtfy(`[${requestId}] ERROR: User not authenticated`);
        throw new functions.https.HttpsError(
          "unauthenticated",
          "User must be authenticated"
        );
      }

      const { swiperId, swipedId, direction } = request.data;

      if (!swiperId || !swipedId || !direction) {
        await logToNtfy(`[${requestId}] ERROR: Missing required parameters`);
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Swiper ID, swiped ID, and direction are required"
        );
      }

      // Get the swiper's user data to check premium status and current matches
      const swiperUserDoc = await db.collection("users").doc(swiperId).get();
      const swipedUserDoc = await db.collection("users").doc(swipedId).get();

      if (!swiperUserDoc.exists) {
        await logToNtfy(
          `[${requestId}] ERROR: Swiper user not found: ${request.data.swiperId}`
        );
        throw new functions.https.HttpsError(
          "not-found",
          "Swiper user not found"
        );
      }

      if (!swipedUserDoc.exists) {
        await logToNtfy(
          `[${requestId}] ERROR: Swiped user not found: ${request.data.swipedId}`
        );
        throw new functions.https.HttpsError(
          "not-found",
          "Swiped user not found"
        );
      }

      const swiperUser = swiperUserDoc.data();
      const swipedUser = swipedUserDoc.data();

      // Check if users have unmatched before
      const unmatchedCheck = await db
        .collection("matches")
        .where("user1Id", "in", [swiperId, swipedId])
        .where("user2Id", "in", [swiperId, swipedId])
        .where("isActive", "==", false)
        .limit(1)
        .get();

      if (!unmatchedCheck.empty) {
        await logToNtfy(
          `[${requestId}] INFO: Users have unmatched before: ${request.data.swiperId} and ${request.data.swipedId}`
        );
        return {
          message: "Users have unmatched before, cannot match again",
          swipe: null,
          match: false,
        };
      }

      // Check if users can match by looking at their actual active matches
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

      // If user is not premium and already has a match, prevent the swipe
      if (!swiperUser?.isPremium && swiperMatches.length >= 1) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "Non-premium users cannot swipe while they have an active match"
        );
      }

      if (!swipedUser?.isPremium && swipedMatches.length >= 1) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "Cannot swipe on users who have active matches"
        );
      }

      // Check if swipe already exists
      const existingSwipe = await db
        .collection("swipes")
        .where("swiperId", "==", swiperId)
        .where("swipedId", "==", swipedId)
        .where("direction", "==", direction)
        .limit(1)
        .get();

      if (!existingSwipe.empty) {
        await logToNtfy(
          `[${requestId}] INFO: Swipe already exists: ${request.data.swiperId} -> ${request.data.swipedId} (${request.data.direction})`
        );
        return {
          message: "Swipe already exists",
          swipe: existingSwipe.docs[0].data(),
          match: false,
        };
      }

      // Create the swipe
      const swipeData = {
        swiperId,
        swipedId,
        direction,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      };

      // If it's a right swipe, check for a match
      if (direction === "right") {
        // Check if the other user has also swiped right on this user
        const mutualSwipe = await db
          .collection("swipes")
          .where("swiperId", "==", swipedId)
          .where("swipedId", "==", swiperId)
          .where("direction", "==", "right")
          .limit(1)
          .get();

        if (!mutualSwipe.empty) {
          await logToNtfy(
            `[${requestId}] 🔔 MATCH MADE: ${request.data.swiperId} <-> ${request.data.swipedId} - Stream Chat notifications should be enabled`
          );

          // Use transaction for atomic match creation
          const matchResult = await db.runTransaction(async (transaction) => {
            // Create the swipe first
            const swipeRef = db.collection("swipes").doc();
            transaction.set(swipeRef, swipeData);

            // Create match data
            const matchData = {
              user1Id: swiperId,
              user2Id: swipedId,
              matchDate: admin.firestore.FieldValue.serverTimestamp(),
              isActive: true,
              messageCount: 0,
              user1Consented: false,
              user2Consented: false,
              // Track unviewed status for both users
              user1Viewed: false,
              user2Viewed: false,
              createdAt: admin.firestore.FieldValue.serverTimestamp(),
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            };

            // Create match document
            const matchRef = db.collection("matches").doc();
            transaction.set(matchRef, matchData);

            // Update both users' currentMatches arrays atomically
            transaction.update(db.collection("users").doc(swiperId), {
              currentMatches: admin.firestore.FieldValue.arrayUnion(
                matchRef.id
              ),
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            transaction.update(db.collection("users").doc(swipedId), {
              currentMatches: admin.firestore.FieldValue.arrayUnion(
                matchRef.id
              ),
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            // Note: Push notifications for matches are now handled by Stream Chat
            // when users receive messages in their match channel
            await logToNtfy(`[${requestId}] 🔔 MATCH CREATED: ${matchRef.id} - Stream Chat should send notifications for new messages`);

            return {
              message: "Swipe recorded and match created",
              swipe: swipeData,
              match: true,
              matchId: matchRef.id,
            };
          });

          return matchResult;
        }
      }

      // If no match, just create the swipe
      await db.collection("swipes").add(swipeData);
      return {
        message: "Swipe recorded",
        swipe: swipeData,
        match: false,
      };
    } catch (error: any) {
      await logToNtfy(`[${requestId}] ERROR: ${error?.message || error}`);
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
 * Counts recent swipes for a user (last 24 hours)
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

      if (!id) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "User ID is required"
        );
      }

      const twentyFourHoursAgo = new Date();
      twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

      const swipesSnapshot = await db
        .collection("swipes")
        .where("swiperId", "==", id)
        .where("timestamp", ">=", twentyFourHoursAgo)
        .get();

      const swipeCount = swipesSnapshot.size;

      return {
        swipeCount,
        dailyLimit: DAILY_SWIPES,
        canSwipe: swipeCount < DAILY_SWIPES,
      };
    } catch (error: any) {
      console.error("Error counting recent swipes:", error);

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

      const swipesSnapshot = await db
        .collection("swipes")
        .where("swiperId", "==", id)
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

import {
  getSwipeLimit,
  incrementSwipeCount,
  updateSwipeLimit,
} from "./swipeLimits";

export const swipeFunctions = {
  createSwipe,
  countRecentSwipes,
  getSwipesByUser,
  getSwipeLimit,
  incrementSwipeCount,
  updateSwipeLimit,
};
