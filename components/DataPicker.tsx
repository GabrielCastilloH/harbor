import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  Animated,
  Dimensions,
  Pressable,
  Alert,
  ScrollView,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import Colors from "../constants/Colors";
import { yearLevels, majors, genders, orientations } from "../constants/Data";

interface DataPickerProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder: string;
  style?: any;
  type: "major" | "yearLevel" | "gender" | "orientation";
}

const { height: screenHeight } = Dimensions.get("window");

export default function DataPicker({
  value,
  onValueChange,
  placeholder,
  style,
  type,
}: DataPickerProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [selectedValue, setSelectedValue] = useState(value || "");
  const [useFallback, setUseFallback] = useState(false);
  const slideAnim = useRef(new Animated.Value(screenHeight)).current;

  // Options based on type
  const options: string[] =
    type === "major"
      ? majors
      : type === "yearLevel"
      ? yearLevels
      : type === "gender"
      ? genders
      : orientations;

  // Update selectedValue when value prop changes
  useEffect(() => {
    setSelectedValue(value || "");
  }, [value]);

  useEffect(() => {
    if (modalVisible) {
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      slideAnim.setValue(screenHeight);
    }
  }, [modalVisible, slideAnim]);

  // Cleanup animation on unmount
  useEffect(() => {
    return () => {
      slideAnim.stopAnimation();
    };
  }, [slideAnim]);

  const handleOpenModal = () => {
    try {
      // Validate that we have options before opening
      if (!options || options.length === 0) {
        Alert.alert("Error", "No options available for selection.");
        return;
      }
      setModalVisible(true);
    } catch (error) {
      console.error("❌ [DATA PICKER] Error opening modal:", error);
      Alert.alert("Error", "Failed to open picker. Please try again.");
    }
  };

  const handleCloseModal = () => {
    try {
      setModalVisible(false);
    } catch (error) {
      console.error("❌ [DATA PICKER] Error closing modal:", error);
    }
  };

  const handleValueChange = (itemValue: string) => {
    try {
      if (itemValue) {
        setSelectedValue(itemValue);
        onValueChange(itemValue);
      }
    } catch (error) {
      console.error("❌ [DATA PICKER] Error changing value:", error);
      Alert.alert("Error", "Failed to update selection. Please try again.");
    }
  };

  const handleFallbackSelect = (option: string) => {
    handleValueChange(option);
    handleCloseModal();
  };

  const handlePickerError = () => {
    setUseFallback(true);
  };

  return (
    <>
      <TouchableOpacity
        style={[styles.pickerButton, style]}
        onPress={handleOpenModal}
        activeOpacity={0.7}
      >
        <Text
          style={[
            styles.pickerText,
            !selectedValue ? styles.placeholderText : styles.selectedText,
          ]}
        >
          {selectedValue || placeholder}
        </Text>
        <Text style={styles.arrow}>▼</Text>
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="none"
        onRequestClose={handleCloseModal}
      >
        <View style={styles.modalOverlay} pointerEvents="box-none">
          <Pressable style={styles.backdrop} onPress={handleCloseModal} />
          <Animated.View
            style={[
              styles.modalContent,
              { transform: [{ translateY: slideAnim }] },
            ]}
          >
            <View>
              <View style={styles.modalHeader}>
                <TouchableOpacity
                  onPress={handleCloseModal}
                  style={styles.cancelButton}
                  activeOpacity={0.7}
                >
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.modalTitle}>Select Option</Text>
                <TouchableOpacity
                  onPress={handleCloseModal}
                  style={styles.doneButton}
                  activeOpacity={0.7}
                >
                  <Text style={styles.doneText}>Done</Text>
                </TouchableOpacity>
              </View>

              {useFallback ? (
                // Fallback picker using ScrollView
                <ScrollView style={styles.fallbackContainer}>
                  {options && options.length > 0 ? (
                    options.map((option: string) => (
                      <TouchableOpacity
                        key={option}
                        style={[
                          styles.fallbackOption,
                          selectedValue === option &&
                            styles.fallbackOptionSelected,
                        ]}
                        onPress={() => handleFallbackSelect(option)}
                        activeOpacity={0.7}
                      >
                        <Text
                          style={[
                            styles.fallbackOptionText,
                            selectedValue === option &&
                              styles.fallbackOptionTextSelected,
                          ]}
                        >
                          {option}
                        </Text>
                      </TouchableOpacity>
                    ))
                  ) : (
                    <View style={styles.fallbackOption}>
                      <Text style={styles.fallbackOptionText}>
                        No options available
                      </Text>
                    </View>
                  )}
                </ScrollView>
              ) : (
                // Native Picker with error handling
                <View style={styles.pickerContainer}>
                  <Picker
                    selectedValue={selectedValue}
                    onValueChange={handleValueChange}
                    style={styles.picker}
                    itemStyle={styles.pickerItem}
                    mode="dropdown"
                  >
                    <Picker.Item label="Select..." value="" enabled={false} />
                    {options && options.length > 0 ? (
                      options.map((option: string) => (
                        <Picker.Item
                          key={option}
                          label={option}
                          value={option}
                          color={Colors.primary500}
                        />
                      ))
                    ) : (
                      <Picker.Item
                        label="No options available"
                        value=""
                        enabled={false}
                      />
                    )}
                  </Picker>
                </View>
              )}
            </View>
          </Animated.View>
        </View>
      </Modal>
    </>
  );
}

const styles = StyleSheet.create({
  pickerButton: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    backgroundColor: Colors.secondary200,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 48,
  },
  pickerText: {
    fontSize: 16,
    color: "gray",
  },
  placeholderText: {
    color: "gray",
    opacity: 0.7,
  },
  selectedText: {
    color: "gray",
    opacity: 1,
  },
  arrow: {
    fontSize: 12,
    color: Colors.primary500,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: "rgba(0, 0, 0, 0.5)",
    justifyContent: "flex-end",
  },
  backdrop: {
    ...StyleSheet.absoluteFillObject,
  },
  modalContent: {
    backgroundColor: Colors.secondary100,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    paddingBottom: 20,
    height: 300,
    zIndex: 1000,
    elevation: 12,
  },
  modalHeader: {
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: Colors.secondary200,
  },
  cancelButton: {
    padding: 8,
  },
  cancelText: {
    color: Colors.primary500,
    fontSize: 16,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: "bold",
    color: Colors.primary500,
  },
  doneButton: {
    padding: 8,
  },
  doneText: {
    color: Colors.primary500,
    fontSize: 16,
    fontWeight: "bold",
  },
  pickerContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  picker: {
    backgroundColor: Colors.secondary100,
    height: 180,
    width: "100%",
  },
  pickerItem: {
    fontSize: 16,
    color: "gray",
  },
  fallbackContainer: {
    flex: 1,
    paddingHorizontal: 20,
  },
  fallbackOption: {
    paddingVertical: 15,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
    borderBottomColor: Colors.secondary200,
  },
  fallbackOptionSelected: {
    backgroundColor: Colors.primary500,
    borderRadius: 8,
  },
  fallbackOptionText: {
    fontSize: 16,
    color: "gray",
  },
  fallbackOptionTextSelected: {
    color: Colors.secondary100,
    fontWeight: "bold",
  },
});
