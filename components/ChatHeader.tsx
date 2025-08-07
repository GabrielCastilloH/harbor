import React from "react";
import { View, Text, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Colors from "../constants/Colors";
import { useAppContext } from "../context/AppContext";
import { UserService } from "../networking";
import { useState, useEffect } from "react";
import HeaderBack from "./HeaderBack";

interface ChatHeaderProps {
  onBack: () => void;
  navigation: any;
}

export default function ChatHeader({ onBack, navigation }: ChatHeaderProps) {
  const { channel, userId } = useAppContext();
  const [matchedUserName, setMatchedUserName] = useState<string>("Loading...");
  const [matchedUserId, setMatchedUserId] = useState<string>("");
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const getMatchedUserName = async () => {
      if (!channel || !userId) return;

      const otherMembers = channel?.state?.members || {};
      const otherUserId = Object.keys(otherMembers).find(
        (key) => key !== userId
      );

      if (otherUserId) {
        setMatchedUserId(otherUserId);
        try {
          const response = await UserService.getUserById(otherUserId);
          if (response) {
            const userData = response.user || response;
            setMatchedUserName(userData.firstName || "User");
          }
        } catch (error) {
          console.error("Error fetching matched user name:", error);
          setMatchedUserName("User");
        } finally {
          setIsLoading(false);
        }
      } else {
        setIsLoading(false);
      }
    };

    getMatchedUserName();
  }, [channel, userId]);

  const handleHeaderPress = () => {
    if (matchedUserId) {
      navigation.navigate("ProfileScreen", {
        userId: matchedUserId,
        matchId: null, // Will be fetched in ProfileScreen
      });
    }
  };

  const handleProfileIconPress = () => {
    if (matchedUserId) {
      navigation.navigate("ProfileScreen", {
        userId: matchedUserId,
        matchId: null, // Will be fetched in ProfileScreen
      });
    }
  };

  return (
    <SafeAreaView
      edges={["top"]}
      style={{ backgroundColor: Colors.primary100 }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingTop: 15,
          paddingBottom: 16,
          paddingHorizontal: 16,
          backgroundColor: Colors.primary100,
        }}
      >
        <Pressable onPress={onBack} style={{ padding: 8 }}>
          <Ionicons name="arrow-back" size={24} color={Colors.primary500} />
        </Pressable>

        <Pressable
          onPress={handleHeaderPress}
          style={{
            flex: 1,
            alignItems: "center",
            paddingVertical: 8,
          }}
        >
          <Text
            style={{
              fontSize: 18,
              fontWeight: "600",
              color: isLoading ? Colors.secondary500 : Colors.primary500,
            }}
          >
            {matchedUserName}
          </Text>
        </Pressable>

        <Pressable onPress={handleProfileIconPress} style={{ padding: 8 }}>
          <Ionicons name="person" size={24} color={Colors.primary500} />
        </Pressable>
      </View>
    </SafeAreaView>
  );
}
