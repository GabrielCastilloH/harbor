import { initializeApp } from "firebase/app";
import { getAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getFunctions } from "firebase/functions";
import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";

const getReactNativePersistence = (firebaseAuth as any)
  .getReactNativePersistence;

const firebaseConfig = {
  apiKey: "AIzaSyBvQvQvQvQvQvQvQvQvQvQvQvQvQvQvQvQ",
  authDomain: "harbor-ch.firebaseapp.com",
  projectId: "harbor-ch",
  storageBucket: "harbor-ch.appspot.com",
  messagingSenderId: "838717009645",
  appId: "1:838717009645:web:1234567890abcdef",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth with AsyncStorage persistence
export const auth = getAuth(app);

// Initialize Firebase services
export const db = getFirestore(app);
export const storage = getStorage(app);
export const functions = getFunctions(app);

// Superwall configuration
export const SUPERWALL_CONFIG = {
  // These will be fetched from Firebase Secret Manager
  apiKeys: {
    ios: process.env.EXPO_PUBLIC_SUPERWALL_IOS_API_KEY || "",
    android: process.env.EXPO_PUBLIC_SUPERWALL_ANDROID_API_KEY || "",
  },
};

export default app;
