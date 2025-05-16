import { ObjectId } from 'mongodb';
import { getDb } from '../util/database.js';
import { upsertUserToStreamChat } from '../controllers/chatController.js';

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
  email: string; // Added email field

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
    email: string // Optional parameter for email
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
  }

  async save() {
    const db = getDb();
    try {
      const result = await db.collection('users').insertOne(this);
      const userId = result.insertedId.toString();

      // Add the user to StreamChat using the dedicated function in chatController
      await upsertUserToStreamChat(userId, this.firstName, this.lastName);

      return result;
    } catch (error) {
      throw error;
    }
  }

  static async fetchAll() {
    const db = getDb();
    try {
      return await db.collection('users').find().limit(3).toArray();
    } catch (error) {
      throw error;
    }
  }

  static async findById(id: ObjectId) {
    const db = getDb();
    try {
      return db.collection('users').findOne({ _id: id });
    } catch (error) {
      throw error;
    }
  }

  static async updateById(id: ObjectId, updatedData: Partial<User>) {
    const db = getDb();
    try {
      const result = await db
        .collection('users')
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

  // Add a new static method to find user by email
  static async findByEmail(email: string) {
    const db = getDb();
    try {
      return await db.collection('users').findOne({ email: email });
    } catch (error) {
      throw error;
    }
  }
}
