import 'dotenv/config'; // Load environment variables from .env file
import express from 'express';
import { authRoutes } from './routes/authRoutes'; // Adjust the path if necessary

const app = express();

// Middleware to parse JSON bodies
app.use(express.json()); 

// Register the authentication routes under the "/auth" path
app.use('/auth', authRoutes);

// Start the server
app.listen(5000, () => {
  console.log('Server running on http://localhost:5000');
});
