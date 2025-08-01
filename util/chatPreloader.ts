import AsyncStorage from "@react-native-async-storage/async-storage";
import { ChatFunctions } from "../networking/ChatFunctions";

/**
 * Pre-loads Stream Chat credentials for a user
 * This should be called during sign-in to avoid loading delays when accessing chat
 */
export async function preloadChatCredentials(userId: string): Promise<{
  apiKey: string;
  userToken: string;
}> {
  try {
    console.log("ChatPreloader - Starting to pre-load chat credentials for user:", userId);
    
    // Fetch Stream API key and user token in parallel
    const [apiKey, userToken] = await Promise.all([
      ChatFunctions.getStreamApiKey(),
      ChatFunctions.generateToken(userId),
    ]);

    // Store in AsyncStorage for persistence
    await Promise.all([
      AsyncStorage.setItem("@streamApiKey", apiKey),
      AsyncStorage.setItem("@streamUserToken", userToken),
    ]);

    console.log("ChatPreloader - Successfully pre-loaded chat credentials");
    
    return { apiKey, userToken };
  } catch (error) {
    console.error("ChatPreloader - Error pre-loading chat credentials:", error);
    throw error;
  }
}

/**
 * Clears cached chat credentials
 * Should be called on sign-out
 */
export async function clearChatCredentials(): Promise<void> {
  try {
    await Promise.all([
      AsyncStorage.removeItem("@streamApiKey"),
      AsyncStorage.removeItem("@streamUserToken"),
    ]);
    console.log("ChatPreloader - Cleared cached chat credentials");
  } catch (error) {
    console.error("ChatPreloader - Error clearing chat credentials:", error);
  }
} 