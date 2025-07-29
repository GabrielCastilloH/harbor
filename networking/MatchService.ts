import { BlurService } from "./BlurService";

export interface Match {
  _id: string;
  user1Id: string;
  user2Id: string;
  messageCount: number;
  matchDate: string;
  isActive: boolean;
  channelId?: string;
}

// Firebase Functions base URL
const FIREBASE_FUNCTIONS_BASE =
  "https://us-central1-harbor-ch.cloudfunctions.net";

export const createMatch = async (
  user1Id: string,
  user2Id: string
): Promise<string> => {
  const response = await fetch(
    `${FIREBASE_FUNCTIONS_BASE}/matches-createMatch`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ user1Id, user2Id }),
    }
  );
  const data = await response.json();
  return data.matchId;
};

export const getActiveMatches = async (userId: string): Promise<Match[]> => {
  const response = await fetch(
    `${FIREBASE_FUNCTIONS_BASE}/matches-getActiveMatches/${userId}`
  );
  const data = await response.json();
  return data.matches || [];
};

export const unmatch = async (
  userId: string,
  matchId: string
): Promise<void> => {
  await fetch(`${FIREBASE_FUNCTIONS_BASE}/matches-unmatchUsers`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ userId, matchId }),
  });
};

export const updateMatchChannel = async (
  matchId: string,
  channelId: string
): Promise<void> => {
  await fetch(
    `${FIREBASE_FUNCTIONS_BASE}/matches-updateMatchChannel/${matchId}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ channelId }),
    }
  );
};

// Re-export blur functions for convenience
export const updateBlurLevel = async (
  userId: string,
  matchedUserId: string
): Promise<{
  blurPercentage: number;
  shouldShowWarning: boolean;
  hasShownWarning: boolean;
  messageCount: number;
}> => {
  return BlurService.updateBlurLevelForMessage(userId, matchedUserId);
};

export const getBlurLevel = async (
  userId: string,
  matchedUserId: string
): Promise<{
  blurPercentage: number;
  hasShownWarning: boolean;
  messageCount: number;
}> => {
  return BlurService.getBlurLevel(userId, matchedUserId);
};
