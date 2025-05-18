import React, { useState, useEffect } from "react";
import {
  Image,
  ImageStyle,
  StyleSheet,
  ActivityIndicator,
  View,
} from "react-native";
import axios from "axios";
import { useAppContext } from "../context/AppContext";
import Colors from "../constants/Colors";

interface CachedImageProps {
  fileId: string;
  style?: ImageStyle;
  resizeMode?: "cover" | "contain" | "stretch" | "center";
}

const serverUrl = process.env.SERVER_URL;

export default function CachedImage({
  fileId,
  style,
  resizeMode = "cover",
}: CachedImageProps) {
  const [imageUri, setImageUri] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const { userId } = useAppContext();

  useEffect(() => {
    let isMounted = true;

    const fetchImage = async () => {
      try {
        setLoading(true);
        const response = await axios.get(
          `${serverUrl}/images/${fileId}?requestingUserId=${userId}`,
          { responseType: "json" }
        );

        if (isMounted && response.data.imageData) {
          setImageUri(response.data.imageData);
        }
      } catch (error) {
        console.error("Error fetching image:", error);
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    if (fileId) {
      fetchImage();
    }

    return () => {
      isMounted = false;
    };
  }, [fileId, userId]);

  if (loading) {
    return (
      <View style={[styles.loadingContainer, style]}>
        <ActivityIndicator size="small" color={Colors.primary500} />
      </View>
    );
  }

  if (!imageUri) {
    return (
      <View style={[styles.errorContainer, style]}>
        <Image
          source={require("../assets/images/placeholder.png")}
          style={[styles.placeholderImage, style]}
          resizeMode={resizeMode}
        />
      </View>
    );
  }

  return (
    <Image source={{ uri: imageUri }} style={style} resizeMode={resizeMode} />
  );
}

const styles = StyleSheet.create({
  loadingContainer: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.secondary200,
  },
  errorContainer: {
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.secondary200,
  },
  placeholderImage: {
    width: "100%",
    height: "100%",
  },
});
