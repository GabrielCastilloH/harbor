import * as functions from "firebase-functions";
import * as admin from "firebase-admin";

// Initialize Firebase Admin
admin.initializeApp();

// Import all function modules
import { authFunctions } from "./auth";
import { userFunctions } from "./users";
import { swipeFunctions } from "./swipes";
import { matchFunctions } from "./matches";
import { chatFunctions } from "./chat";
import { imageFunctions } from "./images";
import { blurFunctions } from "./blur";
import { recommendationFunctions } from "./recommendations";

// Export all functions
export const auth = authFunctions;
export const users = userFunctions;
export const swipes = swipeFunctions;
export const matches = matchFunctions;
export const chat = chatFunctions;
export const images = imageFunctions;
export const blur = blurFunctions;
export const recommendations = recommendationFunctions;
