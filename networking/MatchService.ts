import { getFunctions, httpsCallable } from "firebase/functions";
import app from "../firebaseConfig";

const functions = getFunctions(app, "us-central1");

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
  console.log("MatchService - createMatch called with:", { user1Id, user2Id });

  try {
    const createMatch = httpsCallable(functions, "createMatch");
    const result = await createMatch({ user1Id, user2Id });
    const data = result.data as { message: string; matchId: string };

    console.log("MatchService - Match created:", data);
    return data.matchId;
  } catch (error) {
    console.error("MatchService - Error creating match:", error);
    throw error;
  }
};

export const getActiveMatches = async (userId: string): Promise<Match[]> => {
  console.log("MatchService - getActiveMatches called with:", userId);

  try {
    const getActiveMatches = httpsCallable(functions, "getActiveMatches");
    const result = await getActiveMatches({ id: userId });
    const data = result.data as { matches: Match[] };

    console.log("MatchService - Active matches:", data);
    return data.matches;
  } catch (error) {
    console.error("MatchService - Error getting active matches:", error);
    throw error;
  }
};

export const unmatch = async (
  userId: string,
  matchId: string
): Promise<void> => {
  console.log("MatchService - unmatch called with:", { userId, matchId });

  try {
    const unmatchUsers = httpsCallable(functions, "unmatchUsers");
    const result = await unmatchUsers({ user1Id: userId, user2Id: matchId });
    const data = result.data as { message: string; matchId: string };

    console.log("MatchService - Users unmatched:", data);
  } catch (error) {
    console.error("MatchService - Error unmatching users:", error);
    throw error;
  }
};

export const updateMatchChannel = async (
  matchId: string,
  channelId: string
): Promise<void> => {
  console.log("MatchService - updateMatchChannel called with:", {
    matchId,
    channelId,
  });

  try {
    const updateMatchChannel = httpsCallable(functions, "updateMatchChannel");
    const result = await updateMatchChannel({ matchId, channelId });
    const data = result.data as { message: string };

    console.log("MatchService - Match channel updated:", data);
  } catch (error) {
    console.error("MatchService - Error updating match channel:", error);
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
  console.log("MatchService - updateBlurLevel called with:", {
    userId,
    matchedUserId,
  });

  try {
    const updateBlurLevelForMessage = httpsCallable(
      functions,
      "updateBlurLevelForMessage"
    );
    const result = await updateBlurLevelForMessage({ userId, matchedUserId });
    const data = result.data as {
      blurPercentage: number;
      shouldShowWarning: boolean;
      hasShownWarning: boolean;
      messageCount: number;
    };

    console.log("MatchService - Blur level updated:", data);
    return data;
  } catch (error) {
    console.error("MatchService - Error updating blur level:", error);
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
  console.log("MatchService - getBlurLevel called with:", {
    userId,
    matchedUserId,
  });

  try {
    const getBlurLevel = httpsCallable(functions, "getBlurLevel");
    const result = await getBlurLevel({ userId, matchedUserId });
    const data = result.data as {
      blurPercentage: number;
      hasShownWarning: boolean;
      messageCount: number;
    };

    console.log("MatchService - Blur level:", data);
    return data;
  } catch (error) {
    console.error("MatchService - Error getting blur level:", error);
    throw error;
  }
};
