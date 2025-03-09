import { ObjectId } from 'mongodb';
import { getDb } from '../util/database.js';
import { StreamChat } from 'stream-chat';
import * as dotenv from 'dotenv';
dotenv.config();

// Get StreamChat API credentials from env vars
const API_KEY = process.env.STREAM_API_KEY;
const API_SECRET = process.env.STREAM_API_SECRET;

// Create StreamChat server client instance
const serverClient = StreamChat.getInstance(API_KEY || '', API_SECRET || '');

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
  swipes: ObjectId[];
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
    swipes: ObjectId[],
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
    this.swipes = swipes;
    this.email = email;
  }

  async save() {
    const db = getDb();
    try {
      // First save the user to MongoDB
      const result = await db.collection('users').insertOne(this);

      // If the user has an email, register them in StreamChat as well
      if (this.email) {
        try {
          // Add the user to StreamChat with their email as ID
          await serverClient.upsertUser({
            id: this.email,
            name: `${this.firstName} ${this.lastName}`,
            role: 'user',
            // Additional user data that might be useful for chat
            yearLevel: this.yearLevel,
            major: this.major,
          });
          console.log(`User ${this.email} added to StreamChat`);
        } catch (streamError) {
          console.error('Error adding user to StreamChat:', streamError);
          // Note: We don't throw here to avoid failing the whole operation
          // if only the StreamChat registration fails
        }
      }

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

      // If the user has an email and we're updating fields relevant to StreamChat, update StreamChat too
      if (updatedUser && updatedUser.email) {
        try {
          await serverClient.upsertUser({
            id: updatedUser.email,
            name: `${updatedUser.firstName} ${updatedUser.lastName}`,
            role: 'user',
            yearLevel: updatedUser.yearLevel,
            major: updatedUser.major,
          });
          console.log(`User ${updatedUser.email} updated in StreamChat`);
        } catch (streamError) {
          console.error('Error updating user in StreamChat:', streamError);
          // Continue with the operation even if StreamChat update fails
        }
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
