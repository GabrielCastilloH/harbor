import { Text, View, StyleSheet, Modal, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import React, { useEffect, useState } from "react";
import { Channel, MessageInput, MessageList } from "stream-chat-expo";
import { useAppContext } from "../context/AppContext";
import Colors from "../constants/Colors";
import { updateMessageCount } from "../networking";
import { MatchService, ConsentService } from "../networking";
import HeaderBack from "../components/HeaderBack";
import LoadingScreen from "../components/LoadingScreen";
import { useNavigation } from "@react-navigation/native";
import { UserService } from "../networking";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";
import { Platform } from "react-native";

export default function ChatScreen() {
  console.log("ChatScreen - Component rendered");

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

  console.log("ChatScreen - Initial state:", {
    channel: !!channel,
    userId,
    tabBarHeight,
    matchedUserName,
    isLayoutReady,
    consentStatus: !!consentStatus,
  });

  // Hide tab bar when this screen is focused
  useEffect(() => {
    console.log("ChatScreen - Setting up tab bar listeners");
    const unsubscribe = navigation.addListener("focus", () => {
      console.log("ChatScreen - Screen focused, hiding tab bar");
      navigation.getParent()?.setOptions({
        tabBarStyle: { display: "none" },
      });
    });

    const unsubscribeBlur = navigation.addListener("blur", () => {
      console.log("ChatScreen - Screen blurred, showing tab bar");
      navigation.getParent()?.setOptions({
        tabBarStyle: {
          backgroundColor: Colors.secondary100,
          display: "flex",
        },
      });
    });

    return () => {
      console.log("ChatScreen - Cleaning up tab bar listeners");
      unsubscribe();
      unsubscribeBlur();
    };
  }, [navigation]);

  // Check consent state when component mounts
  useEffect(() => {
    console.log("ChatScreen - Starting consent state check", {
      channel: !!channel,
      userId,
    });

    const checkConsentState = async () => {
      if (!channel || !userId) {
        console.log(
          "ChatScreen - Missing channel or userId, skipping consent check"
        );
        return;
      }

      const matchId = channel.data?.matchId;
      console.log("ChatScreen - Match ID from channel:", matchId);

      if (!matchId) {
        console.log("ChatScreen - No match ID found in channel data");
        return;
      }

      try {
        console.log("ChatScreen - Attempting to migrate match consent");
        // TEMPORARY: Migrate existing match to new consent fields
        try {
          await MatchService.migrateMatchConsent(matchId);
          console.log("ChatScreen - Successfully migrated match consent");
        } catch (migrationError) {
          console.log(
            "ChatScreen - Migration failed (expected):",
            migrationError
          );
          // Migration failed, continue anyway
        }

        console.log("ChatScreen - Getting consent status");
        const status = await ConsentService.getConsentStatus(matchId);
        console.log("ChatScreen - Consent status received:", status);
        setConsentStatus(status);

        // Check if channel is frozen due to unmatch
        const isChannelFrozen = channel.data?.frozen || false;
        console.log("ChatScreen - Channel frozen status:", isChannelFrozen);

        if (isChannelFrozen) {
          console.log("ChatScreen - Channel is frozen, setting chat as frozen");
          setIsChatFrozen(true);
          setShowConsentModal(false); // Don't show consent modal if chat is frozen due to unmatch
        } else if (status.shouldShowConsentScreen) {
          console.log("ChatScreen - Should show consent screen");
          setShowConsentModal(true);
          setIsChatFrozen(true);
        } else if (status.bothConsented) {
          console.log("ChatScreen - Both users consented, unfreezing chat");
          setIsChatFrozen(false);
        }

        // Check if current user has consented
        // Determine if current user is user1 or user2
        const isUser1 = status.user1Id === userId;
        const currentUserConsented = isUser1
          ? status.user1Consented
          : status.user2Consented;
        console.log("ChatScreen - Current user consent status:", {
          isUser1,
          currentUserConsented,
        });
        setUserConsented(currentUserConsented);

        // Don't show modal if current user has already consented
        if (currentUserConsented) {
          console.log(
            "ChatScreen - Current user already consented, hiding modal"
          );
          setShowConsentModal(false);
        }
      } catch (error) {
        console.error("ChatScreen - Error checking consent state:", error);
      }
    };

    checkConsentState();
  }, [channel, userId]);

  // Fetch matched user name
  useEffect(() => {
    console.log("ChatScreen - Starting matched user name fetch", {
      channel: !!channel,
      userId,
    });

    const getMatchedUserName = async () => {
      if (!channel || !userId) {
        console.log("ChatScreen - Missing channel or userId for name fetch");
        return;
      }

      const otherMembers = channel?.state?.members || {};
      console.log("ChatScreen - Channel members:", Object.keys(otherMembers));

      const otherUserId = Object.keys(otherMembers).find(
        (key) => key !== userId
      );
      console.log("ChatScreen - Other user ID found:", otherUserId);

      if (otherUserId) {
        setMatchedUserId(otherUserId);
        try {
          console.log("ChatScreen - Fetching user data for:", otherUserId);
          const response = await UserService.getUserById(otherUserId);
          console.log("ChatScreen - User service response:", response);

          if (response) {
            const userData = (response as any).user || response;
            const firstName = userData.firstName || "User";
            console.log(
              "ChatScreen - Setting matched user name to:",
              firstName
            );
            setMatchedUserName(firstName);
          }
        } catch (error) {
          console.error(
            "ChatScreen - Error fetching matched user name:",
            error
          );
          setMatchedUserName("User");
        }
      } else {
        console.log("ChatScreen - No other user ID found in members");
      }
    };

    getMatchedUserName();
  }, [channel, userId]);

  // Set layout ready when we have the user name and tab bar height
  useEffect(() => {
    console.log("ChatScreen - Checking layout readiness:", {
      matchedUserName,
      tabBarHeight,
      isLayoutReady,
    });

    // Only require matchedUserName to be loaded, tabBarHeight can be 0
    if (matchedUserName !== "Loading...") {
      console.log(
        "ChatScreen - Layout is ready, setting isLayoutReady to true"
      );
      setIsLayoutReady(true);
    } else {
      console.log("ChatScreen - Layout not ready yet:", {
        matchedUserName,
        tabBarHeight,
      });
    }
  }, [matchedUserName]);

  const handleConsentResponse = async (consented: boolean) => {
    console.log("ChatScreen - Handling consent response:", consented);

    try {
      const matchId = channel?.data?.matchId;
      if (!matchId || !userId) {
        console.log(
          "ChatScreen - Missing matchId or userId for consent response"
        );
        return;
      }

      console.log("ChatScreen - Updating consent for match:", matchId);
      const response = await ConsentService.updateConsent(
        matchId,
        userId,
        consented
      );
      console.log("ChatScreen - Consent update response:", response);

      if (consented) {
        console.log("ChatScreen - User consented, updating state");
        setUserConsented(true);
        // Only hide modal and unfreeze chat if both users have consented
        if (response.bothConsented) {
          console.log("ChatScreen - Both users consented, unfreezing chat");
          setShowConsentModal(false);
          setIsChatFrozen(false);

          // Send system message when both users consent
          try {
            console.log("ChatScreen - Sending consent system message");
            await channel?.sendMessage({
              text: "Both of you have decided to continue getting to know one another! 💕",
              user_id: "system",
            });
            console.log("ChatScreen - System message sent successfully");
          } catch (messageError) {
            console.error(
              "ChatScreen - Error sending consent system message:",
              messageError
            );
            // Don't fail the consent process if system message fails
          }
        }
      } else {
        console.log("ChatScreen - User chose to unmatch, keeping chat frozen");
        // If user chose to unmatch, keep chat frozen
        setIsChatFrozen(true);
        // TODO: Implement unmatch logic
      }
    } catch (error) {
      console.error("ChatScreen - Error handling consent response:", error);
    }
  };

  useEffect(() => {
    console.log("ChatScreen - Setting up message listener", {
      channel: !!channel,
    });

    if (!channel) {
      console.log("ChatScreen - No channel available for message listener");
      return;
    }

    // Set up message listener
    const handleNewMessage = async (event: any) => {
      console.log("ChatScreen - New message received:", event);

      const matchId = channel.data?.matchId;
      if (matchId) {
        try {
          console.log(
            "ChatScreen - Updating message count for match:",
            matchId
          );
          // First increment the message count
          await updateMessageCount(matchId);

          console.log("ChatScreen - Checking consent status after new message");
          // Check if we need to show consent screen
          const status = await ConsentService.getConsentStatus(matchId);
          console.log("ChatScreen - Updated consent status:", status);
          setConsentStatus(status);

          // Check if channel is frozen due to unmatch
          const isChannelFrozen = channel.data?.frozen || false;
          console.log(
            "ChatScreen - Channel frozen status after message:",
            isChannelFrozen
          );

          if (isChannelFrozen) {
            console.log(
              "ChatScreen - Channel is frozen, setting chat as frozen"
            );
            setIsChatFrozen(true);
            setShowConsentModal(false); // Don't show consent modal if chat is frozen due to unmatch
          } else {
            // Determine if current user has already consented
            const isUser1 = status.user1Id === userId;
            const currentUserConsented = isUser1
              ? status.user1Consented
              : status.user2Consented;

            console.log("ChatScreen - Current user consent check:", {
              isUser1,
              currentUserConsented,
            });

            if (status.shouldShowConsentScreen && !currentUserConsented) {
              console.log(
                "ChatScreen - Should show consent screen after message"
              );
              setShowConsentModal(true);
              setIsChatFrozen(true);
            } else if (status.bothConsented) {
              console.log(
                "ChatScreen - Both consented after message, unfreezing"
              );
              setShowConsentModal(false);
              setIsChatFrozen(false);
            }
          }
        } catch (error) {
          console.error(
            "ChatScreen - Failed to update message count or check consent:",
            error
          );
        }
      } else {
        console.log("ChatScreen - No match ID found for new message");
      }
    };

    // Subscribe to new message events
    console.log("ChatScreen - Subscribing to message.new event");
    channel.on("message.new", handleNewMessage);

    // Cleanup listener on unmount
    return () => {
      console.log("ChatScreen - Cleaning up message listener");
      channel.off("message.new", handleNewMessage);
    };
  }, [channel, userId]);

  console.log("ChatScreen - Render conditions:", {
    hasChannel: !!channel,
    isLayoutReady,
    matchedUserName,
    tabBarHeight,
  });

  if (!channel) {
    console.log("ChatScreen - No channel, showing loading message");
    return (
      <SafeAreaView>
        <Text>Loading chat ...</Text>
      </SafeAreaView>
    );
  }

  // Don't render the main content until layout is ready to prevent jarring shifts
  if (!isLayoutReady) {
    console.log("ChatScreen - Layout not ready, showing loading screen");
    return (
      <View style={styles.loadingContainer}>
        <HeaderBack title="Loading..." onBack={() => navigation.goBack()} />
        <LoadingScreen loadingText="Loading chat..." />
      </View>
    );
  }

  console.log("ChatScreen - Rendering main chat interface");
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

      <Channel channel={channel}>
        <View style={styles.channelContainer}>
          <MessageList />
          <MessageInput />
        </View>
      </Channel>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  channelContainer: {
    flex: 1,
    backgroundColor: Colors.primary100,
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
