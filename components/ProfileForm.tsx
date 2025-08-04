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
} from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons, AntDesign } from "@expo/vector-icons";
import Colors from "../constants/Colors";
import { Profile } from "../types/App";
import * as ImagePicker from "expo-image-picker";
import { getImageSource } from "../util/imageUtils";
import GenderPicker from "./GenderPicker";
import DataPicker from "./DataPicker";

interface ProfileFormProps {
  profileData: Profile;
  onProfileChange: (profile: Profile) => void;
  isAccountSetup?: boolean;
  onSave: (images?: string[]) => void;
  onLogout?: () => void;
}

const truncateForLog = (str: string): string => {
  if (!str) return "";
  return str.length > 6
    ? `${str.substring(0, 3)}...${str.substring(str.length - 3)}`
    : str;
};

// Utility to wrap URIs with keys
function wrapImagesWithKeys(images: any[]) {
  // Ensure images is always an array
  const safeImages = images || [];
  return safeImages.map((img) => ({
    key: Date.now().toString() + Math.random(),
    uri: typeof img === "string" ? img : img.originalUrl,
  }));
}

export default function ProfileForm({
  profileData,
  onProfileChange,
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
    console.log(
      "[ProfileForm] profileData.images changed:",
      profileData.images
    );
    const wrappedImages = wrapImagesWithKeys(profileData.images);
    console.log("[ProfileForm] 🔍 DEBUG - wrappedImages:", wrappedImages);
    setImagesWithKeys(wrappedImages);
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

    // Check required dropdown fields
    const dropdownFields: (keyof Profile)[] = [
      "yearLevel",
      "major",
      "gender",
      "sexualOrientation",
    ];

    dropdownFields.forEach((field) => {
      if (!profileData[field] || profileData[field].toString().trim() === "") {
        const fieldName = field.replace(/([A-Z])/g, " $1").toLowerCase();
        errors.push(`Please select your ${fieldName}`);
      }
    });

    // Check text fields with character limits
    const textFields: {
      field: keyof Profile;
      maxLength: number;
      minLength: number;
      name: string;
    }[] = [
      { field: "firstName", maxLength: 50, minLength: 2, name: "first name" },
      { field: "aboutMe", maxLength: 300, minLength: 5, name: "about me" },
      {
        field: "q1",
        maxLength: 150,
        minLength: 5,
        name: "answer to 'This year, I really want to'",
      },
      {
        field: "q2",
        maxLength: 150,
        minLength: 5,
        name: "answer to 'Together we could'",
      },
      {
        field: "q3",
        maxLength: 150,
        minLength: 5,
        name: "answer to 'Favorite book, movie or song'",
      },
      {
        field: "q4",
        maxLength: 150,
        minLength: 5,
        name: "answer to 'I chose my major because'",
      },
      {
        field: "q5",
        maxLength: 150,
        minLength: 5,
        name: "answer to 'My favorite study spot is'",
      },
      {
        field: "q6",
        maxLength: 150,
        minLength: 5,
        name: "answer to 'Some of my hobbies are'",
      },
    ];

    textFields.forEach(({ field, maxLength, minLength, name }) => {
      const value = profileData[field]?.toString().trim() || "";

      if (value === "") {
        errors.push(`Please fill in your ${name}`);
      } else if (value.length < minLength) {
        errors.push(
          `Your ${name} must be at least ${minLength} characters long`
        );
      } else if (value.length > maxLength) {
        errors.push(`Your ${name} must be ${maxLength} characters or less`);
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

    // Update profileData.images before saving - save as string URLs
    const updatedProfile = {
      ...profileData,
      images: imagesWithKeys.map((img) => img.uri),
    };

    onProfileChange(updatedProfile);

    // Pass the updated profile to onSave so it has the latest images
    if (isAccountSetup) {
      // For account setup, we need to pass the images directly
      onSave(imagesWithKeys.map((img) => img.uri));
    } else {
      onSave(imagesWithKeys.map((img) => img.uri));
    }
  };

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

          <Text style={styles.firstLabel}>First Name (or Initial)</Text>
          <TextInput
            style={styles.input}
            placeholder="First name (or initial/nickname for extra privacy)"
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

          <View style={styles.genderContainer}>
            <View style={styles.genderField}>
              <Text style={styles.label}>Your Gender</Text>
              <GenderPicker
                value={profileData.gender || ""}
                onValueChange={(value) => handleChange("gender", value)}
                placeholder="Select gender"
                style={styles.genderPicker}
              />
            </View>
            <View style={styles.genderField}>
              <Text style={styles.label}>Sexual Orientation</Text>
              <GenderPicker
                value={profileData.sexualOrientation || ""}
                onValueChange={(value) =>
                  handleChange("sexualOrientation", value)
                }
                placeholder="Select orientation"
                style={styles.genderPicker}
                type="orientation"
              />
            </View>
          </View>

          <Text style={styles.label}>Year Level</Text>
          <DataPicker
            value={profileData.yearLevel || ""}
            onValueChange={(value) => handleChange("yearLevel", value)}
            placeholder="Select year level"
            type="yearLevel"
            style={styles.individualPicker}
          />

          <Text style={styles.label}>Major</Text>
          <DataPicker
            value={profileData.major || ""}
            onValueChange={(value) => handleChange("major", value)}
            placeholder="Select major"
            type="major"
            style={styles.individualPicker}
          />

          <View style={styles.labelContainer}>
            <Text style={styles.label}>About Me</Text>
            <Text style={styles.characterCount}>
              {profileData.aboutMe?.length || 0}/300
            </Text>
          </View>
          <TextInput
            style={[styles.input, styles.multilineInput]}
            placeholder="Tell us about yourself..."
            value={profileData.aboutMe}
            onChangeText={(text) => handleChange("aboutMe", text)}
            multiline
            numberOfLines={3}
          />

          <View style={styles.labelContainer}>
            <Text style={styles.label}>This year, I really want to</Text>
            <Text style={styles.characterCount}>
              {profileData.q1?.length || 0}/150
            </Text>
          </View>
          <TextInput
            style={[styles.input, styles.multilineInput]}
            placeholder="This year, I want to..."
            value={profileData.q1}
            onChangeText={(text) => handleChange("q1", text)}
            multiline
            numberOfLines={3}
          />

          <View style={styles.labelContainer}>
            <Text style={styles.label}>Together we could</Text>
            <Text style={styles.characterCount}>
              {profileData.q2?.length || 0}/150
            </Text>
          </View>
          <TextInput
            style={[styles.input, styles.multilineInput]}
            placeholder="We could..."
            value={profileData.q2}
            onChangeText={(text) => handleChange("q2", text)}
            multiline
            numberOfLines={3}
          />

          <View style={styles.labelContainer}>
            <Text style={styles.label}>Favorite book, movie or song</Text>
            <Text style={styles.characterCount}>
              {profileData.q3?.length || 0}/150
            </Text>
          </View>
          <TextInput
            style={[styles.input, styles.multilineInput]}
            placeholder="My favorite book/movie/song is..."
            value={profileData.q3}
            onChangeText={(text) => handleChange("q3", text)}
            multiline
            numberOfLines={3}
          />

          <View style={styles.labelContainer}>
            <Text style={styles.label}>I chose my major because...</Text>
            <Text style={styles.characterCount}>
              {profileData.q4?.length || 0}/150
            </Text>
          </View>
          <TextInput
            style={[styles.input, styles.multilineInput]}
            placeholder="I chose my major because..."
            value={profileData.q4}
            onChangeText={(text) => handleChange("q4", text)}
            multiline
            numberOfLines={3}
          />

          <View style={styles.labelContainer}>
            <Text style={styles.label}>My favorite study spot is</Text>
            <Text style={styles.characterCount}>
              {profileData.q5?.length || 0}/150
            </Text>
          </View>
          <TextInput
            style={[styles.input, styles.multilineInput]}
            placeholder="My favorite study spot is..."
            value={profileData.q5}
            onChangeText={(text) => handleChange("q5", text)}
            multiline
            numberOfLines={3}
          />

          <View style={styles.labelContainer}>
            <Text style={styles.label}>Some of my hobbies are</Text>
            <Text style={styles.characterCount}>
              {profileData.q6?.length || 0}/150
            </Text>
          </View>
          <TextInput
            style={[styles.input, styles.multilineInput]}
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
            {imagesWithKeys
              .filter(
                (image) =>
                  image.uri &&
                  typeof image.uri === "string" &&
                  image.uri.trim() !== ""
              )
              .map((image) => {
                console.log("[ProfileForm] 🔍 DEBUG - rendering image:", image);
                return (
                  <View key={image.key} style={styles.imageContainer}>
                    <View style={styles.imageBackground}>
                      <Image
                        source={getImageSource(image.uri)}
                        style={styles.image}
                        onError={(error) => {
                          console.log(
                            "[ProfileForm] 🔍 DEBUG - Image loading error:",
                            error
                          );
                        }}
                        onLoad={() => {
                          console.log(
                            "[ProfileForm] 🔍 DEBUG - Image loaded successfully"
                          );
                        }}
                        resizeMode="cover"
                        fadeDuration={0}
                      />
                    </View>
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
                );
              })}
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
  firstLabel: {
    fontSize: 16,
    color: Colors.primary500,
    marginBottom: 5,
    marginTop: 10,
  },
  input: {
    backgroundColor: Colors.secondary200,
    padding: 15,
    borderRadius: 8,
    marginBottom: 15,
    color: "gray",
    fontSize: 16,
  },
  imageContainer: {
    position: "relative",
    marginRight: 16,
    marginTop: 8,
    overflow: "visible",
  },
  imageBackground: {
    width: 100,
    height: 100,
    borderRadius: 10,
    backgroundColor: Colors.secondary200, // Light background for placeholder
    justifyContent: "center",
    alignItems: "center",
  },
  image: {
    width: 100,
    height: 100,
    borderRadius: 10,
    resizeMode: "cover", // Ensure image covers the background
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
  profileImagesTitle: {
    marginBottom: 8,
  },
  genderContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    marginBottom: 15,
  },
  genderField: {
    flex: 1,
    marginRight: 10,
  },
  genderPicker: {
    flex: 1,
  },
  individualPicker: {
    marginBottom: 15,
  },
  multilineInput: {
    height: 80,
    textAlignVertical: "top",
    paddingTop: 15,
  },
  characterCount: {
    fontSize: 12,
    color: Colors.primary500,
    textAlign: "right",
  },
  labelContainer: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    marginBottom: 5,
  },
});
