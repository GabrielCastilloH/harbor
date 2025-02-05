import { getDb } from '../util/database.js';
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
  rightSwipes: string[];
  leftSwipes: string[];

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
    rightSwipes: string[] = [],
    leftSwipes: string[] = []
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
    this.rightSwipes = rightSwipes;
    this.leftSwipes = leftSwipes;
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
}
