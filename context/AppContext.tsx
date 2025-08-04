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
  const [isAuthDetermined, setIsAuthDetermined] = useState(false);

  // Ensure userId is never an empty string - convert to null
  useEffect(() => {
    if (userId === "") {
      setUserId(null);
    }
  }, [userId]);

  // Listen to Firebase Auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      // Prevent multiple rapid state changes during initialization
      if (isAuthDetermined && user?.uid === currentUser?.uid) {
        return;
      }

      if (user) {
        // User is signed in
        setCurrentUser(user);
        setIsAuthenticated(true);

        // Always check Firestore when user changes to ensure we have the correct profile
        // This fixes the issue where switching accounts doesn't properly check the new user's profile
        try {
          const { UserService } = require("../networking");
          const response = await UserService.getUserById(user.uid);
          if (response && response.user) {
            setUserId(user.uid);
            setProfile(response.user);
          } else {
            setUserId(null);
            setProfile(null);
          }
        } catch (error: any) {
          if (
            error?.code === "functions/not-found" ||
            error?.code === "not-found" ||
            error?.message?.includes("not found")
          ) {
            setUserId(null);
            setProfile(null);
          } else {
            // For other errors, still set userId but log the error
            console.error("Error checking user profile:", error);
            setUserId(user.uid);
          }
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
        setCurrentUser(null);
        setIsAuthenticated(false);
        setUserId(null); // Ensure this is null, not empty string
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

      setIsAuthDetermined(true);
      setIsInitialized(true);
    });

    return () => {
      unsubscribe();
    };
  }, [currentUser?.uid, isAuthDetermined]);

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
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => React.useContext(AppContext);
