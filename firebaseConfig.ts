import { initializeApp, getApps, FirebaseApp } from "firebase/app";
import { initializeAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";
import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";
import * as firebaseAuth from "firebase/auth";
const reactNativePersistence = (firebaseAuth as any).getReactNativePersistence;

// Import React Native Firebase to ensure it's initialized first
import "@react-native-firebase/app";

const firebaseConfig = {
  apiKey: "AIzaSyCoMkTjfYne2GQ-OpWODSYo9GiMlXqzRg4",
  authDomain: "harbor-ch.firebaseapp.com",
  projectId: "harbor-ch",
  storageBucket: "harbor-ch.firebasestorage.app",
  messagingSenderId: "838717009645",
  appId: "1:838717009645:web:0dba1cce14cf3f794426e4",
  measurementId: "G-PVV6GZQQ8R",
};

// Initialize Firebase only if no apps exist (prevents conflicts)
let app: FirebaseApp;
if (getApps().length === 0) {
  app = initializeApp(firebaseConfig);
} else {
  app = getApps()[0];
}

// Initialize Firebase Auth with AsyncStorage persistence
export const auth = initializeAuth(app, {
  persistence: reactNativePersistence(ReactNativeAsyncStorage),
});

// Initialize Firebase services
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);

// Superwall configuration
export const SUPERWALL_CONFIG = {
  apiKeys: {
    ios: process.env.EXPO_PUBLIC_SUPERWALL_IOS_API_KEY || "",
    android: process.env.EXPO_PUBLIC_SUPERWALL_ANDROID_API_KEY || "",
  },
};

export default app;
