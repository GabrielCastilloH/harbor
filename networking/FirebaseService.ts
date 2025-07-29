// Firebase Functions base URL
const FIREBASE_FUNCTIONS_BASE =
  "https://us-central1-harbor-ch.cloudfunctions.net";

/**
 * Firebase Service - Handles all API calls to Firebase Functions
 */
export class FirebaseService {
  // Auth Functions
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

  // User Functions
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

  // Swipe Functions
  static async createSwipe(
    swiperId: string,
    swipedId: string,
    direction: "left" | "right"
  ) {
    const response = await fetch(
      `${FIREBASE_FUNCTIONS_BASE}/swipes-createSwipe`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ swiperId, swipedId, direction }),
      }
    );
    return response.json();
  }

  static async countRecentSwipes(id: string) {
    const response = await fetch(
      `${FIREBASE_FUNCTIONS_BASE}/swipes-countRecentSwipes/${id}`
    );
    return response.json();
  }

  static async getSwipesByUser(id: string) {
    const response = await fetch(
      `${FIREBASE_FUNCTIONS_BASE}/swipes-getSwipesByUser/${id}`
    );
    return response.json();
  }

  // Match Functions
  static async createMatch(user1Id: string, user2Id: string) {
    const response = await fetch(
      `${FIREBASE_FUNCTIONS_BASE}/matches-createMatch`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ user1Id, user2Id }),
      }
    );
    return response.json();
  }

  static async getActiveMatches(id: string) {
    const response = await fetch(
      `${FIREBASE_FUNCTIONS_BASE}/matches-getActiveMatches/${id}`
    );
    return response.json();
  }

  static async unmatchUsers(user1Id: string, user2Id: string) {
    const response = await fetch(
      `${FIREBASE_FUNCTIONS_BASE}/matches-unmatchUsers`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ user1Id, user2Id }),
      }
    );
    return response.json();
  }

  static async updateMatchChannel(matchId: string, channelId: string) {
    const response = await fetch(
      `${FIREBASE_FUNCTIONS_BASE}/matches-updateMatchChannel/${matchId}`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ channelId }),
      }
    );
    return response.json();
  }

  static async incrementMatchMessages(matchId: string) {
    const response = await fetch(
      `${FIREBASE_FUNCTIONS_BASE}/matches-incrementMatchMessages/${matchId}`,
      {
        method: "POST",
      }
    );
    return response.json();
  }

  // Chat Functions
  static async generateUserToken(userId: string) {
    const response = await fetch(
      `${FIREBASE_FUNCTIONS_BASE}/chat-generateUserToken`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId }),
      }
    );
    return response.json();
  }

  static async createChatChannel(userId1: string, userId2: string) {
    const response = await fetch(
      `${FIREBASE_FUNCTIONS_BASE}/chat-createChatChannel`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId1, userId2 }),
      }
    );
    return response.json();
  }

  static async updateChannelChatStatus(channelId: string, freeze: boolean) {
    const response = await fetch(
      `${FIREBASE_FUNCTIONS_BASE}/chat-updateChannelChatStatus`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ channelId, freeze }),
      }
    );
    return response.json();
  }

  static async updateMessageCount(matchId: string) {
    const response = await fetch(
      `${FIREBASE_FUNCTIONS_BASE}/chat-updateMessageCount`,
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

  // Image Functions
  static async uploadImage(
    userId: string,
    imageData: string,
    contentType: string = "image/jpeg"
  ) {
    const response = await fetch(
      `${FIREBASE_FUNCTIONS_BASE}/images-uploadImage`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId, imageData, contentType }),
      }
    );
    return response.json();
  }

  // Blur Functions
  static async updateBlurLevelForMessage(
    userId: string,
    matchedUserId: string
  ) {
    const response = await fetch(
      `${FIREBASE_FUNCTIONS_BASE}/blur-updateBlurLevelForMessage`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ userId, matchedUserId }),
      }
    );
    return response.json();
  }

  static async handleWarningResponse(
    matchId: string,
    userId: string,
    agreed: boolean
  ) {
    const response = await fetch(
      `${FIREBASE_FUNCTIONS_BASE}/blur-handleWarningResponse`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ matchId, userId, agreed }),
      }
    );
    return response.json();
  }

  static async getBlurLevel(userId: string, matchedUserId: string) {
    const response = await fetch(
      `${FIREBASE_FUNCTIONS_BASE}/blur-getBlurLevel/${userId}/${matchedUserId}`
    );
    return response.json();
  }

  // Recommendation Functions
  static async getRecommendations(id: string) {
    const response = await fetch(
      `${FIREBASE_FUNCTIONS_BASE}/recommendations-getRecommendations/${id}`
    );
    return response.json();
  }
}
