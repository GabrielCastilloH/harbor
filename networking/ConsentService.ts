import { getFirestore, doc, updateDoc, getDoc } from "firebase/firestore";
import app from "../firebaseConfig";
import { BLUR_CONFIG } from "../constants/blurConfig";

const db = getFirestore(app);

export class ConsentService {
  /**
   * Update user's consent status for a specific match
   * Only the user themselves can update their own consent
   */
  static async updateConsent(
    matchId: string,
    userId: string,
    consented: boolean
  ): Promise<void> {
    try {
      const matchRef = doc(db, "matches", matchId);
      const matchDoc = await getDoc(matchRef);

      if (!matchDoc.exists()) {
        throw new Error("Match not found");
      }

      const matchData = matchDoc.data();

      // Determine which user is updating their consent
      let updateData: any = {};

      if (matchData.user1Id === userId) {
        updateData.user1Consented = consented;
      } else if (matchData.user2Id === userId) {
        updateData.user2Consented = consented;
      } else {
        throw new Error("User not part of this match");
      }

      await updateDoc(matchRef, updateData);
    } catch (error) {
      console.error("Error updating consent:", error);
      throw error;
    }
  }

  /**
   * Get consent status for a match
   */
  static async getConsentStatus(matchId: string): Promise<{
    user1Consented: boolean;
    user2Consented: boolean;
    bothConsented: boolean;
  }> {
    try {
      const matchRef = doc(db, "matches", matchId);
      const matchDoc = await getDoc(matchRef);

      if (!matchDoc.exists()) {
        throw new Error("Match not found");
      }

      const matchData = matchDoc.data();
      const user1Consented = matchData.user1Consented || false;
      const user2Consented = matchData.user2Consented || false;

      return {
        user1Consented,
        user2Consented,
        bothConsented: user1Consented && user2Consented,
      };
    } catch (error) {
      console.error("Error getting consent status:", error);
      throw error;
    }
  }

  /**
   * Check if consent screen should be shown
   */
  static shouldShowConsentScreen(messageCount: number): boolean {
    return messageCount >= BLUR_CONFIG.CONSENT_REQUIRED_MESSAGES;
  }
}
