import * as admin from "firebase-admin";

// Initialize Firebase Admin
admin.initializeApp();

// Import all function modules
import { authFunctions } from "./auth/auth";
import { userFunctions } from "./users/users";
import { swipeFunctions } from "./swipes/swipes";
import { matchFunctions } from "./matches/matches";
import { chatFunctions } from "./chat/chat";
import { imageFunctions } from "./images/images";
import { blurFunctions } from "./blur/blur";
import { recommendationFunctions } from "./recommendations/recommendations";

// Export all functions
export const auth = authFunctions;
export const users = userFunctions;
export const swipes = swipeFunctions;
export const matches = matchFunctions;
export const chat = chatFunctions;
export const images = imageFunctions;
export const blur = blurFunctions;
export const recommendations = recommendationFunctions;
