import { FirebaseService } from "./FirebaseService";

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
    const response = await FirebaseService.createMatch(user1Id, user2Id);
    return response.matchId;
  } catch (error) {
    console.error("Error creating match:", error);
    throw error;
  }
};

export const getActiveMatches = async (userId: string): Promise<Match[]> => {
  try {
    const response = await FirebaseService.getActiveMatches(userId);
    return response.matches;
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
    await FirebaseService.unmatchUser(userId, matchId);
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
    await FirebaseService.updateMatchChannel(matchId, channelId);
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
    const response = await FirebaseService.updateBlurLevelForMessage(
      userId,
      matchedUserId
    );
    return response;
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
    const response = await FirebaseService.getBlurLevel(userId, matchedUserId);
    return response;
  } catch (error) {
    console.error("Error getting blur level:", error);
    throw error;
  }
};
