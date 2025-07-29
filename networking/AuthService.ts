import { getFunctions, httpsCallable } from "firebase/functions";
import app from "../firebaseConfig";

const functions = getFunctions(app, "us-central1");

export class AuthService {
  static async verifyGoogleAuth(token: string, email: string, name: string) {
    console.log("AuthService - verifyGoogleAuth called with:", {
      token,
      email,
      name,
    });

    try {
      const verifyGoogleAuth = httpsCallable(
        functions,
        "auth-verifyGoogleAuth"
      );
      const result = await verifyGoogleAuth({ token });
      const data = result.data as { user?: any; authInfo?: any };

      console.log("AuthService - Response:", data);
      return data;
    } catch (error) {
      console.error("AuthService - Error:", error);
      throw error;
    }
  }
}
