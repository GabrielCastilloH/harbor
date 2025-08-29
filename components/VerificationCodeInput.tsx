import React, { useState, useRef, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  Dimensions,
  TouchableOpacity,
  Alert,
} from "react-native";
import * as Clipboard from "expo-clipboard";
import Colors from "../constants/Colors";

interface VerificationCodeInputProps {
  value: string;
  onChangeText: (text: string) => void;
  maxLength?: number;
}

const { width } = Dimensions.get("window");
const BOX_SIZE = Math.min(width * 0.12, 50); // Responsive box size
const BOX_SPACING = 8;

export default function VerificationCodeInput({
  value,
  onChangeText,
  maxLength = 6,
}: VerificationCodeInputProps) {
  const inputRef = useRef<TextInput>(null);
  const [isFocused, setIsFocused] = useState(false);

  const handlePress = () => {
    inputRef.current?.focus();
  };

  const handlePaste = async () => {
    try {
      const clipboardContent = await Clipboard.getStringAsync();
      if (clipboardContent) {
        // Extract only numbers from clipboard content
        const numericContent = clipboardContent.replace(/[^0-9]/g, "");

        if (numericContent.length >= maxLength) {
          // Take only the first maxLength digits
          const codeToPaste = numericContent.slice(0, maxLength);
          onChangeText(codeToPaste);
        } else if (numericContent.length > 0) {
          // If we have some numbers but not enough, just paste what we have
          onChangeText(numericContent);
        } else {
          Alert.alert(
            "No Code Found",
            "No verification code found in clipboard. Please copy the code from your email and try again."
          );
        }
      } else {
        Alert.alert(
          "No Code Found",
          "No verification code found in clipboard. Please copy the code from your email and try again."
        );
      }
    } catch (error) {
      console.error("Error pasting code:", error);
      Alert.alert(
        "Paste Error",
        "Failed to paste code. Please enter it manually."
      );
    }
  };

  const renderBoxes = () => {
    const boxes = [];
    for (let i = 0; i < maxLength; i++) {
      const digit = value[i] || "";
      const isActive = i === value.length && isFocused;

      boxes.push(
        <View
          key={i}
          style={[
            styles.box,
            digit ? styles.boxFilled : styles.boxEmpty,
            isActive && styles.boxActive,
          ]}
        >
          <Text
            style={[
              styles.boxText,
              digit ? styles.boxTextFilled : styles.boxTextEmpty,
            ]}
          >
            {digit}
          </Text>
        </View>
      );
    }
    return boxes;
  };

  return (
    <View style={styles.container}>
      <TextInput
        ref={inputRef}
        style={styles.hiddenInput}
        value={value}
        onChangeText={(text) => {
          // Only allow numbers and limit to maxLength
          const numericText = text.replace(/[^0-9]/g, "").slice(0, maxLength);
          onChangeText(numericText);
        }}
        keyboardType="number-pad"
        maxLength={maxLength}
        onFocus={() => setIsFocused(true)}
        onBlur={() => setIsFocused(false)}
        autoFocus={true}
        selectTextOnFocus={true}
      />

      <View style={styles.boxesContainer} onTouchEnd={handlePress}>
        {renderBoxes()}
      </View>

      <TouchableOpacity style={styles.pasteButton} onPress={handlePaste}>
        <Text style={styles.pasteButtonText}>📋 Paste Code</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    alignItems: "center",
    marginVertical: 20,
  },
  hiddenInput: {
    position: "absolute",
    opacity: 0,
    width: 1,
    height: 1,
  },
  boxesContainer: {
    flexDirection: "row",
    justifyContent: "center",
    alignItems: "center",
  },
  box: {
    width: BOX_SIZE,
    height: BOX_SIZE,
    borderRadius: 12,
    borderWidth: 2,
    justifyContent: "center",
    alignItems: "center",
    marginHorizontal: BOX_SPACING / 2,
  },
  boxEmpty: {
    borderColor: Colors.secondary500,
    backgroundColor: Colors.secondary100,
  },
  boxFilled: {
    borderColor: Colors.primary500,
    backgroundColor: Colors.primary100,
  },
  boxActive: {
    borderColor: Colors.primary500,
    backgroundColor: Colors.secondary100,
    borderWidth: 3,
  },
  boxText: {
    fontSize: 24,
    fontWeight: "bold",
    textAlign: "center",
  },
  boxTextEmpty: {
    color: Colors.secondary500,
  },
  boxTextFilled: {
    color: Colors.primary500,
  },
  pasteButton: {
    marginTop: 16,
    paddingVertical: 8,
    paddingHorizontal: 16,
    backgroundColor: Colors.primary100,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.primary500,
  },
  pasteButtonText: {
    color: Colors.primary500,
    fontSize: 14,
    fontWeight: "500",
  },
});
