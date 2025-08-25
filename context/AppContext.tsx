import React, { useState, ReactNode, useEffect, useRef } from "react";
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
  setProfileExists: (exists: boolean) => void;
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
  setProfileExists: () => {},
  refreshAuthState: () => {},
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
      console.log(
        `LOG: IGNORING onAuthStateChanged event at ${new Date().toISOString()} because another one is in progress.`
      );
      return;
    }

    isProcessingAuthRef.current = true;
    console.log(
      `LOG: checkAndSetAuthState started at ${new Date().toISOString()}`
    );

    try {
      if (!user) {
        console.log(
          `LOG: User is null, signing out at ${new Date().toISOString()}`
        );
        setStreamApiKey(null);
        setStreamUserToken(null);
        try {
          await AsyncStorage.multiRemove(["@streamApiKey", "@streamUserToken"]);
        } catch (error) {
          console.error("❌ [APP CONTEXT] Error clearing stored data:", error);
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
        console.log(`LOG: State after sign-out: isInitialized=true`);
        return;
      }

      console.log(
        `LOG: Attempting to get ID token and user profile in parallel at ${new Date().toISOString()}`
      );

      // 🚀 OPTIMIZATION: Use Promise.all to fetch data in parallel
      const { UserService } = require("../networking");
      const [idToken, firestoreResponse] = await Promise.all([
        user.getIdToken(true),
        UserService.getUserById(user.uid),
      ]);

      console.log(
        `LOG: Successfully got ID token and Firestore response at ${new Date().toISOString()}. Token length: ${
          idToken.length
        }`
      );
      console.log(
        `LOG: Firestore response received at ${new Date().toISOString()}:`,
        firestoreResponse ? "found" : "not found"
      );

      if (!user.emailVerified) {
        console.log(`LOG: Email not verified at ${new Date().toISOString()}`);
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
        console.log(
          `LOG: Profile exists at ${new Date().toISOString()}. profileExists is now true.`
        );
        console.log(
          `LOG: Attempting to load Stream credentials at ${new Date().toISOString()}...`
        );
        await loadStreamCredentials();
        console.log(
          `LOG: Stream credentials loaded at ${new Date().toISOString()}.`
        );

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
        console.log(
          `LOG: Profile does NOT exist at ${new Date().toISOString()}. profileExists is now false.`
        );
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
      console.log(
        `ERROR: During profile check at ${new Date().toISOString()}, profileExists is now false.`
      );
      console.error(error);
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
      console.log(
        `LOG: checkAndSetAuthState finished at ${new Date().toISOString()}`
      );
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
    // 🚨 NEW LOGGING HERE 🚨
    console.log(
      `LOG: onAuthStateChanged listener setup at ${new Date().toISOString()}`
    );

    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      console.log(
        `--- onAuthStateChanged Fired at ${new Date().toISOString()} ---`
      );
      console.log("User object received:", user ? "true" : "false");
      console.log(
        `Current isInitialized: ${isInitialized}, isAuthenticated: ${isAuthenticated}, profileExists: ${profileExists}`
      );

      // 🏆 All state updates now handled atomically in checkAndSetAuthState
      await checkAndSetAuthState(user);

      console.log(
        `--- onAuthStateChanged FINISHED at ${new Date().toISOString()} ---`
      );
      console.log(
        `New isInitialized: ${isInitialized}, isAuthenticated: ${isAuthenticated}, profileExists: ${profileExists}`
      );
      console.log("-------------------------------------");
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
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => React.useContext(AppContext);
