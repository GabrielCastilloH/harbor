import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "../constants/Colors";

interface PasswordInputProps {
  value: string;
  onChangeText: (text: string) => void;
  placeholder?: string;
  error?: string;
  onBlur?: () => void;
  showStrengthIndicator?: boolean;
  returnKeyType?: "done" | "go" | "next" | "search" | "send";
  onSubmitEditing?: () => void;
  editable?: boolean;
}

export default function PasswordInput({
  value,
  onChangeText,
  placeholder = "Enter your password",
  error,
  onBlur,
  showStrengthIndicator = false,
  returnKeyType = "done",
  onSubmitEditing,
  editable = true,
}: PasswordInputProps) {
  const [isFocused, setIsFocused] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const validatePassword = (
    password: string
  ): { isValid: boolean; errors: string[] } => {
    const errors: string[] = [];

    if (password.length < 8) {
      errors.push("At least 8 characters");
    }
    if (!/[A-Z]/.test(password)) {
      errors.push("One uppercase letter");
    }
    if (!/[a-z]/.test(password)) {
      errors.push("One lowercase letter");
    }
    if (!/\d/.test(password)) {
      errors.push("One number");
    }

    return {
      isValid: errors.length === 0,
      errors,
    };
  };

  const isValidPassword = value ? validatePassword(value).isValid : true;
  const showError = error || (value && !isValidPassword);

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
          secureTextEntry={!showPassword}
          autoCapitalize="none"
          autoCorrect={false}
          returnKeyType={returnKeyType}
          onSubmitEditing={onSubmitEditing}
          editable={editable}
          onFocus={() => setIsFocused(true)}
          onBlur={() => {
            setIsFocused(false);
            onBlur?.();
          }}
        />
        <TouchableOpacity
          style={styles.eyeButton}
          onPress={() => setShowPassword(!showPassword)}
          disabled={!editable}
        >
          <Ionicons
            name={showPassword ? "eye-off-outline" : "eye-outline"}
            size={20}
            color={!editable ? Colors.secondary500 : Colors.primary500}
          />
        </TouchableOpacity>
      </View>

      {showError && (
        <Text style={styles.errorText}>
          {error ||
            "Password must be at least 8 characters with uppercase, lowercase, and number"}
        </Text>
      )}

      {value && isValidPassword && !error && (
        <Text style={styles.successText}>✓ Password meets requirements</Text>
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
    height: 60, // Fixed height for consistency
    flexDirection: "row",
    alignItems: "center",
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
    flex: 1,
  },
  inputDisabled: {
    opacity: 0.6,
  },
  eyeButton: {
    padding: 4,
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
