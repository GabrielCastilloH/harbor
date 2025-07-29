import * as functions from "firebase-functions/v2";
import * as admin from "firebase-admin";
import { CallableRequest } from "firebase-functions/v2/https";
import { StreamChat } from "stream-chat";
import { SecretManagerServiceClient } from "@google-cloud/secret-manager";

const db = admin.firestore();
const secretManager = new SecretManagerServiceClient();

let streamClient: StreamChat | null = null;

/**
 * Initialize Stream Chat client with secrets from Google Secret Manager
 */
async function getStreamClient(): Promise<StreamChat> {
  if (streamClient) return streamClient;

  try {
    // Get Stream API credentials from Secret Manager
    const [streamApiKeyVersion] = await secretManager.accessSecretVersion({
      name: "projects/harbor-ch/secrets/STREAM_API_KEY/versions/latest",
    });
    const [streamApiSecretVersion] = await secretManager.accessSecretVersion({
      name: "projects/harbor-ch/secrets/STREAM_API_SECRET/versions/latest",
    });

    const apiKey = streamApiKeyVersion.payload?.data?.toString() || "";
    const apiSecret = streamApiSecretVersion.payload?.data?.toString() || "";

    if (!apiKey || !apiSecret) {
      throw new Error("Missing Stream API credentials");
    }

    streamClient = StreamChat.getInstance(apiKey, apiSecret);
    return streamClient;
  } catch (error) {
    console.error("Error getting Stream client:", error);
    throw error;
  }
}

/**
 * Creates a user in Stream Chat
 */
async function createStreamUser(userId: string, firstName: string) {
  try {
    const serverClient = await getStreamClient();

    // Create user in Stream Chat with just the first name
    await serverClient.upsertUser({
      id: userId,
      name: firstName,
    });

    console.log(`Stream Chat user created: ${userId} with name: ${firstName}`);
  } catch (error) {
    console.error("Error creating Stream Chat user:", error);
    // Don't throw error here as we don't want to fail the entire user creation
  }
}

interface CreateUserData {
  firstName: string;
  lastName: string;
  yearLevel?: string;
  age?: number;
  major?: string;
  images?: string[];
  aboutMe?: string;
  yearlyGoal?: string;
  potentialActivities?: string;
  favoriteMedia?: string;
  majorReason?: string;
  studySpot?: string;
  hobbies?: string;
  email: string;
}

interface UpdateUserData {
  firstName?: string;
  lastName?: string;
  yearLevel?: string;
  age?: number;
  major?: string;
  images?: string[];
  aboutMe?: string;
  yearlyGoal?: string;
  potentialActivities?: string;
  favoriteMedia?: string;
  majorReason?: string;
  studySpot?: string;
  hobbies?: string;
}

/**
 * Creates a new user profile
 */
export const createUser = functions.https.onCall(
  {
    region: "us-central1",
    memory: "256MiB",
    timeoutSeconds: 60,
    minInstances: 0,
    maxInstances: 10,
    concurrency: 80,
    cpu: 1,
    ingressSettings: "ALLOW_ALL",
    invoker: "public",
  },
  async (request: CallableRequest<CreateUserData>) => {
    try {
      console.log("createUser function called with:", request.data);

      if (!request.auth) {
        console.log("createUser - User not authenticated");
        throw new functions.https.HttpsError(
          "unauthenticated",
          "User must be authenticated"
        );
      }

      const userData = request.data;
      const { email, firstName, lastName } = userData;

      if (!email || !firstName || !lastName) {
        console.log("createUser - Missing required fields:", {
          email,
          firstName,
          lastName,
        });
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Email, firstName, and lastName are required"
        );
      }

      console.log("createUser - Creating user with email:", email);

      // Check if user already exists
      const existingUser = await db.collection("users").doc(email).get();
      if (existingUser.exists) {
        console.log("createUser - User already exists:", email);
        throw new functions.https.HttpsError(
          "already-exists",
          "User already exists"
        );
      }

      // Create new user data
      const newUserData = {
        _id: email,
        ...userData,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
        currentMatches: [],
        isPremium: false,
      };

      console.log("createUser - Saving user to Firestore:", email);

      // Use email as document ID for easy lookup
      await db.collection("users").doc(email).set(newUserData);

      console.log(
        "createUser - User saved to Firestore, creating Stream Chat user"
      );

      // Create a corresponding user in Stream Chat
      await createStreamUser(email, firstName);

      console.log("createUser - User creation completed successfully:", email);

      return {
        message: "User created successfully",
        user: newUserData,
      };
    } catch (error: any) {
      console.error("createUser - Error:", error);
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }
      throw new functions.https.HttpsError("internal", "Failed to create user");
    }
  }
);

/**
 * Retrieves all users (for recommendations)
 */
export const getAllUsers = functions.https.onCall(
  {
    region: "us-central1",
    memory: "256MiB",
    timeoutSeconds: 60,
    minInstances: 0,
    maxInstances: 10,
    concurrency: 80,
    cpu: 1,
    ingressSettings: "ALLOW_ALL",
    invoker: "public",
  },
  async (request: CallableRequest) => {
    try {
      if (!request.auth) {
        throw new functions.https.HttpsError(
          "unauthenticated",
          "User must be authenticated"
        );
      }

      const usersSnapshot = await db.collection("users").get();
      const users = usersSnapshot.docs.map((doc) => ({
        _id: doc.id,
        ...doc.data(),
      }));

      return { users };
    } catch (error: any) {
      console.error("Error fetching users:", error);
      throw new functions.https.HttpsError("internal", "Failed to fetch users");
    }
  }
);

/**
 * Fetches user by ID (email)
 */
export const getUserById = functions.https.onCall(
  {
    region: "us-central1",
    memory: "256MiB",
    timeoutSeconds: 60,
    minInstances: 0,
    maxInstances: 10,
    concurrency: 80,
    cpu: 1,
    ingressSettings: "ALLOW_ALL",
    invoker: "public",
  },
  async (request: CallableRequest<{ id: string }>) => {
    try {
      console.log("getUserById function called with:", request.data);

      if (!request.auth) {
        console.log("getUserById - User not authenticated");
        throw new functions.https.HttpsError(
          "unauthenticated",
          "User must be authenticated"
        );
      }

      const { id } = request.data;
      if (!id) {
        console.log("getUserById - No id provided");
        throw new functions.https.HttpsError(
          "invalid-argument",
          "User ID is required"
        );
      }

      console.log("getUserById - Fetching user with ID:", id);
      const userDoc = await db.collection("users").doc(id).get();

      if (!userDoc.exists) {
        console.log("getUserById - User not found:", id);
        throw new functions.https.HttpsError("not-found", "User not found");
      }

      const userData = userDoc.data();
      console.log("getUserById - User found:", userData);
      return userData;
    } catch (error: any) {
      console.error("getUserById - Error:", error);
      if (error instanceof functions.https.HttpsError) {
        throw error;
      }
      throw new functions.https.HttpsError("internal", "Failed to fetch user");
    }
  }
);

/**
 * Updates user profile
 */
export const updateUser = functions.https.onCall(
  {
    region: "us-central1",
    memory: "256MiB",
    timeoutSeconds: 60,
    minInstances: 0,
    maxInstances: 10,
    concurrency: 80,
    cpu: 1,
    ingressSettings: "ALLOW_ALL",
    invoker: "public",
  },
  async (
    request: CallableRequest<{ id: string; userData: UpdateUserData }>
  ) => {
    try {
      if (!request.auth) {
        throw new functions.https.HttpsError(
          "unauthenticated",
          "User must be authenticated"
        );
      }

      const { id, userData } = request.data;

      if (!id) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "User ID is required"
        );
      }

      const updatedData = {
        ...userData,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      await db.collection("users").doc(id).update(updatedData);

      const updatedUserDoc = await db.collection("users").doc(id).get();
      const updatedUser = {
        _id: updatedUserDoc.id,
        ...updatedUserDoc.data(),
      };

      return {
        message: "User updated successfully",
        user: updatedUser,
      };
    } catch (error: any) {
      console.error("Error updating user:", error);

      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      throw new functions.https.HttpsError("internal", "Failed to update user");
    }
  }
);

/**
 * Unmatches a user (removes match from currentMatches array)
 */
export const unmatchUser = functions.https.onCall(
  {
    region: "us-central1",
    memory: "256MiB",
    timeoutSeconds: 60,
    minInstances: 0,
    maxInstances: 10,
    concurrency: 80,
    cpu: 1,
    ingressSettings: "ALLOW_ALL",
    invoker: "public",
  },
  async (request: CallableRequest<{ id: string; matchId: string }>) => {
    try {
      if (!request.auth) {
        throw new functions.https.HttpsError(
          "unauthenticated",
          "User must be authenticated"
        );
      }

      const { id, matchId } = request.data;

      if (!id || !matchId) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "User ID and match ID are required"
        );
      }

      const userRef = db.collection("users").doc(id);
      const userDoc = await userRef.get();

      if (!userDoc.exists) {
        throw new functions.https.HttpsError("not-found", "User not found");
      }

      const userData = userDoc.data();
      const currentMatches = userData?.currentMatches || [];
      const updatedMatches = currentMatches.filter(
        (match: string) => match !== matchId
      );

      await userRef.update({
        currentMatches: updatedMatches,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      });

      return {
        message: "Match removed successfully",
        currentMatches: updatedMatches,
      };
    } catch (error: any) {
      console.error("Error unmatching user:", error);

      if (error instanceof functions.https.HttpsError) {
        throw error;
      }

      throw new functions.https.HttpsError(
        "internal",
        "Failed to unmatch user"
      );
    }
  }
);

export const userFunctions = {
  createUser,
  getAllUsers,
  getUserById,
  updateUser,
  unmatchUser,
};
