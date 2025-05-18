import axios from "axios";

const serverUrl = process.env.SERVER_URL;

export interface Match {
  _id: string;
  user1Id: string;
  user2Id: string;
  messageCount: number;
  matchDate: string;
  isActive: boolean;
  channelId?: string;
}

export const createMatch = async (
  user1Id: string,
  user2Id: string
): Promise<string> => {
  try {
    const response = await axios.post(`${serverUrl}/matches`, {
      user1Id,
      user2Id,
    });
    return response.data.matchId;
  } catch (error) {
    console.error("Error creating match:", error);
    throw error;
  }
};

export const getActiveMatches = async (userId: string): Promise<Match[]> => {
  try {
    const response = await axios.get(`${serverUrl}/matches/user/${userId}`);
    return response.data.matches;
  } catch (error) {
    console.error("Error getting active matches:", error);
    throw error;
  }
};

export const unmatch = async (
  userId: string,
  matchId: string
): Promise<void> => {
  try {
    await axios.post(`${serverUrl}/users/${userId}/unmatch`, { matchId });
  } catch (error) {
    console.error("Error unmatching:", error);
    throw error;
  }
};

export const updateMatchChannel = async (
  matchId: string,
  channelId: string
): Promise<void> => {
  try {
    await axios.post(`${serverUrl}/matches/${matchId}/channel`, { channelId });
  } catch (error) {
    console.error("Error updating match channel:", error);
    throw error;
  }
};

export const updateBlurLevel = async (
  userId: string,
  matchedUserId: string
): Promise<{
  blurPercentage: number;
  shouldShowWarning: boolean;
  hasShownWarning: boolean;
  messageCount: number;
}> => {
  try {
    const response = await axios.post(`${serverUrl}/blur/update`, {
      userId,
      matchedUserId,
    });
    return response.data;
  } catch (error) {
    console.error("Error updating blur level:", error);
    throw error;
  }
};

export const getBlurLevel = async (
  userId: string,
  matchedUserId: string
): Promise<{
  blurPercentage: number;
  hasShownWarning: boolean;
  messageCount: number;
}> => {
  try {
    const response = await axios.get(
      `${serverUrl}/blur/${userId}/${matchedUserId}`
    );
    return response.data;
  } catch (error) {
    console.error("Error getting blur level:", error);
    throw error;
  }
};
