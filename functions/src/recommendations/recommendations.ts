import * as functions from "firebase-functions/v2";
import * as admin from "firebase-admin";
import { CallableRequest } from "firebase-functions/v2/https";

// Keep the logToNtfy function available for future use
// @ts-ignore
async function logToNtfy(msg: string) {
  try {
    await fetch("https://ntfy.sh/harbor-debug-randomr", {
      method: "POST",
      body: `[${new Date().toISOString()}] ${msg}`,
    });
  } catch (error) {
    console.error("Failed to log to ntfy:", error);
  }
}

const db = admin.firestore();

/**
 * Determines if two users are compatible based on their gender and sexual orientation
 */
function isCompatible(user1: any, user2: any): boolean {
  const gender1 = user1.gender;
  const orientation1 = user1.sexualOrientation;
  const gender2 = user2.gender;
  const orientation2 = user2.sexualOrientation;

  // If either user is missing required data, don't show them
  if (!gender1 || !orientation1 || !gender2 || !orientation2) {
    return false;
  }

  // Check if user1 would be interested in user2
  const user1InterestedInUser2 = isUserInterestedIn(user1, user2);

  // Check if user2 would be interested in user1
  const user2InterestedInUser1 = isUserInterestedIn(user2, user1);

  // Both users must be interested in each other for compatibility
  return user1InterestedInUser2 && user2InterestedInUser1;
}

/**
 * Determines if user1 would be interested in user2 based on gender and sexual orientation
 */
function isUserInterestedIn(user1: any, user2: any): boolean {
  const gender1 = user1.gender;
  const orientation1 = user1.sexualOrientation;
  const gender2 = user2.gender;

  switch (orientation1) {
    case "Heterosexual":
      // Heterosexual people are interested in the opposite gender
      if (gender1 === "Male") return gender2 === "Female";
      if (gender1 === "Female") return gender2 === "Male";
      if (gender1 === "Non-Binary") return gender2 === "Non-Binary";
      return false;

    case "Homosexual":
      // Homosexual people are interested in the same gender
      if (gender1 === "Male") return gender2 === "Male";
      if (gender1 === "Female") return gender2 === "Female";
      if (gender1 === "Non-Binary") return gender2 === "Non-Binary";
      return false;

    case "Bisexual":
      // Bisexual people are interested in their own gender and other genders
      if (gender1 === "Male") return gender2 === "Male" || gender2 === "Female";
      if (gender1 === "Female")
        return gender2 === "Male" || gender2 === "Female";
      if (gender1 === "Non-Binary") return gender2 === "Non-Binary";
      return false;

    case "Pansexual":
      // Pansexual people are interested in all genders
      if (gender1 === "Male")
        return (
          gender2 === "Male" || gender2 === "Female" || gender2 === "Non-Binary"
        );
      if (gender1 === "Female")
        return (
          gender2 === "Male" || gender2 === "Female" || gender2 === "Non-Binary"
        );
      if (gender1 === "Non-Binary")
        return (
          gender2 === "Male" || gender2 === "Female" || gender2 === "Non-Binary"
        );
      return false;

    default:
      return false;
  }
}

/**
 * Gets user recommendations for swiping
 */
export const getRecommendations = functions.https.onCall(
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

      const userId = request.auth.uid;

      if (!userId) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "User ID is required"
        );
      }

      // Get the current user's data
      const userDoc = await db.collection("users").doc(userId).get();
      if (!userDoc.exists) {
        throw new functions.https.HttpsError("not-found", "User not found");
      }

      const currentUserData = userDoc.data();

      // Check if current user is deactivated
      if (currentUserData?.isActive === false) {
        return { recommendations: [] };
      }

      // Get all other users (excluding sensitive data)
      const allUsersSnapshot = await db.collection("users").get();
      const allUsers = allUsersSnapshot.docs.map((doc) => {
        const userData = doc.data();
        // Remove sensitive data for security
        const { images, email, ...userDataWithoutSensitiveInfo } = userData;
        return {
          uid: doc.id,
          ...userDataWithoutSensitiveInfo,
        };
      });

      // Filter out the current user, deactivated users, and users they've already swiped on
      const otherUsers = allUsers.filter(
        (user) => user.uid !== userId && (user as any).isActive !== false // Exclude deactivated users
      );

      // Get swipes by the current user
      const swipesSnapshot = await db
        .collection("swipes")
        .where("swiperId", "==", userId)
        .get();

      const swipedUserIds = swipesSnapshot.docs.map(
        (doc) => doc.data().swipedId
      );

      // Filter out users the current user has already swiped on
      const availableUsers = otherUsers.filter(
        (user) => !swipedUserIds.includes(user.uid)
      );

      // Get all active matches to filter out users who are already matched
      const activeMatchesSnapshot = await db
        .collection("matches")
        .where("isActive", "==", true)
        .get();

      const matchedUserIds = new Set<string>();

      activeMatchesSnapshot.docs.forEach((doc) => {
        const matchData = doc.data();
        if (matchData.user1Id && matchData.user2Id) {
          matchedUserIds.add(matchData.user1Id);
          matchedUserIds.add(matchData.user2Id);
        }
      });

      // Filter out users who are already in active matches
      const trulyAvailableUsers = availableUsers.filter(
        (user) => !matchedUserIds.has(user.uid)
      );

      if (trulyAvailableUsers.length === 0) {
        return { recommendations: [] };
      }

      // Apply intelligent matching based on sexual orientation and gender preferences
      const filteredRecommendations = trulyAvailableUsers.filter((user) => {
        return isCompatible(currentUserData, user);
      });

      return { recommendations: filteredRecommendations };
    } catch (error: any) {
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }
      throw new functions.https.HttpsError(
        "internal",
        "Failed to get recommendations"
      );
    }
  }
);

export const recommendationsFunctions = {
  getRecommendations,
};
