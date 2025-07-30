import { getFunctions, httpsCallable } from "firebase/functions";
import app from "../firebaseConfig";

const functions = getFunctions(app, "us-central1");

export class ChatFunctions {
  static async getStreamApiKey() {
    try {
      const getStreamApiKey = httpsCallable(functions, "chat-getStreamApiKey");
      const result = await getStreamApiKey();
      const data = result.data as { apiKey: string };

      return data.apiKey;
    } catch (error) {
      console.error("ChatFunctions - Error getting Stream API key:", error);
      throw error;
    }
  }

  static async generateToken(userId: string) {
    try {
      const generateToken = httpsCallable(functions, "chat-generateToken");
      const result = await generateToken({ userId });
      const data = result.data as { token: string };

      return data.token;
    } catch (error) {
      console.error("ChatFunctions - Error generating token:", error);
      throw error;
    }
  }

  static async createChannel(channelData: any) {
    try {
      const createChannel = httpsCallable(functions, "chat-createChatChannel");
      const result = await createChannel(channelData);
      const data = result.data as any;

      return data;
    } catch (error) {
      console.error("ChatFunctions - Channel creation error:", error);
      throw error;
    }
  }
}

export async function fetchUpdateChannelChatStatus(
  channelId: string,
  freeze: boolean
): Promise<any> {
  // console.log(
  //   "ChatFunctions - Updating channel:",
  //   channelId,
  //   "frozen:",
  //   freeze
  // );

  try {
    const updateChannelChatStatus = httpsCallable(
      functions,
      "chat-updateChannelChatStatus"
    );
    const result = await updateChannelChatStatus({ channelId, freeze });
    const data = result.data as { channel: any };

    // console.log("ChatFunctions - Channel updated:", data.channel);
    return data.channel;
  } catch (error) {
    console.error("ChatFunctions - Error updating channel:", error);
    throw new Error("Failed to update chat channel status");
  }
}

export async function updateMessageCount(matchId: string): Promise<void> {
  try {
    const updateMessageCount = httpsCallable(
      functions,
      "chat-updateMessageCount"
    );
    const result = await updateMessageCount({ matchId });
    const data = result.data as { success: boolean };

    // console.log("ChatFunctions - Message count updated:", data);
  } catch (error) {
    console.error("ChatFunctions - Error updating message count:", error);
    throw new Error("Failed to update message count");
  }
}
