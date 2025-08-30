import { getFunctions, httpsCallable } from "firebase/functions";
import app from "../firebaseConfig";
// import { logToNtfy } from "../util/debugUtils";

const functions = getFunctions(app, "us-central1");

export class UserService {
  static async createUser(userData: any) {
    // await logToNtfy(
    //   `UserService - createUser called with userData: ${JSON.stringify(userData)}`
    // );
    // await logToNtfy(
    //   `UserService - userData type: ${typeof userData}`
    // );
    // await logToNtfy(
    //   `UserService - userData keys: ${Object.keys(userData || {}).join(", ")}`
    // );

    try {
      const createUser = httpsCallable(functions, "userFunctions-createUser");
      const result = await createUser(userData);
      const data = result.data as any;
      // await logToNtfy(
      //   `UserService - createUser success: ${JSON.stringify(data)}`
      // );

      return data;
    } catch (error) {
      console.error("UserService - Error creating user:", error);
      throw error;
    }
  }

  static async getAllUsers() {
    try {
      const getAllUsers = httpsCallable(functions, "userFunctions-getAllUsers");
      const result = await getAllUsers();
      const data = result.data as any;

      return data;
    } catch (error) {
      console.error("UserService - Error getting all users:", error);
      throw error;
    }
  }

  static async getUserById(id: string) {
    try {
      const getUserById = httpsCallable(functions, "userFunctions-getUserById");
      const result = await getUserById({ id });
      const data = result.data as any;

      return data;
    } catch (error) {
      // Don't log as error since this is expected for new users
      throw error;
    }
  }

  static async updateUser(id: string, userData: any) {
    try {
      const updateUser = httpsCallable(functions, "userFunctions-updateUser");
      const result = await updateUser({ id, userData });
      const data = result.data as any;

      return data;
    } catch (error) {
      console.error("UserService - Error updating user:", error);
      throw error;
    }
  }

  static async unmatchUser(id: string, matchId: string) {
    try {
      const unmatchUser = httpsCallable(functions, "userFunctions-unmatchUser");
      const result = await unmatchUser({ id, matchId });
      const data = result.data as any;

      return data;
    } catch (error) {
      console.error("UserService - Error unmatching user:", error);
      throw error;
    }
  }

  // PREMIUM DISABLED: Paywall function commented out
  static async markPaywallAsSeen(userId: string) {
    // Premium functionality disabled - return success without calling backend
    return { success: true };

    // Original implementation commented out:
    // try {
    //   const markPaywallAsSeen = httpsCallable(
    //     functions,
    //     "userFunctions-markPaywallAsSeen"
    //   );
    //   const result = await markPaywallAsSeen({ userId });
    //   const data = result.data as any;

    //   return data;
    // } catch (error) {
    //   console.error("UserService - Error marking paywall as seen:", error);
    //   throw error;
    // }
  }

  /**
   * Deletes the user's account and all associated data
   */
  static async deleteAccount(): Promise<{ success: boolean; message: string }> {
    try {
      const { httpsCallable } = await import("firebase/functions");
      const { getFunctions } = await import("firebase/functions");

      const functions = getFunctions();
      const deleteUserFunction = httpsCallable(
        functions,
        "userFunctions-deleteUser"
      );

      const result = await deleteUserFunction();
      return result.data as { success: boolean; message: string };
    } catch (error: any) {
      console.error("❌ [UserService] Error deleting account:", error);
      throw new Error(
        error.message || "Failed to delete account. Please try again."
      );
    }
  }

  /**
   * Deactivates the user's account
   */
  static async deactivateAccount(): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      const { httpsCallable } = await import("firebase/functions");
      const { getFunctions } = await import("firebase/functions");

      const functions = getFunctions();
      const deactivateFunction = httpsCallable(
        functions,
        "userFunctions-deactivateAccount"
      );

      const result = await deactivateFunction();
      return result.data as { success: boolean; message: string };
    } catch (error: any) {
      console.error("❌ [UserService] Error deactivating account:", error);
      throw new Error(
        error.message || "Failed to deactivate account. Please try again."
      );
    }
  }

  /**
   * Reactivates the user's account
   */
  static async reactivateAccount(): Promise<{
    success: boolean;
    message: string;
  }> {
    try {
      const { httpsCallable } = await import("firebase/functions");
      const { getFunctions } = await import("firebase/functions");

      const functions = getFunctions();
      const reactivateFunction = httpsCallable(
        functions,
        "userFunctions-reactivateAccount"
      );

      const result = await reactivateFunction();
      return result.data as { success: boolean; message: string };
    } catch (error: any) {
      console.error("❌ [UserService] Error reactivating account:", error);
      throw new Error(
        error.message || "Failed to reactivate account. Please try again."
      );
    }
  }

  /**
   * Checks if an email belongs to a deleted account
   */
  static async checkDeletedAccount(
    email: string
  ): Promise<{ isDeleted: boolean; deletedAt?: any }> {
    try {
      const { httpsCallable } = await import("firebase/functions");
      const { getFunctions } = await import("firebase/functions");

      const functions = getFunctions();
      const checkDeletedFunction = httpsCallable(
        functions,
        "userFunctions-checkDeletedAccount"
      );

      const result = await checkDeletedFunction({ email });
      return result.data as { isDeleted: boolean; deletedAt?: any };
    } catch (error: any) {
      console.error("❌ [UserService] Error checking deleted account:", error);
      throw new Error(
        error.message || "Failed to check account status. Please try again."
      );
    }
  }
}
