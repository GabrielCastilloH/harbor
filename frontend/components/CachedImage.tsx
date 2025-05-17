import React, { useState, useEffect } from "react";
import {
  Image,
  ImageProps,
  ActivityIndicator,
  View,
  StyleSheet,
} from "react-native";
import axios from "axios";
import * as FileSystem from "expo-file-system";
import Colors from "../constants/Colors";

const serverUrl = process.env.SERVER_URL;

interface CachedImageProps extends Omit<ImageProps, "source"> {
  fileId: string;
}

export default function CachedImage({
  fileId,
  style,
  ...props
}: CachedImageProps) {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let isMounted = true;

    const loadImage = async () => {
      if (!fileId) {
        setLoading(false);
        return;
      }

      try {
        // Check if image is cached
        const cacheFile = `${FileSystem.cacheDirectory}${fileId}.jpg`;
        const metadata = await FileSystem.getInfoAsync(cacheFile);

        if (metadata.exists) {
          // Use cached image
          setImageUri(`file://${cacheFile}`);
          setLoading(false);
        } else {
          // Fetch image from backend
          const response = await axios.get(`${serverUrl}/images/${fileId}`);
          const imageData = response.data.imageData;

          // Save to cache
          await FileSystem.writeAsStringAsync(
            cacheFile,
            imageData.split(",")[1],
            {
              encoding: FileSystem.EncodingType.Base64,
            }
          );

          if (isMounted) {
            setImageUri(`file://${cacheFile}`);
            setLoading(false);
          }
        }
      } catch (error) {
        console.error("Error loading image:", error);
        setLoading(false);
      }
    };

    loadImage();

    return () => {
      isMounted = false;
    };
  }, [fileId]);

  if (loading) {
    return (
      <View style={[styles.loadingContainer, style]}>
        <ActivityIndicator color={Colors.primary500} />
      </View>
    );
  }

  if (!imageUri) {
    return (
      <View style={[styles.errorContainer, style]}>
        <Image
          source={require("../assets/images/placeholder.png")}
          style={[styles.placeholderImage, style]}
        />
      </View>
    );
  }

  return <Image source={{ uri: imageUri }} style={style} {...props} />;
}

const styles = StyleSheet.create({
  loadingContainer: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.primary100,
  },
  errorContainer: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.primary100,
  },
  placeholderImage: {
    width: "100%",
    height: "100%",
    resizeMode: "cover",
  },
});
