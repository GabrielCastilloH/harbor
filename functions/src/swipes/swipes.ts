import * as functions from "firebase-functions/v2";
import * as admin from "firebase-admin";
import { CallableRequest } from "firebase-functions/v2/https";
import { onSchedule } from "firebase-functions/v2/scheduler";

const db = admin.firestore();
const DAILY_SWIPES = 5;

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
      // Force new deployment
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

      // Get the swiper's user data to check premium status and current matches
      const swiperUserDoc = await db.collection("users").doc(swiperId).get();
      const swipedUserDoc = await db.collection("users").doc(swipedId).get();

      if (!swiperUserDoc.exists) {
        throw new functions.https.HttpsError(
          "not-found",
          "Swiper user not found"
        );
      }

      if (!swipedUserDoc.exists) {
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

            // Update both users' currentMatches arrays atomically and increment daily swipe count
            transaction.update(db.collection("users").doc(swiperId), {
              currentMatches: admin.firestore.FieldValue.arrayUnion(
                matchRef.id
              ),
              dailySwipeCount: admin.firestore.FieldValue.increment(1),
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            transaction.update(db.collection("users").doc(swipedId), {
              currentMatches: admin.firestore.FieldValue.arrayUnion(
                matchRef.id
              ),
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });

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

      // Increment daily swipe count for the swiper
      await db
        .collection("users")
        .doc(swiperId)
        .update({
          dailySwipeCount: admin.firestore.FieldValue.increment(1),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

      return {
        message: "Swipe recorded",
        swipe: swipeData,
        match: false,
      };
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

/**
 * Sends a push notification via Expo
 */
async function sendPushNotification(
  expoPushToken: string,
  title: string,
  body: string
) {
  const message = {
    to: expoPushToken,
    title,
    body,
    sound: "default",
  };

  try {
    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(message),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! status: ${response.status}`);
    }

    const result = await response.json();
    console.log("Push notification sent successfully:", result);
    return result;
  } catch (error) {
    console.error("Failed to send push notification:", error);
    throw error;
  }
}

/**
 * Scheduled function to reset daily swipes and send notifications
 * Runs daily at midnight UTC
 */
export const resetDailySwipes = onSchedule("0 0 * * *", async (event) => {
  try {
    // Get all users
    const usersSnapshot = await db.collection("users").get();
    const users = usersSnapshot.docs.map((doc) => ({
      id: doc.id,
      ...doc.data(),
    }));

    let resetCount = 0;
    let notificationCount = 0;

    // Process users in batches to avoid timeout
    const batchSize = 10;
    for (let i = 0; i < users.length; i += batchSize) {
      const batch = users.slice(i, i + batchSize);

      await Promise.all(
        batch.map(async (user) => {
          try {
            const userRef = db.collection("users").doc(user.id);
            const userData = user as any;

            // Check if user has used a significant portion of their swipes (>90%)
            const dailySwipeCount = userData.dailySwipeCount || 0;
            const shouldNotify =
              dailySwipeCount >= DAILY_SWIPES * 0.9 && userData.expoPushToken;

            // Reset the daily swipe count and update timestamp
            await userRef.update({
              dailySwipeCount: 0,
              lastSwipeReset: admin.firestore.FieldValue.serverTimestamp(),
              updatedAt: admin.firestore.FieldValue.serverTimestamp(),
            });

            resetCount++;

            // Send notification if user qualifies
            if (shouldNotify) {
              try {
                await sendPushNotification(
                  userData.expoPushToken,
                  "Swipes Reset! ✨",
                  `Your ${DAILY_SWIPES} daily swipes have been reset!`
                );
                notificationCount++;
              } catch (notificationError) {
                console.error(
                  `Failed to send notification to user ${user.id}:`,
                  notificationError
                );
              }
            }
          } catch (error) {
            console.error(`Error processing user ${user.id}:`, error);
          }
        })
      );
    }

    console.log("Daily swipe reset completed:", {
      success: true,
      usersProcessed: users.length,
      usersReset: resetCount,
      notificationsSent: notificationCount,
    });
  } catch (error) {
    console.error("Error in resetDailySwipes:", error);
    throw error;
  }
});

export const swipeFunctions = {
  createSwipe,
  countRecentSwipes,
  getSwipesByUser,
  getSwipeLimit,
  incrementSwipeCount,
  updateSwipeLimit,
  resetDailySwipes,
};
