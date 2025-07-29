import { FirebaseService } from "./FirebaseService";

export async function fetchUserToken(userId: string): Promise<string> {
  console.log("ChatFunctions - fetchUserToken called with userId:", userId);

  try {
    const response = await FirebaseService.generateUserToken(userId);
    console.log("ChatFunctions - Token response:", response);
    return response.token;
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
  const response = await FirebaseService.createChatChannel(userId1, userId2);
  console.log("ChatFunctions - Channel created:", response.channel);
  return response.channel;
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
    const response = await FirebaseService.updateChannelChatStatus(
      channelId,
      freeze
    );
    console.log("ChatFunctions - Channel updated:", response.channel);
    return response.channel;
  } catch (error) {
    console.error("ChatFunctions - Error updating channel:", error);
    throw new Error("Failed to update chat channel status");
  }
}

export async function updateMessageCount(matchId: string): Promise<void> {
  console.log("ChatFunctions - Updating message count for match:", matchId);
  try {
    const response = await FirebaseService.updateMessageCount(matchId);
    console.log("ChatFunctions - Message count updated:", response);
  } catch (error) {
    console.error("ChatFunctions - Error updating message count:", error);
    throw new Error("Failed to update message count");
  }
}
