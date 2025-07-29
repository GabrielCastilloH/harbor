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
          "swiperId, swipedId, and direction are required"
        );
      }

      console.log("Processing swipe:", { swiperId, swipedId, direction });

      // Get the swiper's user data to check premium status and current matches
      const swiperDoc = await db.collection("users").doc(swiperId).get();
      if (!swiperDoc.exists) {
        throw new functions.https.HttpsError(
          "not-found",
          "Swiper user not found"
        );
      }

      const swiperUser = swiperDoc.data();

      // If user is not premium and already has a match, prevent the swipe
      if (!swiperUser?.isPremium && swiperUser?.currentMatches?.length > 0) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "Non-premium users cannot swipe while they have an active match"
        );
      }

      // Check if users can add more matches
      const [canSwiperMatch, canSwipedMatch] = await Promise.all([
        canAddMatch(swiperId),
        canAddMatch(swipedId),
      ]);

      console.log("Can users match:", { canSwiperMatch, canSwipedMatch });

      if (!canSwiperMatch || !canSwipedMatch) {
        // Record the swipe but don't create a match
        const swipeData = {
          swiperId,
          swipedId,
          direction,
          timestamp: admin.firestore.FieldValue.serverTimestamp(),
        };

        await db.collection("swipes").add(swipeData);

        return {
          message: "Swipe recorded (one or both users cannot add more matches)",
          swipe: swipeData,
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

      const swipeRef = await db.collection("swipes").add(swipeData);

      // Check if this creates a match (both users swiped right)
      if (direction === "right") {
        const existingSwipe = await db
          .collection("swipes")
          .where("swiperId", "==", swipedId)
          .where("swipedId", "==", swiperId)
          .where("direction", "==", "right")
          .limit(1)
          .get();

        if (!existingSwipe.empty) {
          // It's a match! Create a match record
          const matchData = {
            user1Id: swiperId,
            user2Id: swipedId,
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
            message: "Swipe recorded and match created!",
            swipe: { id: swipeRef.id, ...swipeData },
            match: true,
            matchId: matchRef.id,
          };
        }
      }

      return {
        message: "Swipe recorded",
        swipe: { id: swipeRef.id, ...swipeData },
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

export const swipeFunctions = {
  createSwipe,
  countRecentSwipes,
  getSwipesByUser,
};
