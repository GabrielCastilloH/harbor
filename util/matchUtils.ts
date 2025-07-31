import { getFirestore, collection, query, where, getDocs } from "firebase/firestore";
import { app } from "../firebaseConfig";

const db = getFirestore(app);

/**
 * Find the active match ID between two users
 */
export async function getMatchId(userId1: string, userId2: string): Promise<string | null> {
  try {
    const matchesRef = collection(db, "matches");
    const q = query(
      matchesRef,
      where("user1Id", "in", [userId1, userId2]),
      where("user2Id", "in", [userId1, userId2]),
      where("isActive", "==", true)
    );
    
    const querySnapshot = await getDocs(q);
    
    if (!querySnapshot.empty) {
      return querySnapshot.docs[0].id;
    }
    
    return null;
  } catch (error) {
    console.error("Error finding match ID:", error);
    return null;
  }
} 