import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

const db = admin.firestore();

/**
 * Updates blur level for a match based on message count
 * @param req Request containing userId and matchedUserId
 * @param res Response with blur data
 */
export const updateBlurLevelForMessage = functions.https.onRequest(
  async (req, res) => {
    // Enable CORS
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    try {
      const { userId, matchedUserId } = req.body;

      if (!userId || !matchedUserId) {
        res.status(400).json({
          message: "User ID and matched user ID are required",
        });
        return;
      }

      // Find the match between these users
      const match = await findMatchByUsers(userId, matchedUserId);

      if (!match) {
        res.status(404).json({ message: "Match not found" });
        return;
      }

      const matchData = match as any;
      const messageCount = matchData.messageCount || 0;
      const blurPercentage = matchData.blurPercentage || 100;
      const warningShown = matchData.warningShown || false;

      // Calculate new blur level based on message count
      let newBlurPercentage = blurPercentage;
      let shouldShowWarning = false;
      let hasShownWarning = warningShown;

      if (messageCount >= 10 && blurPercentage > 0) {
        newBlurPercentage = Math.max(0, blurPercentage - 20);
        shouldShowWarning = true;
        hasShownWarning = true;
      } else if (messageCount >= 20 && blurPercentage > 0) {
        newBlurPercentage = Math.max(0, blurPercentage - 20);
        shouldShowWarning = true;
        hasShownWarning = true;
      } else if (messageCount >= 30 && blurPercentage > 0) {
        newBlurPercentage = 0; // Fully unblurred
        shouldShowWarning = true;
        hasShownWarning = true;
      }

      // Update the match with new blur level
      await db.collection("matches").doc(match.id).update({
        blurPercentage: newBlurPercentage,
        warningShown: hasShownWarning,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      res.status(200).json({
        blurPercentage: newBlurPercentage,
        shouldShowWarning,
        hasShownWarning,
        messageCount,
      });
    } catch (error) {
      console.error("Error updating blur level:", error);
      res.status(500).json({
        message: "Failed to update blur level",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
);

/**
 * Handles user response to blur warning
 * @param req Request containing matchId, userId, and agreed status
 * @param res Response with success status
 */
export const handleWarningResponse = functions.https.onRequest(
  async (req, res) => {
    // Enable CORS
    res.set("Access-Control-Allow-Origin", "*");
    res.set("Access-Control-Allow-Methods", "POST");
    res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

    if (req.method === "OPTIONS") {
      res.status(204).send("");
      return;
    }

    try {
      const { matchId, userId, agreed } = req.body;

      if (!matchId || !userId || agreed === undefined) {
        res.status(400).json({
          message: "Match ID, user ID, and agreed status are required",
        });
        return;
      }

      const matchDoc = await db.collection("matches").doc(matchId).get();
      if (!matchDoc.exists) {
        res.status(404).json({ message: "Match not found" });
        return;
      }

      const matchData = matchDoc.data() as any;
      const user1Id = matchData.user1Id;
      const user2Id = matchData.user2Id;

      // Determine which user this is and update their agreement status
      let updateData: any = {};

      if (userId === user1Id) {
        updateData.user1Agreed = agreed;
      } else if (userId === user2Id) {
        updateData.user2Agreed = agreed;
      } else {
        res.status(400).json({ message: "User is not part of this match" });
        return;
      }

      updateData.updatedAt = admin.firestore.FieldValue.serverTimestamp();

      await db.collection("matches").doc(matchId).update(updateData);

      res.status(200).json({
        message: "Warning response recorded successfully",
      });
    } catch (error) {
      console.error("Error handling warning response:", error);
      res.status(500).json({
        message: "Failed to handle warning response",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
);

/**
 * Gets blur level for a match
 * @param req Request containing user IDs
 * @param res Response with blur data
 */
export const getBlurLevel = functions.https.onRequest(async (req, res) => {
  // Enable CORS
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "GET");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  try {
    const { userId, matchedUserId } = req.params;

    if (!userId || !matchedUserId) {
      res.status(400).json({
        message: "User ID and matched user ID are required",
      });
      return;
    }

    // Find the match between these users
    const match = await findMatchByUsers(userId, matchedUserId);

    if (!match) {
      res.status(404).json({ message: "Match not found" });
      return;
    }

    const matchData = match as any;

    res.status(200).json({
      blurPercentage: matchData.blurPercentage || 100,
      hasShownWarning: matchData.warningShown || false,
      messageCount: matchData.messageCount || 0,
    });
  } catch (error) {
    console.error("Error getting blur level:", error);
    res.status(500).json({
      message: "Failed to get blur level",
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * Helper function to find a match between two users
 * @param user1Id First user ID
 * @param user2Id Second user ID
 * @returns Promise<any> Match document or null
 */
async function findMatchByUsers(user1Id: string, user2Id: string) {
  // Check both possible combinations
  const match1 = await db
    .collection("matches")
    .where("user1Id", "==", user1Id)
    .where("user2Id", "==", user2Id)
    .where("isActive", "==", true)
    .limit(1)
    .get();

  if (!match1.empty) {
    return { id: match1.docs[0].id, ...match1.docs[0].data() };
  }

  const match2 = await db
    .collection("matches")
    .where("user1Id", "==", user2Id)
    .where("user2Id", "==", user1Id)
    .where("isActive", "==", true)
    .limit(1)
    .get();

  if (!match2.empty) {
    return { id: match2.docs[0].id, ...match2.docs[0].data() };
  }

  return null;
}

export const blurFunctions = {
  updateBlurLevelForMessage,
  handleWarningResponse,
  getBlurLevel,
};
