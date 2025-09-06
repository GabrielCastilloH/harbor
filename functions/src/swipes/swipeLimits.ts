import * as functions from "firebase-functions/v2";
import * as admin from "firebase-admin";
import { CallableRequest } from "firebase-functions/v2/https";

const db = admin.firestore();

/**
 * Gets the current swipe limit data for a user from their user document.
 */
export const getSwipeLimit = functions.https.onCall(
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
      if (request.auth.uid !== userId) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "User can only access their own swipe limit"
        );
      }

      const userRef = db.collection("users").doc(userId);
      const userDoc = await userRef.get();
      if (!userDoc.exists) {
        throw new functions.https.HttpsError("not-found", "User not found");
      }

      const userData = userDoc.data();
      const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD

      let swipesToday = userData?.swipesToday ?? 0;
      let maxSwipesPerDay = userData?.maxSwipesPerDay ?? 5; // Default to 5
      let resetDate = userData?.resetDate ?? today;

      // Reset swipe count if a new day has started
      if (resetDate !== today) {
        swipesToday = 0;
        resetDate = today;
        await userRef.update({
          swipesToday: 0,
          resetDate: today,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });
      }

      const canSwipe = swipesToday < maxSwipesPerDay;
      return {
        userId,
        swipesToday,
        maxSwipesPerDay,
        canSwipe,
        resetDate,
      };
    } catch (error: any) {
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }
      throw new functions.https.HttpsError(
        "internal",
        "Failed to get swipe limit"
      );
    }
  }
);

/**
 * Increments the swipe count for a user in a transactional way.
 */
export const incrementSwipeCount = functions.https.onCall(
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
      if (request.auth.uid !== userId) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "User can only increment their own swipe count"
        );
      }

      const userRef = db.collection("users").doc(userId);
      const today = new Date().toISOString().split("T")[0];

      return await db.runTransaction(async (transaction) => {
        const userDoc = await transaction.get(userRef);
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

        let currentSwipes = userData.swipesToday ?? 0;
        const maxSwipesPerDay = userData.maxSwipesPerDay ?? 5;
        let resetDate = userData.resetDate ?? today;

        if (resetDate !== today) {
          currentSwipes = 0;
          resetDate = today;
        }

        if (currentSwipes >= maxSwipesPerDay) {
          return {
            userId,
            swipesToday: currentSwipes,
            maxSwipesPerDay,
            canSwipe: false,
            resetDate,
          };
        }

        const newSwipeCount = currentSwipes + 1;
        transaction.update(userRef, {
          swipesToday: newSwipeCount,
          resetDate,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        return {
          userId,
          swipesToday: newSwipeCount,
          maxSwipesPerDay,
          canSwipe: newSwipeCount < maxSwipesPerDay,
          resetDate,
        };
      });
    } catch (error: any) {
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }
      throw new functions.https.HttpsError(
        "internal",
        "Failed to increment swipe count"
      );
    }
  }
);

export const swipeLimitFunctions = {
  getSwipeLimit,
  incrementSwipeCount,
};
