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

  // Check consent state when component mounts
  useEffect(() => {
    const checkConsentState = async () => {
      if (!channel || !userId) {
        return;
      }

      const matchId = channel.data?.matchId;

      if (!matchId) {
        return;
      }

      try {
        // TEMPORARY: Migrate existing match to new consent fields
        try {
          await MatchService.migrateMatchConsent(matchId);
        } catch (migrationError) {
          // Migration failed, continue anyway
        }

        const status = await ConsentService.getConsentStatus(matchId);
        setConsentStatus(status);

        // Check if channel is frozen due to unmatch
        const isChannelFrozen = channel.data?.frozen || false;

        if (isChannelFrozen) {
          setIsChatFrozen(true);
          setShowConsentModal(false); // Don't show consent modal if chat is frozen due to unmatch
        } else if (status.shouldShowConsentScreen) {
          setShowConsentModal(true);
          setIsChatFrozen(true);
        } else if (status.bothConsented) {
          setIsChatFrozen(false);
        }

        // Check if current user has consented
        // Determine if current user is user1 or user2
        const isUser1 = status.user1Id === userId;
        const currentUserConsented = isUser1
          ? status.user1Consented
          : status.user2Consented;
        setUserConsented(currentUserConsented);

        // Don't show modal if current user has already consented
        if (currentUserConsented) {
          setShowConsentModal(false);
        }
      } catch (error) {
        console.error("Error checking consent state:", error);
      }
    };

    checkConsentState();
  }, [channel, userId]);

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
      const matchId = channel?.data?.matchId;
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
      const matchId = channel.data?.matchId;
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
            setShowConsentModal(false); // Don't show consent modal if chat is frozen due to unmatch
          } else {
            // Determine if current user has already consented
            const isUser1 = status.user1Id === userId;
            const currentUserConsented = isUser1
              ? status.user1Consented
              : status.user2Consented;

            if (status.shouldShowConsentScreen && !currentUserConsented) {
              setShowConsentModal(true);
              setIsChatFrozen(true);
            } else if (status.bothConsented) {
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
      }
    };

    // Subscribe to new message events
    channel.on("message.new", handleNewMessage);

    // Cleanup listener on unmount
    return () => {
      channel.off("message.new", handleNewMessage);
    };
  }, [channel, userId]);

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
        <LoadingScreen loadingText="Loading chat..." />
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
