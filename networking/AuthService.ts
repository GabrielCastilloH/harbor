import { getFunctions, httpsCallable } from "firebase/functions";
import app from "../firebaseConfig";

const functions = getFunctions(app, "us-central1");

export class AuthService {
  static async signUpWithEmail(email: string, password: string) {
    try {
      const signUpWithEmail = httpsCallable(
        functions,
        "authFunctions-signUpWithEmail"
      );
      const result = await signUpWithEmail({ email, password });
      const data = result.data as any;
      return data;
    } catch (error) {
      console.error("AuthService - Error signing up:", error);
      throw error;
    }
  }

  static async signInWithEmail(email: string, password: string) {
    try {
      const signInWithEmail = httpsCallable(
        functions,
        "authFunctions-signInWithEmail"
      );
      const result = await signInWithEmail({ email, password });
      const data = result.data as any;
      return data;
    } catch (error) {
      console.error("AuthService - Error signing in:", error);
      throw error;
    }
  }

  static async sendVerificationEmail() {
    try {
      const sendVerificationEmail = httpsCallable(
        functions,
        "authFunctions-sendVerificationEmail"
      );
      const result = await sendVerificationEmail();
      const data = result.data as any;
      return data;
    } catch (error) {
      console.error("AuthService - Error sending verification email:", error);
      throw error;
    }
  }

  static async checkEmailVerification() {
    try {
      const checkEmailVerification = httpsCallable(
        functions,
        "authFunctions-checkEmailVerification"
      );
      const result = await checkEmailVerification();
      const data = result.data as any;
      return data;
    } catch (error) {
      console.error("AuthService - Error checking email verification:", error);
      throw error;
    }
  }

  static async resetPassword(email: string) {
    try {
      const resetPassword = httpsCallable(
        functions,
        "authFunctions-resetPassword"
      );
      const result = await resetPassword({ email });
      const data = result.data as any;
      return data;
    } catch (error) {
      console.error("AuthService - Error resetting password:", error);
      throw error;
    }
  }
}
