import { getFunctions, httpsCallable } from "firebase/functions";
import app from "../firebaseConfig";
import { logToNtfy } from "../util/debugUtils";

const functions = getFunctions(app, "us-central1");

export class UserService {
  static async createUser(userData: any) {
    console.log("UserService - createUser called with:", userData);

    try {
      const createUser = httpsCallable(functions, "users-createUser");
      const result = await createUser(userData);
      const data = result.data as { message: string; user: any };

      console.log("UserService - User created:", data);
      return data;
    } catch (error) {
      console.error("UserService - Error creating user:", error);
      throw error;
    }
  }

  static async getAllUsers() {
    console.log("UserService - getAllUsers called");

    try {
      const getAllUsers = httpsCallable(functions, "users-getAllUsers");
      const result = await getAllUsers();
      const data = result.data as { users: any[] };

      console.log("UserService - All users fetched:", data);
      return data.users;
    } catch (error) {
      console.error("UserService - Error fetching users:", error);
      throw error;
    }
  }

  static async getUserById(id: string) {
    console.log("UserService - getUserById called with:", id);
    await logToNtfy(`UserService - getUserById called with id: ${id}`);
    await logToNtfy(`UserService - id type: ${typeof id}`);
    await logToNtfy(`UserService - id length: ${id?.length}`);

    try {
      const getUserById = httpsCallable(functions, "users-getUserById");

      await logToNtfy(
        `UserService - Calling function with data: ${JSON.stringify({ id })}`
      );

      const result = await getUserById({ id });
      const data = result.data as any;

      console.log("UserService - User fetched:", data);
      await logToNtfy(`UserService - getUserById success for id: ${id}`);
      await logToNtfy(
        `UserService - User data keys: ${Object.keys(data || {}).join(", ")}`
      );
      return data;
    } catch (error: any) {
      await logToNtfy(
        `UserService - Error fetching user ${id}: ${error.message}`
      );
      await logToNtfy(`UserService - Error code: ${error.code}`);
      await logToNtfy(`UserService - Error details: ${JSON.stringify(error)}`);
      console.error("UserService - Error fetching user:", error);
      throw error;
    }
  }

  static async updateUser(id: string, userData: any) {
    console.log("UserService - updateUser called with:", { id, userData });

    try {
      const updateUser = httpsCallable(functions, "users-updateUser");
      const result = await updateUser({ id, userData });
      const data = result.data as { message: string; user: any };

      console.log("UserService - User updated:", data);
      return data;
    } catch (error) {
      console.error("UserService - Error updating user:", error);
      throw error;
    }
  }

  static async unmatchUser(id: string, matchId: string) {
    console.log("UserService - unmatchUser called with:", { id, matchId });

    try {
      const unmatchUser = httpsCallable(functions, "users-unmatchUser");
      const result = await unmatchUser({ id, matchId });
      const data = result.data as { message: string; currentMatches: string[] };

      console.log("UserService - User unmatched:", data);
      return data;
    } catch (error) {
      console.error("UserService - Error unmatching user:", error);
      throw error;
    }
  }
}
