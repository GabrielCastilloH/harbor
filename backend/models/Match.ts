import { ObjectId } from "mongodb";
import { getDb } from "../util/database.js";

export interface IMatch {
  _id?: ObjectId;
  user1Id: ObjectId;
  user2Id: ObjectId;
  messageCount: number;
  matchDate: Date;
  isActive: boolean;
  channelId?: string;
  blurPercentage: number;
  hasShownWarning: boolean;
}

export class Match {
  constructor(
    public user1Id: ObjectId,
    public user2Id: ObjectId,
    public messageCount: number = 0,
    public matchDate: Date = new Date(),
    public isActive: boolean = true,
    public channelId?: string,
    public blurPercentage: number = 100,
    public hasShownWarning: boolean = false
  ) {}

  async save() {
    const db = getDb();
    try {
      return await db.collection("matches").insertOne(this);
    } catch (error) {
      throw error;
    }
  }

  static async findById(id: ObjectId) {
    const db = getDb();
    try {
      return await db.collection("matches").findOne({ _id: id });
    } catch (error) {
      throw error;
    }
  }

  static async findByUsers(user1Id: ObjectId, user2Id: ObjectId) {
    console.log("RUNNING findByUsers with:", {
      user1Id: user1Id.toString(),
      user2Id: user2Id.toString(),
    });
    const db = getDb();
    try {
      const match = await db.collection("matches").findOne({
        $or: [
          { user1Id, user2Id },
          { user1Id: user2Id, user2Id: user1Id },
        ],
        isActive: true,
      });
      console.log(
        "findByUsers result:",
        match
          ? {
              _id: match._id.toString(),
              user1Id: match.user1Id.toString(),
              user2Id: match.user2Id.toString(),
              isActive: match.isActive,
            }
          : "No match found"
      );
      return match;
    } catch (error) {
      console.error("Error in findByUsers:", error);
      throw error;
    }
  }

  static async findActiveMatchesByUser(userId: ObjectId) {
    const db = getDb();
    try {
      return await db
        .collection("matches")
        .find({
          $or: [{ user1Id: userId }, { user2Id: userId }],
          isActive: true,
        })
        .toArray();
    } catch (error) {
      throw error;
    }
  }

  static async incrementMessageCount(matchId: ObjectId) {
    const db = getDb();
    try {
      return await db
        .collection("matches")
        .updateOne({ _id: matchId }, { $inc: { messageCount: 1 } });
    } catch (error) {
      throw error;
    }
  }

  static async deactivateMatch(matchId: ObjectId) {
    const db = getDb();
    try {
      return await db
        .collection("matches")
        .updateOne({ _id: matchId }, { $set: { isActive: false } });
    } catch (error) {
      throw error;
    }
  }

  static async updateChannelId(matchId: ObjectId, channelId: string) {
    const db = getDb();
    try {
      return await db
        .collection("matches")
        .updateOne({ _id: matchId }, { $set: { channelId } });
    } catch (error) {
      throw error;
    }
  }

  static async updateBlurLevel(
    user1Id: ObjectId,
    user2Id: ObjectId,
    blurPercentage: number,
    hasShownWarning: boolean
  ) {
    const db = getDb();
    try {
      return await db.collection("matches").updateOne(
        {
          $or: [
            { user1Id, user2Id },
            { user1Id: user2Id, user2Id: user1Id },
          ],
          isActive: true,
        },
        {
          $set: {
            blurPercentage,
            hasShownWarning,
          },
        }
      );
    } catch (error) {
      throw error;
    }
  }
}
