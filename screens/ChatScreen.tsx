import {
  Text,
  View,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from "react-native";
import React, { useEffect, useState, useCallback, useRef } from "react";
import { Channel, MessageInput, MessageList } from "stream-chat-react-native";
import { useAppContext } from "../context/AppContext";
import Colors from "../constants/Colors";
import {
  updateMessageCount,
  fetchUpdateChannelChatStatus,
} from "../networking";
import { MatchService, ConsentService } from "../networking";
import HeaderBack from "../components/HeaderBack";
import LoadingScreen from "../components/LoadingScreen";
import { useNavigation } from "@react-navigation/native";
import { UserService } from "../networking";
import { useTelemetryDeck } from "@typedigital/telemetrydeck-react";

export default function ChatScreen() {
  const { channel, userId } = useAppContext();
  const { signal } = useTelemetryDeck();
  const navigation = useNavigation();
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [isChatFrozen, setIsChatFrozen] = useState(false);
  const [userConsented, setUserConsented] = useState(false);
  const [matchedUserName, setMatchedUserName] = useState<string>("Loading...");
  const [matchedUserId, setMatchedUserId] = useState<string>("");
  const [isLayoutReady, setIsLayoutReady] = useState(false);
  // local consent status object is not needed beyond immediate decisions; avoid storing full object
  const [activeMatchId, setActiveMatchId] = useState<string | null>(null);
  const [consentSubmitting, setConsentSubmitting] = useState<
    null | "unmatch" | "continue"
  >(null);
  const [consentStatus, setConsentStatus] = useState<any>(null);
  const [isMatchActive, setIsMatchActive] = useState<boolean>(false);
  const [hasMatchedUser, setHasMatchedUser] = useState<boolean>(false);
  // debug counters removed
  const lastHandledMessageIdRef = useRef<string | null>(null);
  const lastAppliedFreezeRef = useRef<boolean | null>(null);

  // debug logger removed

  // Default resolver: always compute matchId from the other channel member via backend
  const fetchAndApplyConsentStatus = useCallback(
    async (matchId: string) => {
      try {
        const status = await ConsentService.getConsentStatus(matchId);
        setConsentStatus(status);

        const isSelfUser1 = status.user1Id === userId;
        const showForSelf = isSelfUser1
          ? status.shouldShowConsentForUser1
          : status.shouldShowConsentForUser2;

        const channelFrozen = Boolean((channel as any)?.data?.frozen);
        // Show modal only when consent logic requires it; keep chat frozen if server says so
        setShowConsentModal(showForSelf);
        setIsChatFrozen(channelFrozen || showForSelf);

        // IMPORTANT: Never toggle server-side channel freeze for consent flow.
        // We only soft-freeze locally so the header/message doesn't imply "unmatched".
      } catch (e) {
        console.error("[#CONSENT] fetchAndApplyConsentStatus error:", e);
      }
    },
    [channel, userId]
  );

  const resolveMatchId = useCallback(async (): Promise<string | null> => {
    if (!channel || !userId) {
      return null;
    }
    const otherMembers = channel?.state?.members || {};
    const otherUserId = Object.keys(otherMembers).find((key) => key !== userId);
    if (!otherUserId) {
      return null;
    }
    try {
      const fetchedMatchId = await MatchService.getMatchId(userId, otherUserId);
      if (fetchedMatchId) {
        setActiveMatchId(fetchedMatchId);
        setIsMatchActive(true);
        // Start consent UI fetch immediately for faster modal display
        fetchAndApplyConsentStatus(fetchedMatchId);
        return fetchedMatchId;
      } else {
        setIsMatchActive(false);
      }
    } catch (e) {
      console.error("[#CONSENT] resolveMatchId error:", e);
      setIsMatchActive(false);
    }
    return null;
  }, [channel, userId, fetchAndApplyConsentStatus]);

  // Removed: tab bar hide/show logic to keep tab bar visible on ChatScreen

  // Resolve matchId when channel/user changes
  useEffect(() => {
    resolveMatchId();
  }, [resolveMatchId]);

  // Track page view for TelemetryDeck
  useEffect(() => {
    // Send a signal whenever this screen is viewed
    signal("pageview", { screen: "Chat" });
  }, [signal]);

  // (Removed) Immediate modal on frozen channel per user request

  // Check consent state when component mounts or when we resolve a matchId
  useEffect(() => {
    const checkConsentState = async () => {
      if (!channel || !userId || !activeMatchId) return;
      try {
        // TEMPORARY: Migrate existing match to new consent fields
        try {
          await MatchService.migrateMatchConsent(activeMatchId);
        } catch (migrationError) {}

        const status = await ConsentService.getConsentStatus(activeMatchId);
        setConsentStatus(status);

        const isChannelFrozen = (channel.data as any)?.frozen || false;
        const isSelfUser1 = status.user1Id === userId;
        const showForSelf = isSelfUser1
          ? status.shouldShowConsentForUser1
          : status.shouldShowConsentForUser2;

        // Always surface modal when current user must consent
        setShowConsentModal(showForSelf);

        // Chat should be frozen if:
        // 1. Channel is frozen due to unmatch, OR
        // 2. Consent screen should be shown for current user, OR
        // 3. Consent screen should be shown for either user (meaning message threshold reached but not both consented)
        const shouldFreezeChat =
          isChannelFrozen || showForSelf || status.shouldShowConsentScreen;
        setIsChatFrozen(shouldFreezeChat);

        const currentUserConsented = isSelfUser1
          ? status.user1Consented
          : status.user2Consented;
        setUserConsented(currentUserConsented);

        // Do NOT sync server-side freeze for consent. Keep server freeze solely for real unmatch.
      } catch (error) {
        console.error("[#CONSENT] Error checking consent state:", error);
      }
    };
    checkConsentState();
  }, [channel, userId, activeMatchId]);

  // Fetch matched user name and enable profile button immediately
  useEffect(() => {
    const getMatchedUserName = async () => {
      if (!channel || !userId) {
        return;
      }

      const otherMembers = channel?.state?.members || {};

      const otherUserId = Object.keys(otherMembers).find(
        (key) => key !== userId
      );

      if (otherUserId) {
        setMatchedUserId(otherUserId);
        // Enable profile button immediately when we have a matched user
        setHasMatchedUser(true);

        try {
          const response = await UserService.getUserById(otherUserId);

          if (response) {
            const userData = (response as any).user || response;
            const firstName = userData.firstName || "User";
            setMatchedUserName(firstName);
          }
        } catch (error) {
          console.error("Error fetching matched user name:", error);
          setMatchedUserName("User");
        }
      } else {
        setHasMatchedUser(false);
      }
    };

    getMatchedUserName();
  }, [channel, userId]);

  // Set layout ready when we have the user name
  useEffect(() => {
    if (matchedUserName !== "Loading...") {
      setIsLayoutReady(true);
    }
  }, [matchedUserName]);

  useEffect(() => {
    if (!channel) {
      return;
    }

    // Set up message listener
    const handleNewMessage = async (event: any) => {
      const matchId = activeMatchId || (await resolveMatchId());
      const eventId = event?.message?.id;
      if (eventId && lastHandledMessageIdRef.current === eventId) {
        return;
      }
      if (eventId) lastHandledMessageIdRef.current = eventId;
      if (matchId) {
        try {
          // First increment the message count
          await updateMessageCount(matchId);

          // Check if we need to show consent screen
          const status = await ConsentService.getConsentStatus(matchId);
          setConsentStatus(status);

          // Check if channel is frozen due to unmatch
          const isChannelFrozen = channel.data?.frozen || false;

          if (isChannelFrozen) {
            setIsChatFrozen(true);
            setShowConsentModal(false);
          } else {
            const isSelfUser1 = status.user1Id === userId;
            const showForSelf = isSelfUser1
              ? status.shouldShowConsentForUser1
              : status.shouldShowConsentForUser2;

            // Chat should be frozen if:
            // 1. Consent screen should be shown for current user, OR
            // 2. Consent screen should be shown for either user (meaning message threshold reached but not both consented)
            const shouldFreezeChat =
              showForSelf || status.shouldShowConsentScreen;
            setIsChatFrozen(shouldFreezeChat);
            setShowConsentModal(showForSelf);

            // Do NOT touch server-side freeze/unfreeze for consent flow
          }
        } catch (error) {
          console.error("[#CONSENT] message.new error:", error);
        }
      }
    };

    // Subscribe to new message events
    channel.on("message.new", handleNewMessage);

    // Cleanup listener on unmount
    return () => {
      channel.off("message.new", handleNewMessage);
    };
  }, [channel, userId, activeMatchId, resolveMatchId]);

  // Don't render the main content until layout is ready to prevent jarring shifts
  if (!isLayoutReady) {
    return (
      <View style={styles.loadingContainer}>
        <HeaderBack title="Loading..." onBack={() => navigation.goBack()} />
        <View style={{ flex: 1 }}>
          <LoadingScreen loadingText="Loading chat..." />
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <HeaderBack
        title={matchedUserName}
        onBack={() => navigation.goBack()}
        onTitlePress={() => {
          if (matchedUserId) {
            (navigation as any).navigate("ProfileScreen", {
              userId: matchedUserId,
              matchId: null,
            });
          }
        }}
        rightIcon={{
          name: "person",
          onPress: () => {
            if (matchedUserId) {
              (navigation as any).navigate("ProfileScreen", {
                userId: matchedUserId,
                matchId: null,
              });
            }
          },
        }}
      />

      <View style={styles.channelContainer}>
        <Channel channel={channel}>
          <View style={styles.channelContent}>
            <MessageList />
            {isChatFrozen ? (
              <View style={styles.disabledContainer}>
                <Text style={styles.disabledText}>
                  {channel.data?.frozen
                    ? "This chat has been frozen because one of the users unmatched."
                    : userConsented
                    ? "Waiting for the other person to continue the chat..."
                    : "Chat is paused until both users agree to continue."}
                </Text>
              </View>
            ) : (
              <MessageInput />
            )}
          </View>
        </Channel>

        {/* Consent Modal - Inside the Channel view */}
        {showConsentModal && (
          <View style={styles.modalOverlay}>
            <View style={styles.warningModalContent}>
              <Text style={styles.warningTitle}>Photos Will Be Revealed</Text>
              <Text style={styles.warningText}>
                You have been talking to your match for a short while. Your
                photos will start becoming clearer. This is your last chance to
                unmatch while remaining anonymous.
              </Text>
              <View style={styles.warningButtons}>
                <Pressable
                  style={[
                    styles.warningButton,
                    styles.unmatchButton,
                    consentSubmitting ? { opacity: 0.7 } : null,
                  ]}
                  disabled={!!consentSubmitting}
                  onPress={async () => {
                    if (consentSubmitting) return;
                    setConsentSubmitting("unmatch");
                    try {
                      const matchId = activeMatchId || (await resolveMatchId());
                      if (!matchId || !userId) return;
                      await ConsentService.updateConsent(
                        matchId,
                        userId,
                        false
                      );
                      // Server freeze for explicit unmatch only
                      try {
                        const channelId =
                          (channel as any)?.id ||
                          (channel as any)?.cid?.split(":")[1];
                        if (channelId) {
                          await fetchUpdateChannelChatStatus(channelId, true);
                          lastAppliedFreezeRef.current = true;
                        }
                      } catch {}
                      setIsChatFrozen(true);
                      setShowConsentModal(false);
                    } catch (e) {
                      console.error("[#CONSENT] Unmatch/decline error:", e);
                    } finally {
                      setConsentSubmitting(null);
                    }
                  }}
                >
                  {consentSubmitting === "unmatch" ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.warningButtonText}>Unmatch</Text>
                  )}
                </Pressable>
                <Pressable
                  style={[
                    styles.warningButton,
                    styles.continueButton,
                    consentSubmitting ? { opacity: 0.7 } : null,
                  ]}
                  disabled={!!consentSubmitting}
                  onPress={async () => {
                    if (consentSubmitting) return;
                    setConsentSubmitting("continue");
                    try {
                      const matchId = activeMatchId || (await resolveMatchId());
                      if (!matchId || !userId) return;
                      const res = await ConsentService.updateConsent(
                        matchId,
                        userId,
                        true
                      );
                      if (res.bothConsented) {
                        // Backend now sends system message when both consent.
                        // Locally unfreeze UI.
                        setIsChatFrozen(false);
                        setShowConsentModal(false);
                      } else {
                        setShowConsentModal(false);
                        setIsChatFrozen(true);
                      }
                    } catch (e) {
                      console.error("[#CONSENT] Continue error:", e);
                    } finally {
                      setConsentSubmitting(null);
                    }
                  }}
                >
                  {consentSubmitting === "continue" ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.warningButtonText}>Continue</Text>
                  )}
                </Pressable>
              </View>
            </View>
          </View>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "white",
  },
  channelContainer: {
    flex: 1,
    backgroundColor: "white",
  },
  channelContent: {
    flex: 1,
    backgroundColor: "white",
    paddingBottom: 35, // Manual keyboard spacing to avoid KeyboardAvoidingView conflicts with Stream Chat
  },
  disabledContainer: {
    padding: 16,
    backgroundColor: Colors.primary100,
    borderTopWidth: 1,
    borderTopColor: Colors.primary500,
  },
  disabledText: {
    textAlign: "center",
    color: Colors.primary500,
    fontStyle: "italic",
  },
  loadingContainer: {
    flex: 1,
    backgroundColor: Colors.primary100,
  },
  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  warningModalBackground: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.8)",
    justifyContent: "center",
    alignItems: "center",
  },
  warningModalContent: {
    backgroundColor: "white",
    borderRadius: 20,
    padding: 20,
    width: "80%",
    alignItems: "center",
  },
  warningTitle: {
    fontSize: 20,
    fontWeight: "bold",
    marginBottom: 10,
    color: Colors.primary500,
  },
  warningText: {
    textAlign: "center",
    marginBottom: 20,
    color: Colors.black,
  },
  warningButtons: {
    flexDirection: "row",
    justifyContent: "space-around",
    width: "100%",
  },
  warningButton: {
    padding: 10,
    borderRadius: 10,
    width: "45%",
  },
  unmatchButton: {
    backgroundColor: Colors.red,
  },
  continueButton: {
    backgroundColor: Colors.primary500,
  },
  warningButtonText: {
    color: "white",
    textAlign: "center",
    fontWeight: "bold",
  },
});
