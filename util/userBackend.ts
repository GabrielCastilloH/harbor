import { auth, db } from "../firebaseConfig";
import { doc, getDoc, setDoc, serverTimestamp } from "firebase/firestore";

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
  lastName: string;
  email: string;
  [key: string]: any;
}) => {
  try {
    const currentUser = auth.currentUser;
    if (!currentUser) {
      throw new Error("No authenticated user found");
    }

    // Create user document in Firestore
    await setDoc(doc(db, "users", currentUser.uid), {
      ...userData,
      uid: currentUser.uid,
      photoURL: currentUser.photoURL,
      createdAt: serverTimestamp(),
      lastLoginAt: serverTimestamp(),
    });

    return { success: true };
  } catch (error) {
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
