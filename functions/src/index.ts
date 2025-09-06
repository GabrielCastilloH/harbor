import { initializeApp } from "firebase-admin/app";

// Initialize Firebase Admin SDK
initializeApp();

// Import all function modules
import { authFunctions } from "./auth/auth";
import { chatFunctions } from "./chat/chat";
import { imageFunctions } from "./images/images";
import { matchFunctions } from "./matches/matches";
import { recommendationsFunctions } from "./recommendations/recommendations";
import { reportFunctions } from "./reports/reports";
import { superwallFunctions } from "./superwall/superwall";
import { swipeFunctions } from "./swipes/swipes";
import { swipeLimitFunctions } from "./swipes/swipeLimits";
import { userFunctions } from "./users/users";

export {
  authFunctions,
  chatFunctions,
  imageFunctions,
  matchFunctions,
  recommendationsFunctions,
  reportFunctions,
  superwallFunctions,
  swipeFunctions,
  swipeLimitFunctions,
  userFunctions,
};
