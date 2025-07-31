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
    // console.log("MatchService - unmatch called with:", { userId, matchId });

    try {
      const unmatch = httpsCallable(functions, "matchFunctions-unmatchUsers");
      const result = await unmatch({ userId, matchId });
      const data = result.data as any;

      // console.log("MatchService - Users unmatched:", data);
      return data;
    } catch (error) {
      console.error("MatchService - Error unmatching users:", error);
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

  static async updateBlurLevel(
    userId: string,
    matchedUserId: string,
    blurPercentage: number
  ) {
    // console.log("MatchService - updateBlurLevel called with:", {
    //   userId,
    //   matchedUserId,
    //   blurPercentage,
    // });

    try {
      const updateBlurLevel = httpsCallable(
        functions,
        "blurFunctions-updateBlurLevelForMessage"
      );
      const result = await updateBlurLevel({
        userId,
        matchedUserId,
        blurPercentage,
      });
      const data = result.data as any;

      // console.log("MatchService - Blur level updated:", data);
      return data;
    } catch (error) {
      console.error("MatchService - Error updating blur level:", error);
      throw error;
    }
  }

  static async getBlurLevel(userId: string, matchedUserId: string) {
    // console.log("MatchService - getBlurLevel called with:", {
    //   userId,
    //   matchedUserId,
    // });

    try {
      const getBlurLevel = httpsCallable(
        functions,
        "blurFunctions-getBlurLevel"
      );
      const result = await getBlurLevel({ userId, matchedUserId });
      const data = result.data as any;

      // console.log("MatchService - Blur level:", data);
      return data;
    } catch (error) {
      console.error("MatchService - Error getting blur level:", error);
      throw error;
    }
  }
}
