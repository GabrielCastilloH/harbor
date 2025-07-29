// Firebase Functions base URL
const FIREBASE_FUNCTIONS_BASE =
  "https://us-central1-harbor-ch.cloudfunctions.net";

export async function fetchUserToken(userId: string): Promise<string> {
  console.log("ChatFunctions - fetchUserToken called with userId:", userId);

  try {
    const response = await fetch(
      `${FIREBASE_FUNCTIONS_BASE}/chat-generateUserToken`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId }),
      }
    );
    const data = await response.json();
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
  const response = await fetch(
    `${FIREBASE_FUNCTIONS_BASE}/chat-createChatChannel`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ userId1, userId2 }),
    }
  );
  const data = await response.json();
  console.log("ChatFunctions - Channel created:", data.channel);
  return data.channel;
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
    const response = await fetch(
      `${FIREBASE_FUNCTIONS_BASE}/chat-updateChannelChatStatus`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ channelId, freeze }),
      }
    );
    const data = await response.json();
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
    const response = await fetch(
      `${FIREBASE_FUNCTIONS_BASE}/chat-updateMessageCount`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ matchId }),
      }
    );
    const data = await response.json();
    console.log("ChatFunctions - Message count updated:", data);
  } catch (error) {
    console.error("ChatFunctions - Error updating message count:", error);
    throw new Error("Failed to update message count");
  }
}
