import { getFunctions, httpsCallable } from "firebase/functions";
import app from "../firebaseConfig";

const functions = getFunctions(app, "us-central1");

export class AuthService {
  static async verifyGoogleAuth(token: string) {
    // console.log("AuthService - verifyGoogleAuth called with:", {
    //   tokenLength: token?.length || 0,
    //   tokenStartsWith: token?.substring(0, 10),
    // });

    try {
      const verifyGoogleAuth = httpsCallable(functions, "authFunctions-verifyGoogleAuth");
      const result = await verifyGoogleAuth({ token });
      const data = result.data as any;

      // console.log("AuthService - Response:", data);
      return data;
    } catch (error) {
      console.error("AuthService - Error:", error);
      throw error;
    }
  }
}
