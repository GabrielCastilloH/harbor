import * as functions from "firebase-functions";
import * as admin from "firebase-admin";
import { StreamChat } from "stream-chat";
import { SecretManagerServiceClient } from "@google-cloud/secret-manager";

const db = admin.firestore();
const secretManager = new SecretManagerServiceClient();

let streamClient: StreamChat | null = null;

/**
 * Initialize Stream Chat client with secrets from Google Secret Manager
 */
async function getStreamClient(): Promise<StreamChat> {
  if (streamClient) return streamClient;

  try {
    // Get Stream API credentials from Secret Manager
    const [streamApiKeyVersion] = await secretManager.accessSecretVersion({
      name: "projects/harbor-ch/secrets/STREAM_API_KEY/versions/latest",
    });
    const [streamApiSecretVersion] = await secretManager.accessSecretVersion({
      name: "projects/harbor-ch/secrets/STREAM_API_SECRET/versions/latest",
    });

    const apiKey = streamApiKeyVersion.payload?.data?.toString() || "";
    const apiSecret = streamApiSecretVersion.payload?.data?.toString() || "";

    if (!apiKey || !apiSecret) {
      throw new Error("Missing Stream API credentials");
    }

    streamClient = StreamChat.getInstance(apiKey, apiSecret);
    return streamClient;
  } catch (error) {
    console.error("Error getting Stream client:", error);
    throw error;
  }
}

/**
 * Generates Stream Chat token for user
 * @param req Request with userId in body
 * @param res Response with token or error
 */
export const generateUserToken = functions.https.onRequest(async (req, res) => {
  // Enable CORS
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "POST");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  try {
    const { userId } = req.body;
    if (!userId) {
      res.status(400).json({ error: "Missing userId" });
      return;
    }

    const userDoc = await db.collection("users").doc(userId).get();
    if (!userDoc.exists) {
      res.status(404).json({ error: "User not found" });
      return;
    }

    const serverClient = await getStreamClient();
    const token = serverClient.createToken(userId);
    res.json({ token });
  } catch (error) {
    console.error("Error generating user token:", error);
    res.status(500).json({ error: "Failed to generate token" });
  }
});

/**
 * Creates a chat channel between two users
 * @param req Request with userId1 and userId2
 * @param res Response with channel data
 */
export const createChatChannel = functions.https.onRequest(async (req, res) => {
  // Enable CORS
  res.set("Access-Control-Allow-Origin", "*");
  res.set("Access-Control-Allow-Methods", "POST");
  res.set("Access-Control-Allow-Headers", "Content-Type, Authorization");

  if (req.method === "OPTIONS") {
    res.status(204).send("");
    return;
  }

  try {
    const { userId1, userId2 } = req.body;

    if (!userId1 || !userId2) {
      res.status(400).json({ error: "Missing userId1 or userId2" });
      return;
    }

    // Get user data
    const [user1Doc, user2Doc] = await Promise.all([
      db.collection("users").doc(userId1).get(),
      db.collection("users").doc(userId2).get(),
    ]);

    if (!user1Doc.exists || !user2Doc.exists) {
      res.status(404).json({ error: "One or both users not found" });
      return;
    }

    const user1 = user1Doc.data();
    const user2 = user2Doc.data();

    // Create channel ID (sorted to ensure consistency)
    const channelId = [userId1, userId2].sort().join("-");

    const serverClient = await getStreamClient();

    // Create or get the channel
    const channel = serverClient.channel("messaging", channelId, {
      members: [userId1, userId2],
    });

    await channel.create();

    res.json({ channel: channel.data });
  } catch (error) {
    console.error("Error creating chat channel:", error);
    res.status(500).json({ error: "Failed to create chat channel" });
  }
});

/**
 * Updates chat channel status (freeze/unfreeze)
 * @param req Request with channelId and freeze status
 * @param res Response with updated channel data
 */
export const updateChannelChatStatus = functions.https.onRequest(
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
      const { channelId, freeze } = req.body;

      if (channelId === undefined || freeze === undefined) {
        res.status(400).json({ error: "Missing channelId or freeze status" });
        return;
      }

      const serverClient = await getStreamClient();
      const channel = serverClient.channel("messaging", channelId);

      if (freeze) {
        await channel.update({ frozen: true });
      } else {
        await channel.update({ frozen: false });
      }

      res.json({ channel: channel.data });
    } catch (error) {
      console.error("Error updating channel status:", error);
      res.status(500).json({ error: "Failed to update channel status" });
    }
  }
);

/**
 * Updates message count for a match
 * @param req Request with matchId
 * @param res Response with success status
 */
export const updateMessageCount = functions.https.onRequest(
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
      const { matchId } = req.body;

      if (!matchId) {
        res.status(400).json({ error: "Missing matchId" });
        return;
      }

      // Increment message count in Firestore
      await db
        .collection("matches")
        .doc(matchId)
        .update({
          messageCount: admin.firestore.FieldValue.increment(1),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

      res.json({ success: true });
    } catch (error) {
      console.error("Error updating message count:", error);
      res.status(500).json({ error: "Failed to update message count" });
    }
  }
);

export const chatFunctions = {
  generateUserToken,
  createChatChannel,
  updateChannelChatStatus,
  updateMessageCount,
};
