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
  const flatListRef = useRef<FlatList>(null);
  const windowWidth = Dimensions.get("window").width;

  const renderImageItem = ({ item }: { item: ImageItem }) => {
    return (
      <View
        style={{
          width: windowWidth,
          alignItems: "center",
          justifyContent: "center",
          paddingHorizontal: spacing,
          height: imageSize + 60,
          // backgroundColor: "red",
        }}
      >
        <View
          style={[
            styles.shadowContainer,
            {
              width: imageSize,
              height: imageSize,
              borderRadius,
            },
          ]}
        >
          {item?.url ? (
            item.blurLevel && item.blurLevel > 0 ? (
              <BlurView
                intensity={item.blurLevel * 2}
                style={[
                  StyleSheet.absoluteFill,
                  { borderRadius, overflow: "hidden" },
                ]}
              >
                <Image
                  source={{ uri: item.url }}
                  style={{
                    width: imageSize,
                    height: imageSize,
                    borderRadius,
                  }}
                  resizeMode="cover"
                  fadeDuration={0}
                />
              </BlurView>
            ) : (
              <Image
                source={{ uri: item.url }}
                style={{
                  width: imageSize,
                  height: imageSize,
                  borderRadius,
                }}
                resizeMode="cover"
                fadeDuration={0}
              />
            )
          ) : (
            <View
              style={[
                StyleSheet.absoluteFill,
                {
                  backgroundColor: "#f0f0f0",
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

  const handleScroll = (event: any) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / windowWidth);
    setCurrentIndex(index);
  };

  const handleLeftTap = () => {
    if (currentIndex > 0) {
      const newIndex = currentIndex - 1;
      setCurrentIndex(newIndex);
      flatListRef.current?.scrollToIndex({
        index: newIndex,
        animated: false,
      });
    }
  };

  const handleRightTap = () => {
    if (currentIndex < images.length - 1) {
      const newIndex = currentIndex + 1;
      setCurrentIndex(newIndex);
      flatListRef.current?.scrollToIndex({
        index: newIndex,
        animated: false,
      });
    }
  };

  return (
    <View
      style={{
        paddingTop: spacing,
        paddingBottom: spacing,
        width: "100%",
      }}
    >
      <View style={styles.container}>
        <FlatList
          ref={flatListRef}
          data={images}
          horizontal
          pagingEnabled
          showsHorizontalScrollIndicator={false}
          bounces={false}
          overScrollMode="never"
          keyExtractor={(item, index) => `${item.id}-${index}`}
          renderItem={renderImageItem}
          onScroll={handleScroll}
          scrollEventThrottle={16}
          scrollEnabled={false}
        />

        {/* Left tap area */}
        <Pressable style={styles.leftTapArea} onPress={handleLeftTap} />

        {/* Right tap area */}
        <Pressable style={styles.rightTapArea} onPress={handleRightTap} />

        {/* Page indicator */}
        {showIndicators && (
          <View
            style={[
              styles.pageIndicatorContainer,
              {
                top: 50,
                width: imageSize * 0.9,
                transform: [{ translateX: -(imageSize * 0.95) / 2 }],
              },
            ]}
          >
            <View style={[styles.pageIndicator, { width: imageSize * 0.95 }]}>
              {images.map((_, idx) => (
                <View
                  key={idx}
                  style={[styles.dot, idx === currentIndex && styles.activeDot]}
                />
              ))}
            </View>
          </View>
        )}
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "relative",
    overflow: "visible",
  },
  shadowContainer: {
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 12,
    backgroundColor: "#f0f0f0",
    overflow: "visible",
  },
  leftTapArea: {
    position: "absolute",
    left: 0,
    top: 0,
    width: "50%",
    height: "100%",
    zIndex: 1,
  },
  rightTapArea: {
    position: "absolute",
    right: 0,
    top: 0,
    width: "50%",
    height: "100%",
    zIndex: 1,
  },
  pageIndicatorContainer: {
    position: "absolute",
    left: "50%",
    zIndex: 2,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.9,
    shadowRadius: 12,
    elevation: 10,
  },
  pageIndicator: {
    flexDirection: "row",
    justifyContent: "center",
    paddingHorizontal: 20,
    gap: 8,
    width: 310,
  },
  dot: {
    width: "30%",
    height: 4,
    borderRadius: 4,
    backgroundColor: "rgba(220, 240, 245, 0.8)",
  },
  activeDot: {
    backgroundColor: Colors.primary500,
  },
});

export default ImageCarousel;
