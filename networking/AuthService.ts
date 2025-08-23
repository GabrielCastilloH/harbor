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
}
