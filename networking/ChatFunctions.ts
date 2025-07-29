import { getFunctions, httpsCallable } from "firebase/functions";
import app from "../firebaseConfig";

const functions = getFunctions(app, "us-central1");

export async function fetchUserToken(userId: string): Promise<string> {
  console.log("ChatFunctions - fetchUserToken called with userId:", userId);

  try {
    const generateUserToken = httpsCallable(functions, "generateUserToken");
    const result = await generateUserToken();
    const data = result.data as { token: string };

    console.log("ChatFunctions - Token response:", data);
    return data.token;
  } catch (error) {
    console.error("ChatFunctions - Token fetch error:", error);
    throw error;
  }
}

export async function fetchCreateChatChannel(
  userId1: string,
  userId2: string
): Promise<any> {
  console.log(
    "ChatFunctions - Creating chat channel for users:",
    userId1,
    "and",
    userId2
  );

  try {
    const createChatChannel = httpsCallable(functions, "createChatChannel");
    const result = await createChatChannel({ userId1, userId2 });
    const data = result.data as { channel: any };

    console.log("ChatFunctions - Channel created:", data.channel);
    return data.channel;
  } catch (error) {
    console.error("ChatFunctions - Error creating channel:", error);
    throw new Error("Failed to create chat channel");
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
      "updateChannelChatStatus"
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
    const updateMessageCount = httpsCallable(functions, "updateMessageCount");
    const result = await updateMessageCount({ matchId });
    const data = result.data as { success: boolean };

    console.log("ChatFunctions - Message count updated:", data);
  } catch (error) {
    console.error("ChatFunctions - Error updating message count:", error);
    throw new Error("Failed to update message count");
  }
}
