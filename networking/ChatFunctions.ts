import { getFunctions, httpsCallable } from "firebase/functions";
import app from "../firebaseConfig";
import { logToNtfy } from "../util/debugUtils";

const functions = getFunctions(app, "us-central1");

export class ChatFunctions {
  static async getStreamApiKey() {
    console.log("ChatFunctions - getStreamApiKey called");

    try {
      const getStreamApiKey = httpsCallable(functions, "chat-getStreamApiKey");
      const result = await getStreamApiKey();
      const data = result.data as { apiKey: string };

      console.log("ChatFunctions - API Key retrieved");
      return data.apiKey;
    } catch (error: any) {
      console.error("ChatFunctions - Error getting API key:", error);
      throw error;
    }
  }

  static async generateToken(userId: string) {
    console.log("ChatFunctions - generateToken called with:", userId);
    await logToNtfy(
      `ChatFunctions - generateToken called with userId: ${userId}`
    );

    try {
      const generateToken = httpsCallable(functions, "chat-generateUserToken");
      const result = await generateToken({ userId });
      const data = result.data as { token: string };

      console.log("ChatFunctions - Token generated:", data);
      await logToNtfy(
        `ChatFunctions - generateToken success for userId: ${userId}`
      );
      return data.token;
    } catch (error: any) {
      await logToNtfy(
        `ChatFunctions - Token fetch error for ${userId}: ${error.message}`
      );
      console.error("ChatFunctions - Token fetch error:", error);
      throw error;
    }
  }

  static async createChannel(channelData: any) {
    console.log("ChatFunctions - createChannel called with:", channelData);
    await logToNtfy(
      `ChatFunctions - createChannel called with: ${JSON.stringify(
        channelData
      )}`
    );

    try {
      const createChannel = httpsCallable(functions, "chat-createChatChannel");
      const result = await createChannel(channelData);
      const data = result.data as any;

      console.log("ChatFunctions - Channel created:", data);
      await logToNtfy(`ChatFunctions - createChannel success`);
      return data;
    } catch (error: any) {
      await logToNtfy(
        `ChatFunctions - Channel creation error: ${error.message}`
      );
      console.error("ChatFunctions - Channel creation error:", error);
      throw error;
    }
  }
}

export async function fetchUpdateChannelChatStatus(
  channelId: string,
  freeze: boolean
): Promise<any> {
  console.log(
    "ChatFunctions - Updating channel:",
    channelId,
    "frozen:",
    freeze
  );

  try {
    const updateChannelChatStatus = httpsCallable(
      functions,
      "chat-updateChannelChatStatus"
    );
    const result = await updateChannelChatStatus({ channelId, freeze });
    const data = result.data as { channel: any };

    console.log("ChatFunctions - Channel updated:", data.channel);
    return data.channel;
  } catch (error) {
    console.error("ChatFunctions - Error updating channel:", error);
    throw new Error("Failed to update chat channel status");
  }
}

export async function updateMessageCount(matchId: string): Promise<void> {
  console.log("ChatFunctions - Updating message count for match:", matchId);

  try {
    const updateMessageCount = httpsCallable(
      functions,
      "chat-updateMessageCount"
    );
    const result = await updateMessageCount({ matchId });
    const data = result.data as { success: boolean };

    console.log("ChatFunctions - Message count updated:", data);
  } catch (error) {
    console.error("ChatFunctions - Error updating message count:", error);
    throw new Error("Failed to update message count");
  }
}
