import { auth, db } from "../firebaseConfig";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";
import { UserService } from "../networking/UserService";
import { logToNtfy } from "./debugUtils";

/**
 * Check if user exists in your database
 * @param uid User ID to check
 * @returns Promise<boolean> True if user exists
 */
export const checkUserExists = async (uid: string): Promise<boolean> => {
  try {
    const userDoc = await getDoc(doc(db, "users", uid));
    return userDoc.exists();
  } catch (error) {
    console.error("Error checking user existence:", error);
    return false;
  }
};

/**
 * Create new user profile
 * @param userData User data to create
 * @returns Promise<{success: boolean}>
 */
export const createUserProfile = async (userData: {
  firstName: string;
  email: string;
  [key: string]: any;
}) => {
  try {
    await logToNtfy(`createUserProfile - Starting to create user profile`);
    await logToNtfy(
      `createUserProfile - User data: ${JSON.stringify(userData)}`
    );

    const currentUser = auth.currentUser;
    if (!currentUser) {
      await logToNtfy(`createUserProfile - No authenticated user found`);
      throw new Error("No authenticated user found");
    }

    await logToNtfy(`createUserProfile - About to call UserService.createUser`);

    // Call the Firebase Function instead of directly writing to Firestore
    const result = await UserService.createUser(userData);

    await logToNtfy(
      `createUserProfile - UserService.createUser completed successfully`
    );
    await logToNtfy(`createUserProfile - Result: ${JSON.stringify(result)}`);

    return { success: true };
  } catch (error) {
    await logToNtfy(
      `createUserProfile - Error creating user profile: ${error}`
    );
    console.error("Error creating user profile:", error);
    throw error;
  }
};

/**
 * Update user profile
 * @param uid User ID
 * @param updates Updates to apply
 */
export const updateUserProfile = async (uid: string, updates: any) => {
  try {
    await setDoc(
      doc(db, "users", uid),
      {
        ...updates,
        updatedAt: serverTimestamp(),
      },
      { merge: true }
    );
  } catch (error) {
    console.error("Error updating user profile:", error);
    throw error;
  }
};

/**
 * Get user profile
 * @param uid User ID
 * @returns Promise<any> User data or null
 */
export const getUserProfile = async (uid: string) => {
  try {
    const userDoc = await getDoc(doc(db, "users", uid));
    if (userDoc.exists()) {
      return userDoc.data();
    }
    return null;
  } catch (error) {
    console.error("Error getting user profile:", error);
    throw error;
  }
};
