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
 * Gets user recommendations for swiping, prioritizing users who have swiped on you.
 * The final list is a 4:2 ratio of general users to users who swiped on you,
 * with a random ordering. It also uses an "availability" value to match users
 * with similar availabilities if the value is not -1.
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

      const userAvailability = currentUserData?.availability ?? -1;
      const useAvailabilityMatching = userAvailability !== -1;
      const userGroupSize = currentUserData?.groupSize ?? 2;

      // Helper function to filter users
      const filterUser = (u: any) => {
        return (
          u.uid !== userId &&
          !swipedUserIds.has(u.uid) &&
          !matchedUserIds.has(u.uid) &&
          isCompatible(currentUserData, u) &&
          // Prioritize users with the same group size preference
          (u.groupSize === userGroupSize || u.groupSize === undefined)
        );
      };

      // Step 1: Preload swipes and matches to filter out irrelevant users early
      const mySwipesSnapshot = await db
        .collection("swipes")
        .where("swiperId", "==", userId)
        .get();
      const swipedUserIds = new Set(
        mySwipesSnapshot.docs.map((doc) => doc.data().swipedId)
      );

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

      // Step 2: Get users who swiped on you (highest priority)
      const inboundSwipesSnapshot = await db
        .collection("swipes")
        .where("swipedId", "==", userId)
        .where("direction", "==", "right")
        .get();

      const whoSwipedOnYouIds = inboundSwipesSnapshot.docs.map(
        (doc) => doc.data().swiperId
      );

      // Fetch users who swiped on you directly using document IDs
      let swipedUsers: any[] = [];
      if (whoSwipedOnYouIds.length > 0) {
        // Limit to 10 for performance (Firestore 'in' queries are limited to 10 items)
        const limitedIds = whoSwipedOnYouIds.slice(0, 10);
        const swipedUsersSnapshot = await db
          .collection("users")
          .where(admin.firestore.FieldPath.documentId(), "in", limitedIds)
          .get();

        swipedUsers = swipedUsersSnapshot.docs
          .map((doc) => {
            const userData = doc.data();
            const { images, email, ...userDataWithoutSensitiveInfo } = userData;
            return { uid: doc.id, ...userDataWithoutSensitiveInfo };
          })
          .filter(filterUser);
      }

      // Step 3: Fetch availability-based users (medium priority)
      let availabilityUsers: any[] = [];
      if (useAvailabilityMatching) {
        const availabilityValue = userAvailability % 1;
        const lowerBound = availabilityValue - 0.15;
        const upperBound = availabilityValue + 0.15;

        const availabilitySnapshot = await db
          .collection("users")
          .where("availability", ">=", lowerBound)
          .where("availability", "<=", upperBound)
          .limit(50)
          .get();

        availabilityUsers = availabilitySnapshot.docs
          .map((doc) => {
            const userData = doc.data();
            const { images, email, ...userDataWithoutSensitiveInfo } = userData;
            return { uid: doc.id, ...userDataWithoutSensitiveInfo };
          })
          .filter(filterUser);
      }

      // Step 4: Fetch general users as fallback (lowest priority)
      const generalSnapshot = await db.collection("users").limit(50).get();

      const generalUsers = generalSnapshot.docs
        .map((doc) => {
          const userData = doc.data();
          const { images, email, ...userDataWithoutSensitiveInfo } = userData;
          return { uid: doc.id, ...userDataWithoutSensitiveInfo };
        })
        .filter(filterUser);

      // Step 5: Merge results in priority order
      shuffleArray(swipedUsers);
      shuffleArray(availabilityUsers);
      shuffleArray(generalUsers);

      const recommendations = [
        ...swipedUsers,
        ...availabilityUsers,
        ...generalUsers,
      ];

      return { recommendations };
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
