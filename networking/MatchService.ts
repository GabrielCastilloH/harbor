import { getFunctions, httpsCallable } from "firebase/functions";
import app from "../firebaseConfig";

const functions = getFunctions(app, "us-central1");

export class MatchService {
  static async createMatch(user1Id: string, user2Id: string) {
    try {
      const createMatch = httpsCallable(
        functions,
        "matchFunctions-createMatch"
      );
      const result = await createMatch({ user1Id, user2Id });
      const data = result.data as any;
      return data;
    } catch (error) {
      console.error("MatchService - Error creating match:", error);
      throw error;
    }
  }

  static async unmatch(userId: string, matchId: string) {
    try {
      const unmatch = httpsCallable(functions, "matchFunctions-unmatchUsers");
      const result = await unmatch({ userId, matchId });
      const data = result.data as any;
      return data;
    } catch (error) {
      console.error("❌ [DEBUG] MatchService.unmatch error:", error);
      throw error;
    }
  }

  static async updateMatchChannel(
    matchId: string,
    channelId: string,
    channelType: string
  ) {
    try {
      const updateMatchChannel = httpsCallable(
        functions,
        "matchFunctions-updateMatchChannel"
      );
      const result = await updateMatchChannel({
        matchId,
        channelId,
        channelType,
      });
      const data = result.data as any;

      return data;
    } catch (error) {
      console.error("MatchService - Error updating match channel:", error);
      throw error;
    }
  }

  static async getMatchId(
    userId1: string,
    userId2: string
  ): Promise<string | null> {
    try {
      const getMatchId = httpsCallable(functions, "matchFunctions-getMatchId");
      const result = await getMatchId({ userId1, userId2 });
      const data = result.data as { matchId: string | null };

      return data.matchId;
    } catch (error) {
      console.error("MatchService - Error getting match ID:", error);
      throw error;
    }
  }

  static async getUnviewedMatches(userId: string) {
    try {
      const getUnviewedMatches = httpsCallable(
        functions,
        "matchFunctions-getUnviewedMatches"
      );
      const result = await getUnviewedMatches({ userId });
      const data = result.data as any;

      return data;
    } catch (error) {
      console.error("MatchService - Error getting unviewed matches:", error);
      throw error;
    }
  }

  static async markMatchAsViewed(matchId: string, userId: string) {
    try {
      const markMatchAsViewed = httpsCallable(
        functions,
        "matchFunctions-markMatchAsViewed"
      );
      const result = await markMatchAsViewed({ matchId, userId });
      const data = result.data as any;

      return data;
    } catch (error) {
      console.error("MatchService - Error marking match as viewed:", error);
      throw error;
    }
  }
}
