import * as functions from "firebase-functions/v2";
import * as admin from "firebase-admin";
import { CallableRequest } from "firebase-functions/v2/https";

const db = admin.firestore();
const DAILY_SWIPES = 100;

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

      await db.collection("swipes").add(swipeData);

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
          // Both users swiped right on each other - it's a match!
          const matchData = {
            user1Id: swiperId,
            user2Id: swipedId,
            matchDate: admin.firestore.FieldValue.serverTimestamp(),
            isActive: true,
            messageCount: 0,
            blurPercentage: 100,
            warningShown: false,
            user1Agreed: false,
            user2Agreed: false,
            createdAt: admin.firestore.FieldValue.serverTimestamp(),
            updatedAt: admin.firestore.FieldValue.serverTimestamp(),
          };

          const matchRef = await db.collection("matches").add(matchData);

          // Update both users' currentMatches arrays
          await Promise.all([
            db
              .collection("users")
              .doc(swiperId)
              .update({
                currentMatches: admin.firestore.FieldValue.arrayUnion(
                  matchRef.id
                ),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              }),
            db
              .collection("users")
              .doc(swipedId)
              .update({
                currentMatches: admin.firestore.FieldValue.arrayUnion(
                  matchRef.id
                ),
                updatedAt: admin.firestore.FieldValue.serverTimestamp(),
              }),
          ]);

          return {
            message: "Swipe recorded and match created",
            swipe: swipeData,
            match: true,
            matchId: matchRef.id,
          };
        }
      }

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

export const swipeFunctions = {
  createSwipe,
  countRecentSwipes,
  getSwipesByUser,
};
