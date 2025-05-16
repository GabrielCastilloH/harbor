import { ObjectId } from 'mongodb';
import { getDb } from '../util/database.js';

export class Swipe {
  swiperId: ObjectId;
  swipedId: ObjectId;
  direction: 'left' | 'right';

  constructor(
    swiperId: ObjectId,
    swipedId: ObjectId,
    direction: 'left' | 'right'
  ) {
    this.swiperId = swiperId;
    this.swipedId = swipedId;
    this.direction = direction;
  }

  async save() {
    const db = getDb();
    try {
      return await db.collection('swipes').insertOne(this);
    } catch (error) {
      throw error;
    }
  }

  // Add the findOne static method to find a specific swipe
  static async findOne(query: {
    swiperId: ObjectId;
    swipedId: ObjectId;
    direction: string;
  }) {
    const db = getDb();
    try {
      return await db.collection('swipes').findOne(query);
    } catch (error) {
      throw error;
    }
  }

  // Returns a count of swipes made by the given user in the past 24 hours.
  static async countSwipesInPast24Hours(userId: ObjectId) {
    const db = getDb();
    try {
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      const swipes = await db
        .collection('swipes')
        .find({ swiperId: userId })
        .toArray();
      const count = swipes.filter((swipe) => {
        // Ensure _id is an ObjectId and use its getTimestamp() method
        return (swipe._id as ObjectId).getTimestamp() > twentyFourHoursAgo;
      }).length;
      return count;
    } catch (error) {
      throw error;
    }
  }

  // Returns all swipes made by the given user.
  static async findSwipesByUser(userId: ObjectId) {
    const db = getDb();
    try {
      return await db.collection('swipes').find({ swiperId: userId }).toArray();
    } catch (error) {
      throw error;
    }
  }
}
