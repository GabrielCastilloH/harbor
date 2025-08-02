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

    return { apiKey, userToken };
  } catch (error) {
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
  } catch (error) {}
}
