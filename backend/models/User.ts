import { ObjectId } from "mongodb";
import { getDb } from "../util/database.js";
import { upsertUserToStreamChat } from "../controllers/chatController.js";

/** Represents a user in the dating app */
export class User {
  firstName: string;
  lastName: string;
  yearLevel: string;
  age: number;
  major: string;
  images: string[];
  aboutMe: string;
  yearlyGoal: string;
  potentialActivities: string;
  favoriteMedia: string;
  majorReason: string;
  studySpot: string;
  hobbies: string;
  email: string;
  currentMatches: ObjectId[];
  isPremium: boolean;

  /**
   * Creates a new user instance
   * @param {string} firstName - User's first name
   * @param {string} lastName - User's last name
   * @param {string} yearLevel - Academic year level
   * @param {number} age - User's age
   * @param {string} major - Field of study
   * @param {string[]} images - Array of image URLs
   * @param {string} aboutMe - User's bio
   * @param {string} yearlyGoal - Academic/personal goals
   * @param {string} potentialActivities - Preferred activities
   * @param {string} favoriteMedia - Favorite books/movies/shows
   * @param {string} majorReason - Reason for choosing major
   * @param {string} studySpot - Preferred study location
   * @param {string} hobbies - User's interests
   * @param {string} email - User's email address
   * @param {ObjectId[]} currentMatches - Array of current matches
   * @param {boolean} isPremium - Whether the user is premium
   */
  constructor(
    firstName: string,
    lastName: string,
    yearLevel: string,
    age: number,
    major: string,
    images: string[],
    aboutMe: string,
    yearlyGoal: string,
    potentialActivities: string,
    favoriteMedia: string,
    majorReason: string,
    studySpot: string,
    hobbies: string,
    email: string,
    currentMatches: ObjectId[] = [],
    isPremium: boolean = false
  ) {
    this.firstName = firstName;
    this.lastName = lastName;
    this.yearLevel = yearLevel;
    this.age = age;
    this.major = major;
    this.images = images;
    this.aboutMe = aboutMe;
    this.yearlyGoal = yearlyGoal;
    this.potentialActivities = potentialActivities;
    this.favoriteMedia = favoriteMedia;
    this.majorReason = majorReason;
    this.studySpot = studySpot;
    this.hobbies = hobbies;
    this.email = email;
    this.currentMatches = currentMatches;
    this.isPremium = isPremium;
  }

  /**
   * Saves user to database and StreamChat
   * @returns {Promise<InsertOneResult>} Database insertion result
   * @throws {Error} If database operation fails
   */
  async save() {
    const db = getDb();
    try {
      const result = await db.collection("users").insertOne(this);
      const userId = result.insertedId.toString();

      // Add the user to StreamChat using the dedicated function in chatController
      await upsertUserToStreamChat(userId, this.firstName, this.lastName);

      return result;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Retrieves first 3 users from database
   * @returns {Promise<Array<User>>} Array of users
   * @throws {Error} If database operation fails
   */
  static async fetchAll() {
    const db = getDb();
    try {
      return await db.collection("users").find().limit(3).toArray();
    } catch (error) {
      throw error;
    }
  }

  /**
   * Finds user by ID
   * @param {ObjectId} id - User ID to find
   * @returns {Promise<User | null>} User or null if not found
   * @throws {Error} If database operation fails
   */
  static async findById(id: ObjectId) {
    const db = getDb();
    try {
      return db.collection("users").findOne({ _id: id });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Updates user by ID and syncs with StreamChat
   * @param {ObjectId} id - User ID to update
   * @param {Partial<User>} updatedData - Fields to update
   * @returns {Promise<User | null>} Updated user or null
   * @throws {Error} If database operation fails
   */
  static async updateById(id: ObjectId, updatedData: Partial<User>) {
    const db = getDb();
    try {
      const result = await db
        .collection("users")
        .updateOne({ _id: id }, { $set: updatedData });

      if (result.matchedCount === 0) {
        return null;
      }

      // Get the updated user
      const updatedUser = await User.findById(id);

      // If the user exists and we're updating fields relevant to StreamChat, update StreamChat too
      if (updatedUser) {
        const userId = id.toString();
        // Update user in StreamChat using the chatController function
        await upsertUserToStreamChat(
          userId,
          updatedUser.firstName,
          updatedUser.lastName
        );
      }

      return updatedUser;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Finds user by email
   * @param {string} email - Email to search
   * @returns {Promise<User | null>} User or null if not found
   * @throws {Error} If database operation fails
   */
  static async findByEmail(email: string) {
    const db = getDb();
    try {
      return await db.collection("users").findOne({ email: email });
    } catch (error) {
      throw error;
    }
  }

  /**
   * Finds user by image ID
   * @param {string} imageId - Image ID to search for
   * @returns {Promise<User | null>} User or null if not found
   * @throws {Error} If database operation fails
   */
  static async findByImageId(imageId: string) {
    const db = getDb();
    try {
      return await db.collection("users").findOne({ images: imageId });
    } catch (error) {
      throw error;
    }
  }

  static async addMatch(userId: ObjectId, matchId: ObjectId) {
    console.log("Adding match to user:", {
      userId: userId.toString(),
      matchId: matchId.toString(),
    });
    const db = getDb();
    try {
      const result = await db
        .collection("users")
        .updateOne({ _id: userId }, { $addToSet: { currentMatches: matchId } });
      console.log("Add match result:", {
        userId: userId.toString(),
        matchId: matchId.toString(),
        modifiedCount: result.modifiedCount,
      });
      return result;
    } catch (error) {
      console.error("Error adding match to user:", error);
      throw error;
    }
  }

  static async removeMatch(userId: ObjectId, matchId: ObjectId) {
    const db = getDb();
    try {
      return await db.collection("users").updateOne({ _id: userId }, {
        $pull: { currentMatches: matchId },
      } as any);
    } catch (error) {
      throw error;
    }
  }

  static async canAddMatch(userId: ObjectId): Promise<boolean> {
    const db = getDb();
    try {
      const user = await db.collection("users").findOne({ _id: userId });
      if (!user) return false;

      // Premium users can have unlimited matches
      if (user.isPremium) return true;

      // Free users can only have one match
      return !user.currentMatches || user.currentMatches.length === 0;
    } catch (error) {
      throw error;
    }
  }
}
