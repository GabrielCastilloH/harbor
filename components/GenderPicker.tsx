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
} from "react-native";
import { Picker } from "@react-native-picker/picker";
import Colors from "../constants/Colors";

interface GenderPickerProps {
  value: string;
  onValueChange: (value: string) => void;
  placeholder: string;
  style?: any;
}

const genderOptions = ["Male", "Female", "Non-Binary"];
const { height: screenHeight } = Dimensions.get("window");

export default function GenderPicker({
  value,
  onValueChange,
  placeholder,
  style,
}: GenderPickerProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const slideAnim = useRef(new Animated.Value(screenHeight)).current;

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

  return (
    <>
      <TouchableOpacity
        style={[styles.pickerButton, style]}
        onPress={() => setModalVisible(true)}
      >
        <Text style={[styles.pickerText, !value && styles.placeholderText]}>
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
        <View style={styles.modalOverlay}>
          <Animated.View
            style={[
              styles.modalContent,
              {
                transform: [{ translateY: slideAnim }],
              },
            ]}
          >
            <View style={styles.modalHeader}>
              <TouchableOpacity
                onPress={() => setModalVisible(false)}
                style={styles.cancelButton}
              >
                <Text style={styles.cancelText}>Cancel</Text>
              </TouchableOpacity>
              <Text style={styles.modalTitle}>Select {placeholder}</Text>
              <TouchableOpacity
                onPress={() => {
                  setModalVisible(false);
                }}
                style={styles.doneButton}
              >
                <Text style={styles.doneText}>Done</Text>
              </TouchableOpacity>
            </View>
            <View style={styles.pickerContainer}>
              <Picker
                selectedValue={value}
                onValueChange={(itemValue) => {
                  if (itemValue) {
                    onValueChange(itemValue);
                  }
                }}
                style={styles.picker}
                itemStyle={styles.pickerItem}
                mode="dropdown"
              >
                <Picker.Item label="Select..." value="" enabled={false} />
                {genderOptions.map((option) => (
                  <Picker.Item
                    key={option}
                    label={option}
                    value={option}
                    color={Colors.primary500}
                  />
                ))}
              </Picker>
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
    backgroundColor: Colors.secondary100,
    borderWidth: 1,
    borderColor: Colors.secondary500,
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 12,
    minHeight: 48,
  },
  pickerText: {
    fontSize: 16,
    color: Colors.primary500,
  },
  placeholderText: {
    color: Colors.secondary500,
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
    height: 350,
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
    height: 250,
    width: "100%",
  },
  pickerItem: {
    fontSize: 16,
    color: Colors.primary500,
  },
});
