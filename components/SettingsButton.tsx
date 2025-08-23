import React from "react";
import {
  View,
  Text,
  TouchableOpacity,
  Switch,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import Colors from "../constants/Colors";

interface SettingsButtonProps {
  icon: string;
  text: string;
  onPress?: () => void;
  switchProps?: {
    value: boolean;
    onValueChange: (value: boolean) => void;
    disabled?: boolean;
  };
  iconColor?: string;
  textColor?: string;
  backgroundColor?: string;
  isDestructive?: boolean;
  isLoading?: boolean;
  disabled?: boolean;
}

export default function SettingsButton({
  icon,
  text,
  onPress,
  switchProps,
  iconColor = Colors.primary500,
  textColor = Colors.primary500,
  backgroundColor = Colors.secondary200,
  isDestructive = false,
  isLoading = false,
  disabled = false,
}: SettingsButtonProps) {
  const finalIconColor = isDestructive ? "#FF3B30" : iconColor;
  const finalTextColor = isDestructive ? "#FF3B30" : textColor;

  if (switchProps) {
    return (
      <View style={[styles.button, { backgroundColor }]}>
        <Ionicons name={icon as any} size={20} color={finalIconColor} />
        <Text style={[styles.buttonText, { color: finalTextColor }]}>
          {text}
        </Text>
        <Switch
          value={switchProps.value}
          onValueChange={switchProps.onValueChange}
          disabled={switchProps.disabled}
          trackColor={{ false: Colors.primary500, true: Colors.primary500 }}
          thumbColor={Colors.secondary100}
          style={styles.switch}
        />
      </View>
    );
  }

  return (
    <TouchableOpacity
      style={[
        styles.button,
        { backgroundColor },
        (disabled || isLoading) && styles.disabledButton,
      ]}
      onPress={disabled || isLoading ? undefined : onPress}
      disabled={disabled || isLoading}
    >
      {isLoading ? (
        <ActivityIndicator size="small" color={finalIconColor} />
      ) : (
        <Ionicons name={icon as any} size={20} color={finalIconColor} />
      )}
      <Text
        style={[
          styles.buttonText,
          { color: finalTextColor },
          (disabled || isLoading) && styles.disabledText,
        ]}
      >
        {isLoading ? "Signing out..." : text}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  button: {
    flexDirection: "row",
    alignItems: "center",
    padding: 15,
    borderRadius: 8,
    marginBottom: 10,
  },
  disabledButton: {
    opacity: 0.6,
  },
  buttonText: {
    fontSize: 16,
    marginLeft: 10,
    flex: 1,
  },
  disabledText: {
    opacity: 0.8,
  },
  switch: {
    marginLeft: "auto",
  },
});
