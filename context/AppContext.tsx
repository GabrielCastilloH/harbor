import React, { useState, ReactNode, useEffect, useRef } from "react";
import { Profile } from "../types/App";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { auth } from "../firebaseConfig";
import { onAuthStateChanged, User } from "firebase/auth";
import { UserService } from "../networking/UserService";

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
  setProfileExists: (exists: boolean) => void;
  refreshAuthState: (user: User) => void;
  isBanned: boolean;
  setIsBanned: (banned: boolean) => void;
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
  setProfileExists: () => {},
  refreshAuthState: () => {},
  isBanned: false,
  setIsBanned: () => {},
};

export const AppContext = React.createContext<AppContextType>(defaultValue);

interface AppProviderProps {
  children: ReactNode;
}

export const AppProvider: React.FC<AppProviderProps> = ({ children }) => {
  const [channel, setChannel] = useState<any>(null);
  const [thread, setThread] = useState<any>(null);
  const [streamApiKey, setStreamApiKey] = useState<string | null>(null);
  const [streamUserToken, setStreamUserToken] = useState<string | null>(null);

  // 🏆 The Fix: Single atomic state object to prevent race conditions
  const [appState, setAppState] = useState({
    isAuthenticated: false,
    userId: null as string | null,
    profile: null as Profile | null,
    currentUser: null as User | null,
    profileExists: false,
    isInitialized: false,
  });

  // Banned state - separate from appState as it's checked independently
  const [isBanned, setIsBanned] = useState(false);

  // 🏆 The Fix: Use a ref to prevent race conditions from duplicate listener calls
  const isProcessingAuthRef = useRef(false);

  // Computed values for cleaner usage
  const isAuthenticated = !!appState.currentUser;
  const { isInitialized, profileExists, userId, profile, currentUser } =
    appState;

  // The core function to check user and profile status.
  // This is now the single source of truth for handling auth state changes.
  const checkAndSetAuthState = async (user: User | null) => {
    // 🚦 Do not proceed if another process is already running
    if (isProcessingAuthRef.current) {
      return;
    }

    isProcessingAuthRef.current = true;

    try {
      if (!user) {
        setStreamApiKey(null);
        setStreamUserToken(null);
        try {
          await AsyncStorage.multiRemove(["@streamApiKey", "@streamUserToken"]);
        } catch (error) {
          // Silent fail for data clearing
        }

        // 🏆 Atomic state update
        setAppState({
          ...appState,
          isAuthenticated: false,
          userId: null,
          profile: null,
          currentUser: null,
          profileExists: false,
          isInitialized: true,
        });
        return;
      }

      // 🚀 OPTIMIZATION: Use Promise.all to fetch data in parallel
      const { UserService } = require("../networking");
      const [idToken, firestoreResponse, banStatus] = await Promise.all([
        user.getIdToken(true),
        UserService.getUserById(user.uid),
        UserService.checkBannedStatus(user.uid),
      ]);

      // Check if user is banned first
      if (banStatus.isBanned) {
        setIsBanned(true);
        setAppState({
          ...appState,
          isAuthenticated: true,
          userId: user.uid,
          profile: null,
          currentUser: user,
          profileExists: false,
          isInitialized: true,
        });
        return;
      } else {
        setIsBanned(false);
      }

      if (!user.emailVerified) {
        setAppState({
          ...appState,
          isAuthenticated: true,
          userId: null,
          profile: null,
          currentUser: user,
          profileExists: false,
          isInitialized: true,
        });
        return;
      }

      const response = firestoreResponse; // Use the result from Promise.all

      if (response && response.user) {
        await loadStreamCredentials();

        setAppState({
          ...appState,
          isAuthenticated: true,
          userId: user.uid,
          profile: response.user,
          currentUser: user,
          profileExists: true,
          isInitialized: true,
        });
      } else {
        setAppState({
          ...appState,
          isAuthenticated: true,
          userId: user.uid,
          profile: null,
          currentUser: user,
          profileExists: false,
          isInitialized: true,
        });
      }
    } catch (error: any) {
      // Silent fail for auth state check
      setAppState({
        ...appState,
        isAuthenticated: true,
        userId: user?.uid || null,
        profile: null,
        currentUser: user,
        profileExists: false,
        isInitialized: true,
      });
    } finally {
      isProcessingAuthRef.current = false;
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
      // Silent fail for Stream credentials loading
    }
  };

  // Function to manually refresh auth state (used by EmailVerificationScreen)
  const refreshAuthState = async (user: User) => {
    await checkAndSetAuthState(user);
  };

  // Ensure userId is never an empty string - convert to null
  useEffect(() => {
    if (userId === "") {
      setAppState({
        ...appState,
        userId: null,
      });
    }
  }, [userId]);

  // Listen to Firebase Auth state changes
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      // 🏆 All state updates now handled atomically in checkAndSetAuthState
      await checkAndSetAuthState(user);
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
        setUserId: (userId: string | null) =>
          setAppState({ ...appState, userId }),
        profile,
        setProfile: (profile: Profile | null) =>
          setAppState({ ...appState, profile }),
        currentUser,
        streamApiKey,
        setStreamApiKey,
        streamUserToken,
        setStreamUserToken,
        isInitialized,
        profileExists,
        setProfileExists: (exists: boolean) =>
          setAppState({ ...appState, profileExists: exists }),
        refreshAuthState,
        isBanned,
        setIsBanned,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => React.useContext(AppContext);
