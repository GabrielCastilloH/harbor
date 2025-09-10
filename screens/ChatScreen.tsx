import {
  Text,
  View,
  StyleSheet,
  Pressable,
  ActivityIndicator,
  Platform,
  Keyboard,
} from "react-native";
import React, {
  useEffect,
  useState,
  useCallback,
  useRef,
  useMemo,
} from "react";
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
import { usePremium } from "../hooks/usePremium";
import { getUnifiedClarityPercent } from "../constants/blurConfig";
import ClarityBar from "../components/ClarityBar";
import { useSafeAreaInsets } from "react-native-safe-area-context";

export default function ChatScreen() {
  const { channel, userId } = useAppContext();
  const navigation = useNavigation();
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [isChatFrozen, setIsChatFrozen] = useState(false);
  const [userConsented, setUserConsented] = useState(false);
  const [matchedUserName, setMatchedUserName] = useState<string>("Loading...");
  const [matchedUserId, setMatchedUserId] = useState<string>("");
  const [isLayoutReady, setIsLayoutReady] = useState(false);
  const [activeMatchId, setActiveMatchId] = useState<string | null>(null);
  const [consentSubmitting, setConsentSubmitting] = useState<
    null | "unmatch" | "continue"
  >(null);
  const [consentStatus, setConsentStatus] = useState<any>(null);
  const [isMatchActive, setIsMatchActive] = useState<boolean>(false);
  const [hasMatchedUser, setHasMatchedUser] = useState<boolean>(false);
  const [clarityPercent, setClarityPercent] = useState<number | undefined>(
    undefined
  );
  const lastHandledMessageIdRef = useRef<string | null>(null);
  const lastAppliedFreezeRef = useRef<boolean | null>(null);
  const [keyboardHeight, setKeyboardHeight] = useState(0);

  const insets = useSafeAreaInsets();

  // Study group detection
  const isStudyGroup = useMemo(() => {
    if (!channel) return false;
    const members = channel.state?.members || {};
    const memberCount = Object.keys(members).length;
    return memberCount > 2;
  }, [channel]);

  // Update the header title logic
  const headerTitle = useMemo(() => {
    if (isStudyGroup) {
      return "Study Group";
    }
    return matchedUserName;
  }, [isStudyGroup, matchedUserName]);

  // Update the header right icon and title press logic
  const handleHeaderPress = useCallback(() => {
    if (!channel) return;
    const memberIds = Object.keys(channel.state?.members || {});

    if (isStudyGroup) {
      (navigation as any).navigate("StudyGroupConnections", {
        channelId: channel.id,
        memberIds: memberIds,
      });
    } else if (matchedUserId) {
      (navigation as any).navigate("ProfileScreen", {
        userId: matchedUserId,
        matchId: null,
      });
    }
  }, [channel, isStudyGroup, matchedUserId, navigation]);

  const rightIconConfig = useMemo(() => {
    if (isStudyGroup) {
      return {
        name: "people",
        onPress: handleHeaderPress,
      };
    } else {
      return {
        name: "person",
        onPress: handleHeaderPress,
      };
    }
  }, [isStudyGroup, handleHeaderPress]);

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
        setShowConsentModal(showForSelf);
        setIsChatFrozen(channelFrozen || showForSelf);
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

  useEffect(() => {
    resolveMatchId();
  }, [resolveMatchId]);

  useEffect(() => {
    const keyboardWillShowSub = Keyboard.addListener(
      "keyboardWillShow",
      (e) => {
        const constantToSubtract = Platform.OS === "ios" ? 34 : 0;
        setKeyboardHeight(
          e.endCoordinates.height - insets.bottom - constantToSubtract
        );
      }
    );
    const keyboardWillHideSub = Keyboard.addListener("keyboardWillHide", () => {
      setKeyboardHeight(0);
    });
    return () => {
      keyboardWillShowSub.remove();
      keyboardWillHideSub.remove();
    };
  }, [insets.bottom]);

  useEffect(() => {
    const migrateMatchConsent = async () => {
      if (!activeMatchId) return;
      try {
        await MatchService.migrateMatchConsent(activeMatchId);
      } catch (migrationError) {}
    };
    migrateMatchConsent();
  }, [activeMatchId]);

  useEffect(() => {
    const fetchChatData = async () => {
      if (!channel || !userId) {
        return;
      }
      const otherMembers = channel?.state?.members || {};
      const otherUserId = Object.keys(otherMembers).find(
        (key) => key !== userId
      );
      if (otherUserId) {
        setMatchedUserId(otherUserId);
        setHasMatchedUser(true);
        try {
          const [matchedProfileResponse, consentStatusResponse] =
            await Promise.all([
              UserService.getUserById(otherUserId).catch(() => null),
              activeMatchId
                ? ConsentService.getConsentStatus(activeMatchId).catch(
                    () => null
                  )
                : Promise.resolve(null),
            ]);
          if (matchedProfileResponse) {
            const userData =
              (matchedProfileResponse as any).user || matchedProfileResponse;
            const firstName = userData.firstName || "User";
            setMatchedUserName(firstName);
          } else {
            setMatchedUserName("User");
          }
          if (consentStatusResponse && activeMatchId) {
            setConsentStatus(consentStatusResponse);
            const clarity = getUnifiedClarityPercent({
              messageCount: consentStatusResponse.messageCount,
              bothConsented: consentStatusResponse.bothConsented,
            });
            setClarityPercent(clarity);
            const isSelfUser1 = consentStatusResponse.user1Id === userId;
            const showForSelf = isSelfUser1
              ? consentStatusResponse.shouldShowConsentForUser1
              : consentStatusResponse.shouldShowConsentForUser2;
            const isChannelFrozen = (channel.data as any)?.frozen || false;
            setShowConsentModal(showForSelf);
            setIsChatFrozen(
              isChannelFrozen ||
                showForSelf ||
                consentStatusResponse.shouldShowConsentScreen
            );
            const currentUserConsented = isSelfUser1
              ? consentStatusResponse.user1Consented
              : consentStatusResponse.user2Consented;
            setUserConsented(currentUserConsented);
          }
        } catch (error) {
          console.error("Error fetching chat data:", error);
          setMatchedUserName("User");
        }
      } else {
        setHasMatchedUser(false);
      }
    };
    fetchChatData();
  }, [channel, userId, activeMatchId]);

  useEffect(() => {
    if (matchedUserName !== "Loading...") {
      setIsLayoutReady(true);
    }
  }, [matchedUserName]);

  useEffect(() => {
    if (!channel) {
      return;
    }
    const handleNewMessage = async (event: any) => {
      const matchId = activeMatchId || (await resolveMatchId());
      const eventId = event?.message?.id;
      if (eventId && lastHandledMessageIdRef.current === eventId) {
        return;
      }
      if (eventId) lastHandledMessageIdRef.current = eventId;
      if (matchId) {
        try {
          await updateMessageCount(matchId);
          const status = await ConsentService.getConsentStatus(matchId);
          setConsentStatus(status);
          const clarity = getUnifiedClarityPercent({
            messageCount: status.messageCount,
            bothConsented: status.bothConsented,
          });
          setClarityPercent(clarity);
          const isChannelFrozen = channel.data?.frozen || false;
          if (isChannelFrozen) {
            setIsChatFrozen(true);
            setShowConsentModal(false);
          } else {
            const isSelfUser1 = status.user1Id === userId;
            const showForSelf = isSelfUser1
              ? status.shouldShowConsentForUser1
              : status.shouldShowConsentForUser2;
            const shouldFreezeChat =
              showForSelf || status.shouldShowConsentScreen;
            setIsChatFrozen(shouldFreezeChat);
            setShowConsentModal(showForSelf);
          }
        } catch (error) {
          console.error("[#CONSENT] message.new error:", error);
        }
      }
    };
    channel.on("message.new", handleNewMessage);
    return () => {
      channel.off("message.new", handleNewMessage);
    };
  }, [channel, userId, activeMatchId, resolveMatchId]);

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

  const dismissTheKeyboard = () => {
    Keyboard.dismiss();
  };

  return (
    <View style={styles.container}>
      <HeaderBack
        title={headerTitle}
        onBack={() => navigation.goBack()}
        onTitlePress={handleHeaderPress}
        rightIcon={rightIconConfig}
      />
      <ClarityBar clarityPercent={clarityPercent} inChat={true} />
      <Pressable
        style={styles.fullScreenPressable}
        onPress={dismissTheKeyboard}
      >
        <Channel channel={channel} disableKeyboardCompatibleView>
          <View
            style={[styles.channelContent, { paddingBottom: keyboardHeight }]}
          >
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
      </Pressable>

      {showConsentModal && (
        <View style={styles.modalOverlay}>
          <View style={styles.warningModalContent}>
            <Text style={styles.warningTitle}>Photos Will Be Revealed</Text>
            <Text style={styles.warningText}>
              You have been talking to your match for a short while. Your photos
              will start becoming clearer. This is your last chance to unmatch
              while remaining anonymous.
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
                    await ConsentService.updateConsent(matchId, userId, false);
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
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "white",
  },
  fullScreenPressable: {
    flex: 1,
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
