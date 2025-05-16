import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  Modal,
  Pressable,
  Dimensions,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "../constants/Colors";
import { Profile } from "../types/App";
import PageIndicator from "../components/PageIndicator";
import BasicInfoView from "../components/BasicInfoView";
import AcademicView from "../components/AcademicView";
import PersonalView from "../components/PersonalView";
import CachedImage from "../components/CachedImage";
import axios from "axios";
import { useRoute, RouteProp } from "@react-navigation/native";

type ProfileScreenParams = {
  ProfileScreen: {
    userId: string;
  };
};

const serverUrl = process.env.SERVER_URL;
const windowWidth = Dimensions.get("window").width;

export default function ProfileScreen() {
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const route = useRoute<RouteProp<ProfileScreenParams, "ProfileScreen">>();
  const userId = route.params?.userId;

  useEffect(() => {
    const fetchProfile = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        const response = await axios.get(`${serverUrl}/users/${userId}`);
        if (response.data) {
          setProfile(response.data.user || response.data);
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [userId]);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary500} />
      </View>
    );
  }

  if (!profile) {
    return (
      <View style={styles.loadingContainer}>
        <Text>No profile data available</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.scrollView}>
      <ScrollView
        horizontal
        style={styles.photoScroll}
        showsHorizontalScrollIndicator={false}
      >
        {profile.images.map((fileId, index) => (
          <Pressable
            key={index}
            onPress={() => {
              setSelectedPhoto(fileId);
              setModalVisible(true);
            }}
          >
            <CachedImage fileId={fileId} style={styles.thumbnail} />
          </Pressable>
        ))}
      </ScrollView>
      <BasicInfoView profile={profile} />
      <Modal
        visible={modalVisible}
        transparent={true}
        onRequestClose={() => setModalVisible(false)}
      >
        <Pressable
          style={styles.modalBackground}
          onPress={() => setModalVisible(false)}
        >
          {selectedPhoto && (
            <CachedImage
              fileId={selectedPhoto}
              style={styles.fullImage}
              resizeMode="contain"
            />
          )}
        </Pressable>
      </Modal>

      <AcademicView profile={profile} />
      <PersonalView profile={profile} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  scrollView: {
    flex: 1,
    backgroundColor: Colors.secondary100,
    paddingHorizontal: 24,
  },
  photoScroll: {
    marginVertical: 10,
    padding: 10,
  },
  thumbnail: {
    width: 150,
    height: 150,
    borderRadius: 8,
    marginRight: 8,
  },
  modalBackground: {
    flex: 1,
    backgroundColor: "rgba(0,0,0,0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  fullImage: {
    width: windowWidth,
    height: windowWidth,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.secondary100,
  },
});
