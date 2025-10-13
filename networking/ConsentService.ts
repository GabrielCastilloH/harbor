import { getFunctions, httpsCallable } from "firebase/functions";
import app from "../firebaseConfig";
import { BLUR_CONFIG } from "../constants/blurConfig";

const functions = getFunctions(app, "us-central1");

export class ConsentService {
  /**
   * Updates user's consent status for a match
   */
  static async updateConsent(
    matchId: string,
    userId: string,
    consented: boolean
  ): Promise<{ success: boolean; bothConsented: boolean }> {
    try {
      const updateConsent = httpsCallable(
        functions,
        "matchFunctions-updateConsent"
      );
      const result = await updateConsent({
        matchId,
        userId,
        consented,
      });
      return result.data as { success: boolean; bothConsented: boolean };
    } catch (error) {
      console.error("ConsentService - Error updating consent:", error);
      throw error;
    }
  }

  /**
   * Gets consent status for a match
   */
  static async getConsentStatus(matchId: string): Promise<{
    user1Id: string;
    user2Id: string;
    user1Consented: boolean;
    user2Consented: boolean;
    bothConsented: boolean;
    messageCount: number;
    shouldShowConsentScreen: boolean;
    shouldShowConsentForUser: boolean;
    state: "both_consented" | "one_consented" | "none_consented";
    consent: {
      state: string;
      messageThreshold: number;
      bothConsented: boolean;
      users: { id: string; hasConsented: boolean; shouldShow: boolean }[];
    };
  }> {
    try {
      const getConsentStatus = httpsCallable(
        functions,
        "matchFunctions-getConsentStatus"
      );
      const result = await getConsentStatus({ matchId });
      return result.data as {
        user1Id: string;
        user2Id: string;
        user1Consented: boolean;
        user2Consented: boolean;
        bothConsented: boolean;
        messageCount: number;
        shouldShowConsentScreen: boolean;
        shouldShowConsentForUser: boolean;
        state: "both_consented" | "one_consented" | "none_consented";
        consent: {
          state: string;
          messageThreshold: number;
          bothConsented: boolean;
          users: { id: string; hasConsented: boolean; shouldShow: boolean }[];
        };
      };
    } catch (error) {
      console.error("ConsentService - Error getting consent status:", error);
      throw error;
    }
  }

  /**
   * Checks if consent screen should be shown based on message count
   */
  static shouldShowConsentScreen(messageCount: number): boolean {
    return messageCount >= BLUR_CONFIG.MESSAGES_TO_CLEAR_BLUR;
  }
}
