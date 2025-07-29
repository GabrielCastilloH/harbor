// Unified networking exports
export * from "./AuthService";
export * from "./UserService";
export * from "./SwipeService";
export * from "./MatchService";
export * from "./ChatFunctions";
export * from "./ImageService";
export * from "./BlurService";
export * from "./RecommendationService";

// Re-export specific services for easier imports
export { AuthService } from "./AuthService";
export { UserService } from "./UserService";
export { SwipeService } from "./SwipeService";
export { ImageService } from "./ImageService";
export { BlurService } from "./BlurService";
export { RecommendationService } from "./RecommendationService";

// Re-export specific functions for easier imports
export {
  fetchUserToken,
  fetchCreateChatChannel,
  fetchUpdateChannelChatStatus,
  updateMessageCount,
} from "./ChatFunctions";

export {
  createMatch,
  getActiveMatches,
  unmatch,
  updateMatchChannel,
  updateBlurLevel,
  getBlurLevel,
} from "./MatchService";
