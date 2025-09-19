import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
} from "react-native";
import { useNavigation } from "@react-navigation/native";
import Ionicons from "@expo/vector-icons/Ionicons";
import Colors from "../constants/Colors";
import { useAppContext } from "../context/AppContext";
import { UserService } from "../networking/UserService";
import HeaderBack from "../components/HeaderBack";

export default function GroupSizeScreen() {
  const navigation = useNavigation();
  const { userId } = useAppContext();
  const [selectedSize, setSelectedSize] = useState<number>(2);
  const [currentGroupSize, setCurrentGroupSize] = useState<number>(2);
  const [isLoading, setIsLoading] = useState(true);
  const [isUpdating, setIsUpdating] = useState(false);

  useEffect(() => {
    fetchCurrentGroupSize();
  }, []);

  const fetchCurrentGroupSize = async () => {
    if (!userId) return;

    try {
      setIsLoading(true);
      const userData = await UserService.getUserById(userId);
      const groupSize = userData.user?.groupSize || 2;
      setCurrentGroupSize(groupSize);
      setSelectedSize(groupSize);
    } catch (error) {
      console.error("Error fetching group size:", error);
      Alert.alert("Error", "Failed to load current group size");
    } finally {
      setIsLoading(false);
    }
  };

  const handleSizeSelection = (size: number) => {
    setSelectedSize(size);
  };

  const handleSave = async () => {
    if (selectedSize === currentGroupSize) {
      navigation.goBack();
      return;
    }

    if (!userId) return;

    try {
      setIsUpdating(true);
      await UserService.updateGroupSize(userId, selectedSize);
      setCurrentGroupSize(selectedSize);
      Alert.alert("Success", "Group size updated successfully", [
        {
          text: "OK",
          onPress: () => navigation.goBack(),
        },
      ]);
    } catch (error) {
      console.error("Error updating group size:", error);
      Alert.alert("Error", "Failed to update group size. Please try again.");
    } finally {
      setIsUpdating(false);
    }
  };

  const groupSizeOptions = [
    {
      value: 2,
      label: "2 People",
      description: "Traditional one-on-one matching",
    },
    { value: 3, label: "3 People", description: "Small group connections" },
    { value: 4, label: "4 People", description: "Larger group experiences" },
  ];

  const handleBack = () => {
    navigation.goBack();
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <HeaderBack title="Group Size" onBack={handleBack} />
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color={Colors.primary500} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <HeaderBack title="Group Size" onBack={handleBack} />

      <View style={styles.content}>
        <Text style={styles.description}>
          Choose your preferred group size for matching. This determines how
          many people will be in your matches.
        </Text>

        <View style={styles.optionsContainer}>
          {groupSizeOptions.map((option) => (
            <TouchableOpacity
              key={option.value}
              style={[
                styles.optionButton,
                selectedSize === option.value && styles.selectedOption,
              ]}
              onPress={() => handleSizeSelection(option.value)}
              disabled={isUpdating}
            >
              <View style={styles.optionContent}>
                <View style={styles.radioContainer}>
                  <View
                    style={[
                      styles.radioOuter,
                      selectedSize === option.value &&
                        styles.radioOuterSelected,
                    ]}
                  >
                    {selectedSize === option.value && (
                      <View style={styles.radioInner} />
                    )}
                  </View>
                </View>

                <View style={styles.textContainer}>
                  <Text
                    style={[
                      styles.optionLabel,
                      selectedSize === option.value &&
                        styles.selectedOptionLabel,
                    ]}
                  >
                    {option.label}
                  </Text>
                  <Text
                    style={[
                      styles.optionDescription,
                      selectedSize === option.value &&
                        styles.selectedOptionDescription,
                    ]}
                  >
                    {option.description}
                  </Text>
                </View>
              </View>
            </TouchableOpacity>
          ))}
        </View>

        <View style={styles.buttonContainer}>
          <TouchableOpacity
            style={[styles.saveButton, isUpdating && styles.disabledButton]}
            onPress={handleSave}
            disabled={isUpdating}
          >
            {isUpdating ? (
              <ActivityIndicator size="small" color={Colors.secondary100} />
            ) : (
              <Text style={styles.saveButtonText}>Save Changes</Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.secondary100,
  },
  content: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: Colors.primary500,
  },
  description: {
    fontSize: 16,
    color: Colors.primary500,
    marginBottom: 30,
    lineHeight: 22,
  },
  optionsContainer: {
    marginBottom: 40,
  },
  optionButton: {
    backgroundColor: Colors.secondary200,
    borderRadius: 12,
    padding: 20,
    marginBottom: 12,
    borderWidth: 2,
    borderColor: "transparent",
  },
  selectedOption: {
    backgroundColor: Colors.primary100,
    borderColor: Colors.primary500,
  },
  optionContent: {
    flexDirection: "row", // Align children in a row
    alignItems: "center", // Center items vertically
  },
  radioContainer: {
    marginRight: 12,
  },
  radioOuter: {
    width: 20,
    height: 20,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.primary500,
    justifyContent: "center",
    alignItems: "center",
  },
  radioOuterSelected: {
    borderColor: Colors.primary500,
  },
  radioInner: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: Colors.primary500,
  },
  textContainer: {
    flex: 1, // Allow text to take up remaining space
  },
  optionLabel: {
    fontSize: 18,
    fontWeight: "600",
    color: Colors.primary500,
    marginBottom: 4, // Add some space between label and description
  },
  selectedOptionLabel: {
    color: Colors.primary500,
  },
  optionDescription: {
    fontSize: 14,
    color: Colors.secondary800,
  },
  selectedOptionDescription: {
    color: Colors.primary500,
  },
  buttonContainer: {
    paddingBottom: 20,
  },
  saveButton: {
    backgroundColor: Colors.primary500,
    borderRadius: 12,
    paddingVertical: 16,
    alignItems: "center",
    justifyContent: "center",
  },
  disabledButton: {
    opacity: 0.6,
  },
  saveButtonText: {
    color: Colors.secondary100,
    fontSize: 16,
    fontWeight: "600",
  },
});
