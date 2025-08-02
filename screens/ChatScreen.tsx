import { Text, View, StyleSheet, Modal, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import React, { useEffect, useState } from "react";
import { Channel, MessageInput, MessageList } from "stream-chat-expo";
import { useAppContext } from "../context/AppContext";
import Colors from "../constants/Colors";
import { updateMessageCount } from "../networking";
import { MatchService, ConsentService } from "../networking";
import { BLUR_CONFIG } from "../constants/blurConfig";

export default function ChatScreen() {
  const { channel, userId } = useAppContext();
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [isChatFrozen, setIsChatFrozen] = useState(false);
  const [userConsented, setUserConsented] = useState(false);
  const [consentStatus, setConsentStatus] = useState<{
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
        const status = await ConsentService.getConsentStatus(matchId);
        setConsentStatus(status);

        // Show consent modal if needed
        if (status.shouldShowConsentScreen) {
          setShowConsentModal(true);
          setIsChatFrozen(true);
        } else if (status.bothConsented) {
          setIsChatFrozen(false);
        }

        // Check if current user has consented
        const currentUserConsented =
          userId === status.user1Consented
            ? status.user1Consented
            : status.user2Consented;
        setUserConsented(currentUserConsented);
      } catch (error) {
        console.error("Error checking consent state:", error);
      }
    };

    checkConsentState();
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

    console.log("ChatScreen - Setting up message listener for channel:", {
      id: channel.id,
      matchId: channel.data?.matchId,
    });

    // Set up message listener
    const handleNewMessage = async (event: any) => {
      console.log("ChatScreen - New message received:", {
        messageId: event?.message?.id,
        matchId: channel.data?.matchId,
        userId: event?.user?.id,
      });

      const matchId = channel.data?.matchId;
      if (matchId) {
        try {
          // First increment the message count
          console.log(
            "ChatScreen - Updating message count for match:",
            matchId
          );
          await updateMessageCount(matchId);

          // Check if we need to show consent screen
          const status = await ConsentService.getConsentStatus(matchId);
          setConsentStatus(status);

          if (status.shouldShowConsentScreen) {
            setShowConsentModal(true);
            setIsChatFrozen(true);
          } else if (status.bothConsented) {
            setIsChatFrozen(false);
          }
        } catch (error) {
          console.error(
            "ChatScreen - Failed to update message count or check consent:",
            error
          );
        }
      } else {
        console.warn("ChatScreen - Match ID is missing from channel data");
      }
    };

    // Subscribe to new message events
    channel.on("message.new", handleNewMessage);

    // Cleanup listener on unmount
    return () => {
      console.log("ChatScreen - Cleaning up message listener");
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
    <>
      <Channel channel={channel}>
        <MessageList />
        {isChatFrozen ? (
          <View style={styles.disabledContainer}>
            <Text style={styles.disabledText}>
              {userConsented
                ? "Waiting for the other person to continue the chat..."
                : "Chat is paused until both users agree to continue."}
            </Text>
          </View>
        ) : (
          <MessageInput />
        )}
      </Channel>

      <Modal visible={showConsentModal} transparent={true} animationType="fade">
        <View style={styles.warningModalBackground}>
          <View style={styles.warningModalContent}>
            <Text style={styles.warningTitle}>Photos Will Be Revealed</Text>
            <Text style={styles.warningText}>
              You've exchanged {consentStatus?.messageCount || 0} messages. Your
              photos will start becoming clearer. This is your last chance to
              unmatch while remaining anonymous.
            </Text>
            <View style={styles.warningButtons}>
              <Pressable
                style={[styles.warningButton, styles.unmatchButton]}
                onPress={() => handleConsentResponse(false)}
              >
                <Text style={styles.warningButtonText}>Unmatch</Text>
              </Pressable>
              <Pressable
                style={[styles.warningButton, styles.continueButton]}
                onPress={() => handleConsentResponse(true)}
              >
                <Text style={styles.warningButtonText}>Continue</Text>
              </Pressable>
            </View>
          </View>
        </View>
      </Modal>
    </>
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
