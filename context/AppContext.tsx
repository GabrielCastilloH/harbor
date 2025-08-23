import React, { useState, ReactNode, useEffect } from "react";
import { Profile } from "../types/App";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { auth } from "../firebaseConfig";
import { onAuthStateChanged, User } from "firebase/auth";

interface AppContextType {
  channel: any;
  setChannel: (channel: any) => void;
  thread: any;
  setThread: (thread: any) => void;
  isAuthenticated: boolean;
  userId: string | null;
  setUserId: (userId: string | null) => void;
  profile: Profile | null;
  setProfile: (profile: Profile | null) => void;
  currentUser: User | null;
  streamApiKey: string | null;
  setStreamApiKey: (key: string | null) => void;
  streamUserToken: string | null;
  setStreamUserToken: (token: string | null) => void;
  isInitialized: boolean;
  profileExists: boolean;
  refreshAuthState: (user: User) => void;
}

const defaultValue: AppContextType = {
  channel: null,
  setChannel: () => {},
  thread: null,
  setThread: () => {},
  isAuthenticated: false,
  userId: null,
  setUserId: () => {},
  profile: null,
  setProfile: () => {},
  currentUser: null,
  streamApiKey: null,
  setStreamApiKey: () => {},
  streamUserToken: null,
  setStreamUserToken: () => {},
  isInitialized: false,
  profileExists: false,
  refreshAuthState: () => {},
};

export const AppContext = React.createContext<AppContextType>(defaultValue);

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [channel, setChannel] = useState<any>(null);
  const [thread, setThread] = useState<any>(null);
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [streamApiKey, setStreamApiKey] = useState<string | null>(null);
  const [streamUserToken, setStreamUserToken] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [profileExists, setProfileExists] = useState(false);

  // A computed value that reflects the current authentication state
  const isAuthenticated = !!currentUser;

  // The core function to check user and profile status.
  // This is now the single source of truth for handling auth state changes.
  const checkAndSetAuthState = async (user: User | null) => {
    if (!user) {
      // User is signed out
      setUserId(null);
      setProfileExists(false);
      setProfile(null);
      setStreamApiKey(null);
      setStreamUserToken(null);
      try {
        await AsyncStorage.multiRemove(["@streamApiKey", "@streamUserToken"]);
      } catch (error) {
        console.error("❌ [APP CONTEXT] Error clearing stored data:", error);
      }
      return;
    }

    // User is signed in. Force a reload to check the latest status.
    try {
      console.log("🔄 [APP CONTEXT] Reloading user to get latest status...");
      await user.reload();
      console.log(
        "✅ [APP CONTEXT] User reloaded successfully, emailVerified:",
        user.emailVerified
      );
    } catch (error) {
      console.error("❌ [APP CONTEXT] Error reloading user:", error);
    }

    // Check email verification first
    console.log(
      "🔍 [APP CONTEXT] User emailVerified status:",
      user.emailVerified
    );
    if (!user.emailVerified) {
      console.log("📧 [APP CONTEXT] Email not verified");
      setUserId(null);
      setProfileExists(false);
      setProfile(null);
      return;
    }

    // Email is verified, now check for the profile
    console.log("✅ [APP CONTEXT] Email verified, checking profile...");
    try {
      const { UserService } = require("../networking");
      const response = await UserService.getUserById(user.uid);

      if (response && response.user) {
        console.log("✅ [APP CONTEXT] Profile found");
        setUserId(user.uid);
        setProfile(response.user);
        setProfileExists(true); // This state update is now guaranteed to happen after the check
        await loadStreamCredentials(); // Load credentials only if the profile exists
      } else {
        console.log("📝 [APP CONTEXT] No profile found");
        setUserId(user.uid);
        setProfile(null);
        setProfileExists(false); // No profile, so profileExists is false
      }
    } catch (error: any) {
      if (
        error?.code === "not-found" ||
        error?.code === "functions/not-found"
      ) {
        console.log("📝 [APP CONTEXT] No profile found (new user)");
        setUserId(user.uid);
        setProfile(null);
        setProfileExists(false);
      } else {
        console.error("❌ [APP CONTEXT] Error checking profile:", error);
        setUserId(user.uid);
        setProfileExists(false);
        setProfile(null);
      }
    }
  };

  const loadStreamCredentials = async () => {
    try {
      const [storedStreamApiKey, storedStreamUserToken] = await Promise.all([
        AsyncStorage.getItem("@streamApiKey"),
        AsyncStorage.getItem("@streamUserToken"),
      ]);

      if (storedStreamApiKey) setStreamApiKey(storedStreamApiKey);
      if (storedStreamUserToken) setStreamUserToken(storedStreamUserToken);
    } catch (error) {
      console.error(
        "❌ [APP CONTEXT] Error loading Stream credentials:",
        error
      );
    }
  };

  // Function to manually refresh auth state (used by EmailVerificationScreen)
  const refreshAuthState = async (user: User) => {
    console.log("🔄 [APP CONTEXT] Refreshing auth state manually...");
    await checkAndSetAuthState(user);
    console.log("✅ [APP CONTEXT] Auth state refreshed manually");
  };

  // Ensure userId is never an empty string - convert to null
  useEffect(() => {
    if (userId === "") {
      setUserId(null);
    }
  }, [userId]);

  // Listen to Firebase Auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log(
        "🔍 [APP CONTEXT] Auth state changed:",
        user?.uid ? "user signed in" : "user signed out"
      );
      setCurrentUser(user);
      await checkAndSetAuthState(user);
      setIsInitialized(true);
    });

    return () => unsubscribe();
  }, []); // The dependency array is empty to prevent re-running on state changes.

  return (
    <AppContext.Provider
      value={{
        channel,
        setChannel,
        thread,
        setThread,
        isAuthenticated,
        userId,
        setUserId,
        profile,
        setProfile,
        currentUser,
        streamApiKey,
        setStreamApiKey,
        streamUserToken,
        setStreamUserToken,
        isInitialized,
        profileExists,
        refreshAuthState,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => React.useContext(AppContext);
