import * as functions from "firebase-functions/v2";
import * as admin from "firebase-admin";
import { CallableRequest } from "firebase-functions/v2/https";

const db = admin.firestore();
const DAILY_SWIPES = 100;

// @ts-ignore
async function logToNtfy(msg: string) {
  // Function kept for future use but not actively logging
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
      const swiperDoc = await db.collection("users").doc(swiperId).get();
      if (!swiperDoc.exists) {
        throw new functions.https.HttpsError(
          "not-found",
          "Swiper user not found"
        );
      }

      // Get the swiped user's data as well
      const swipedDoc = await db.collection("users").doc(swipedId).get();
      if (!swipedDoc.exists) {
        throw new functions.https.HttpsError(
          "not-found",
          "Swiped user not found"
        );
      }

      const swiperUser = swiperDoc.data();
      const swipedUser = swipedDoc.data();

      // Check if users can match by looking at their actual active matches
      const [swiperAsUser1, swiperAsUser2, swipedAsUser1, swipedAsUser2] =
        await Promise.all([
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

      logToNtfy(
        `Swipe function - Querying matches for swiper ${swiperId} and swiped ${swipedId}`
      );
      logToNtfy(
        `Swipe function - Swiper as user1: ${swiperAsUser1.docs.length} matches`
      );
      logToNtfy(
        `Swipe function - Swiper as user2: ${swiperAsUser2.docs.length} matches`
      );

      const swiperMatches = [...swiperAsUser1.docs, ...swiperAsUser2.docs];
      const swipedMatches = [...swipedAsUser1.docs, ...swipedAsUser2.docs];

      logToNtfy(
        `Swipe function - Total swiper matches: ${swiperMatches.length}`
      );
      logToNtfy(
        `Swipe function - Total swiped matches: ${swipedMatches.length}`
      );

      // Check if users can match based on their premium status and current matches
      const canSwiperMatch = swiperUser?.isPremium || swiperMatches.length < 1;
      const canSwipedMatch = swipedUser?.isPremium || swipedMatches.length < 1;

      logToNtfy(
        `Match check - Swiper: ${swiperId}, Premium: ${swiperUser?.isPremium}, Active matches: ${swiperMatches.length}`
      );
      logToNtfy(
        `Match check - Swiped: ${swipedId}, Premium: ${swipedUser?.isPremium}, Active matches: ${swipedMatches.length}`
      );

      // If user is not premium and already has a match, prevent the swipe
      if (!swiperUser?.isPremium && swiperMatches.length >= 1) {
        logToNtfy(
          `Swiper ${swiperId} is not premium and has ${swiperMatches.length} active matches`
        );
        throw new functions.https.HttpsError(
          "permission-denied",
          "Non-premium users cannot swipe while they have an active match"
        );
      }

      // Check if these users have unmatched before (prevent re-matching)
      const unmatchedCheck = await db
        .collection("matches")
        .where("user1Id", "in", [swiperId, swipedId])
        .where("user2Id", "in", [swiperId, swipedId])
        .where("isActive", "==", false)
        .limit(1)
        .get();

      if (!unmatchedCheck.empty) {
        logToNtfy(`Users have unmatched before: ${swiperId} and ${swipedId}`);
        return {
          message: "Users have unmatched before, cannot match again",
          swipe: null,
          match: false,
        };
      }

      // Check if this swipe already exists to prevent duplicates
      const existingSwipe = await db
        .collection("swipes")
        .where("swiperId", "==", swiperId)
        .where("swipedId", "==", swipedId)
        .where("direction", "==", direction)
        .limit(1)
        .get();

      if (!existingSwipe.empty) {
        logToNtfy(
          `Swipe already exists: ${swiperId} -> ${swipedId} (${direction})`
        );
        // Swipe already exists, return the existing data
        const existingSwipeData = existingSwipe.docs[0].data();

        // Check if it's a match (both users swiped right on each other)
        if (direction === "right") {
          const reverseSwipe = await db
            .collection("swipes")
            .where("swiperId", "==", swipedId)
            .where("swipedId", "==", swiperId)
            .where("direction", "==", "right")
            .limit(1)
            .get();

          if (!reverseSwipe.empty && canSwiperMatch && canSwipedMatch) {
            // Check if match already exists
            const existingMatch = await db
              .collection("matches")
              .where("user1Id", "in", [swiperId, swipedId])
              .where("user2Id", "in", [swiperId, swipedId])
              .where("isActive", "==", true)
              .limit(1)
              .get();

            if (!existingMatch.empty) {
              return {
                message: "Swipe already exists and match found",
                swipe: existingSwipeData,
                match: true,
                matchId: existingMatch.docs[0].id,
              };
            }
          }
        }

        return {
          message: "Swipe already exists",
          swipe: existingSwipeData,
          match: false,
        };
      }

      // Record the swipe
      const swipeData = {
        swiperId,
        swipedId,
        direction,
        timestamp: admin.firestore.FieldValue.serverTimestamp(),
      };

      logToNtfy(
        `Creating new swipe: ${swiperId} -> ${swipedId} (${direction})`
      );
      await db.collection("swipes").add(swipeData);

      // Check if it's a match (both users swiped right on each other)
      if (direction === "right") {
        const reverseSwipe = await db
          .collection("swipes")
          .where("swiperId", "==", swipedId)
          .where("swipedId", "==", swiperId)
          .where("direction", "==", "right")
          .limit(1)
          .get();

        if (!reverseSwipe.empty && canSwiperMatch && canSwipedMatch) {
          // It's a match! Create a match record
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
      console.error("Error creating swipe:", error);

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
