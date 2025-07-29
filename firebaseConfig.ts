import { initializeApp } from "firebase/app";
import { initializeAuth } from "firebase/auth";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import * as firebaseAuth from "firebase/auth";
import ReactNativeAsyncStorage from "@react-native-async-storage/async-storage";

const getReactNativePersistence = (firebaseAuth as any)
  .getReactNativePersistence;

const firebaseConfig = {
  apiKey: "AIzaSyAh5NygEYrPdJXdle524PYrwP3WsPXaIqg",
  authDomain: "harbor-ch.firebaseapp.com",
  projectId: "harbor-ch",
  storageBucket: "harbor-ch.firebasestorage.app",
  messagingSenderId: "838717009645",
  appId: "1:838717009645:ios:094e6663c50385aa4426e4",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);

// Initialize Firebase Auth with AsyncStorage persistence
export const auth = initializeAuth(app, {
  persistence: getReactNativePersistence(ReactNativeAsyncStorage),
});

// Initialize Firebase services
export const db = getFirestore(app);
export const storage = getStorage(app);

export default app;
