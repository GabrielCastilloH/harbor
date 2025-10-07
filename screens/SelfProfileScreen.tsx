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
  Alert,
  Image,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Colors from "../constants/Colors";
import { Profile } from "../types/App";
import BasicInfoView from "../components/BasicInfoView";
import PersonalView from "../components/PersonalView";
import { getImageSource } from "../util/imageUtils";
import { useNavigation } from "@react-navigation/native";
import { useAppContext } from "../context/AppContext";
import { UserService } from "../networking";
import { getPersonalImages } from "../networking/ImageService";
import LoadingScreen from "../components/LoadingScreen";
import ImageCarousel from "../components/ImageCarousel";
import HeaderBack from "../components/HeaderBack";

const windowWidth = Dimensions.get("window").width;

export default function SelfProfileScreen() {
  const [selectedPhoto, setSelectedPhoto] = useState<string | null>(null);
  const [modalVisible, setModalVisible] = useState(false);
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [images, setImages] = useState<Array<{ url: string }>>([]);
  const [imageLoading, setImageLoading] = useState(true);

  const navigation = useNavigation();
  const { userId } = useAppContext();

  useEffect(() => {
    const fetchProfile = async () => {
      if (!userId) {
        setLoading(false);
        return;
      }

      try {
        const response = await UserService.getUserById(userId);
        if (response) {
          // Handle different response formats
          let profileData = null;
          if (response.firstName || response.uid) {
            profileData = response;
          } else if (
            response.user &&
            (response.user.firstName || response.user.uid)
          ) {
            profileData = response.user;
          }

          if (profileData) {
            setProfile(profileData);
          }
        }
      } catch (error) {
        console.error("Error fetching profile:", error);
        Alert.alert("Error", "Failed to load profile");
      } finally {
        setLoading(false);
      }
    };

    fetchProfile();
  }, [userId]);

  useEffect(() => {
    const fetchImages = async () => {
      if (!userId) {
        setImageLoading(false);
        return;
      }

      try {
        const response = await getPersonalImages(userId);
        if (response) {
          setImages(response);
        }
      } catch (error) {
        console.error("Error fetching images:", error);
      } finally {
        setImageLoading(false);
      }
    };

    fetchImages();
  }, [userId]);

  const handleBack = () => {
    navigation.goBack();
  };

  if (loading) {
    return <LoadingScreen loadingText="Loading profile..." />;
  }

  if (!profile) {
    return (
      <SafeAreaView style={styles.safeArea}>
        <View style={styles.errorContainer}>
          <Text style={styles.errorText}>Failed to load profile</Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <View style={{ flex: 1, backgroundColor: Colors.secondary100 }}>
      <HeaderBack title="My Profile" onBack={handleBack} />

      <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
        {/* Image Carousel - Always show, even when loading */}
        <View style={styles.imageContainer}>
          <ImageCarousel
            images={
              images.length > 0
                ? images.map((img, index) => ({
                    id: index.toString(),
                    url: img.url,
                    blurLevel: 0, // No blur for own images
                  }))
                : [
                    {
                      id: "placeholder",
                      url: "", // Empty URL will show gray background
                      blurLevel: 0,
                    },
                  ]
            }
            imageSize={windowWidth - 40}
            borderRadius={16}
            spacing={20}
            showIndicators={images.length > 0}
          />
        </View>

        {/* Profile Content */}
        <View style={styles.contentContainer}>
          <BasicInfoView profile={profile} />
          <PersonalView profile={profile} showFlag={false} />
        </View>
      </ScrollView>

      {/* Photo Modal */}
      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalOverlay}>
          <Pressable
            style={styles.modalBackground}
            onPress={() => setModalVisible(false)}
          />
          {selectedPhoto && (
            <Image
              source={{ uri: selectedPhoto }}
              style={styles.modalImage}
              resizeMode="contain"
            />
          )}
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: Colors.secondary100,
  },
  container: {
    flex: 1,
    backgroundColor: Colors.secondary100,
  },
  imageContainer: {
    marginVertical: 20,
  },
  contentContainer: {
    paddingHorizontal: 20,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.9)",
    justifyContent: "center",
    alignItems: "center",
  },
  modalBackground: {
    position: "absolute",
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
  },
  modalImage: {
    width: windowWidth * 0.9,
    height: windowWidth * 0.9,
    borderRadius: 12,
  },
  errorContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.secondary100,
  },
  errorText: {
    fontSize: 16,
    color: Colors.primary500,
  },
});
