import { MongoClient } from 'mongodb';
import environment from './environment.js';

const MONGODB_URI =
  environment.mongoURI || 'mongodb://localhost:27017/your_database';

console.log(MONGODB_URI);

const mongoConnect = async (
  callback: (client: MongoClient) => void
): Promise<void> => {
  try {
    const client = await MongoClient.connect(MONGODB_URI);
    console.log('Connected to MongoDB');
    callback(client);
  } catch (err) {
    console.error('Failed to connect to MongoDB', err);
    throw err;
  }
};

export default mongoConnect;
