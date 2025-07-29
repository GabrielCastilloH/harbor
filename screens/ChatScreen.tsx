import { Text, View, StyleSheet, Modal, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import React, { useEffect, useState } from "react";
import { Channel, MessageInput, MessageList } from "stream-chat-expo";
import { useAppContext } from "../context/AppContext";
import Colors from "../constants/Colors";
import { updateMessageCount } from "../networking";
import { BlurService } from "../networking";

export default function ChatScreen() {
  const { channel, userId } = useAppContext();
  const [showWarning, setShowWarning] = useState(false);
  const [isChatFrozen, setIsChatFrozen] = useState(false);
  const [userAgreed, setUserAgreed] = useState(false);

  // Check warning state when component mounts
  useEffect(() => {
    const checkWarningState = async () => {
      if (!channel || !userId) return;

      const otherMembers = channel.state?.members || {};
      const otherUserId = Object.keys(otherMembers).find(
        (key) => key !== userId
      );

      if (otherUserId) {
        try {
          const response = await BlurService.getBlurLevel(userId, otherUserId);
          const {
            warningShown,
            bothAgreed,
            user1Agreed,
            user2Agreed,
            user1Id,
          } = response;

          // Show warning and freeze chat if warning was shown but not both agreed
          if (warningShown && !bothAgreed) {
            setShowWarning(!user1Agreed && !user2Agreed);
            setIsChatFrozen(true);
            // Check if current user has agreed
            setUserAgreed(userId === user1Id ? user1Agreed : user2Agreed);
          }
        } catch (error) {
          console.error("Error checking warning state:", error);
        }
      }
    };

    checkWarningState();
  }, [channel, userId]);

  const handleWarningResponse = async (agreed: boolean) => {
    try {
      const matchId = channel?.data?.matchId;
      if (!matchId || !userId) return;

      const response = await BlurService.handleWarningResponse(
        matchId,
        userId,
        agreed
      );

      if (agreed) {
        setUserAgreed(true);
        // Only hide warning and unfreeze chat if both users have agreed
        if (response.data.bothAgreed) {
          setShowWarning(false);
          setIsChatFrozen(false);
        }
      } else {
        // If user chose to unmatch, keep chat frozen
        setIsChatFrozen(true);
      }
      setShowWarning(false);
    } catch (error) {
      console.error("Error handling warning response:", error);
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

          // Get the other user's ID from the channel members
          const otherMembers = channel.state?.members || {};
          const otherUserId = Object.keys(otherMembers).find(
            (key) => key !== userId
          );

          if (otherUserId && userId) {
            // Then update the blur level
            console.log("ChatScreen - Updating blur level for users:", {
              userId,
              otherUserId,
            });
            const response = await BlurService.updateBlurLevelForMessage(
              userId,
              otherUserId
            );

            // Handle warning state
            if (response.data.shouldShowWarning) {
              setShowWarning(true);
              setIsChatFrozen(true);
            } else if (response.data.bothAgreed) {
              setIsChatFrozen(false);
            }
          }
        } catch (error) {
          console.error(
            "ChatScreen - Failed to update message count or blur level:",
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
        {isChatFrozen || channel.data?.frozen ? (
          <View style={styles.disabledContainer}>
            <Text style={styles.disabledText}>
              {channel.data?.frozen
                ? "This chat has been frozen because one of the users unmatched."
                : userAgreed
                ? "Waiting for the other person to continue the chat..."
                : "Chat is paused until both users agree to continue."}
            </Text>
          </View>
        ) : (
          <MessageInput />
        )}
      </Channel>

      <Modal visible={showWarning} transparent={true} animationType="fade">
        <View style={styles.warningModalBackground}>
          <View style={styles.warningModalContent}>
            <Text style={styles.warningTitle}>Photos Will Be Revealed</Text>
            <Text style={styles.warningText}>
              You've exchanged enough messages that your photos will start
              becoming clearer. This is your last chance to unmatch while
              remaining anonymous.
            </Text>
            <View style={styles.warningButtons}>
              <Pressable
                style={[styles.warningButton, styles.unmatchButton]}
                onPress={() => handleWarningResponse(false)}
              >
                <Text style={styles.warningButtonText}>Unmatch</Text>
              </Pressable>
              <Pressable
                style={[styles.warningButton, styles.continueButton]}
                onPress={() => handleWarningResponse(true)}
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
