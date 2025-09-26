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
 * SCALABILITY IMPROVEMENT: This function now relies on an 'isAvailable: boolean'
 * field on the user document for efficient filtering of users currently in a match.
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

      // Daily limits and dynamic recommendation sizing
      const MAX_SWIPES_PER_DAY = 5;
      const MAX_RECS_TO_FETCH = 10;

      const userDoc = await db.collection("users").doc(userId).get();
      if (!userDoc.exists) {
        throw new functions.https.HttpsError("not-found", "User not found");
      }

      const currentUserData = userDoc.data();
      if (!currentUserData) {
        throw new functions.https.HttpsError(
          "not-found",
          "User data not found"
        );
      }

      // Check if user account is active
      if (currentUserData?.isActive === false) {
        return { recommendations: [] };
      }

      // Check if user is currently in a match (isAvailable defaults to true if not set)
      const isAvailable = currentUserData?.isAvailable !== false;
      if (!isAvailable) {
        return { recommendations: [] };
      }

      // NEW: determine today's swipe count from counters subdoc and compute target limit
      const countersRef = db
        .collection("users")
        .doc(userId)
        .collection("counters")
        .doc("swipes");
      const countersSnap = await countersRef.get();
      const cData = countersSnap.exists ? (countersSnap.data() as any) : {};
      const swipesMadeToday = Number(cData?.count || 0);

      const remainingSwipes = Math.max(0, MAX_SWIPES_PER_DAY - swipesMadeToday);
      if (remainingSwipes === 0) {
        return { recommendations: [] };
      }

      const finalRecsLimit = Math.max(0, MAX_RECS_TO_FETCH - swipesMadeToday);

      // Step 1: Preload swipes to filter out irrelevant users early
      // Prefer per-user subcollection; fallback to flat collection
      let swipedUserIds = new Set<string>();
      try {
        const outgoing = await db
          .collection("swipes")
          .doc(userId)
          .collection("outgoing")
          .get();
        swipedUserIds = new Set(outgoing.docs.map((d) => d.id));
      } catch (_e) {
        const mySwipesSnapshot = await db
          .collection("swipes")
          .where("swiperId", "==", userId)
          .get();
        swipedUserIds = new Set(
          mySwipesSnapshot.docs.map((doc) => doc.data().swipedId)
        );
      }

      // Create filter set for users to exclude (swiped users + current user)
      const matchedUserIds = new Set<string>();
      matchedUserIds.add(userId); // Add current user to avoid self-match
      for (const id of swipedUserIds) {
        matchedUserIds.add(id);
      }

      // Step 2: Get users who swiped on you (highest priority)
      let whoSwipedOnYouIds: string[] = [];
      const incomingSnapshot = await db
        .collection("swipes")
        .doc(userId)
        .collection("incoming")
        .where("direction", "==", "right")
        .get();
      whoSwipedOnYouIds = incomingSnapshot.docs.map((d) => d.id);

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

          swipedUsers = swipedUsersSnapshot.docs
            .filter((doc) => {
              const userData = doc.data();
              // Filter by isActive and isAvailable (defaults to true if not set)
              const isActive = userData?.isActive !== false;
              const isAvailable = userData?.isAvailable !== false;
              return isActive && isAvailable;
            })
            .map((doc) => {
              const userData = doc.data();
              const { images, email, ...userDataWithoutSensitiveInfo } =
                userData;
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
        if (
          compatibilityData.orientation.length > 0 &&
          compatibilityData.gender.length > 0
        ) {
          try {
            // Fetch a wider pool, filter out excluded users in memory
            const availabilitySnapshot = await db
              .collection("users")
              .where("availability", ">=", lowerBound)
              .where("availability", "<=", upperBound)
              .where("sexualOrientation", "in", compatibilityData.orientation)
              .where("gender", "in", compatibilityData.gender)
              .limit(100)
              .get();

            availabilityUsers = availabilitySnapshot.docs
              .filter((doc) => {
                if (matchedUserIds.has(doc.id)) return false;
                const userData = doc.data();
                // Filter by isActive and isAvailable (defaults to true if not set)
                const isActive = userData?.isActive !== false;
                const isAvailable = userData?.isAvailable !== false;
                return isActive && isAvailable;
              })
              .map((doc) => {
                const userData = doc.data();
                const { images, email, ...userDataWithoutSensitiveInfo } =
                  userData;
                return { uid: doc.id, ...userDataWithoutSensitiveInfo };
              })
              .slice(0, 50);
          } catch (error) {
            console.error("Error fetching availability users:", error);
            availabilityUsers = [];
          }
        }
      }

      // Step 4: Fetch general users as fallback (lowest priority)
      const compatibilityData = getCompatibilityQuery(currentUserData);
      let generalUsers: any[] = [];
      if (
        compatibilityData.orientation.length > 0 &&
        compatibilityData.gender.length > 0
      ) {
        try {
          const generalSnapshot = await db
            .collection("users")
            .where("sexualOrientation", "in", compatibilityData.orientation)
            .where("gender", "in", compatibilityData.gender)
            .limit(100)
            .get();

          generalUsers = generalSnapshot.docs
            .filter((doc) => {
              if (matchedUserIds.has(doc.id)) return false;
              const userData = doc.data();
              // Filter by isActive and isAvailable (defaults to true if not set)
              const isActive = userData?.isActive !== false;
              const isAvailable = userData?.isAvailable !== false;
              return isActive && isAvailable;
            })
            .map((doc) => {
              const userData = doc.data();
              const { images, email, ...userDataWithoutSensitiveInfo } =
                userData;
              return { uid: doc.id, ...userDataWithoutSensitiveInfo };
            })
            .slice(0, 50);
        } catch (error) {
          console.error("Error fetching general users:", error);
          generalUsers = [];
        }
      }

      // Step 5: Merge results in priority order
      shuffleArray(swipedUsers);
      shuffleArray(availabilityUsers);
      shuffleArray(generalUsers);

      // Merge with de-dup and cap by finalRecsLimit
      const seen = new Set<string>();
      const merged: any[] = [];
      const pushUnique = (arr: any[]) => {
        for (const u of arr) {
          const id = u.uid;
          if (!seen.has(id)) {
            seen.add(id);
            merged.push(u);
            if (merged.length >= finalRecsLimit) return true;
          }
        }
        return false;
      };

      if (!pushUnique(swipedUsers)) {
        if (!pushUnique(availabilityUsers)) {
          pushUnique(generalUsers);
        }
      }

      return { recommendations: merged };
    } catch (error: any) {
      console.error("Recommendations function error:", error);
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
  const userGender = currentUserData?.gender;
  const userOrientation = currentUserData?.sexualOrientation;

  // Guard: if missing data, return empty arrays so callers can skip invalid 'in' queries
  if (!userGender || !userOrientation) {
    return { gender: [], orientation: [] };
  }
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
      // Fallback for unknown orientations: narrow to user's own values
      compatibleGenders.push(userGender);
      compatibleOrientations.push(userOrientation);
      break;
  }

  if (compatibleGenders.length === 0) {
    // As a final safeguard, return empty arrays so callers skip querying
    return { gender: [], orientation: [] };
  }

  return { gender: compatibleGenders, orientation: compatibleOrientations };
}

export const recommendationsFunctions = {
  getRecommendations,
};
