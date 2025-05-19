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
  warningShown: boolean;
  user1Agreed: boolean;
  user2Agreed: boolean;
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
    public warningShown: boolean = false,
    public user1Agreed: boolean = false,
    public user2Agreed: boolean = false
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
    const db = getDb();
    try {
      const match = await db.collection("matches").findOne({
        $or: [
          { user1Id, user2Id },
          { user1Id: user2Id, user2Id: user1Id },
        ],
        isActive: true,
      });
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
    warningShown: boolean
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
            warningShown,
          },
        }
      );
    } catch (error) {
      throw error;
    }
  }

  static async updateWarningAgreement(
    matchId: ObjectId,
    userId: ObjectId,
    agreed: boolean
  ) {
    const db = getDb();
    try {
      const match = await this.findById(matchId);
      if (!match) throw new Error("Match not found");

      const isUser1 = match.user1Id.equals(userId);
      const updateField = isUser1 ? "user1Agreed" : "user2Agreed";

      return await db
        .collection("matches")
        .updateOne({ _id: matchId }, { $set: { [updateField]: agreed } });
    } catch (error) {
      throw error;
    }
  }

  static async bothUsersAgreed(matchId: ObjectId): Promise<boolean> {
    const match = await this.findById(matchId);
    return match ? match.user1Agreed && match.user2Agreed : false;
  }

  static async resetWarningAgreements(matchId: ObjectId) {
    const db = getDb();
    try {
      return await db.collection("matches").updateOne(
        { _id: matchId },
        {
          $set: {
            user1Agreed: false,
            user2Agreed: false,
            warningShown: false,
          },
        }
      );
    } catch (error) {
      throw error;
    }
  }
}
