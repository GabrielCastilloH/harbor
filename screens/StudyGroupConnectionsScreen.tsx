import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Pressable,
  ActivityIndicator,
  Image,
} from "react-native";
import { useRoute, RouteProp, useNavigation } from "@react-navigation/native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "../constants/Colors";
import HeaderBack from "../components/HeaderBack";
import { useAppContext } from "../context/AppContext";
import { UserService } from "../networking";
import { Profile } from "../types/App";

type StudyGroupConnectionsParams = {
  StudyGroupConnections: {
    channelId: string;
    memberIds: string[];
  };
};

export default function StudyGroupConnectionsScreen() {
  const [members, setMembers] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  const route =
    useRoute<RouteProp<StudyGroupConnectionsParams, "StudyGroupConnections">>();
  const navigation = useNavigation();
  const { userId: currentUserId } = useAppContext();

  const { channelId, memberIds } = route.params;

  useEffect(() => {
    const fetchMembers = async () => {
      try {
        const memberPromises = memberIds.map((id) =>
          UserService.getUserById(id)
        );
        const memberResponses = await Promise.all(memberPromises);

        const memberProfiles = memberResponses
          .filter((response) => response)
          .map((response) => {
            const userData = (response as any).user || response;
            return userData;
          });

        setMembers(memberProfiles);
      } catch (error) {
        console.error("Error fetching study group members:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchMembers();
  }, [memberIds]);

  const handleBack = () => {
    navigation.goBack();
  };

  const handleMemberPress = (member: Profile) => {
    // Check if the member has a valid uid
    if (!member.uid) {
      console.error("Member has no UID, cannot navigate to profile.");
      return;
    }

    // Prevent self-navigation
    if (member.uid === currentUserId) {
      console.log("You cannot view your own profile from here.");
      return;
    }

    // Navigate to the profile screen
    (navigation as any).navigate("ProfileScreen", {
      userId: member.uid,
      matchId: null,
    });
  };

  const renderMember = ({ item }: { item: Profile }) => (
    <Pressable
      style={styles.memberItem}
      onPress={() => handleMemberPress(item)}
    >
      <View style={styles.memberInfo}>
        <View style={styles.avatarContainer}>
          {item.images && item.images.length > 0 ? (
            <Image source={{ uri: item.images[0] }} style={styles.avatar} />
          ) : (
            <View style={[styles.avatar, styles.placeholderAvatar]}>
              <Ionicons name="person" size={24} color={Colors.secondary500} />
            </View>
          )}
        </View>
        <View style={styles.memberDetails}>
          <Text style={styles.memberName}>{item.firstName}</Text>
          <Text style={styles.memberMajor}>{item.major}</Text>
        </View>
      </View>
      <Ionicons name="chevron-forward" size={20} color={Colors.secondary500} />
    </Pressable>
  );

  if (loading) {
    return (
      <View style={styles.container}>
        <HeaderBack title="Connections" onBack={handleBack} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary500} />
          <Text style={styles.loadingText}>Loading connections...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <HeaderBack title="Connections" onBack={handleBack} />
      <FlatList
        data={members}
        keyExtractor={(item) => item.uid || item.email}
        renderItem={renderMember}
        style={styles.memberList}
        contentContainerStyle={styles.memberListContent}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.secondary100,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: Colors.secondary500,
  },
  memberList: {
    flex: 1,
  },
  memberListContent: {
    padding: 16,
  },
  memberItem: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "space-between",
    backgroundColor: Colors.secondary100,
    padding: 16,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
    borderColor: Colors.secondary200,
  },
  memberInfo: {
    flexDirection: "row",
    alignItems: "center",
    flex: 1,
  },
  avatarContainer: {
    marginRight: 12,
  },
  avatar: {
    width: 50,
    height: 50,
    borderRadius: 25,
  },
  placeholderAvatar: {
    backgroundColor: Colors.secondary200,
    justifyContent: "center",
    alignItems: "center",
  },
  memberDetails: {
    flex: 1,
  },
  memberName: {
    fontSize: 16,
    fontWeight: "600",
    color: Colors.primary500,
    marginBottom: 4,
  },
  memberMajor: {
    fontSize: 14,
    color: Colors.secondary500,
  },
});
