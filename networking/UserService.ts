// Firebase Functions base URL
const FIREBASE_FUNCTIONS_BASE =
  "https://us-central1-harbor-ch.cloudfunctions.net";

/**
 * User Service - Handles user-related API calls
 */
export class UserService {
  static async createUser(userData: any) {
    const response = await fetch(
      `${FIREBASE_FUNCTIONS_BASE}/users-createUser`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(userData),
      }
    );
    return response.json();
  }

  static async getAllUsers() {
    const response = await fetch(
      `${FIREBASE_FUNCTIONS_BASE}/users-getAllUsers`
    );
    return response.json();
  }

  static async getUserById(id: string) {
    const response = await fetch(
      `${FIREBASE_FUNCTIONS_BASE}/users-getUserById/${id}`
    );
    return response.json();
  }

  static async updateUser(id: string, userData: any) {
    const response = await fetch(
      `${FIREBASE_FUNCTIONS_BASE}/users-updateUser/${id}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(userData),
      }
    );
    return response.json();
  }

  static async unmatchUser(id: string, matchId: string) {
    const response = await fetch(
      `${FIREBASE_FUNCTIONS_BASE}/users-unmatchUser/${id}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ matchId }),
      }
    );
    return response.json();
  }
}
