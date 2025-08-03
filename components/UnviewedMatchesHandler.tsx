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
  const { userId, isAuthenticated } = useAppContext();
  const [unviewedMatches, setUnviewedMatches] = useState<UnviewedMatch[]>([]);
  const [currentMatchIndex, setCurrentMatchIndex] = useState(0);
  const [showMatchModal, setShowMatchModal] = useState(false);
  const [currentProfile, setCurrentProfile] = useState<Profile | null>(null);

  useEffect(() => {
    const checkUnviewedMatches = async () => {
      if (!isAuthenticated || !userId) {
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
      }
    };

    // Check for unviewed matches when app initializes
    checkUnviewedMatches();
  }, [isAuthenticated, userId]);

  const handleMatchModalClose = async () => {
    if (
      unviewedMatches.length > 0 &&
      currentMatchIndex < unviewedMatches.length
    ) {
      const currentMatch = unviewedMatches[currentMatchIndex];

      // Mark this match as viewed
      try {
        await MatchService.markMatchAsViewed(currentMatch.matchId, userId!);
      } catch (error) {
        console.error("Error marking match as viewed:", error);
      }

      // Move to next match or close modal
      if (currentMatchIndex + 1 < unviewedMatches.length) {
        setCurrentMatchIndex(currentMatchIndex + 1);
      } else {
        setShowMatchModal(false);
        setUnviewedMatches([]);
        setCurrentMatchIndex(0);
      }
    } else {
      setShowMatchModal(false);
      setUnviewedMatches([]);
      setCurrentMatchIndex(0);
    }
  };

  // Get current match data
  const currentMatch = unviewedMatches[currentMatchIndex];
  const matchedProfile = currentMatch?.matchedProfile;
  const userProfile = currentProfile; // This would need to be set from context

  if (!showMatchModal || !matchedProfile) {
    return null;
  }

  return (
    <MatchModal
      visible={showMatchModal}
      onClose={handleMatchModalClose}
      matchedProfile={matchedProfile}
      currentProfile={userProfile}
    />
  );
}
