import React from "react";
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  Image,
  Alert,
  KeyboardAvoidingView,
  Platform,
  Animated,
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, AntDesign } from "@expo/vector-icons";
import Colors from "../constants/Colors";
import { Profile } from "../types/App";
import * as ImagePicker from "expo-image-picker";
import { getImageSource } from "../util/imageUtils";

interface ProfileFormProps {
  profileData: Profile;
  onProfileChange: (profile: Profile) => void;
  loading?: boolean;
  isAccountSetup?: boolean;
  onSave: () => void;
  onLogout?: () => void;
}

const truncateForLog = (str: string): string => {
  if (!str) return "";
  return str.length > 6
    ? `${str.substring(0, 3)}...${str.substring(str.length - 3)}`
    : str;
};

// Utility to wrap URIs with keys
function wrapImagesWithKeys(images: string[]) {
  return images.map((uri) => ({
    key: Date.now().toString() + Math.random(),
    uri,
  }));
}

// Skeletal loading component for images
const ImageSkeleton = ({ count }: { count: number }) => {
  const fadeAnim = React.useRef(new Animated.Value(0.3)).current;

  React.useEffect(() => {
    const fadeInOut = () => {
      Animated.sequence([
        Animated.timing(fadeAnim, {
          toValue: 0.8,
          duration: 1200,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnim, {
          toValue: 0.2,
          duration: 1200,
          useNativeDriver: true,
        }),
      ]).start(() => fadeInOut());
    };
    fadeInOut();
  }, [fadeAnim]);

  return (
    <>
      {Array.from({ length: count }).map((_, index) => (
        <View key={index} style={styles.imageContainer}>
          <Animated.View
            style={[
              styles.imageSkeleton,
              {
                opacity: fadeAnim,
              },
            ]}
          />
        </View>
      ))}
    </>
  );
};

export default function ProfileForm({
  profileData,
  onProfileChange,
  loading = false,
  isAccountSetup = false,
  onSave,
  onLogout,
}: ProfileFormProps) {
  // Local state for images with keys
  const [imagesWithKeys, setImagesWithKeys] = React.useState(() =>
    wrapImagesWithKeys(profileData.images)
  );

  // Keep imagesWithKeys in sync with profileData.images if profileData changes (e.g., on load)
  React.useEffect(() => {
    setImagesWithKeys(wrapImagesWithKeys(profileData.images));
  }, [profileData.images]);

  const handleChange = (
    key: keyof Profile,
    value: string | number | string[]
  ) => {
    onProfileChange({ ...profileData, [key]: value });
  };

  const validateProfile = (): string[] => {
    const errors: string[] = [];

    // Check images - use imagesWithKeys instead of profileData.images
    if (imagesWithKeys.filter((img) => img.uri !== "").length < 3) {
      errors.push("Please add at least 3 images");
    }

    // Check text fields
    const textFields: (keyof Profile)[] = [
      "firstName",
      "yearLevel",
      "major",
      "aboutMe",
      "q1",
      "q2",
      "q3",
      "q4",
      "q5",
      "q6",
    ];

    textFields.forEach((field) => {
      if (!profileData[field] || profileData[field].toString().trim() === "") {
        errors.push(
          `Please fill in ${field.replace(/([A-Z])/g, " $1").toLowerCase()}`
        );
      }
    });

    // Check age
    if (!profileData.age || profileData.age < 18) {
      errors.push("Please enter a valid age (18+)");
    }

    return errors;
  };

  // When adding an image
  const pickImage = async () => {
    if (imagesWithKeys.length >= 6) {
      Alert.alert("Maximum Images", "You can only add up to 6 images");
      return;
    }
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.9,
    });
    if (!result.canceled && result.assets && result.assets.length > 0) {
      const imageUri = result.assets[0].uri;
      setImagesWithKeys((prev) => [
        ...prev,
        { key: Date.now().toString() + Math.random(), uri: imageUri },
      ]);
    }
  };

  // When removing an image
  const removeImage = (key: string) => {
    setImagesWithKeys((prev) => prev.filter((img) => img.key !== key));
  };

  // When saving, update profileData.images to be just the uris
  const handleSaveClick = () => {
    const errors = validateProfile();
    if (errors.length > 0) {
      Alert.alert("Cannot Save Profile", errors.join("\n"), [{ text: "OK" }]);
      return;
    }
    // Update profileData.images before saving
    onProfileChange({
      ...profileData,
      images: imagesWithKeys.map((img) => img.uri),
    });
    onSave();
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <Text>Loading profile...</Text>
      </View>
    );
  }

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === "ios" ? "padding" : "height"}
    >
      <ScrollView
        style={[
          styles.container,
          isAccountSetup && styles.containerAccountSetup,
        ]}
        contentContainerStyle={{ flexGrow: 1, paddingBottom: 20 }}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={[styles.section, isAccountSetup && styles.sectionAccountSetup]}
        >
          <View style={styles.headerContainer}>
            {isAccountSetup && onLogout && (
              <TouchableOpacity style={styles.backButton} onPress={onLogout}>
                <Ionicons
                  name="chevron-back"
                  size={24}
                  color={Colors.primary500}
                />
              </TouchableOpacity>
            )}
            <Text style={styles.sectionTitle}>
              {isAccountSetup ? "Setup your Account" : "Personal Information"}
            </Text>
          </View>

          <Text style={styles.label}>First Name</Text>
          <TextInput
            style={styles.input}
            placeholder="First Name"
            value={profileData.firstName}
            onChangeText={(text) => handleChange("firstName", text)}
          />

          <Text style={styles.label}>Age</Text>
          <TextInput
            style={styles.input}
            placeholder="Age"
            value={profileData.age ? profileData.age.toString() : ""}
            onChangeText={(text) => handleChange("age", Number(text))}
            keyboardType="numeric"
          />

          <Text style={styles.label}>Year Level</Text>
          <TextInput
            style={styles.input}
            placeholder="Year Level"
            value={profileData.yearLevel}
            onChangeText={(text) => handleChange("yearLevel", text)}
          />

          <Text style={styles.label}>Major</Text>
          <TextInput
            style={styles.input}
            placeholder="Major"
            value={profileData.major}
            onChangeText={(text) => handleChange("major", text)}
          />

          <Text style={styles.label}>About Me</Text>
          <TextInput
            style={styles.input}
            placeholder="Tell us about yourself..."
            value={profileData.aboutMe}
            onChangeText={(text) => handleChange("aboutMe", text)}
            multiline
            numberOfLines={3}
          />

          <Text style={styles.label}>This year, I really want to</Text>
          <TextInput
            style={styles.input}
            placeholder="This year, I want to..."
            value={profileData.q1}
            onChangeText={(text) => handleChange("q1", text)}
            multiline
            numberOfLines={3}
          />

          <Text style={styles.label}>Together we could</Text>
          <TextInput
            style={styles.input}
            placeholder="We could..."
            value={profileData.q2}
            onChangeText={(text) => handleChange("q2", text)}
            multiline
            numberOfLines={3}
          />

          <Text style={styles.label}>Favorite book, movie or song</Text>
          <TextInput
            style={styles.input}
            placeholder="My favorite book/movie/song is..."
            value={profileData.q3}
            onChangeText={(text) => handleChange("q3", text)}
            multiline
            numberOfLines={3}
          />

          <Text style={styles.label}>I chose my major because...</Text>
          <TextInput
            style={styles.input}
            placeholder="I chose my major because..."
            value={profileData.q4}
            onChangeText={(text) => handleChange("q4", text)}
            multiline
            numberOfLines={3}
          />

          <Text style={styles.label}>My favorite study spot is</Text>
          <TextInput
            style={styles.input}
            placeholder="My favorite study spot is..."
            value={profileData.q5}
            onChangeText={(text) => handleChange("q5", text)}
            multiline
            numberOfLines={3}
          />

          <Text style={styles.label}>Some of my hobbies are</Text>
          <TextInput
            style={styles.input}
            placeholder="In my free time, I like to..."
            value={profileData.q6}
            onChangeText={(text) => handleChange("q6", text)}
            multiline
            numberOfLines={3}
          />
        </View>

        <View style={styles.section}>
          <Text style={[styles.sectionTitle, styles.profileImagesTitle]}>
            Profile Images
          </Text>
          <ScrollView horizontal showsHorizontalScrollIndicator={false}>
            {loading ? (
              <ImageSkeleton
                count={Math.max(profileData.images?.length || 0, 3)}
              />
            ) : (
              imagesWithKeys.map((image) => (
                <View key={image.key} style={styles.imageContainer}>
                  <Image
                    source={getImageSource(image.uri)}
                    style={styles.image}
                    onLoadStart={() => {
                      // Image started loading
                    }}
                    onLoadEnd={() => {
                      // Image finished loading
                    }}
                  />
                  <TouchableOpacity
                    style={styles.removeButton}
                    onPress={() => removeImage(image.key)}
                  >
                    <Ionicons
                      name="close"
                      size={24}
                      color={Colors.secondary100}
                    />
                  </TouchableOpacity>
                </View>
              ))
            )}
            <TouchableOpacity style={styles.addButton} onPress={pickImage}>
              <AntDesign name="plus" size={40} color={Colors.primary500} />
            </TouchableOpacity>
          </ScrollView>
        </View>

        <TouchableOpacity style={styles.saveButton} onPress={handleSaveClick}>
          <Text style={styles.saveButtonText}>Save</Text>
        </TouchableOpacity>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.secondary100,
    paddingTop: 16,
  },
  containerAccountSetup: {
    paddingTop: 0,
  },
  headerContainer: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 10, // Restore margin for proper spacing
  },
  backButton: {
    marginRight: 10,
    padding: 5,
    justifyContent: "center",
    alignItems: "center",
  },
  section: {
    paddingHorizontal: 20, // Restore horizontal padding
  },
  sectionAccountSetup: {
    paddingTop: 0,
  },
  sectionTitle: {
    fontSize: 22,
    fontWeight: "bold",
    color: Colors.primary500,
    textAlignVertical: "center",
  },
  label: {
    fontSize: 16,
    color: Colors.primary500,
    marginBottom: 5,
  },
  input: {
    backgroundColor: Colors.secondary200,
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    color: "gray",
  },
  imageContainer: {
    position: "relative",
    marginRight: 16,
    marginTop: 8,
    overflow: "visible",
  },
  image: {
    width: 100,
    height: 100,
    borderRadius: 10,
  },
  removeButton: {
    position: "absolute",
    top: -8,
    right: -8,
    backgroundColor: Colors.primary500,
    borderRadius: 20,
    width: 32,
    height: 32,
    alignItems: "center",
    justifyContent: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 4,
  },
  removeButtonText: {
    color: "white",
    fontSize: 12,
  },
  addButton: {
    width: 100,
    height: 100,
    backgroundColor: "transparent",
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.primary500,
    borderStyle: "dashed",
    alignItems: "center",
    justifyContent: "center",
    marginTop: 8, // aligns with imageContainer's marginTop
  },
  addButtonText: {
    color: Colors.primary500,
    fontSize: 40,
    fontWeight: "bold",
  },
  saveButton: {
    backgroundColor: Colors.primary500,
    padding: 15,
    margin: 20,
    borderRadius: 10,
    alignItems: "center",
  },
  saveButtonText: {
    color: Colors.secondary100,
    fontSize: 18,
    fontWeight: "bold",
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  profileImagesTitle: {
    marginBottom: 8,
  },
  imageSkeleton: {
    width: 100,
    height: 100,
    borderRadius: 10,
    backgroundColor: Colors.secondary200,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
});
