import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

const db = admin.firestore();
const RECOMMENDED_COUNT = 3;
const DAILY_SWIPES = 100;

/**
 * Gets user recommendations for swiping
 * @param req Request containing user ID
 * @param res Response with array of recommended users
 */
export const getRecommendations = functions.https.onRequest(
  async (req, res) => {
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

      // Check if the user can add more matches
      const canAddMatch = await canUserAddMatch(id);
      if (!canAddMatch) {
        res.status(200).json({
          message: "User cannot add more matches",
          recommendations: [],
        });
        return;
      }

      // Check daily swipe limit
      const swipeCount = await countRecentSwipes(id);
      if (swipeCount > DAILY_SWIPES) {
        res.status(200).json({
          message: "User exceeded daily swipes",
          swipeCount,
        });
        return;
      }

      // Get all users the current user has swiped on
      const swipesSnapshot = await db
        .collection("swipes")
        .where("swiperId", "==", id)
        .get();

      const swipedIds = swipesSnapshot.docs.map((doc) => doc.data().swipedId);

      // Get current user to check if they're premium
      const currentUserDoc = await db.collection("users").doc(id).get();
      if (!currentUserDoc.exists) {
        res.status(404).json({ message: "User not found" });
        return;
      }

      const currentUser = currentUserDoc.data() as any;

      // Get all users except the current user and those already swiped
      const allUsersSnapshot = await db.collection("users").get();
      const allUsers = allUsersSnapshot.docs
        .map((doc) => ({ _id: doc.id, ...doc.data() }))
        .filter(
          (user) =>
            user._id !== id &&
            !swipedIds.includes(user._id) &&
            user._id !== currentUser.email // Also exclude by email
        );

      // Filter out users who can't add more matches (unless premium)
      const availableUsers = [];
      for (const user of allUsers) {
        const canAddMatch = await canUserAddMatch(user._id);
        if (canAddMatch) {
          availableUsers.push(user);
        }
      }

      // Shuffle and limit to recommended count
      const shuffled = availableUsers.sort(() => 0.5 - Math.random());
      const recommendations = shuffled.slice(0, RECOMMENDED_COUNT);

      res.status(200).json({
        recommendations,
        swipeCount,
        dailyLimit: DAILY_SWIPES,
      });
    } catch (error) {
      console.error("Error getting recommendations:", error);
      res.status(500).json({
        message: "Failed to get recommendations",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
);

/**
 * Helper function to check if a user can add more matches
 * @param userId User ID to check
 * @returns Promise<boolean> Whether user can add more matches
 */
async function canUserAddMatch(userId: string): Promise<boolean> {
  const userDoc = await db.collection("users").doc(userId).get();
  if (!userDoc.exists) return false;

  const userData = userDoc.data() as any;
  const currentMatches = userData?.currentMatches || [];

  // Premium users can have unlimited matches
  if (userData?.isPremium) return true;

  // Non-premium users can only have 1 match
  return currentMatches.length < 1;
}

/**
 * Helper function to count recent swipes for a user
 * @param userId User ID to count swipes for
 * @returns Promise<number> Number of swipes in last 24 hours
 */
async function countRecentSwipes(userId: string): Promise<number> {
  const twentyFourHoursAgo = new Date();
  twentyFourHoursAgo.setHours(twentyFourHoursAgo.getHours() - 24);

  const swipesSnapshot = await db
    .collection("swipes")
    .where("swiperId", "==", userId)
    .where("timestamp", ">=", twentyFourHoursAgo)
    .get();

  return swipesSnapshot.size;
}

export const recommendationFunctions = {
  getRecommendations,
};
