import { ObjectId } from "mongodb";
import { getDb } from "../util/database.js";

/** Represents a swipe action between two users in the dating app */
export class Swipe {
  swiperId: ObjectId;
  swipedId: ObjectId;
  direction: "left" | "right";

  /**
   * Creates a new swipe instance
   * @param {ObjectId} swiperId - ID of the user who made the swipe
   * @param {ObjectId} swipedId - ID of the user who was swiped on
   * @param {'left' | 'right'} direction - Direction of the swipe
   */
  constructor(
    swiperId: ObjectId,
    swipedId: ObjectId,
    direction: "left" | "right"
  ) {
    this.swiperId = swiperId;
    this.swipedId = swipedId;
    this.direction = direction;
  }

  /**
   * Saves the swipe to the database
   * @returns {Promise<InsertOneResult>} Result of the database insertion
   * @throws {Error} If database operation fails
   */
  async save() {
    const db = getDb();
    try {
      return await db.collection("swipes").insertOne(this);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Finds a specific swipe in the database
   * @param {Object} query - Query object containing swipe details
   * @param {ObjectId} query.swiperId - ID of the user who made the swipe
   * @param {ObjectId} query.swipedId - ID of the user who was swiped on
   * @param {string} query.direction - Direction of the swipe
   * @returns {Promise<Swipe | null>} The found swipe or null
   * @throws {Error} If database operation fails
   */
  static async findOne(query: {
    swiperId: ObjectId;
    swipedId: ObjectId;
    direction: string;
  }) {
    const db = getDb();
    try {
      return await db.collection("swipes").findOne(query);
    } catch (error) {
      throw error;
    }
  }

  /**
   * Counts swipes made by a user in the last 24 hours
   * @param {ObjectId} userId - ID of the user to count swipes for
   * @returns {Promise<number>} Number of swipes in the past 24 hours
   * @throws {Error} If database operation fails
   */
  static async countSwipesInPast24Hours(userId: ObjectId) {
    const db = getDb();
    try {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const swipes = await db
        .collection("swipes")
        .find({ swiperId: userId })
        .toArray();
      const count = swipes.filter((swipe) => {
        return (swipe._id as ObjectId).getTimestamp() > twentyFourHoursAgo;
      }).length;
      return count;
    } catch (error) {
      throw error;
    }
  }

  /**
   * Retrieves all swipes made by a specific user
   * @param {ObjectId} userId - ID of the user to find swipes for
   * @returns {Promise<Array<Swipe>>} Array of swipes made by the user
   * @throws {Error} If database operation fails
   */
  static async findSwipesByUser(userId: ObjectId) {
    const db = getDb();
    try {
      return await db.collection("swipes").find({ swiperId: userId }).toArray();
    } catch (error) {
      throw error;
    }
  }
}
