import React from "react";
import { View, StyleSheet, ActivityIndicator, Text, Image } from "react-native";
import Colors from "../constants/Colors";

interface LoadingScreenProps {
  loadingText: string;
}

export default function LoadingScreen({ loadingText }: LoadingScreenProps) {
  return (
    <View style={styles.container}>
      <Image
        tintColor={Colors.primary500}
        source={require("../assets/logo.png")}
        style={styles.logo}
        resizeMode="contain"
      />
      <ActivityIndicator
        size="large"
        color={Colors.primary500}
        style={styles.spinner}
      />
      <Text style={styles.text}>{loadingText}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.secondary100,
    justifyContent: "center",
    alignItems: "center",
  },
  logo: {
    width: 120,
    height: 120,
    marginBottom: 20,
  },
  spinner: {
    marginBottom: 20,
  },
  text: {
    fontSize: 18,
    color: Colors.primary500,
    textAlign: "center",
  },
});
