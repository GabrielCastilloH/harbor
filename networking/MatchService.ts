import { getFunctions, httpsCallable } from "firebase/functions";
import app from "../firebaseConfig";

const functions = getFunctions(app, "us-central1");

export class MatchService {
  static async createMatch(user1Id: string, user2Id: string) {
    // console.log("MatchService - createMatch called with:", { user1Id, user2Id });

    try {
      const createMatch = httpsCallable(
        functions,
        "matchFunctions-createMatch"
      );
      const result = await createMatch({ user1Id, user2Id });
      const data = result.data as any;

      // console.log("MatchService - Match created:", data);
      return data;
    } catch (error) {
      console.error("MatchService - Error creating match:", error);
      throw error;
    }
  }

  static async getActiveMatches(userId: string) {
    // console.log("MatchService - getActiveMatches called with:", userId);

    try {
      const getActiveMatches = httpsCallable(
        functions,
        "matchFunctions-getActiveMatches"
      );
      const result = await getActiveMatches({ userId });
      const data = result.data as any;

      // console.log("MatchService - Active matches:", data);
      return data;
    } catch (error) {
      console.error("MatchService - Error getting active matches:", error);
      throw error;
    }
  }

  static async unmatch(userId: string, matchId: string) {
    console.log("🔍 [DEBUG] MatchService.unmatch called with:", {
      userId,
      matchId,
    });

    try {
      const unmatch = httpsCallable(functions, "matchFunctions-unmatchUsers");
      console.log(
        "🔍 [DEBUG] Calling Firebase function: matchFunctions-unmatchUsers"
      );
      const result = await unmatch({ userId, matchId });
      const data = result.data as any;

      console.log("✅ [DEBUG] MatchService.unmatch successful:", data);
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
    // console.log("MatchService - updateMatchChannel called with:", {
    //   matchId,
    //   channelId,
    //   channelType,
    // });

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

      // console.log("MatchService - Match channel updated:", data);
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

  static async migrateMatchConsent(matchId: string) {
    try {
      const migrateMatchConsent = httpsCallable(
        functions,
        "matchFunctions-migrateMatchConsent"
      );
      const result = await migrateMatchConsent({ matchId });
      return result.data as any;
    } catch (error) {
      console.error("MatchService - Error migrating match consent:", error);
      throw error;
    }
  }
}
