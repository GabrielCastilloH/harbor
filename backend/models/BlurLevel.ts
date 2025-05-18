import { ObjectId } from "mongodb";
import { getDb } from "../util/database.js";

export class BlurLevel {
  constructor(
    public userId: ObjectId,
    public matchedUserId: ObjectId,
    public blurPercentage: number = 100, // Start at 100% blur
    public hasShownWarning: boolean = false
  ) {}

  async save() {
    const db = getDb();
    try {
      return await db.collection("blurLevels").insertOne(this);
    } catch (error) {
      throw error;
    }
  }

  static async findByUserPair(userId: ObjectId, matchedUserId: ObjectId) {
    const db = getDb();
    try {
      return await db.collection("blurLevels").findOne({
        userId: userId,
        matchedUserId: matchedUserId,
      });
    } catch (error) {
      throw error;
    }
  }

  static async updateBlurLevel(
    userId: ObjectId,
    matchedUserId: ObjectId,
    newBlurPercentage: number,
    hasShownWarning: boolean = false
  ) {
    const db = getDb();
    try {
      return await db.collection("blurLevels").updateOne(
        { userId: userId, matchedUserId: matchedUserId },
        {
          $set: {
            blurPercentage: newBlurPercentage,
            hasShownWarning: hasShownWarning,
          },
        },
        { upsert: true }
      );
    } catch (error) {
      throw error;
    }
  }
}
