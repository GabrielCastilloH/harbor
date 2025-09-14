import React, { useEffect, useState } from "react";
import { useAppContext } from "../context/AppContext";
import { MatchService } from "../networking/MatchService";

interface UnviewedMatch {
  matchId: string;
  match: any;
  matchedProfile: any;
}

export default function UnviewedMatchesHandler() {
  const { userId, isAuthenticated } = useAppContext();
  const [hasLoaded, setHasLoaded] = useState(false);

  useEffect(() => {
    const checkUnviewedMatches = async () => {
      if (!isAuthenticated || !userId || hasLoaded) {
        return;
      }

      try {
        const response = await MatchService.getUnviewedMatches(userId);

        if (response.matches && response.matches.length > 0) {
          // Mark all unviewed matches as viewed without showing modal
          for (const match of response.matches) {
            if (match?.matchId && userId) {
              try {
                await MatchService.markMatchAsViewed(match.matchId, userId);
              } catch (error) {
                console.error("Error marking match as viewed:", error);
              }
            }
          }
        }
      } catch (error) {
        console.error("Error checking unviewed matches:", error);
      } finally {
        setHasLoaded(true);
      }
    };

    checkUnviewedMatches();
  }, [isAuthenticated, userId, hasLoaded]);

  return null;
}
