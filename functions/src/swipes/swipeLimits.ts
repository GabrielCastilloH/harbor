import * as functions from "firebase-functions/v2";
import * as admin from "firebase-admin";
import { CallableRequest } from "firebase-functions/v2/https";

const db = admin.firestore();

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
 * Gets the current swipe limit data for a user
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

      if (!userId) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "User ID is required"
        );
      }

      // Verify the requesting user is accessing their own data
      if (request.auth.uid !== userId) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "User can only access their own swipe limit"
        );
      }

      // Get user's swipe limit document
      const swipeLimitDoc = await db
        .collection("swipeLimits")
        .doc(userId)
        .get();

      const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD format

      if (!swipeLimitDoc.exists) {
        // Create new swipe limit document
        const newSwipeLimit = {
          userId,
          swipesToday: 0,
          maxSwipesPerDay: 20, // Default to free tier
          canSwipe: true,
          resetDate: today,
          createdAt: admin.firestore.FieldValue.serverTimestamp(),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        };

        await db.collection("swipeLimits").doc(userId).set(newSwipeLimit);

        return {
          userId,
          swipesToday: 0,
          maxSwipesPerDay: 20,
          canSwipe: true,
          resetDate: today,
        };
      }

      const swipeLimitData = swipeLimitDoc.data();
      if (!swipeLimitData) {
        throw new functions.https.HttpsError(
          "not-found",
          "Swipe limit data not found"
        );
      }

      // Check if we need to reset the counter (new day)
      if (swipeLimitData.resetDate !== today) {
        // Reset for new day
        await db.collection("swipeLimits").doc(userId).update({
          swipesToday: 0,
          resetDate: today,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

        return {
          userId,
          swipesToday: 0,
          maxSwipesPerDay: swipeLimitData.maxSwipesPerDay,
          canSwipe: true,
          resetDate: today,
        };
      }

      // Check if user can still swipe today
      const canSwipe =
        swipeLimitData.swipesToday < swipeLimitData.maxSwipesPerDay;

      return {
        userId,
        swipesToday: swipeLimitData.swipesToday,
        maxSwipesPerDay: swipeLimitData.maxSwipesPerDay,
        canSwipe,
        resetDate: swipeLimitData.resetDate,
      };
    } catch (error: any) {
      console.error("Error getting swipe limit:", error);
      await logToNtfy(`❌ SWIPE LIMIT ERROR: ${error.message}`);

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
 * Increments the swipe count for a user
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

      if (!userId) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "User ID is required"
        );
      }

      // Verify the requesting user is accessing their own data
      if (request.auth.uid !== userId) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "User can only access their own swipe limit"
        );
      }

      // Get current swipe limit data
      const swipeLimitDoc = await db
        .collection("swipeLimits")
        .doc(userId)
        .get();
      const today = new Date().toISOString().split("T")[0]; // YYYY-MM-DD format

      if (!swipeLimitDoc.exists) {
        throw new functions.https.HttpsError(
          "not-found",
          "Swipe limit not initialized"
        );
      }

      const swipeLimitData = swipeLimitDoc.data();
      if (!swipeLimitData) {
        throw new functions.https.HttpsError(
          "not-found",
          "Swipe limit data not found"
        );
      }

      // Check if we need to reset the counter (new day)
      let currentSwipes = swipeLimitData.swipesToday;
      let resetDate = swipeLimitData.resetDate;

      if (resetDate !== today) {
        // Reset for new day
        currentSwipes = 0;
        resetDate = today;
      }

      // Check if user can still swipe
      if (currentSwipes >= swipeLimitData.maxSwipesPerDay) {
        return {
          userId,
          swipesToday: currentSwipes,
          maxSwipesPerDay: swipeLimitData.maxSwipesPerDay,
          canSwipe: false,
          resetDate,
        };
      }

      // Increment swipe count
      const newSwipeCount = currentSwipes + 1;

      await db.collection("swipeLimits").doc(userId).update({
        swipesToday: newSwipeCount,
        resetDate,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return {
        userId,
        swipesToday: newSwipeCount,
        maxSwipesPerDay: swipeLimitData.maxSwipesPerDay,
        canSwipe: newSwipeCount < swipeLimitData.maxSwipesPerDay,
        resetDate,
      };
    } catch (error: any) {
      console.error("Error incrementing swipe count:", error);
      await logToNtfy(`❌ SWIPE COUNT ERROR: ${error.message}`);

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

/**
 * Updates a user's swipe limit based on their premium status
 */
export const updateSwipeLimit = functions.https.onCall(
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
  async (request: CallableRequest<{ userId: string; isPremium: boolean }>) => {
    try {
      if (!request.auth) {
        throw new functions.https.HttpsError(
          "unauthenticated",
          "User must be authenticated"
        );
      }

      const { userId, isPremium } = request.data;

      if (!userId || isPremium === undefined) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "User ID and premium status are required"
        );
      }

      // Verify the requesting user is accessing their own data
      if (request.auth.uid !== userId) {
        throw new functions.https.HttpsError(
          "permission-denied",
          "User can only update their own swipe limit"
        );
      }

      const maxSwipesPerDay = isPremium ? 40 : 20;

      // Update or create swipe limit document
      await db.collection("swipeLimits").doc(userId).set(
        {
          userId,
          maxSwipesPerDay,
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        },
        { merge: true }
      );

      return {
        message: "Swipe limit updated successfully",
        maxSwipesPerDay,
      };
    } catch (error: any) {
      console.error("Error updating swipe limit:", error);
      await logToNtfy(`❌ UPDATE SWIPE LIMIT ERROR: ${error.message}`);

      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      throw new functions.https.HttpsError(
        "internal",
        "Failed to update swipe limit"
      );
    }
  }
);
