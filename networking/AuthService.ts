// Firebase Functions base URL
const FIREBASE_FUNCTIONS_BASE =
  "https://us-central1-harbor-ch.cloudfunctions.net";

/**
 * Auth Service - Handles authentication-related API calls
 */
export class AuthService {
  static async verifyGoogleAuth(token: string, email: string, name: string) {
    const response = await fetch(
      `${FIREBASE_FUNCTIONS_BASE}/auth-verifyGoogleAuth`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token, email, name }),
      }
    );
    return response.json();
  }
}
