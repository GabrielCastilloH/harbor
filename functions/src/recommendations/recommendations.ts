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
 * Gets user recommendations for swiping, prioritizing users who have swiped on you.
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

      // Check for active matches first - if user has an active match, return empty recommendations
      const [activeMatchesSnapshot1, activeMatchesSnapshot2] =
        await Promise.all([
          db
            .collection("matches")
            .where("isActive", "==", true)
            .where("user1Id", "==", userId)
            .get(),
          db
            .collection("matches")
            .where("isActive", "==", true)
            .where("user2Id", "==", userId)
            .get(),
        ]);

      if (
        activeMatchesSnapshot1.docs.length > 0 ||
        activeMatchesSnapshot2.docs.length > 0
      ) {
        return { recommendations: [] };
      }

      const userDoc = await db.collection("users").doc(userId).get();
      if (!userDoc.exists) {
        throw new functions.https.HttpsError("not-found", "User not found");
      }

      const currentUserData = userDoc.data();
      if (currentUserData?.isActive === false) {
        return { recommendations: [] };
      }

      // Step 1: Preload swipes to filter out irrelevant users early
      const mySwipesSnapshot = await db
        .collection("swipes")
        .where("swiperId", "==", userId)
        .get();
      const swipedUserIds = new Set(
        mySwipesSnapshot.docs.map((doc) => doc.data().swipedId)
      );

      // Create filter set for users to exclude (swiped users + current user)
      const matchedUserIds = new Set<string>();
      matchedUserIds.add(userId); // Add current user to avoid self-match
      for (const id of swipedUserIds) {
        matchedUserIds.add(id);
      }

      // Step 2: Get users who swiped on you (highest priority)
      const inboundSwipesSnapshot = await db
        .collection("swipes")
        .where("swipedId", "==", userId)
        .where("direction", "==", "right")
        .get();

      const whoSwipedOnYouIds = inboundSwipesSnapshot.docs.map(
        (doc) => doc.data().swiperId
      );

      let swipedUsers: any[] = [];
      if (whoSwipedOnYouIds.length > 0) {
        const uniqueInboundSwipes = whoSwipedOnYouIds.filter(
          (id) => !matchedUserIds.has(id)
        );
        if (uniqueInboundSwipes.length > 0) {
          const limitedIds = uniqueInboundSwipes.slice(0, 10);
          const swipedUsersSnapshot = await db
            .collection("users")
            .where(admin.firestore.FieldPath.documentId(), "in", limitedIds)
            .get();

          swipedUsers = swipedUsersSnapshot.docs.map((doc) => {
            const userData = doc.data();
            const { images, email, ...userDataWithoutSensitiveInfo } = userData;
            return { uid: doc.id, ...userDataWithoutSensitiveInfo };
          });
        }
      }

      // Step 3: Fetch availability-based users (medium priority)
      let availabilityUsers: any[] = [];
      const userAvailability = currentUserData?.availability ?? -1;
      const useAvailabilityMatching = userAvailability !== -1;

      if (useAvailabilityMatching) {
        const availabilityValue = userAvailability % 1;
        const lowerBound = availabilityValue - 0.15;
        const upperBound = availabilityValue + 0.15;
        const compatibilityData = getCompatibilityQuery(currentUserData);

        const availabilitySnapshot = await db
          .collection("users")
          .where("availability", ">=", lowerBound)
          .where("availability", "<=", upperBound)
          .where("sexualOrientation", "in", compatibilityData.orientation)
          .where("gender", "in", compatibilityData.gender)
          .where(
            admin.firestore.FieldPath.documentId(),
            "not-in",
            Array.from(matchedUserIds)
          )
          .limit(50)
          .get();

        availabilityUsers = availabilitySnapshot.docs.map((doc) => {
          const userData = doc.data();
          const { images, email, ...userDataWithoutSensitiveInfo } = userData;
          return { uid: doc.id, ...userDataWithoutSensitiveInfo };
        });
      }

      // Step 4: Fetch general users as fallback (lowest priority)
      const compatibilityData = getCompatibilityQuery(currentUserData);
      const generalSnapshot = await db
        .collection("users")
        .where("sexualOrientation", "in", compatibilityData.orientation)
        .where("gender", "in", compatibilityData.gender)
        .where(
          admin.firestore.FieldPath.documentId(),
          "not-in",
          Array.from(matchedUserIds)
        )
        .limit(50)
        .get();

      const generalUsers = generalSnapshot.docs.map((doc) => {
        const userData = doc.data();
        const { images, email, ...userDataWithoutSensitiveInfo } = userData;
        return { uid: doc.id, ...userDataWithoutSensitiveInfo };
      });

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

/**
 * Generates the necessary Firestore query parameters for compatibility.
 * This helper function makes the main function more readable and performant.
 */
function getCompatibilityQuery(currentUserData: any) {
  const userGender = currentUserData.gender;
  const userOrientation = currentUserData.sexualOrientation;
  let compatibleGenders: string[] = [];
  let compatibleOrientations: string[] = [];

  switch (userOrientation) {
    case "Heterosexual":
      if (userGender === "Male") {
        compatibleGenders.push("Female");
        compatibleOrientations.push("Heterosexual", "Bisexual", "Pansexual");
      } else if (userGender === "Female") {
        compatibleGenders.push("Male");
        compatibleOrientations.push("Heterosexual", "Bisexual", "Pansexual");
      }
      break;

    case "Homosexual":
      if (userGender === "Male") {
        compatibleGenders.push("Male");
        compatibleOrientations.push("Homosexual", "Bisexual", "Pansexual");
      } else if (userGender === "Female") {
        compatibleGenders.push("Female");
        compatibleOrientations.push("Homosexual", "Bisexual", "Pansexual");
      }
      break;

    case "Bisexual":
      if (userGender === "Male" || userGender === "Female") {
        compatibleGenders.push("Male", "Female");
        compatibleOrientations.push(
          "Bisexual",
          "Pansexual",
          "Heterosexual",
          "Homosexual"
        );
      }
      break;

    case "Pansexual":
      compatibleGenders.push("Male", "Female", "Non-Binary");
      compatibleOrientations.push(
        "Bisexual",
        "Pansexual",
        "Heterosexual",
        "Homosexual"
      );
      break;

    default:
      break;
  }

  if (compatibleGenders.length === 0) {
    // Fallback for cases not explicitly handled to prevent an error with 'in' queries
    return { gender: [userGender], orientation: [userOrientation] };
  }

  return { gender: compatibleGenders, orientation: compatibleOrientations };
}

export const recommendationsFunctions = {
  getRecommendations,
};
