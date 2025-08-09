import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
  Platform,
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import Colors from "../constants/Colors";

interface DataPickerProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder: string;
  style?: any;
  type: "major" | "yearLevel";
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
  const slideAnim = useRef(new Animated.Value(screenHeight)).current;

  // Import data based on type
  const { yearLevels, majors } = require("../constants/Data");
  const options = type === "major" ? majors : yearLevels;

  useEffect(() => {
    if (modalVisible) {
      console.log("[DataPicker] Modal opening");
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 300,
        useNativeDriver: true,
      }).start();
    } else {
      console.log("[DataPicker] Modal closing");
      slideAnim.setValue(screenHeight);
    }
  }, [modalVisible, slideAnim]);

  return (
    <>
      <TouchableOpacity
        style={[styles.pickerButton, style]}
        onPress={() => {
          console.log("[DataPicker] Open pressed");
          setModalVisible(true);
        }}
      >
        <Text
          style={[
            styles.pickerText,
            !value ? styles.placeholderText : styles.selectedText,
          ]}
        >
          {value || placeholder}
        </Text>
        <Text style={styles.arrow}>▼</Text>
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="none"
        onRequestClose={() => setModalVisible(false)}
      >
        <TouchableOpacity
          style={[
            styles.modalOverlay,
            Platform.OS === "android" ? styles.debugOverlay : null,
          ]}
          activeOpacity={1}
          onPressIn={() => console.log("[DataPicker] Overlay press in")}
          onPress={() => {
            console.log("[DataPicker] Overlay pressed -> closing");
            setModalVisible(false);
          }}
        >
          <Animated.View
            style={[
              styles.modalContent,
              {
                transform: [{ translateY: slideAnim }],
              },
              Platform.OS === "android" ? styles.debugModalContent : null,
            ]}
            onLayout={(e) => {
              const { x, y, width, height } = e.nativeEvent.layout;
              console.log("[DataPicker] Modal content layout", {
                x,
                y,
                width,
                height,
              });
            }}
          >
            <TouchableOpacity
              activeOpacity={1}
              onPress={() =>
                console.log("[DataPicker] Inner container pressed")
              }
            >
              <View style={styles.modalHeader}>
                <TouchableOpacity
                  onPress={() => {
                    console.log("[DataPicker] Cancel pressed");
                    setModalVisible(false);
                  }}
                  style={styles.cancelButton}
                >
                  <Text style={styles.cancelText}>Cancel</Text>
                </TouchableOpacity>
                <Text style={styles.modalTitle}>Select Option</Text>
                <TouchableOpacity
                  onPress={() => {
                    console.log("[DataPicker] Done pressed");
                    setModalVisible(false);
                  }}
                  style={styles.doneButton}
                >
                  <Text style={styles.doneText}>Done</Text>
                </TouchableOpacity>
              </View>
              <View
                style={[
                  styles.pickerContainer,
                  Platform.OS === "android"
                    ? styles.debugPickerContainer
                    : null,
                ]}
                onLayout={(e) => {
                  const { x, y, width, height } = e.nativeEvent.layout;
                  console.log("[DataPicker] Picker container layout", {
                    x,
                    y,
                    width,
                    height,
                  });
                }}
              >
                <Picker
                  selectedValue={value}
                  onValueChange={(itemValue) => {
                    console.log("[DataPicker] onValueChange", itemValue);
                    if (itemValue) {
                      onValueChange(itemValue);
                    }
                  }}
                  style={[
                    styles.picker,
                    Platform.OS === "android" ? styles.debugPicker : null,
                  ]}
                  itemStyle={styles.pickerItem}
                  mode="dropdown"
                >
                  <Picker.Item label="Select..." value="" enabled={false} />
                  {options.map((option: string) => (
                    <Picker.Item
                      key={option}
                      label={option}
                      value={option}
                      color={Colors.primary500}
                    />
                  ))}
                </Picker>
              </View>
            </TouchableOpacity>
          </Animated.View>
        </TouchableOpacity>
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
  // Android visual debugging aids
  debugOverlay: {
    backgroundColor: "rgba(255, 0, 0, 0.25)",
  },
  debugModalContent: {
    backgroundColor: "rgba(0, 255, 0, 0.25)",
    borderWidth: 2,
    borderColor: "#00AA00",
  },
  debugPickerContainer: {
    backgroundColor: "rgba(0, 0, 255, 0.1)",
    borderWidth: 2,
    borderColor: "#0000FF",
  },
  debugPicker: {
    backgroundColor: "rgba(255, 255, 0, 0.25)",
    borderWidth: 2,
    borderColor: "#AAAA00",
  },
});
