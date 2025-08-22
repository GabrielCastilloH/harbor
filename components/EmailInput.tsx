import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import Colors from "../constants/Colors";

interface EmailInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  error?: string;
  onBlur?: () => void;
  autoCapitalize?: "none" | "sentences" | "words" | "characters";
  autoCorrect?: boolean;
  keyboardType?: "default" | "email-address" | "numeric" | "phone-pad";
  returnKeyType?: "done" | "go" | "next" | "search" | "send";
  onSubmitEditing?: () => void;
  editable?: boolean;
}

export default function EmailInput({
  value,
  onChangeText,
  placeholder = "Enter your Cornell email",
  error,
  onBlur,
  autoCapitalize = "none",
  autoCorrect = false,
  keyboardType = "email-address",
  returnKeyType = "next",
  onSubmitEditing,
  editable = true,
}: EmailInputProps) {
  const [isFocused, setIsFocused] = useState(false);

  const validateCornellEmail = (email: string): boolean => {
    // Reject emails with + symbols to prevent alias abuse
    if (email.includes("+")) {
      return false;
    }
    const emailRegex = /^[^\s@]+@cornell\.edu$/i;
    return emailRegex.test(email);
  };

  // Normalize email by removing + alias part
  const normalizeEmail = (email: string): string => {
    const [localPart, domain] = email.split("@");
    const normalizedLocalPart = localPart.split("+")[0]; // Remove everything after +
    return `${normalizedLocalPart}@${domain}`.toLowerCase();
  };

  const isValidEmail = value ? validateCornellEmail(value) : true;
  const showError = error || (value && !isValidEmail);

  return (
    <View style={styles.container}>
      <View
        style={[
          styles.inputContainer,
          isFocused && styles.inputContainerFocused,
          showError && styles.inputContainerError,
        ]}
      >
        <TextInput
          style={[styles.input, !editable && styles.inputDisabled]}
          value={value}
          onChangeText={onChangeText}
          placeholder={placeholder}
          placeholderTextColor={Colors.secondary500}
          autoCapitalize={autoCapitalize}
          autoCorrect={autoCorrect}
          keyboardType={keyboardType}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          editable={editable}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            setIsFocused(false);
            onBlur?.();
          }}
        />
      </View>
      {showError && (
        <Text style={styles.errorText}>
          {error ||
            (value && value.includes("+")
              ? "Email addresses with + symbols are not allowed"
              : "Please enter a valid Cornell email address")}
        </Text>
      )}
      {value && isValidEmail && !error && !value.includes("+") && (
        <Text style={styles.successText}>✓ Valid Cornell email</Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 16,
  },
  inputContainer: {
    borderWidth: 2,
    borderColor: Colors.secondary200,
    borderRadius: 12,
    backgroundColor: Colors.secondary100,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  inputContainerFocused: {
    borderColor: Colors.primary500,
    backgroundColor: Colors.primary100,
  },
  inputContainerError: {
    borderColor: Colors.red,
    backgroundColor: Colors.secondary100,
  },
  input: {
    fontSize: 16,
    color: Colors.black,
    fontWeight: "500",
  },
  inputDisabled: {
    opacity: 0.6,
  },
  errorText: {
    color: Colors.red,
    fontSize: 14,
    marginTop: 4,
    marginLeft: 4,
  },
  successText: {
    color: Colors.green,
    fontSize: 14,
    marginTop: 4,
    marginLeft: 4,
  },
});
