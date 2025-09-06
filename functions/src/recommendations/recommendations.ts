import * as functions from "firebase-functions/v2";
import * as admin from "firebase-admin";
import { CallableRequest } from "firebase-functions/v2/https";

const db = admin.firestore();

/**
 * Shuffles an array randomly using the Fisher-Yates (Knuth) shuffle algorithm.
 */
function shuffleArray(array: any[]) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [array[i], array[j]] = [array[j], array[i]];
  }
}

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
      if (gender1 === "Male") return gender2 === "Female";
      if (gender1 === "Female") return gender2 === "Male";
      if (gender1 === "Non-Binary") return gender2 === "Non-Binary";
      return false;

    case "Homosexual":
      if (gender1 === "Male") return gender2 === "Male";
      if (gender1 === "Female") return gender2 === "Female";
      if (gender1 === "Non-Binary") return gender2 === "Non-Binary";
      return false;

    case "Bisexual":
      if (gender1 === "Male") return gender2 === "Male" || gender2 === "Female";
      if (gender1 === "Female")
        return gender2 === "Male" || gender2 === "Female";
      if (gender1 === "Non-Binary") return gender2 === "Non-Binary";
      return false;

    case "Pansexual":
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
 * Gets user recommendations for swiping, prioritizing users who have swiped on you
 * The final list is a 4:2 ratio of general users to users who swiped on you,
 * with a random ordering.
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

      const userDoc = await db.collection("users").doc(userId).get();
      if (!userDoc.exists) {
        throw new functions.https.HttpsError("not-found", "User not found");
      }

      const currentUserData = userDoc.data();
      if (currentUserData?.isActive === false) {
        return { recommendations: [] };
      }

      // 1. Get all users and filter out the current user and deactivated users
      const allUsersSnapshot = await db.collection("users").get();
      const allUsers = allUsersSnapshot.docs
        .map((doc) => {
          const userData = doc.data();
          const { images, email, ...userDataWithoutSensitiveInfo } = userData;
          return { uid: doc.id, ...userDataWithoutSensitiveInfo };
        })
        .filter(
          (user) => user.uid !== userId && (user as any).isActive !== false
        );

      // 2. Get users who have swiped right on the current user
      const inboundSwipesSnapshot = await db
        .collection("swipes")
        .where("swipedId", "==", userId)
        .where("direction", "==", "right")
        .get();

      const usersWhoSwipedOnYou = inboundSwipesSnapshot.docs
        .map((doc) => allUsers.find((user) => user.uid === doc.data().swiperId))
        .filter(Boolean) as any[];

      // 3. Get users the current user has already swiped on
      const mySwipesSnapshot = await db
        .collection("swipes")
        .where("swiperId", "==", userId)
        .get();
      const swipedUserIds = new Set(
        mySwipesSnapshot.docs.map((doc) => doc.data().swipedId)
      );

      // 4. Get users who are in an active match
      const activeMatchesSnapshot = await db
        .collection("matches")
        .where("isActive", "==", true)
        .get();
      const matchedUserIds = new Set<string>();
      activeMatchesSnapshot.docs.forEach((doc) => {
        const matchData = doc.data();
        matchedUserIds.add(matchData.user1Id);
        matchedUserIds.add(matchData.user2Id);
      });

      // 5. Create two pools of compatible, available users
      const whoSwipedOnYou = usersWhoSwipedOnYou.filter(
        (user) =>
          !swipedUserIds.has(user.uid) &&
          !matchedUserIds.has(user.uid) &&
          isCompatible(currentUserData, user)
      );

      const generalRecommendations = allUsers.filter(
        (user) =>
          !swipedUserIds.has(user.uid) &&
          !matchedUserIds.has(user.uid) &&
          !whoSwipedOnYou.some((p) => p.uid === user.uid) &&
          isCompatible(currentUserData, user)
      );

      // 6. Shuffle both pools to ensure random selection
      shuffleArray(whoSwipedOnYou);
      shuffleArray(generalRecommendations);

      // 7. Combine the pools with the specified 4:2 ratio and random order
      const finalRecommendations: any[] = [];
      const totalGeneral = generalRecommendations.length;
      const totalSwipedOnYou = whoSwipedOnYou.length;

      let generalIndex = 0;
      let swipedOnYouIndex = 0;

      while (
        generalIndex < totalGeneral ||
        swipedOnYouIndex < totalSwipedOnYou
      ) {
        // Determine the number of cards to pull from each pool in this batch
        const generalCardsToPull = Math.min(4, totalGeneral - generalIndex);
        const swipedOnYouCardsToPull = Math.min(
          2,
          totalSwipedOnYou - swipedOnYouIndex
        );

        // Create a temporary batch of cards
        const tempBatch = [];
        for (let i = 0; i < generalCardsToPull; i++) {
          tempBatch.push({
            type: "general",
            user: generalRecommendations[generalIndex + i],
          });
        }
        for (let i = 0; i < swipedOnYouCardsToPull; i++) {
          tempBatch.push({
            type: "swipedOnYou",
            user: whoSwipedOnYou[swipedOnYouIndex + i],
          });
        }

        // Shuffle the temporary batch to randomize the order
        shuffleArray(tempBatch);

        // Add the shuffled batch to the final recommendations
        for (const card of tempBatch) {
          finalRecommendations.push(card.user);
        }

        // Move indices forward
        generalIndex += generalCardsToPull;
        swipedOnYouIndex += swipedOnYouCardsToPull;
      }

      return { recommendations: finalRecommendations };
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
