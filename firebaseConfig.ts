import { initializeApp } from "firebase/app";
import { getFirestore } from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getAuth } from "firebase/auth";

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

// Initialize Firebase services
export const db = getFirestore(app);
export const storage = getStorage(app);
export const auth = getAuth(app);

export default app;
