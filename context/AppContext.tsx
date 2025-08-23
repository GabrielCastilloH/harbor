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
  setIsAuthenticated: (isAuthenticated: boolean) => void;
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
}

const defaultValue: AppContextType = {
  channel: null,
  setChannel: () => {},
  thread: null,
  setThread: () => {},
  isAuthenticated: false,
  setIsAuthenticated: () => {},
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
};

export const AppContext = React.createContext<AppContextType>(defaultValue);

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [channel, setChannel] = useState<any>(null);
  const [thread, setThread] = useState<any>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [userId, setUserId] = useState<string | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [streamApiKey, setStreamApiKey] = useState<string | null>(null);
  const [streamUserToken, setStreamUserToken] = useState<string | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [profileExists, setProfileExists] = useState(false);

  // Ensure userId is never an empty string - convert to null
  useEffect(() => {
    if (userId === "") {
      setUserId(null);
    }
  }, [userId]);

  // Listen to Firebase Auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log("🔍 [APP CONTEXT] Auth state changed - user:", user?.uid);
      setCurrentUser(user);

      if (user) {
        // User is signed in. Force a reload to check the latest status.
        // This is the ONLY place this should happen.
        try {
          await user.reload();
        } catch (error) {
          console.error("❌ [APP CONTEXT] Error reloading user:", error);
        }

        // Check verification first
        if (user.emailVerified) {
          setIsAuthenticated(true);
          console.log("✅ [APP CONTEXT] Email verified. Checking profile...");

          // Now, check for the profile
          try {
            const { UserService } = require("../networking");
            const response = await UserService.getUserById(user.uid);

            if (response && response.user) {
              console.log("✅ [APP CONTEXT] User profile found in Firestore");
              setUserId(user.uid);
              setProfileExists(true);
              setProfile(response.user);
            } else {
              console.log("📝 [APP CONTEXT] No user profile in Firestore");
              setUserId(null);
              setProfileExists(false);
              setProfile(null);
            }
          } catch (error) {
            console.error("❌ [APP CONTEXT] Error checking profile:", error);
            setProfileExists(false);
          }
        } else {
          // User is signed in but email NOT verified
          setIsAuthenticated(false);
          setUserId(null);
          setProfileExists(false);
        }

        // Load cached Stream credentials
        try {
          const [storedStreamApiKey, storedStreamUserToken] = await Promise.all(
            [
              AsyncStorage.getItem("@streamApiKey"),
              AsyncStorage.getItem("@streamUserToken"),
            ]
          );

          if (storedStreamApiKey) {
            setStreamApiKey(storedStreamApiKey);
          }
          if (storedStreamUserToken) {
            setStreamUserToken(storedStreamUserToken);
          }
        } catch (error) {}
      } else {
        // User is signed out
        setIsAuthenticated(false);
        setUserId(null);
        setProfileExists(false);
        setProfile(null);
        setStreamApiKey(null);
        setStreamUserToken(null);

        // Clear stored data
        try {
          await AsyncStorage.multiRemove(["@streamApiKey", "@streamUserToken"]);
        } catch (error) {
          console.error("Error clearing stored data:", error);
        }
      }
      setIsInitialized(true);
    });

    return () => unsubscribe();
  }, []); // The dependency array should be empty to prevent re-running on state changes.

  return (
    <AppContext.Provider
      value={{
        channel,
        setChannel,
        thread,
        setThread,
        isAuthenticated,
        setIsAuthenticated,
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
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => React.useContext(AppContext);
