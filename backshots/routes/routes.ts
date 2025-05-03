import express from 'express';
import { Request, Response, NextFunction } from 'express';
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
  getUserById,
  updateUser,
} from '../controllers/userController.js';

import { getRecommendations } from '../controllers/algoDaddy.js';
import {
  generateUserToken,
  createChatChannel,
  updateChannelChatDisabled,
} from '../controllers/chatController.js';
import {
  uploadImage,
  getImage,
  deleteImage,
} from '../controllers/imageController.js';

const router = express.Router();

// POST new user.
router.post('/users', validateUser, createUser);

// GET all users.
router.get('/users', getAllUsers);

// GET a specific user by ID
router.get('/users/:id', getUserById);

// POST update a new user.
router.post('/users/:id', updateUser);

// Swipe routes.
router.post('/swipes', validateSwipe, createSwipe);
router.get('/swipes/:userId/count', countRecentSwipes);
router.get('/swipes/:userId', getSwipesByUser);

// Get recommendations
router.get('/users/:id/recommendations', getRecommendations);

// Chat routes
router.post('/chat/token', generateUserToken);
router.post('/chat/channel', createChatChannel);
router.post('/chat/channel/update', updateChannelChatDisabled);

// Add image routes
router.post('/images/upload', uploadImage);
router.get('/images/:id', getImage);
router.delete('/images/delete', deleteImage);

export default router;
