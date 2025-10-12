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

      // 🛑 CRITICAL CHECK: Return empty if the current user is in an active match
      // The `isAvailable` field should be set to `false` by a Match creation/update trigger.
      const isAvailable = currentUserData?.isAvailable !== false;

      if (!isAvailable) {
        return { recommendations: [] };
      }
      // 🛑 END CRITICAL CHECK

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

      // Step 1.5: Preload blocked users for filtering
      let blockedUserIds = new Set<string>();
      try {
        const blockedSnapshot = await db
          .collection("users")
          .doc(userId)
          .collection("blocked")
          .get();
        blockedUserIds = new Set(blockedSnapshot.docs.map((d) => d.id));
      } catch (error) {
        console.error("Error loading blocked users:", error);
      }

      // Create filter set for users to exclude (swiped + blocked + current user)
      const matchedUserIds = new Set<string>();
      matchedUserIds.add(userId); // Add current user to avoid self-match
      for (const id of swipedUserIds) {
        matchedUserIds.add(id);
      }
      for (const id of blockedUserIds) {
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
            // 💡 SCALABILITY FIX: Filter users who are not available (in a match)
            .where("isAvailable", "==", true)
            .get();

          swipedUsers = swipedUsersSnapshot.docs
            .filter((doc) => {
              const userData = doc.data();
              // Filter by isActive (isAvailable is already filtered by the query)
              const isActive = userData?.isActive !== false;
              return isActive;
            })
            .map((doc) => {
              const userData = doc.data();
              const { images, email, ...userDataWithoutSensitiveInfo } =
                userData;
              return { uid: doc.id, ...userDataWithoutSensitiveInfo };
            });
        }
      }

      // Step 3: Fetch users with similar age/year (medium priority)
      let ageYearUsers: any[] = [];
      const userAge = currentUserData?.age ?? -1;
      const userYear = currentUserData?.yearLevel ?? null;

      const compatibilityData = getCompatibilityQuery(currentUserData);

      if (
        userAge !== -1 &&
        userYear &&
        compatibilityData.orientation.length > 0 &&
        compatibilityData.gender.length > 0
      ) {
        try {
          const ageLower = userAge - 2;
          const ageUpper = userAge + 2;

          const ageYearSnapshot = await db
            .collection("users")
            .where("age", ">=", ageLower)
            .where("age", "<=", ageUpper)
            .where("yearLevel", "==", userYear)
            .where("sexualOrientation", "in", compatibilityData.orientation)
            .where("gender", "in", compatibilityData.gender)
            .where("isAvailable", "==", true)
            .limit(100)
            .get();

          ageYearUsers = ageYearSnapshot.docs
            .filter((doc) => {
              if (matchedUserIds.has(doc.id)) {
                return false;
              }
              const userData = doc.data();
              const isActive = userData?.isActive !== false;
              return isActive;
            })
            .map((doc) => {
              const userData = doc.data();
              const { images, email, ...userDataWithoutSensitiveInfo } =
                userData;
              return { uid: doc.id, ...userDataWithoutSensitiveInfo };
            })
            .slice(0, 50);
        } catch (error) {
          console.error("Error fetching age/year users:", error);
          ageYearUsers = [];
        }
      }

      // Step 4: Fetch availability-based users (medium priority)
      let availabilityUsers: any[] = [];
      const userAvailability = currentUserData?.availability ?? -1;
      const useAvailabilityMatching = userAvailability !== -1;

      if (useAvailabilityMatching) {
        const availabilityValue = userAvailability % 1;
        const lowerBound = availabilityValue - 0.15;
        const upperBound = availabilityValue + 0.15;
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
              // 💡 SCALABILITY FIX: Filter users who are not available (in a match)
              .where("isAvailable", "==", true)
              .limit(100)
              .get();

            availabilityUsers = availabilitySnapshot.docs
              .filter((doc) => {
                if (matchedUserIds.has(doc.id)) return false;
                const userData = doc.data();
                // Filter by isActive (isAvailable is already filtered by the query)
                const isActive = userData?.isActive !== false;
                return isActive;
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

      // Step 5: Fetch general users as fallback (lowest priority)
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
            // 💡 SCALABILITY FIX: Filter users who are not available (in a match)
            .where("isAvailable", "==", true)
            .limit(100)
            .get();

          generalUsers = generalSnapshot.docs
            .filter((doc) => {
              if (matchedUserIds.has(doc.id)) return false;
              const userData = doc.data();
              // Filter by isActive (isAvailable is already filtered by the query)
              const isActive = userData?.isActive !== false;
              return isActive;
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

      // Step 6: Merge results in priority order

      shuffleArray(swipedUsers);
      shuffleArray(ageYearUsers);
      shuffleArray(availabilityUsers);
      shuffleArray(generalUsers);

      // Merge with de-dup and cap by finalRecsLimit
      const seen = new Set<string>();
      const merged: any[] = [];
      const pushUnique = (arr: any[]) => {
        console.log(
          "🔥 Backend getRecommendations: Processing array with",
          arr.length,
          "users"
        );
        for (const u of arr) {
          const id = u.uid;
          if (!seen.has(id)) {
            seen.add(id);
            merged.push(u);
            console.log(
              "🔥 Backend getRecommendations: Added user",
              id,
              "to merged results. Total:",
              merged.length
            );
            if (merged.length >= finalRecsLimit) {
              console.log(
                "🔥 Backend getRecommendations: Reached finalRecsLimit of",
                finalRecsLimit
              );
              return true;
            }
          } else {
            console.log(
              "🔥 Backend getRecommendations: Skipping duplicate user",
              id
            );
          }
        }
        return false;
      };

      console.log("🔥 Backend getRecommendations: Starting merge process");
      if (!pushUnique(swipedUsers)) {
        console.log("🔥 Backend getRecommendations: Adding ageYearUsers");
        if (!pushUnique(ageYearUsers)) {
          console.log(
            "🔥 Backend getRecommendations: Adding availabilityUsers"
          );
          if (!pushUnique(availabilityUsers)) {
            console.log("🔥 Backend getRecommendations: Adding generalUsers");
            pushUnique(generalUsers);
          }
        }
      }

      console.log(
        "🔥 Backend getRecommendations: Final merged recommendations count:",
        merged.length
      );
      console.log(
        "🔥 Backend getRecommendations: Final recommendations:",
        merged.map((u) => ({
          uid: u.uid,
          firstName: u.firstName,
          gender: u.gender,
          sexualOrientation: u.sexualOrientation,
        }))
      );

      functions.logger.info("🔥 Backend getRecommendations: Final results", {
        userId,
        recommendationsCount: merged.length,
        recommendations: merged.map((u) => ({
          uid: u.uid,
          firstName: u.firstName,
          gender: u.gender,
          sexualOrientation: u.sexualOrientation,
        })),
      });

      return { recommendations: merged };
    } catch (error: any) {
      console.error(
        "🔥 Backend getRecommendations: Function error occurred:",
        error
      );
      console.error(
        "🔥 Backend getRecommendations: Error message:",
        error.message
      );
      console.error("🔥 Backend getRecommendations: Error stack:", error.stack);
      if (error instanceof functions.https.HttpsError) {
        console.log("🔥 Backend getRecommendations: Re-throwing HttpsError");
        throw error;
      }
      console.log("🔥 Backend getRecommendations: Throwing new internal error");
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
  console.log("🔥 getCompatibilityQuery: Starting compatibility calculation");
  const userGender = currentUserData?.gender;
  const userOrientation = currentUserData?.sexualOrientation;
  console.log("🔥 getCompatibilityQuery: User gender:", userGender);
  console.log("🔥 getCompatibilityQuery: User orientation:", userOrientation);

  // Guard: if missing data, return empty arrays so callers can skip invalid 'in' queries
  if (!userGender || !userOrientation) {
    console.log(
      "🔥 getCompatibilityQuery: Missing gender or orientation data, returning empty arrays"
    );
    return { gender: [], orientation: [] };
  }
  let compatibleGenders: string[] = [];
  let compatibleOrientations: string[] = [];

  switch (userOrientation) {
    case "Heterosexual":
      console.log(
        "🔥 getCompatibilityQuery: Processing Heterosexual orientation"
      );
      if (userGender === "Male") {
        compatibleGenders.push("Female");
        compatibleOrientations.push("Heterosexual", "Bisexual", "Pansexual");
        console.log(
          "🔥 getCompatibilityQuery: Male heterosexual - looking for females with any orientation"
        );
      } else if (userGender === "Female") {
        compatibleGenders.push("Male");
        compatibleOrientations.push("Heterosexual", "Bisexual", "Pansexual");
        console.log(
          "🔥 getCompatibilityQuery: Female heterosexual - looking for males with any orientation"
        );
      }
      break;

    case "Homosexual":
      console.log(
        "🔥 getCompatibilityQuery: Processing Homosexual orientation"
      );
      if (userGender === "Male") {
        compatibleGenders.push("Male");
        compatibleOrientations.push("Homosexual", "Bisexual", "Pansexual");
        console.log(
          "🔥 getCompatibilityQuery: Male homosexual - looking for males with compatible orientations"
        );
      } else if (userGender === "Female") {
        compatibleGenders.push("Female");
        compatibleOrientations.push("Homosexual", "Bisexual", "Pansexual");
        console.log(
          "🔥 getCompatibilityQuery: Female homosexual - looking for females with compatible orientations"
        );
      }
      break;

    case "Bisexual":
      console.log("🔥 getCompatibilityQuery: Processing Bisexual orientation");
      if (userGender === "Male" || userGender === "Female") {
        compatibleGenders.push("Male", "Female");
        compatibleOrientations.push(
          "Bisexual",
          "Pansexual",
          "Heterosexual",
          "Homosexual"
        );
        console.log(
          "🔥 getCompatibilityQuery: Bisexual - looking for any gender with any orientation"
        );
      }
      break;

    case "Pansexual":
      console.log("🔥 getCompatibilityQuery: Processing Pansexual orientation");
      compatibleGenders.push("Male", "Female", "Non-Binary");
      compatibleOrientations.push(
        "Bisexual",
        "Pansexual",
        "Heterosexual",
        "Homosexual"
      );
      console.log(
        "🔥 getCompatibilityQuery: Pansexual - looking for any gender with any orientation"
      );
      break;

    default:
      console.log(
        "🔥 getCompatibilityQuery: Unknown orientation:",
        userOrientation,
        "- using fallback"
      );
      // Fallback for unknown orientations: narrow to user's own values
      compatibleGenders.push(userGender);
      compatibleOrientations.push(userOrientation);
      break;
  }

  if (compatibleGenders.length === 0) {
    console.log(
      "🔥 getCompatibilityQuery: No compatible genders found, returning empty arrays"
    );
    // As a final safeguard, return empty arrays so callers skip querying
    return { gender: [], orientation: [] };
  }

  console.log(
    "🔥 getCompatibilityQuery: Final compatible genders:",
    compatibleGenders
  );
  console.log(
    "🔥 getCompatibilityQuery: Final compatible orientations:",
    compatibleOrientations
  );
  return { gender: compatibleGenders, orientation: compatibleOrientations };
}

/**
 * Unblocks a user by removing them from the current user's blocked subcollection
 */
export const unblockUser = functions.https.onCall(
  {
    region: "us-central1",
    memory: "256MiB",
    timeoutSeconds: 30,
    minInstances: 0,
    maxInstances: 10,
    concurrency: 80,
    cpu: 1,
    ingressSettings: "ALLOW_ALL",
    invoker: "public",
  },
  async (request: CallableRequest<{ blockedUserId: string }>) => {
    try {
      if (!request.auth) {
        throw new functions.https.HttpsError(
          "unauthenticated",
          "User must be authenticated"
        );
      }

      const userId = request.auth.uid;
      const { blockedUserId } = request.data;

      if (!blockedUserId) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "blockedUserId is required"
        );
      }

      // Remove from blocked subcollection
      await db
        .collection("users")
        .doc(userId)
        .collection("blocked")
        .doc(blockedUserId)
        .delete();

      return { success: true, message: "User unblocked successfully" };
    } catch (error: any) {
      console.error("Error unblocking user:", error);
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }
      throw new functions.https.HttpsError(
        "internal",
        "Failed to unblock user"
      );
    }
  }
);

export const recommendationsFunctions = {
  getRecommendations,
  unblockUser,
};
