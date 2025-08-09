import {
  Text,
  View,
  StyleSheet,
  Pressable,
  ActivityIndicator,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import React, { useEffect, useState, useCallback, useRef } from "react";
import { Channel, MessageInput, MessageList } from "stream-chat-expo";
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

export default function ChatScreen() {
  const { channel, userId } = useAppContext();
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
  // debug counters removed
  const lastHandledMessageIdRef = useRef<string | null>(null);
  const lastAppliedFreezeRef = useRef<boolean | null>(null);

  // debug logger removed

  // Default resolver: always compute matchId from the other channel member via backend
  const fetchAndApplyConsentStatus = useCallback(
    async (matchId: string) => {
      try {
        const status = await ConsentService.getConsentStatus(matchId);

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
        // Start consent UI fetch immediately for faster modal display
        fetchAndApplyConsentStatus(fetchedMatchId);
        return fetchedMatchId;
      }
    } catch (e) {
      console.error("[#CONSENT] resolveMatchId error:", e);
    }
    return null;
  }, [channel, userId, fetchAndApplyConsentStatus]);

  // Removed: tab bar hide/show logic to keep tab bar visible on ChatScreen

  // Resolve matchId when channel/user changes
  useEffect(() => {
    resolveMatchId();
  }, [resolveMatchId]);

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

        const isChannelFrozen = (channel.data as any)?.frozen || false;
        const isSelfUser1 = status.user1Id === userId;
        const showForSelf = isSelfUser1
          ? status.shouldShowConsentForUser1
          : status.shouldShowConsentForUser2;

        // Always surface modal when current user must consent
        setShowConsentModal(showForSelf);
        setIsChatFrozen(isChannelFrozen || showForSelf);

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

  // Fetch matched user name
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
      }
    };

    getMatchedUserName();
  }, [channel, userId]);

  // Set layout ready when we have the user name and tab bar height
  useEffect(() => {
    // Only require matchedUserName to be loaded, tabBarHeight can be 0
    if (matchedUserName !== "Loading...") {
      setIsLayoutReady(true);
    }
  }, [matchedUserName]);

  const handleConsentResponse = async (consented: boolean) => {
    try {
      const matchId = activeMatchId || (await resolveMatchId());
      if (!matchId || !userId) {
        return;
      }

      const response = await ConsentService.updateConsent(
        matchId,
        userId,
        consented
      );

      if (consented) {
        setUserConsented(true);
        // Only hide modal and unfreeze chat if both users have consented
        if (response.bothConsented) {
          setShowConsentModal(false);
          setIsChatFrozen(false);

          // Send system message when both users consent
          try {
            await channel?.sendMessage({
              text: "Both of you have decided to continue getting to know one another! 💕",
              user_id: "system",
            });
          } catch (messageError) {
            console.error(
              "Error sending consent system message:",
              messageError
            );
            // Don't fail the consent process if system message fails
          }
        }
      } else {
        // If user chose to unmatch, keep chat frozen
        setIsChatFrozen(true);
        // TODO: Implement unmatch logic
      }
    } catch (error) {
      console.error("Error handling consent response:", error);
    }
  };

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
            setIsChatFrozen(showForSelf);
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

        {/* Consent Modal - inside SafeAreaView so it never covers the header */}
        {showConsentModal && (
          <View style={styles.modalOverlay}>
            <View style={styles.warningModalContent}>
              <Text style={styles.warningTitle}>Continue this chat?</Text>
              <Text style={styles.warningText}>
                To keep chatting, both of you need to agree to continue. You can
                also choose to unmatch.
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
                        // No server unfreeze here; consent flow is client-only visual gating
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
