import React from "react";
import { View, Text, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Colors from "../constants/Colors";

interface HeaderBackProps {
  title: string;
  onBack: () => void;
  onTitlePress?: () => void;
  rightIcon?: {
    name?: string;
    text?: string;
    textStyle?: any;
    onPress: () => void;
    disabled?: boolean;
  };
}

export default function HeaderBack({
  title,
  onBack,
  onTitlePress,
  rightIcon,
}: HeaderBackProps) {
  return (
    <SafeAreaView
      edges={["top"]}
      style={{ backgroundColor: Colors.primary100 }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "space-between",
          paddingTop: 8,
          paddingBottom: 12,
          paddingHorizontal: 16,
          backgroundColor: Colors.primary100,
        }}
      >
        <Pressable onPress={onBack} style={{ padding: 8 }}>
          <Ionicons name="arrow-back" size={24} color={Colors.primary500} />
        </Pressable>

        {onTitlePress ? (
          <Pressable onPress={onTitlePress}>
            <Text
              style={{
                fontSize: 18,
                fontWeight: "600",
                color: Colors.primary500,
              }}
            >
              {title}
            </Text>
          </Pressable>
        ) : (
          <Text
            style={{
              fontSize: 18,
              fontWeight: "600",
              color: Colors.primary500,
            }}
          >
            {title}
          </Text>
        )}

        {rightIcon ? (
          <Pressable
            onPress={rightIcon.disabled ? () => {} : rightIcon.onPress}
            style={{
              padding: 8,
              opacity: rightIcon.disabled ? 0.3 : 1,
            }}
            disabled={rightIcon.disabled}
          >
            {rightIcon.text ? (
              <Text style={rightIcon.textStyle}>{rightIcon.text}</Text>
            ) : (
              <Ionicons
                name={rightIcon.name as any}
                size={24}
                color={Colors.primary500}
              />
            )}
          </Pressable>
        ) : (
          <View style={{ width: 40 }} />
        )}
      </View>
    </SafeAreaView>
  );
}
