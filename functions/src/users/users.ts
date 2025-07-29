import * as functions from "firebase-functions/v2";
import * as admin from "firebase-admin";
import { CallableRequest } from "firebase-functions/v2/https";

const db = admin.firestore();

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
      if (!request.auth) {
        throw new functions.https.HttpsError(
          "unauthenticated",
          "User must be authenticated"
        );
      }

      const userData = request.data;

      if (!userData || Object.keys(userData).length === 0) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "Request data is required"
        );
      }

      const {
        firstName,
        lastName,
        yearLevel,
        age,
        major,
        images,
        aboutMe,
        yearlyGoal,
        potentialActivities,
        favoriteMedia,
        majorReason,
        studySpot,
        hobbies,
        email,
      } = userData;

      if (!firstName || !lastName || !email) {
        throw new functions.https.HttpsError(
          "invalid-argument",
          "First name, last name, and email are required"
        );
      }

      const newUserData = {
        firstName,
        lastName,
        yearLevel: yearLevel || "",
        age: age ? Number(age) : 0,
        major: major || "",
        images: images || [],
        aboutMe: aboutMe || "",
        yearlyGoal: yearlyGoal || "",
        potentialActivities: potentialActivities || "",
        favoriteMedia: favoriteMedia || "",
        majorReason: majorReason || "",
        studySpot: studySpot || "",
        hobbies: hobbies || "",
        email,
        currentMatches: [],
        isPremium: false,
        createdAt: admin.firestore.FieldValue.serverTimestamp(),
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      };

      // Use email as document ID for easy lookup
      await db.collection("users").doc(email).set(newUserData);

      return {
        message: "User created successfully",
        user: { ...newUserData, _id: email },
      };
    } catch (error: any) {
      console.error("Error creating user:", error);

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
