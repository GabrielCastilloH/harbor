import { MongoClient, Db } from 'mongodb';
import environment from './environment.js';

let _db: Db | undefined;

const MONGODB_URI =
  environment.mongoURI ||
  (() => {
    console.log('MongoDB URI not found in environment variables');
    throw new Error('MongoDB URI not found in environment variables');
  })();

const mongoConnect = async (callback: () => void): Promise<void> => {
  try {
    const client = await MongoClient.connect(MONGODB_URI);
    _db = client.db('harbor');
    callback();
  } catch (err) {
    console.error('Failed to connect to MongoDB', err);
    throw err;
  }
};

const getDb = () => {
  if (_db) {
    return _db;
  }
  throw 'No database found!';
};

export { mongoConnect, getDb };
