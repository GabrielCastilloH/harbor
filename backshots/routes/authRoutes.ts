import express, { Request, Response } from 'express';
import { authenticateGoogle } from '../controllers/authController.js';

const router = express.Router();

// Define the route to handle Google OAuth token verification
router.post('/google', authenticateGoogle);

export default router;
