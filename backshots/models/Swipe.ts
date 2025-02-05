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

  
  static async findByTime(userId: ObjectId) {
    const db = getDb();
    try {
      const allSwipes = await db
        .collection('swipes')
        .find({ swiperId: userId })
        .toArray();
      const twentyFourHoursAgo = new Date(Date.now() - 24 * 60 * 60 * 1000);
      return allSwipes.filter((swipe) => {
        return (swipe._id as ObjectId).getTimestamp() > twentyFourHoursAgo;
      });
    } catch (error) {
      throw error;
    }
  }
}
