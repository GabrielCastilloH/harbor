import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

const db = admin.firestore();

/**
 * Creates a match between two users
 * @param req Request containing user1Id and user2Id
 * @param res Response with match ID
 */
export const createMatch = functions.https.onRequest(async (req, res) => {
  // Enable CORS
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "POST");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  try {
    const { user1Id, user2Id } = req.body;

    if (!user1Id || !user2Id) {
      res.status(400).json({ message: "Both user IDs are required" });
      return;
    }

    console.log("Creating match for users:", { user1Id, user2Id });

    // Check if users exist
    const [user1Doc, user2Doc] = await Promise.all([
      db.collection("users").doc(user1Id).get(),
      db.collection("users").doc(user2Id).get(),
    ]);

    if (!user1Doc.exists || !user2Doc.exists) {
      res.status(404).json({ message: "One or both users not found" });
      return;
    }

    const user1 = user1Doc.data();
    const user2 = user2Doc.data();

    console.log("Current matches for users:", {
      user1Matches: user1?.currentMatches || [],
      user2Matches: user2?.currentMatches || [],
    });

    // Check if a match already exists between these users
    const existingMatch = await findMatchByUsers(user1Id, user2Id);

    if (existingMatch) {
      console.log("Match already exists, returning existing match");
      res.status(200).json({
        message: "Match already exists",
        matchId: existingMatch.id,
      });
      return;
    }

    // Check if users can add new matches
    const [canUser1Match, canUser2Match] = await Promise.all([
      canAddMatch(user1Id),
      canAddMatch(user2Id),
    ]);

    if (!canUser1Match || !canUser2Match) {
      res.status(403).json({
        message: "One or both users cannot add more matches",
        canUser1Match,
        canUser2Match,
      });
      return;
    }

    // Create the match
    const matchData = {
      user1Id,
      user2Id,
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
        .doc(user1Id)
        .update({
          currentMatches: admin.firestore.FieldValue.arrayUnion(matchRef.id),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }),
      db
        .collection("users")
        .doc(user2Id)
        .update({
          currentMatches: admin.firestore.FieldValue.arrayUnion(matchRef.id),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }),
    ]);

    res.status(201).json({
      message: "Match created successfully",
      matchId: matchRef.id,
    });
  } catch (error) {
    console.error("Error creating match:", error);
    res.status(500).json({
      message: "Failed to create match",
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * Gets active matches for a user
 * @param req Request containing user ID
 * @param res Response with array of matches
 */
export const getActiveMatches = functions.https.onRequest(async (req, res) => {
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

    const matchesSnapshot = await db
      .collection("matches")
      .where("isActive", "==", true)
      .where(admin.firestore.FieldPath.documentId(), "in", [])
      .get();

    // Get user's current matches
    const userDoc = await db.collection("users").doc(id).get();
    if (!userDoc.exists) {
      res.status(404).json({ message: "User not found" });
      return;
    }

    const userData = userDoc.data();
    const currentMatches = userData?.currentMatches || [];

    if (currentMatches.length === 0) {
      res.status(200).json({ matches: [] });
      return;
    }

    // Get the actual match documents
    const matchDocs = await Promise.all(
      currentMatches.map((matchId: string) =>
        db.collection("matches").doc(matchId).get()
      )
    );

    const matches = matchDocs
      .filter((doc) => doc.exists)
      .map((doc) => ({
        _id: doc.id,
        ...doc.data(),
      }))
      .filter((match) => match.isActive);

    res.status(200).json({ matches });
  } catch (error) {
    console.error("Error getting active matches:", error);
    res.status(500).json({
      message: "Failed to get active matches",
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * Unmatches two users
 * @param req Request containing user IDs
 * @param res Response with success status
 */
export const unmatchUsers = functions.https.onRequest(async (req, res) => {
  // Enable CORS
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "POST");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  try {
    const { user1Id, user2Id } = req.body;

    if (!user1Id || !user2Id) {
      res.status(400).json({ message: "Both user IDs are required" });
      return;
    }

    // Find the match between these users
    const match = await findMatchByUsers(user1Id, user2Id);

    if (!match) {
      res.status(404).json({ message: "Match not found" });
      return;
    }

    // Deactivate the match
    await db.collection("matches").doc(match.id).update({
      isActive: false,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });

    // Remove match from both users' currentMatches arrays
    await Promise.all([
      db
        .collection("users")
        .doc(user1Id)
        .update({
          currentMatches: admin.firestore.FieldValue.arrayRemove(match.id),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }),
      db
        .collection("users")
        .doc(user2Id)
        .update({
          currentMatches: admin.firestore.FieldValue.arrayRemove(match.id),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        }),
    ]);

    res.status(200).json({
      message: "Users unmatched successfully",
      matchId: match.id,
    });
  } catch (error) {
    console.error("Error unmatching users:", error);
    res.status(500).json({
      message: "Failed to unmatch users",
      error: error instanceof Error ? error.message : String(error),
    });
  }
});

/**
 * Updates match channel ID
 * @param req Request containing match ID and channel ID
 * @param res Response with success status
 */
export const updateMatchChannel = functions.https.onRequest(
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
      const { matchId } = req.params;
      const { channelId } = req.body;

      if (!matchId || !channelId) {
        res
          .status(400)
          .json({ message: "Match ID and channel ID are required" });
        return;
      }

      await db.collection("matches").doc(matchId).update({
        channelId,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      res.status(200).json({
        message: "Match channel updated successfully",
      });
    } catch (error) {
      console.error("Error updating match channel:", error);
      res.status(500).json({
        message: "Failed to update match channel",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
);

/**
 * Increments message count for a match
 * @param req Request containing match ID
 * @param res Response with success status
 */
export const incrementMatchMessages = functions.https.onRequest(
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
      const { matchId } = req.params;

      if (!matchId) {
        res.status(400).json({ message: "Match ID is required" });
        return;
      }

      await db
        .collection("matches")
        .doc(matchId)
        .update({
          messageCount: admin.firestore.FieldValue.increment(1),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

      res.status(200).json({
        message: "Message count incremented successfully",
      });
    } catch (error) {
      console.error("Error incrementing message count:", error);
      res.status(500).json({
        message: "Failed to increment message count",
        error: error instanceof Error ? error.message : String(error),
      });
    }
  }
);

/**
 * Helper function to find a match between two users
 * @param user1Id First user ID
 * @param user2Id Second user ID
 * @returns Promise<FirebaseFirestore.QueryDocumentSnapshot | null> Match document or null
 */
async function findMatchByUsers(user1Id: string, user2Id: string) {
  const matchesSnapshot = await db
    .collection("matches")
    .where("isActive", "==", true)
    .where(admin.firestore.FieldPath.documentId(), "in", [])
    .get();

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

export const matchFunctions = {
  createMatch,
  getActiveMatches,
  unmatchUsers,
  updateMatchChannel,
  incrementMatchMessages,
};
