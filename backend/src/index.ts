// src/index.ts
import express, { Request, Response } from 'express';
import { sequelize } from './database'; // Import sequelize instance
import { allRoutes } from './routes/allRoutes';
import * as dotenv from 'dotenv';
import { Swipe } from './models/swipe'; // Import the Swipe model

dotenv.config();  // Load environment variables

const app = express();
const port = 5000;

app.use(express.json());
app.use('/api', allRoutes); // Use your API routes

// Sync the models with the database (create tables if they don't exist)
sequelize.sync({ force: false }) // Set force to false to avoid dropping existing tables
  .then(() => {
    console.log('Database synced successfully!');
  })
  .catch((err) => {
    console.error('Error syncing database:', err);
  });

// Root endpoint
app.get('/', (req: Request, res: Response) => {
  res.send('Hello, welcome to the API!');
});

// Start the server
app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`);
});
