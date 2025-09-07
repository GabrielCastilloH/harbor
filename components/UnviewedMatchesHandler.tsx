import React, { useEffect, useState } from "react";
import { useAppContext } from "../context/AppContext";
import { MatchService } from "../networking/MatchService";
import MatchModal from "../screens/MatchModal";
import { Profile } from "../types/App";

interface UnviewedMatch {
  matchId: string;
  match: any;
  matchedProfile: Profile;
}

export default function UnviewedMatchesHandler() {
  const { userId, isAuthenticated, profile } = useAppContext();
  const [unviewedMatches, setUnviewedMatches] = useState<UnviewedMatch[]>([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [showMatchModal, setShowMatchModal] = useState(false);
  // ✅ NEW: State to track if we've already fetched matches this session
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    const checkUnviewedMatches = async () => {
      // ✅ FIX: Don't run the fetch if we've already done it
      if (!isAuthenticated || !userId || hasLoaded) {
        return;
      }

      try {
        const response = await MatchService.getUnviewedMatches(userId);

        if (response.matches && response.matches.length > 0) {
          setUnviewedMatches(response.matches);
          setCurrentMatchIndex(0);
          setShowMatchModal(true);
        }
      } catch (error) {
        console.error("Error checking unviewed matches:", error);
      } finally {
        // ✅ NEW: Set the flag to true after the fetch attempt, regardless of the outcome
        setHasLoaded(true);
      }
    };

    checkUnviewedMatches();
  }, [isAuthenticated, userId, hasLoaded]); // ✅ Update dependency array

  const handleMatchModalClose = async () => {
    // Mark the current match as viewed before closing or moving to the next
    if (
      unviewedMatches.length > 0 &&
      currentMatchIndex < unviewedMatches.length
    ) {
      const currentMatch = unviewedMatches[currentMatchIndex];
      if (currentMatch?.matchId && userId) {
        try {
          await MatchService.markMatchAsViewed(currentMatch.matchId, userId);
        } catch (error) {
          console.error("Error marking match as viewed:", error);
        }
      }
    }

    if (currentMatchIndex + 1 < unviewedMatches.length) {
      setCurrentMatchIndex(currentMatchIndex + 1);
    } else {
      // If no more unviewed matches, close the modal completely
      setShowMatchModal(false);
      setUnviewedMatches([]);
      setCurrentMatchIndex(0);
      setHasLoaded(false); // ✅ NEW: Allow a re-fetch if component re-mounts
    }
  };

  // Get current match data
  const currentMatch = unviewedMatches[currentMatchIndex];
  const matchedProfile = currentMatch?.matchedProfile;
  const userProfile = profile; // Get from context

  if (!showMatchModal || !matchedProfile || !userProfile) {
    return null;
  }

  return (
    <MatchModal
      visible={showMatchModal}
      onClose={handleMatchModalClose}
      matchedProfile={matchedProfile}
      currentProfile={userProfile}
      matchId={currentMatch?.matchId}
    />
  );
}
