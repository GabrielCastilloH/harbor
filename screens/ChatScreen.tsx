import { Text, View, StyleSheet, Modal, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import React, { useEffect, useState } from "react";
import { Channel, MessageInput, MessageList } from "stream-chat-expo";
import { useAppContext } from "../context/AppContext";
import Colors from "../constants/Colors";
import { updateMessageCount } from "../networking";
import { MatchService } from "../networking";

export default function ChatScreen() {
  const { channel, userId } = useAppContext();
  const [showWarning, setShowWarning] = useState(false);
  const [isChatFrozen, setIsChatFrozen] = useState(false);
  const [userAgreed, setUserAgreed] = useState(false);

  // Note: Blur logic is now handled dynamically in ProfileScreen
  // No need to check warning state here anymore

  useEffect(() => {
    if (!channel) return;

    const handleNewMessage = async (event: any) => {
      try {
        console.log("ChatScreen - New message received:", event);

        // Get the channel ID and extract user IDs
        const channelId = channel.id;
        const userIds = channelId.split("-");

        console.log(
          `ChatScreen - Channel ID: ${channelId}, User IDs:`,
          userIds
        );

        if (userIds.length === 2 && userId) {
          // Find the match between these users
          const matchId = await MatchService.getMatchId(userIds[0], userIds[1]);

          console.log(`ChatScreen - Match lookup result: ${matchId}`);

          if (matchId) {
            console.log(`Found matchId: ${matchId} for channel: ${channelId}`);

            // First increment the message count
            await updateMessageCount(matchId);
            console.log(
              `ChatScreen - Message count updated for match: ${matchId}`
            );

            // Get the other user's ID from the channel members
            const otherMembers = channel.state?.members || {};
            const otherUserId = Object.keys(otherMembers).find(
              (key) => key !== userId
            );

            console.log(`ChatScreen - Other user ID: ${otherUserId}`);

            if (otherUserId && userId) {
              // Then update the blur level
              const response = await BlurService.updateBlurLevelForMessage(
                userId,
                otherUserId
              );

              console.log(`ChatScreen - Blur level update response:`, response);

              // Handle warning state
              if (response.shouldShowWarning) {
                setShowWarning(true);
                setIsChatFrozen(true);
                console.log(`ChatScreen - Warning shown, chat frozen`);
              }
            }
          } else {
            console.log(`No match found for channel: ${channelId}`);
          }
        } else {
          console.log(
            `ChatScreen - Invalid channel ID format or missing userId`
          );
        }
      } catch (error) {
        console.error(
          "ChatScreen - Failed to update message count or blur level:",
          error
        );
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
