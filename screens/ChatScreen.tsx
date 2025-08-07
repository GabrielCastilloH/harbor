import { Text, View, StyleSheet, Modal, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import React, { useEffect, useState } from "react";
import { Channel, MessageInput, MessageList } from "stream-chat-expo";
import { useAppContext } from "../context/AppContext";
import Colors from "../constants/Colors";
import { updateMessageCount } from "../networking";
import { MatchService, ConsentService } from "../networking";
import { BLUR_CONFIG } from "../constants/blurConfig";
import ChatHeader from "../components/ChatHeader";
import { useNavigation } from "@react-navigation/native";

export default function ChatScreen() {
  const { channel, userId } = useAppContext();
  const [showConsentModal, setShowConsentModal] = useState(false);
  const [isChatFrozen, setIsChatFrozen] = useState(false);
  const [userConsented, setUserConsented] = useState(false);
  const [consentStatus, setConsentStatus] = useState<{
    user1Id: string;
    user2Id: string;
    user1Consented: boolean;
    user2Consented: boolean;
    bothConsented: boolean;
    messageCount: number;
    shouldShowConsentScreen: boolean;
  } | null>(null);

  const navigation = useNavigation();

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

  const handleBack = () => {
    navigation.goBack();
  };

  return (
    <>
      <ChatHeader onBack={handleBack} navigation={navigation} />
      <Channel channel={channel}>
        <MessageList />

        {/* Consent Modal - Inside the Channel view */}
        {showConsentModal && (
          <View style={styles.modalOverlay}>
            <View style={styles.warningModalContent}>
              <Text style={styles.warningTitle}>Photos Will Be Revealed</Text>
              <Text style={styles.warningText}>
                You've exchanged {consentStatus?.messageCount || 0} messages.
                Your photos will start becoming clearer. This is your last
                chance to unmatch while remaining anonymous.
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
                  onPress={() => {
                    setShowConsentModal(false);
                    handleConsentResponse(true);
                  }}
                >
                  <Text style={styles.warningButtonText}>Continue</Text>
                </Pressable>
              </View>
            </View>
          </View>
        )}

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
      </Channel>
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
