// Unified networking exports
export * from "./AuthService";
export * from "./UserService";
export * from "./SwipeService";
export * from "./MatchService";
export * from "./ChatFunctions";
export * from "./ImageService";
export * from "./RecommendationService";
export * from "./ConsentService";
export * from "./ImageCache";

// Re-export specific services for easier imports
export { AuthService } from "./AuthService";
export { UserService } from "./UserService";
export { SwipeService } from "./SwipeService";
export { MatchService } from "./MatchService";
export { ImageService } from "./ImageService";
export { RecommendationService } from "./RecommendationService";
export { ConsentService } from "./ConsentService";
export { ImageCache } from "./ImageCache";

// Re-export specific functions for easier imports
export {
  fetchUpdateChannelChatStatus,
  updateMessageCount,
} from "./ChatFunctions";

import { getFunctions } from "firebase/functions";
import app from "../firebaseConfig";

// Initialize Firebase Functions
const functions = getFunctions(app, "us-central1");
