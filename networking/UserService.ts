import { getFunctions, httpsCallable } from "firebase/functions";
import app from "../firebaseConfig";
// import { logToNtfy } from "../util/debugUtils";

const functions = getFunctions(app, "us-central1");

export class UserService {
  static async createUser(userData: any) {
    console.log("UserService - createUser called with userData:", userData);
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
      console.log("UserService - About to call userFunctions-createUser");
      const createUser = httpsCallable(functions, "userFunctions-createUser");
      const result = await createUser(userData);
      const data = result.data as any;

      console.log("UserService - createUser success:", data);
      // await logToNtfy(
      //   `UserService - createUser success: ${JSON.stringify(data)}`
      // );
      // console.log("UserService - User created:", data);
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

      // console.log("UserService - All users fetched:", data);
      return data;
    } catch (error) {
      console.error("UserService - Error getting all users:", error);
      throw error;
    }
  }

  static async getUserById(id: string) {
    // console.log("UserService - getUserById called with:", id);

    try {
      const getUserById = httpsCallable(functions, "userFunctions-getUserById");
      const result = await getUserById({ id });
      const data = result.data as any;

      // console.log("UserService - User fetched:", data);
      return data;
    } catch (error) {
      console.error("UserService - Error getting user by ID:", error);
      throw error;
    }
  }

  static async updateUser(id: string, userData: any) {
    // console.log("UserService - updateUser called with:", { id, userData });

    try {
      const updateUser = httpsCallable(functions, "userFunctions-updateUser");
      const result = await updateUser({ id, userData });
      const data = result.data as any;

      // console.log("UserService - User updated:", data);
      return data;
    } catch (error) {
      console.error("UserService - Error updating user:", error);
      throw error;
    }
  }

  static async unmatchUser(id: string, matchId: string) {
    // console.log("UserService - unmatchUser called with:", { id, matchId });

    try {
      const unmatchUser = httpsCallable(functions, "userFunctions-unmatchUser");
      const result = await unmatchUser({ id, matchId });
      const data = result.data as any;

      // console.log("UserService - User unmatched:", data);
      return data;
    } catch (error) {
      console.error("UserService - Error unmatching user:", error);
      throw error;
    }
  }
}
