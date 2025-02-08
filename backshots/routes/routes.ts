import express from 'express';
import { validateUser } from '../middleware/userValidation.js';
import { validateSwipe } from '../middleware/swipeValidation.js';
import {
  createSwipe,
  countRecentSwipes,
  getSwipesByUser,
} from '../controllers/swipeController.js';
import {
  createUser,
  getAllUsers,
  getUserByEmail,
  getUserById,
  updateUser,
} from '../controllers/userController.js';

import { getRecommendations } from '../controllers/algoDaddy.js';

const router = express.Router();

// POST new user.
router.post('/users', validateUser, createUser);

// GET all users.
router.get('/users', getAllUsers);

// GET a specific user by ID
router.get('/users/:id', getUserById);

// GET a specific user by email
router.get('/users/email/:email', getUserByEmail);

// POST update a new user.
router.post('/users/:id', updateUser);

// Swipe routes.
router.post('/swipes', validateSwipe, createSwipe);
router.get('/swipes/:userId/count', countRecentSwipes);
router.get('/swipes/:userId', getSwipesByUser);

// Get recommendations
router.get('/users/:id/recommendations', getRecommendations);

export default router;
