import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

const db = admin.firestore();
const DAILY_SWIPES = 100;

/**
 * Records a swipe and checks for matches
 * @param req Request containing swiperId, swipedId, direction
 * @param res Response with swipe record and match status
 */
export const createSwipe = functions.https.onRequest(async (req, res) => {
  // Enable CORS
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "POST");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  const { swiperId, swipedId, direction } = req.body;

  if (!swiperId || !swipedId || !direction) {
    res.status(400).json({
      message: "swiperId, swipedId, and direction are required",
    });
    return;
  }

  try {
    console.log("Processing swipe:", { swiperId, swipedId, direction });

    // Get the swiper's user data to check premium status and current matches
    const swiperDoc = await db.collection("users").doc(swiperId).get();
    if (!swiperDoc.exists) {
      res.status(404).json({ message: "Swiper user not found" });
      return;
    }

    const swiperUser = swiperDoc.data();

    // If user is not premium and already has a match, prevent the swipe
    if (!swiperUser?.isPremium && swiperUser?.currentMatches?.length > 0) {
      res.status(403).json({
        message:
          "Non-premium users cannot swipe while they have an active match",
        canSwipe: false,
      });
      return;
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

      res.status(201).json({
        message: "Swipe recorded (one or both users cannot add more matches)",
        swipe: swipeData,
        match: false,
      });
      return;
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

        res.status(201).json({
          message: "Swipe recorded and match created!",
          swipe: { id: swipeRef.id, ...swipeData },
          match: true,
          matchId: matchRef.id,
        });
        return;
      }
    }

    res.status(201).json({
      message: "Swipe recorded",
      swipe: { id: swipeRef.id, ...swipeData },
      match: false,
    });
  } catch (error) {
    console.error("Error creating swipe:", error);
    res.status(500).json({
      message: "Failed to create swipe",
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * Counts recent swipes for a user (last 24 hours)
 * @param req Request containing user ID
 * @param res Response with swipe count
 */
export const countRecentSwipes = functions.https.onRequest(async (req, res) => {
  // Enable CORS
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  try {
    const { id } = req.params;
    if (!id) {
      res.status(400).json({ message: "User ID is required" });
      return;
    }

    const twentyFourHoursAgo = new Date();
    twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

    const swipesSnapshot = await db
      .collection("swipes")
      .where("swiperId", "==", id)
      .where("timestamp", ">=", twentyFourHoursAgo)
      .get();

    const swipeCount = swipesSnapshot.size;

    res.status(200).json({
      swipeCount,
      dailyLimit: DAILY_SWIPES,
      canSwipe: swipeCount < DAILY_SWIPES,
    });
  } catch (error) {
    console.error("Error counting recent swipes:", error);
    res.status(500).json({
      message: "Failed to count recent swipes",
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * Gets all swipes by a user
 * @param req Request containing user ID
 * @param res Response with array of swipes
 */
export const getSwipesByUser = functions.https.onRequest(async (req, res) => {
  // Enable CORS
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  try {
    const { id } = req.params;
    if (!id) {
      res.status(400).json({ message: "User ID is required" });
      return;
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

    res.status(200).json(swipes);
  } catch (error) {
    console.error("Error getting swipes by user:", error);
    res.status(500).json({
      message: "Failed to get swipes by user",
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

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
