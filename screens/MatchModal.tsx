import React, { useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Dimensions,
  Platform,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "../constants/Colors";
import { Profile } from "../types/App";
import BasicInfoView from "../components/BasicInfoView";
import { useNavigation } from "@react-navigation/native";
import { useAppContext } from "../context/AppContext";

interface MatchModalProps {
  visible: boolean;
  onClose: () => void;
  matchedProfile: Profile | null;
  currentProfile: Profile | null;
  matchId?: string;
}

const { width } = Dimensions.get("window");

export default function MatchModal({
  visible,
  onClose,
  matchedProfile,
  currentProfile,
  matchId,
}: MatchModalProps) {
  const navigation = useNavigation();
  const { userId, setChannel } = useAppContext();
  const [isLoadingChat, setIsLoadingChat] = React.useState(false);

  if (!matchedProfile || !currentProfile) return null;

  // Simplified: Always navigate to ChatsTab
  const handleGoToChat = async () => {
    setIsLoadingChat(true);
    try {
      (navigation as any).navigate("ChatsTab");
      onClose();
    } catch (error) {
      console.error("Error navigating to chat tab:", error);
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
    right: "5%",
    top: Platform.OS === "ios" ? "7%" : "3%",
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
    top: Platform.OS === "ios" ? "9%" : "5%",
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
    top: "10%",
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
    bottom: "10%",
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
