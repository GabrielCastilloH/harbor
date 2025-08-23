import { getFunctions, httpsCallable } from "firebase/functions";
import app from "../firebaseConfig";

const functions = getFunctions(app, "us-central1");

export class AuthService {
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

  static async sendVerificationCode(email: string) {
    try {
      const sendVerificationCode = httpsCallable(
        functions,
        "authFunctions-sendVerificationCode"
      );
      const result = await sendVerificationCode({ email });
      const data = result.data as any;
      return data;
    } catch (error) {
      console.error("AuthService - Error sending verification code:", error);
      throw error;
    }
  }

  static async verifyVerificationCode(code: string) {
    try {
      const verifyVerificationCode = httpsCallable(
        functions,
        "authFunctions-verifyVerificationCode"
      );
      const result = await verifyVerificationCode({ code });
      const data = result.data as any;
      return data;
    } catch (error) {
      console.error("AuthService - Error verifying code:", error);
      throw error;
    }
  }

  static async sendTestEmail() {
    try {
      const sendTestEmail = httpsCallable(
        functions,
        "authFunctions-sendTestEmail"
      );
      const result = await sendTestEmail({});
      const data = result.data as any;
      return data;
    } catch (error) {
      console.error("AuthService - Error sending test email:", error);
      throw error;
    }
  }
}
