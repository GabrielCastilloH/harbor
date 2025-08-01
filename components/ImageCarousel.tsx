import React, { useState, useRef } from "react";
import {
  View,
  Image,
  Pressable,
  StyleSheet,
  Dimensions,
  FlatList,
  Text,
} from "react-native";
import { BlurView } from "expo-blur";
import Colors from "../constants/Colors";

interface ImageItem {
  id: string;
  url: string;
  title?: string;
  blurLevel?: number;
}

interface ImageCarouselProps {
  images: ImageItem[];
  imageSize?: number;
  borderRadius?: number;
  spacing?: number;
  showIndicators?: boolean;
}

const ImageCarousel: React.FC<ImageCarouselProps> = ({
  images,
  imageSize = 340,
  borderRadius = 16,
  spacing = 20,
  showIndicators = true,
}) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  // Tap navigation
  const handleLeftTap = () => {
    if (currentIndex > 0) setCurrentIndex(currentIndex - 1);
  };
  const handleRightTap = () => {
    if (currentIndex < images.length - 1) setCurrentIndex(currentIndex + 1);
  };

  // Indicator
  const renderIndicator = () => {
    if (!showIndicators || images.length <= 1) return null;
    return (
      <View
        style={[
          styles.indicatorContainer,
          {
            width: imageSize - 32, // indicator is a bit narrower than the image
            left: "50%",
            transform: [{ translateX: -(imageSize - 32) / 2 }],
            top: 0,
          },
        ]}
      >
        {images.map((_, idx) => (
          <View
            key={idx}
            style={[
              styles.dot,
              {
                backgroundColor:
                  idx === currentIndex
                    ? Colors.primary500
                    : "rgba(255,255,255,0.7)",
                flex: 1,
                marginHorizontal: 4,
              },
            ]}
          />
        ))}
      </View>
    );
  };

  // Main render
  const current = images[currentIndex];
  return (
    <View
      style={{
        paddingTop: spacing,
        paddingBottom: spacing,
        paddingHorizontal: spacing,
        alignItems: "center",
        width: "100%",
      }}
    >
      {/* Indicator */}
      {renderIndicator()}

      {/* Image with shadow and tap areas */}
      <View
        style={[
          styles.shadowContainer,
          {
            width: imageSize,
            height: imageSize,
            borderRadius,
            marginTop: 24,
          },
        ]}
      >
        {/* Tap left */}
        <Pressable
          style={[
            styles.tapHalf,
            {
              left: 0,
              borderTopLeftRadius: borderRadius,
              borderBottomLeftRadius: borderRadius,
            },
          ]}
          onPress={handleLeftTap}
        />
        {/* Tap right */}
        <Pressable
          style={[
            styles.tapHalf,
            {
              right: 0,
              borderTopRightRadius: borderRadius,
              borderBottomRightRadius: borderRadius,
            },
          ]}
          onPress={handleRightTap}
        />

        {/* Image/Blur */}
        {current?.url ? (
          current.blurLevel && current.blurLevel > 0 ? (
            <BlurView
              intensity={current.blurLevel * 2}
              style={[
                StyleSheet.absoluteFill,
                { borderRadius, overflow: "hidden" },
              ]}
            >
              <Image
                source={{ uri: current.url }}
                style={{
                  width: imageSize,
                  height: imageSize,
                  borderRadius,
                }}
                resizeMode="cover"
              />
            </BlurView>
          ) : (
            <Image
              source={{ uri: current.url }}
              style={{
                width: imageSize,
                height: imageSize,
                borderRadius,
              }}
              resizeMode="cover"
            />
          )
        ) : (
          <View
            style={[
              StyleSheet.absoluteFill,
              {
                backgroundColor: "#eee",
                borderRadius,
                alignItems: "center",
                justifyContent: "center",
              },
            ]}
          >
            <Text style={{ color: "#888" }}>No Image</Text>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  shadowContainer: {
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.25,
    shadowRadius: 16,
    elevation: 16,
    backgroundColor: "#fff", // for iOS shadow
    overflow: "visible",
  },
  tapHalf: {
    position: "absolute",
    top: 0,
    width: "50%",
    height: "100%",
    zIndex: 2,
  },
  indicatorContainer: {
    position: "absolute",
    flexDirection: "row",
    height: 8,
    zIndex: 10,
    backgroundColor: "transparent",
    marginTop: 0,
    alignSelf: "center",
  },
  dot: {
    height: 4,
    borderRadius: 4,
  },
});

export default ImageCarousel;
