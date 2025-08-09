import { Text, View, StyleSheet, Modal, Pressable } from "react-native";
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
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Platform } from "react-native";

export default function ChatScreen() {
  const { channel, userId } = useAppContext();
  const navigation = useNavigation();
  const tabBarHeight = useBottomTabBarHeight();
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [isChatFrozen, setIsChatFrozen] = useState(false);
  const [userConsented, setUserConsented] = useState(false);
  const [matchedUserName, setMatchedUserName] = useState<string>("Loading...");
  const [matchedUserId, setMatchedUserId] = useState<string>("");
  const [isLayoutReady, setIsLayoutReady] = useState(false);
  const [consentStatus, setConsentStatus] = useState<{
    user1Id: string;
    user2Id: string;
    user1Consented: boolean;
    user2Consented: boolean;
    bothConsented: boolean;
    messageCount: number;
    shouldShowConsentScreen: boolean;
  } | null>(null);
  const [activeMatchId, setActiveMatchId] = useState<string | null>(null);
  const debugSeq = useRef(0);
  const listenerAttachCount = useRef(0);
  const lastHandledMessageIdRef = useRef<string | null>(null);
  const lastAppliedFreezeRef = useRef<boolean | null>(null);

  const debug = (...args: any[]) => {
    try {
      debugSeq.current += 1;
      console.log(`[#CONSENT][${debugSeq.current}]`, ...args);
    } catch {}
  };

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

        // Fire-and-forget server-side freeze sync (do not block UI)
        try {
          const desiredFreeze = showForSelf;
          const channelId =
            (channel as any)?.id || (channel as any)?.cid?.split(":")[1];
          if (
            typeof channelId === "string" &&
            lastAppliedFreezeRef.current !== desiredFreeze
          ) {
            fetchUpdateChannelChatStatus(channelId, desiredFreeze)
              .then(() => {
                lastAppliedFreezeRef.current = desiredFreeze;
              })
              .catch((e) => {
                console.error("[#CONSENT] freezeSync(fetchAndApply) error:", e);
              });
          }
        } catch {}
      } catch (e) {
        console.error("[#CONSENT] fetchAndApplyConsentStatus error:", e);
      }
    },
    [channel, userId]
  );

  const resolveMatchId = useCallback(async (): Promise<string | null> => {
    if (!channel || !userId) {
      debug("resolveMatchId: missing channel/userId", {
        hasChannel: !!channel,
        userId,
      });
      return null;
    }
    const otherMembers = channel?.state?.members || {};
    const otherUserId = Object.keys(otherMembers).find((key) => key !== userId);
    if (!otherUserId) {
      debug("resolveMatchId: no otherUserId", {
        members: Object.keys(otherMembers),
      });
      return null;
    }
    try {
      const fetchedMatchId = await MatchService.getMatchId(userId, otherUserId);
      if (fetchedMatchId) {
        setActiveMatchId(fetchedMatchId);
        debug("resolveMatchId: resolved", { fetchedMatchId, otherUserId });
        // Start consent UI fetch immediately for faster modal display
        fetchAndApplyConsentStatus(fetchedMatchId);
        return fetchedMatchId;
      }
      debug("resolveMatchId: null fetchedMatchId");
    } catch (e) {
      console.error("[#CONSENT] resolveMatchId error:", e);
    }
    return null;
  }, [channel, userId, fetchAndApplyConsentStatus]);

  // Hide tab bar when this screen is focused
  useEffect(() => {
    const unsubscribe = navigation.addListener("focus", () => {
      navigation.getParent()?.setOptions({
        tabBarStyle: { display: "none" },
      });
    });

    const unsubscribeBlur = navigation.addListener("blur", () => {
      navigation.getParent()?.setOptions({
        tabBarStyle: {
          backgroundColor: Colors.secondary100,
          display: "flex",
        },
      });
    });

    return () => {
      // Ensure tab bar is shown when component unmounts
      navigation.getParent()?.setOptions({
        tabBarStyle: {
          backgroundColor: Colors.secondary100,
          display: "flex",
        },
      });
      unsubscribe();
      unsubscribeBlur();
    };
  }, [navigation]);

  // Resolve matchId when channel/user changes
  useEffect(() => {
    debug("effect: resolveMatchId on channel/user change");
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
        setConsentStatus(status);

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

        // Always sync server-side freeze to match showForSelf
        try {
          const desiredFreeze = showForSelf;
          const channelId =
            (channel as any)?.id || (channel as any)?.cid?.split(":")[1];
          if (
            typeof channelId === "string" &&
            lastAppliedFreezeRef.current !== desiredFreeze
          ) {
            console.log("[#CONSENT] freezeSync(checkConsentState)", {
              desiredFreeze,
              channelId,
            });
            await fetchUpdateChannelChatStatus(channelId, desiredFreeze);
            lastAppliedFreezeRef.current = desiredFreeze;
          }
        } catch (e) {
          console.error("[#CONSENT] freezeSync(checkConsentState) error:", e);
        }
        debug("checkConsentState", {
          activeMatchId,
          status,
          showModal: showConsentModal,
          isChatFrozen,
        });
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
      debug("handleConsentResponse", { consented, response });

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
      debug("message.new", {
        matchId,
        activeMatchId,
        eventId: event?.message?.id,
      });
      const eventId = event?.message?.id;
      if (eventId && lastHandledMessageIdRef.current === eventId) {
        debug("message.new skipped duplicate", { eventId });
        return;
      }
      if (eventId) lastHandledMessageIdRef.current = eventId;
      if (matchId) {
        try {
          // First increment the message count
          debug("updateMessageCount ->", { matchId });
          await updateMessageCount(matchId);
          debug("updateMessageCount done", { matchId });

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
            setIsChatFrozen(showForSelf);
            setShowConsentModal(showForSelf);

            // Server-side freeze/unfreeze to hard-block input
            try {
              const desiredFreeze = showForSelf;
              const channelId =
                (channel as any)?.id || (channel as any)?.cid?.split(":")[1];
              if (
                typeof channelId === "string" &&
                lastAppliedFreezeRef.current !== desiredFreeze
              ) {
                console.log("[#CONSENT] freezeSync(message.new)", {
                  desiredFreeze,
                  channelId,
                });
                await fetchUpdateChannelChatStatus(channelId, desiredFreeze);
                lastAppliedFreezeRef.current = desiredFreeze;
              }
            } catch (e) {
              console.error("[#CONSENT] freezeSync(message.new) error:", e);
            }
          }
          debug("post-status", { status, willShow: showConsentModal });
        } catch (error) {
          console.error("[#CONSENT] message.new error:", error);
        }
      }
    };

    // Subscribe to new message events
    channel.on("message.new", handleNewMessage);
    listenerAttachCount.current += 1;
    debug("listener attached", { count: listenerAttachCount.current });

    // Cleanup listener on unmount
    return () => {
      channel.off("message.new", handleNewMessage);
      debug("listener removed");
    };
  }, [channel, userId, activeMatchId, resolveMatchId]);

  if (!channel) {
    return (
      <SafeAreaView>
        <Text>Loading chat ...</Text>
      </SafeAreaView>
    );
  }

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

      <SafeAreaView style={styles.channelContainer} edges={["bottom"]}>
        <Channel channel={channel}>
          <View style={styles.channelContent}>
            <MessageList />
            <MessageInput />
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
                  style={[styles.warningButton, styles.unmatchButton]}
                  onPress={async () => {
                    try {
                      const matchId = activeMatchId || (await resolveMatchId());
                      if (!matchId || !userId) return;
                      await ConsentService.updateConsent(
                        matchId,
                        userId,
                        false
                      );
                      const channelId =
                        (channel as any)?.id ||
                        (channel as any)?.cid?.split(":")[1];
                      if (channelId) {
                        await fetchUpdateChannelChatStatus(channelId, true);
                        lastAppliedFreezeRef.current = true;
                      }
                      setIsChatFrozen(true);
                      setShowConsentModal(false);
                    } catch (e) {
                      console.error("[#CONSENT] Unmatch/decline error:", e);
                    }
                  }}
                >
                  <Text style={styles.warningButtonText}>Unmatch</Text>
                </Pressable>
                <Pressable
                  style={[styles.warningButton, styles.continueButton]}
                  onPress={async () => {
                    try {
                      const matchId = activeMatchId || (await resolveMatchId());
                      if (!matchId || !userId) return;
                      const res = await ConsentService.updateConsent(
                        matchId,
                        userId,
                        true
                      );
                      if (res.bothConsented) {
                        const channelId =
                          (channel as any)?.id ||
                          (channel as any)?.cid?.split(":")[1];
                        if (channelId) {
                          await fetchUpdateChannelChatStatus(channelId, false);
                          lastAppliedFreezeRef.current = false;
                        }
                        setIsChatFrozen(false);
                        setShowConsentModal(false);
                      } else {
                        setShowConsentModal(false);
                        setIsChatFrozen(true);
                      }
                    } catch (e) {
                      console.error("[#CONSENT] Continue error:", e);
                    }
                  }}
                >
                  <Text style={styles.warningButtonText}>Continue</Text>
                </Pressable>
              </View>
            </View>
          </View>
        )}
      </SafeAreaView>
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
