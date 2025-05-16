import * as dotenv from 'dotenv';
dotenv.config();

const environment = {
  mongoURI: process.env.MONGODB_URI,
};

export default environment;
