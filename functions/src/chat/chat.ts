import * as functions from "firebase-functions/v2";
import * as admin from "firebase-admin";
import { StreamChat } from "stream-chat";
import { CallableRequest } from "firebase-functions/v2/https";
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
 * Exposes Stream API key to frontend
 */
export const getStreamApiKey = functions.https.onCall(
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
  async (request: CallableRequest) => {
    try {
      console.log("getStreamApiKey function called");

      if (!request.auth) {
        console.log("getStreamApiKey - User not authenticated");
        throw new functions.https.HttpsError(
          "unauthenticated",
          "User must be authenticated"
        );
      }

      // Get Stream API key from Secret Manager
      const [streamApiKeyVersion] = await secretManager.accessSecretVersion({
        name: "projects/harbor-ch/secrets/STREAM_API_KEY/versions/latest",
      });

      const apiKey = streamApiKeyVersion.payload?.data?.toString() || "";

      if (!apiKey) {
        throw new functions.https.HttpsError(
          "internal",
          "Stream API key not found"
        );
      }

      console.log("getStreamApiKey - API key retrieved successfully");
      return { apiKey };
    } catch (error: any) {
      console.error("getStreamApiKey - Error:", error);
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }
      throw new functions.https.HttpsError(
        "internal",
        "Failed to get Stream API key"
      );
    }
  }
);

/**
 * Generates Stream Chat token for authenticated user
 */
export const generateUserToken = functions.https.onCall(
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
  async (request: CallableRequest) => {
    try {
      console.log("generateUserToken function called with:", request.data);

      if (!request.auth) {
        console.log("generateUserToken - User not authenticated");
        throw new functions.https.HttpsError(
          "unauthenticated",
          "User must be authenticated"
        );
      }

      const userId = request.auth.uid;
      console.log("generateUserToken - Generating token for user:", userId);

      // Verify user exists in Firestore
      const userDoc = await db.collection("users").doc(userId).get();
      if (!userDoc.exists) {
        console.log("generateUserToken - User not found:", userId);
        throw new functions.https.HttpsError("not-found", "User not found");
      }

      const serverClient = await getStreamClient();
      const token = serverClient.createToken(userId);

      console.log(
        "generateUserToken - Token generated successfully for user:",
        userId
      );
      return { token };
    } catch (error: any) {
      console.error("generateUserToken - Error:", error);
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }
      throw new functions.https.HttpsError(
        "internal",
        "Failed to generate token"
      );
    }
  }
);

// Alias for the client-side call
export const generateToken = functions.https.onCall(
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
      console.log("generateToken function called with:", request.data);

      if (!request.auth) {
        console.log("generateToken - User not authenticated");
        throw new functions.https.HttpsError(
          "unauthenticated",
          "User must be authenticated"
        );
      }

      const { userId } = request.data;
      if (!userId) {
        console.log("generateToken - No userId provided");
        throw new functions.https.HttpsError(
          "invalid-argument",
          "User ID is required"
        );
      }

      console.log("generateToken - Generating token for user:", userId);

      // Verify user exists in Firestore
      const userDoc = await db.collection("users").doc(userId).get();
      if (!userDoc.exists) {
        console.log("generateToken - User not found:", userId);
        throw new functions.https.HttpsError("not-found", "User not found");
      }

      const serverClient = await getStreamClient();
      const token = serverClient.createToken(userId);

      console.log(
        "generateToken - Token generated successfully for user:",
        userId
      );
      return { token };
    } catch (error: any) {
      console.error("generateToken - Error:", error);
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }
      throw new functions.https.HttpsError(
        "internal",
        "Failed to generate token"
      );
    }
  }
);

/**
 * Creates a chat channel between two users
 */
export const createChatChannel = functions.https.onCall(
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
  async (request: CallableRequest<{ userId1: string; userId2: string }>) => {
    try {
      if (!request.auth) {
        throw new functions.https.HttpsError(
          "unauthenticated",
          "User must be authenticated"
        );
      }

      const { userId1, userId2 } = request.data;

      if (!userId1 || !userId2) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Missing userId1 or userId2"
        );
      }

      // Verify both users exist
      const [user1Doc, user2Doc] = await Promise.all([
        db.collection("users").doc(userId1).get(),
        db.collection("users").doc(userId2).get(),
      ]);

      if (!user1Doc.exists || !user2Doc.exists) {
        throw new functions.https.HttpsError(
          "not-found",
          "One or both users not found"
        );
      }

      const serverClient = await getStreamClient();

      // Create channel ID (sorted to ensure consistency)
      const channelId = [userId1, userId2].sort().join("-");

      // Create or get the channel
      const channel = serverClient.channel("messaging", channelId, {
        members: [userId1, userId2],
        created_by_id: request.auth.uid,
      });

      try {
        await channel.create();
      } catch (err: any) {
        if (err && err.code === 16) {
          // Channel already exists, just use it
          await channel.watch();
        } else {
          throw err;
        }
      }

      return { channel: channel.data };
    } catch (error) {
      console.error("Error creating chat channel:", error);
      throw new functions.https.HttpsError(
        "internal",
        "Failed to create chat channel"
      );
    }
  }
);

/**
 * Updates chat channel status (freeze/unfreeze)
 */
export const updateChannelChatStatus = functions.https.onCall(
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
  async (request: CallableRequest<{ channelId: string; freeze: boolean }>) => {
    try {
      if (!request.auth) {
        throw new functions.https.HttpsError(
          "unauthenticated",
          "User must be authenticated"
        );
      }

      const { channelId, freeze } = request.data;

      if (!channelId || freeze === undefined) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Missing channelId or freeze status"
        );
      }

      const serverClient = await getStreamClient();
      const channel = serverClient.channel("messaging", channelId);

      if (freeze) {
        await channel.update({ frozen: true });
      } else {
        await channel.update({ frozen: false });
      }

      return { channel: channel.data };
    } catch (error) {
      console.error("Error updating channel status:", error);
      throw new functions.https.HttpsError(
        "internal",
        "Failed to update channel status"
      );
    }
  }
);

/**
 * Updates message count for a match
 */
export const updateMessageCount = functions.https.onCall(
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
  async (request: CallableRequest<{ matchId: string }>) => {
    try {
      if (!request.auth) {
        throw new functions.https.HttpsError(
          "unauthenticated",
          "User must be authenticated"
        );
      }

      const { matchId } = request.data;

      if (!matchId) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Missing matchId"
        );
      }

      // Increment message count in Firestore
      await db
        .collection("matches")
        .doc(matchId)
        .update({
          messageCount: admin.firestore.FieldValue.increment(1),
          updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        });

      return { success: true };
    } catch (error) {
      console.error("Error updating message count:", error);
      throw new functions.https.HttpsError(
        "internal",
        "Failed to update message count"
      );
    }
  }
);

export const chatFunctions = {
  generateUserToken,
  generateToken,
  getStreamApiKey,
  createChatChannel,
  createChannel: createChatChannel, // Alias for client-side call
  updateChannelChatStatus,
  updateMessageCount,
};
