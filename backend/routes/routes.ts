import express from "express";
import { Request, Response, NextFunction } from "express";
import { validateUser } from "../middleware/userValidation.js";
import { validateSwipe } from "../middleware/swipeValidation.js";
import { verifyGoogleAuth } from "../middleware/authMiddleware.js";
import { authenticateGoogle } from "../controllers/authController.js";
import {
  createSwipe,
  countRecentSwipes,
  getSwipesByUser,
} from "../controllers/swipeController.js";
import {
  createUser,
  getAllUsers,
  getUserById,
  updateUser,
  unmatchUser,
} from "../controllers/userController.js";
import { getRecommendations } from "../controllers/algoDaddy.js";
import {
  generateUserToken,
  createChatChannel,
  updateChannelChatStatus,
} from "../controllers/chatController.js";
import {
  uploadImage,
  getImage,
  deleteImage,
} from "../controllers/imageController.js";
import {
  updateBlurLevelForMessage,
  getBlurLevel,
  handleWarningResponse,
} from "../controllers/blurController.js";
import {
  createMatch,
  getActiveMatches,
  unmatchUsers,
  updateMatchChannel,
  incrementMatchMessages,
} from "../controllers/matchController.js";

const router = express.Router();

// Public auth route
router.post("/auth/google", authenticateGoogle);

// Protected routes
const protectedRouter = express.Router();
protectedRouter.use(verifyGoogleAuth);

// POST new user.
protectedRouter.post("/users", validateUser, createUser);

// GET all users.
protectedRouter.get("/users", getAllUsers);

// GET a specific user by ID
protectedRouter.get("/users/:id", getUserById);

// POST update a new user.
protectedRouter.post("/users/:id", updateUser);

// Swipe routes.
protectedRouter.post("/swipes", validateSwipe, createSwipe);
protectedRouter.get("/swipes/:userId/count", countRecentSwipes);
protectedRouter.get("/swipes/:userId", getSwipesByUser);

// Get recommendations
protectedRouter.get("/users/:id/recommendations", getRecommendations);

// Chat routes
protectedRouter.post("/chat/token", generateUserToken);
protectedRouter.post("/chat/channel", createChatChannel);
protectedRouter.post("/chat/channel/update", updateChannelChatStatus);

// Add image routes
protectedRouter.post("/images/upload", uploadImage);
protectedRouter.get("/images/:id", getImage);
protectedRouter.delete("/images/delete", deleteImage);

// Add unmatch route
protectedRouter.post("/users/:userId/unmatch", unmatchUser);

// Add blur level routes
protectedRouter.post("/blur/update", updateBlurLevelForMessage);
protectedRouter.get("/blur/:userId/:matchedUserId", getBlurLevel);
protectedRouter.post("/blur/warning-response", handleWarningResponse);

// Match routes
protectedRouter.post("/matches", createMatch);
protectedRouter.get("/matches/user/:userId", getActiveMatches);
protectedRouter.post("/matches/:matchId/unmatch", unmatchUsers);
protectedRouter.post("/matches/:matchId/channel", updateMatchChannel);
protectedRouter.post("/matches/:matchId/messages", incrementMatchMessages);

// Use the protected routes
router.use("/", protectedRouter);

export default router;
