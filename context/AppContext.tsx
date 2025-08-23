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
  isCheckingProfile: boolean;
  authState: "unauthenticated" | "unverified" | "no-profile" | "authenticated";
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
  isCheckingProfile: false,
  authState: "unauthenticated",
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
  const [isCheckingProfile, setIsCheckingProfile] = useState(false);
  const [authState, setAuthState] = useState<
    "unauthenticated" | "unverified" | "no-profile" | "authenticated"
  >("unauthenticated");

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
      console.log("🔍 [APP CONTEXT] User email:", user?.email);
      console.log("🔍 [APP CONTEXT] Email verified:", user?.emailVerified);

      // Prevent multiple rapid state changes during initialization
      if (isAuthDetermined && user?.uid === currentUser?.uid) {
        console.log("🔄 [APP CONTEXT] Skipping duplicate auth state change");
        return;
      }

      if (user) {
        // User is signed in
        console.log("✅ [APP CONTEXT] User signed in");
        setCurrentUser(user);

        if (!user.emailVerified) {
          // User exists but email is not verified
          console.log(
            "📧 [APP CONTEXT] Email not verified - setting authState to unverified"
          );
          setIsAuthenticated(false);
          setUserId(null);
          setProfile(null);
          setAuthState("unverified");
          setIsCheckingProfile(false);
        } else {
          // Email is verified - check Firestore profile
          console.log(
            "✅ [APP CONTEXT] Email verified - checking Firestore profile"
          );
          setIsCheckingProfile(true);

          try {
            const { UserService } = require("../networking");
            const response = await UserService.getUserById(user.uid);

            if (response && response.user) {
              // User has profile in Firestore - fully authenticated
              console.log(
                "✅ [APP CONTEXT] User profile found in Firestore - fully authenticated"
              );
              setUserId(user.uid);
              setProfile(response.user);
              setIsAuthenticated(true);
              setAuthState("authenticated");
            } else {
              // Email verified but no profile in Firestore
              console.log(
                "📝 [APP CONTEXT] Email verified but no profile in Firestore - needs account setup"
              );
              setUserId(null);
              setProfile(null);
              setIsAuthenticated(false);
              setAuthState("no-profile");
            }
          } catch (error: any) {
            if (
              error?.code === "functions/not-found" ||
              error?.code === "not-found" ||
              error?.message?.includes("not found")
            ) {
              // Email verified but no profile in Firestore
              console.log(
                "📝 [APP CONTEXT] User profile not found in Firestore - needs account setup"
              );
              setUserId(null);
              setProfile(null);
              setIsAuthenticated(false);
              setAuthState("no-profile");
            } else {
              console.error(
                "❌ [APP CONTEXT] Unexpected error checking user profile:",
                error
              );
              setUserId(null);
              setProfile(null);
              setIsAuthenticated(false);
              setAuthState("no-profile");
            }
          } finally {
            setIsCheckingProfile(false);
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
        console.log(
          "🚪 [APP CONTEXT] User signed out - setting authState to unauthenticated"
        );
        setCurrentUser(null);
        setIsAuthenticated(false);
        setUserId(null); // Ensure this is null, not empty string
        setProfile(null);
        setStreamApiKey(null);
        setStreamUserToken(null);
        setIsCheckingProfile(false);
        setAuthState("unauthenticated");

        // Clear stored data
        try {
          await AsyncStorage.multiRemove(["@streamApiKey", "@streamUserToken"]);
        } catch (error) {
          console.error("Error clearing stored data:", error);
        }
      }

      setIsAuthDetermined(true);
    });

    return () => unsubscribe();
  }, [isAuthDetermined, currentUser]);

  // Set initialized to true when profile checking is complete
  useEffect(() => {
    if (isAuthDetermined && !isCheckingProfile) {
      setIsInitialized(true);
    }
  }, [isAuthDetermined, isCheckingProfile]);

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
        isCheckingProfile,
        authState,
      }}
    >
      {children}
    </AppContext.Provider>
  );
};

export const useAppContext = () => React.useContext(AppContext);
