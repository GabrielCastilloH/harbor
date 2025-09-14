import React from "react";
import { StyleSheet, FlatList, SafeAreaView } from "react-native";
import Post from "../components/Block";

const DUMMY_POSTS = Array.from({ length: 20 }, (_, i) => ({ id: `post-${i}` }));

const FeedScreen = () => {
  return (
    <SafeAreaView style={styles.container}>
      <FlatList
        data={DUMMY_POSTS}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => <Post />}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
  },
});

export default FeedScreen;
