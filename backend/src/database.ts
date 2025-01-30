// src/database.ts
import { Sequelize } from 'sequelize';
import * as dotenv from 'dotenv';

dotenv.config();  // Load environment variables

console.log('DB_HOST:', process.env.DB_HOST);  // Log to verify environment variables

export const sequelize = new Sequelize({
  dialect: 'postgres',
  host: process.env.DB_HOST,
  username: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
});
