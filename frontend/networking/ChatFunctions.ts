import axios from "axios";

const serverUrl = process.env.SERVER_URL || "http://localhost:3000"; // adjust as needed
console.log("ChatFunctions - Using server URL:", serverUrl);

export async function fetchUserToken(userId: string): Promise<string> {
  console.log("ChatFunctions - fetchUserToken called with userId:", userId);
  console.log("ChatFunctions - Making request to:", `${serverUrl}/chat/token`);

  try {
    const response = await axios.post(`${serverUrl}/chat/token`, { userId });
    console.log("ChatFunctions - Token response:", response.status);
    console.log(
      "ChatFunctions - Token data:",
      JSON.stringify(response.data, null, 2)
    );
    return response.data.token;
  } catch (error) {
    console.error("ChatFunctions - Token fetch error:", error);
    if (axios.isAxiosError(error)) {
      console.error("ChatFunctions - Error status:", error.response?.status);
      console.error(
        "ChatFunctions - Error data:",
        JSON.stringify(error.response?.data, null, 2)
      );
      console.error(
        "ChatFunctions - Request config:",
        JSON.stringify(
          {
            url: error.config?.url,
            method: error.config?.method,
            data: error.config?.data,
          },
          null,
          2
        )
      );
    }
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
  const response = await axios.post(`${serverUrl}/chat/channel`, {
    userId1,
    userId2,
  });
  console.log("ChatFunctions - Channel created:", response.data.channel);
  return response.data.channel;
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
    const response = await axios.post(`${serverUrl}/chat/channel/update`, {
      channelId,
      freeze,
    });
    console.log("ChatFunctions - Channel updated:", response.data.channel);
    return response.data.channel;
  } catch (error) {
    console.error("ChatFunctions - Error updating channel:", error);
    throw new Error("Failed to update chat channel status");
  }
}

export async function updateMessageCount(channelId: string): Promise<void> {
  console.log("ChatFunctions - Updating message count for channel:", channelId);
  try {
    const response = await axios.post(`${serverUrl}/chat/message-count`, {
      channelId,
    });
    console.log("ChatFunctions - Message count updated:", response.data);
  } catch (error) {
    console.error("ChatFunctions - Error updating message count:", error);
    throw new Error("Failed to update message count");
  }
}
