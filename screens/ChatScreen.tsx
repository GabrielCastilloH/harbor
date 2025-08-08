import { Text, View, StyleSheet, Modal, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import React, { useEffect, useState, useRef } from "react";
import { Channel, MessageInput, MessageList } from "stream-chat-expo";
import { useAppContext } from "../context/AppContext";
import Colors from "../constants/Colors";
import { updateMessageCount } from "../networking";
import { MatchService, ConsentService } from "../networking";
import { BLUR_CONFIG } from "../constants/blurConfig";
import HeaderBack from "../components/HeaderBack";
import { useNavigation } from "@react-navigation/native";
import { UserService } from "../networking";
import { useBottomTabBarHeight } from "@react-navigation/bottom-tabs";

export default function ChatScreen() {
  const { channel, userId } = useAppContext();
  const navigation = useNavigation();
  const tabBarHeight = useBottomTabBarHeight();
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [isChatFrozen, setIsChatFrozen] = useState(false);
  const [userConsented, setUserConsented] = useState(false);
  const [matchedUserName, setMatchedUserName] = useState<string>("Loading...");
  const [matchedUserId, setMatchedUserId] = useState<string>("");
  const channelViewRef = useRef<View>(null);
  const [consentStatus, setConsentStatus] = useState<{
    user1Id: string;
    user2Id: string;
    user1Consented: boolean;
    user2Consented: boolean;
    bothConsented: boolean;
    messageCount: number;
    shouldShowConsentScreen: boolean;
  } | null>(null);

  // Check consent state when component mounts
  useEffect(() => {
    const checkConsentState = async () => {
      if (!channel || !userId) return;

      const matchId = channel.data?.matchId;
      if (!matchId) return;

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
      if (!channel || !userId) return;

      const otherMembers = channel?.state?.members || {};
      const otherUserId = Object.keys(otherMembers).find(
        (key) => key !== userId
      );

      console.log("ChatScreen - Channel members:", otherMembers);
      console.log("ChatScreen - Current userId:", userId);
      console.log("ChatScreen - Other userId:", otherUserId);

      if (otherUserId) {
        setMatchedUserId(otherUserId);
        try {
          const response = await UserService.getUserById(otherUserId);
          console.log("ChatScreen - User response:", response);
          if (response) {
            const userData = response.user || response;
            const firstName = userData.firstName || "User";
            console.log("ChatScreen - Setting matched user name:", firstName);
            setMatchedUserName(firstName);
          }
        } catch (error) {
          console.error("Error fetching matched user name:", error);
          setMatchedUserName("User");
        }
      } else {
        console.log("ChatScreen - No other user found in channel");
        setMatchedUserName("User");
      }
    };

    getMatchedUserName();
  }, [channel, userId]);

  const handleConsentResponse = async (consented: boolean) => {
    try {
      const matchId = channel?.data?.matchId;
      if (!matchId || !userId) return;

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
    if (!channel) return;

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

  return (
    <View style={{ flex: 1, backgroundColor: "red" }}>
      <View
        style={{ backgroundColor: "green" }}
        onLayout={(event) => {
          const { height, y, width, x } = event.nativeEvent.layout;
          console.log("🔍 HEADER - HeaderBack Layout:");
          console.log("   Height:", height);
          console.log("   Y position:", y);
          console.log("   Width:", width);
          console.log("   X position:", x);
          console.log("   Header visible:", height > 0);
        }}
      >
        <HeaderBack
          title={matchedUserName}
          onBack={() => navigation.goBack()}
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
      </View>

      {/* STEP 1: Add basic Channel wrapper with logging */}
      <Channel channel={channel}>
        <View
          style={{
            flex: 1,
            backgroundColor: Colors.secondary100,
            paddingBottom: tabBarHeight + 22,
          }}
          onLayout={(event) => {
            const { height, y, width, x } = event.nativeEvent.layout;
            console.log("🔍 STEP 1 - Channel View Layout:");
            console.log("   Height:", height);
            console.log("   Y position:", y);
            console.log("   Width:", width);
            console.log("   X position:", x);
            console.log("   Channel exists:", !!channel);
            console.log("   Screen dimensions - Height:", height + y);
            console.log("   Tab bar height:", tabBarHeight);
            console.log("   Total bottom padding:", tabBarHeight + 10);
          }}
        >
          {/* STEP 2: Add MessageList with logging */}
          <MessageList />

          {/* STEP 3: Add MessageInput with logging */}
          <View style={{ paddingBottom: 15 }}>
            <MessageInput />
          </View>
        </View>
      </Channel>
    </View>
  );
}

const styles = StyleSheet.create({
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
  modalOverlay: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 1000,
  },
  warningModalBackground: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
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
