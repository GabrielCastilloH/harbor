import React from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "../constants/Colors";
import { Profile } from "../types/App";
import BasicInfoView from "../components/BasicInfoView";
import { useNavigation } from "@react-navigation/native";
import { ChatFunctions } from "../networking";
import { useAppContext } from "../context/AppContext";

interface MatchModalProps {
  visible: boolean;
  onClose: () => void;
  matchedProfile: Profile | null;
  currentProfile: Profile | null;
}

const { width } = Dimensions.get("window");

export default function MatchModal({
  visible,
  onClose,
  matchedProfile,
  currentProfile,
}: MatchModalProps) {
  const navigation = useNavigation();
  const { userId, setChannel } = useAppContext();
  const [isLoadingChat, setIsLoadingChat] = React.useState(false);

  if (!matchedProfile || !currentProfile) return null;

  const handleGoToChat = async () => {
    if (!userId || !matchedProfile.uid) {
      console.error("Missing userId or matchedProfile.uid");
      return;
    }

    setIsLoadingChat(true);
    try {
      // Create or get the chat channel between the two users
      const chatResponse = await ChatFunctions.createChannel({
        userId1: userId,
        userId2: matchedProfile.uid,
      });

      if (chatResponse && chatResponse.channel) {
        // Set the channel in context
        setChannel(chatResponse.channel);

        // Navigate to the ChatsTab
        (navigation as any).navigate("ChatsTab");

        // Close the match modal
        onClose();
      }
    } catch (error) {
      console.error("Error navigating to chat:", error);
    } finally {
      setIsLoadingChat(false);
    }
  };

  return (
    <Modal visible={visible} transparent={true} animationType="fade">
      <View style={styles.modalBackground}>
        <View style={styles.modalContent}>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <Ionicons name="close" size={30} color={Colors.primary500} />
          </TouchableOpacity>

          <Text style={styles.matchText}>
            You matched with {"\n"} {matchedProfile.firstName}!
          </Text>

          <View style={styles.cardsContainer}>
            {/* Bottom card (current user) */}
            <View style={[styles.card, styles.bottomCard]}>
              <BasicInfoView profile={currentProfile} />
            </View>

            {/* Top card (matched user) */}
            <View style={[styles.card, styles.topCard]}>
              <BasicInfoView profile={matchedProfile} />
            </View>
          </View>

          {/* Go to Chat Button */}
          <TouchableOpacity
            style={[
              styles.chatButton,
              isLoadingChat && styles.chatButtonDisabled,
            ]}
            onPress={handleGoToChat}
            disabled={isLoadingChat}
          >
            <Ionicons
              name={isLoadingChat ? "hourglass" : "chatbubbles"}
              size={24}
              color={Colors.secondary100}
            />
            <Text style={styles.chatButtonText}>
              {isLoadingChat ? "Loading..." : "Go to Chat"}
            </Text>
          </TouchableOpacity>
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalBackground: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalContent: {
    width: "100%",
    height: "100%",
    backgroundColor: Colors.primary100,
    alignItems: "center",
    justifyContent: "center",
  },
  closeButton: {
    position: "absolute",
    right: 20,
    top: 50,
    zIndex: 3,
  },
  matchText: {
    fontSize: 32,
    fontWeight: "bold",
    color: Colors.primary500,
    marginBottom: 40,
    textAlign: "center",
    zIndex: 2,
    position: "absolute",
    top: 100,
    width: "100%",
    paddingHorizontal: 20,
  },
  cardsContainer: {
    width: "100%",
    height: "70%",
    position: "relative",
    alignItems: "center",
    justifyContent: "center",
  },
  card: {
    width: width * 0.85,
    height: width * 1.2,
    position: "absolute",
    backgroundColor: Colors.secondary100,
    borderRadius: 24,
    borderWidth: 3,
    padding: 25,
    top: 85,
    borderColor: `${Colors.primary500}50`,
    overflow: "hidden",
  },
  bottomCard: {
    transform: [{ rotate: "-15deg" }],
    zIndex: 1,
  },
  topCard: {
    transform: [{ rotate: "15deg" }],
    zIndex: 2,
  },
  chatButton: {
    position: "absolute",
    bottom: 80,
    backgroundColor: Colors.primary500,
    paddingHorizontal: 30,
    paddingVertical: 15,
    borderRadius: 25,
    flexDirection: "row",
    alignItems: "center",
    zIndex: 3,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    elevation: 5,
  },
  chatButtonText: {
    color: Colors.secondary100,
    fontSize: 18,
    fontWeight: "600",
    marginLeft: 8,
  },
  chatButtonDisabled: {
    opacity: 0.6,
  },
});
