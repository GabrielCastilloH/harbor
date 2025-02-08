import { ObjectId } from 'mongodb';
import { getDb } from '../util/database.js';

export class User {
  email: string;
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

  constructor(
    email: string,
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
    swipes: ObjectId[]
  ) {
    this.email = email;
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
  }

  async save() {
    const db = getDb();
    try {
      return await db.collection('users').insertOne(this);
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
      return await db.collection('users').findOne({ _id: id });
    } catch (error) {
      throw error;
    }
  }

  static async findByEmail(email: string) {
    const db = getDb();
    try {
      return await db.collection('users').findOne({ email: email });
    } catch (error) {
      throw error;
    }
  }

  static async updateById(id: ObjectId, updatedData: Partial<User>) {
    const db = getDb();
    try {
      const result = await db.collection('users').updateOne(
        { _id: id },
        { $set: updatedData }
      );
      if (result.matchedCount === 0) {
        return null;
      }
      return await User.findById(id);
    } catch (error) {
      throw error;
    }
  }
}