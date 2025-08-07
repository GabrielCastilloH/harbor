import React from "react";
import { View, Text, Pressable } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import { Ionicons } from "@expo/vector-icons";
import Colors from "../constants/Colors";

interface HeaderBackProps {
  title: string;
  onBack: () => void;
}

export default function HeaderBack({ title, onBack }: HeaderBackProps) {
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
          paddingTop: 15,
          paddingBottom: 16,
          paddingHorizontal: 16,
          backgroundColor: Colors.primary100,
        }}
      >
        <Pressable onPress={onBack} style={{ padding: 8 }}>
          <Ionicons name="arrow-back" size={24} color={Colors.primary500} />
        </Pressable>
        <Text
          style={{
            fontSize: 18,
            fontWeight: "600",
            color: Colors.primary500,
          }}
        >
          {title}
        </Text>
        <View style={{ width: 40 }} />
      </View>
    </SafeAreaView>
  );
}
