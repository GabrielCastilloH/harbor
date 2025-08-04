import { getFunctions, httpsCallable } from "firebase/functions";
import app from "../firebaseConfig";

const functions = getFunctions(app, "us-central1");

export class AuthService {
  static async verifyGoogleAuth(token: string) {
    try {
      const verifyGoogleAuth = httpsCallable(
        functions,
        "authFunctions-verifyGoogleAuth"
      );
      const result = await verifyGoogleAuth({ token });
      const data = result.data as any;
      return data;
    } catch (error) {
      console.error("AuthService - Error:", error);
      throw error;
    }
  }
}
