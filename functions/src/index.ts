import { initializeApp } from "firebase-admin/app";

initializeApp();

// Import all function modules
import { authFunctions } from "./auth/auth";
import { chatFunctions } from "./chat/chat";
import { imageFunctions } from "./images/images";
import { matchFunctions } from "./matches/matches";
import { recommendationsFunctions } from "./recommendations/recommendations";
import { swipeFunctions } from "./swipes/swipes";
import { userFunctions } from "./users/users";

export {
  authFunctions,
  chatFunctions,
  imageFunctions,
  matchFunctions,
  recommendationsFunctions,
  swipeFunctions,
  userFunctions,
};
