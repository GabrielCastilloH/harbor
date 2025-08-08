import React from "react";
import { View, Text } from "react-native";
import { SafeAreaView } from "react-native-safe-area-context";
import Colors from "../constants/Colors";

interface MainHeadingProps {
  title: string;
}

export default function MainHeading({ title }: MainHeadingProps) {
  return (
    <SafeAreaView
      edges={["top"]}
      style={{ backgroundColor: Colors.primary100 }}
    >
      <View
        style={{
          flexDirection: "row",
          alignItems: "center",
          justifyContent: "center",
          paddingTop: 12,
          paddingBottom: 12,
          paddingHorizontal: 16,
          backgroundColor: Colors.primary100,
        }}
      >
        <Text
          style={{
            fontSize: 24,
            fontWeight: "bold",
            color: Colors.primary500,
            textAlign: "center",
          }}
        >
          {title}
        </Text>
      </View>
    </SafeAreaView>
  );
}
