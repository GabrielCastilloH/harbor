import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  StyleSheet,
  TouchableOpacity,
} from "react-native";
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

  const validatePassword = (password: string): { isValid: boolean; errors: string[] } => {
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
      errors
    };
  };

  const getPasswordStrength = (password: string): { strength: string; color: string } => {
    if (!password) return { strength: "", color: Colors.secondary500 };
    
    const validation = validatePassword(password);
    const hasLength = password.length >= 8;
    const hasUpper = /[A-Z]/.test(password);
    const hasLower = /[a-z]/.test(password);
    const hasNumber = /\d/.test(password);
    
    const criteria = [hasLength, hasUpper, hasLower, hasNumber];
    const metCriteria = criteria.filter(Boolean).length;
    
    if (metCriteria === 0) return { strength: "Very Weak", color: Colors.red };
    if (metCriteria === 1) return { strength: "Weak", color: Colors.red };
    if (metCriteria === 2) return { strength: "Fair", color: Colors.secondary500 };
    if (metCriteria === 3) return { strength: "Good", color: Colors.green };
    if (metCriteria === 4) return { strength: "Strong", color: Colors.green };
    
    return { strength: "", color: Colors.secondary500 };
  };

  const isValidPassword = value ? validatePassword(value).isValid : true;
  const showError = error || (value && !isValidPassword);
  const { strength, color } = getPasswordStrength(value);

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
          style={[
            styles.input,
            !editable && styles.inputDisabled,
          ]}
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
          <Text style={styles.eyeButtonText}>
            {showPassword ? "🙈" : "👁️"}
          </Text>
        </TouchableOpacity>
      </View>
      
      {showStrengthIndicator && value && (
        <View style={styles.strengthContainer}>
          <Text style={[styles.strengthText, { color }]}>
            Password strength: {strength}
          </Text>
        </View>
      )}
      
      {showError && (
        <Text style={styles.errorText}>
          {error || "Password must be at least 8 characters with uppercase, lowercase, and number"}
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
  eyeButtonText: {
    fontSize: 20,
  },
  strengthContainer: {
    marginTop: 4,
    marginLeft: 4,
  },
  strengthText: {
    fontSize: 14,
    fontWeight: "500",
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
