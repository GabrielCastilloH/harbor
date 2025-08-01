import React, { useState } from "react";
import {
  View,
  Image,
  FlatList,
  Text,
  Dimensions,
  Pressable,
  StyleSheet,
} from "react-native";
import { BlurView } from "expo-blur";
import Colors from "../constants/Colors";

// Types
interface ImageItem {
  id: string;
  url: string;
  title?: string;
  blurLevel?: number;
}

interface ImageCarouselProps {
  images: ImageItem[];
  imageHeight?: number;
  imageWidth?: number;
  borderRadius?: number;
  showIndicators?: boolean;
  onImagePress?: (image: ImageItem, index: number) => void;
}

const ImageCarousel: React.FC<ImageCarouselProps> = ({
  images,
  imageHeight = 340,
  imageWidth = 340,
  borderRadius = 12,
  showIndicators = true,
  onImagePress,
}) => {
  const windowWidth = Dimensions.get("window").width;
  const [currentIndex, setCurrentIndex] = useState(0);
  const flatListRef = React.useRef<FlatList>(null);

  const renderImageItem = ({
    item,
    index,
  }: {
    item: ImageItem;
    index: number;
  }) => {
    return (
      <View
        style={{
          width: windowWidth,
          alignItems: "center",
          justifyContent: "center",
        }}
      >
        {item.url && item.url.trim() !== "" ? (
          item.blurLevel && item.blurLevel > 0 ? (
            <BlurView
              intensity={item.blurLevel * 2}
              style={{
                height: imageHeight,
                width: imageWidth,
                borderRadius: borderRadius,
              }}
            >
              <Image
                source={{ uri: item.url }}
                style={{
                  height: imageHeight,
                  width: imageWidth,
                  borderRadius: borderRadius,
                }}
                className="rounded-xl"
                resizeMode="cover"
              />
            </BlurView>
          ) : (
            <Image
              source={{ uri: item.url }}
              style={{
                height: imageHeight,
                width: imageWidth,
                borderRadius: borderRadius,
              }}
              className="rounded-xl"
              resizeMode="cover"
            />
          )
        ) : (
          <View
            style={{
              height: imageHeight,
              width: imageWidth,
              borderRadius: borderRadius,
            }}
            className="rounded-xl bg-gray-200 items-center justify-center"
          >
            <Text className="text-gray-500 text-lg">No Image</Text>
          </View>
        )}
      </View>
    );
  };

  const handleScroll = (event: any) => {
    const index = Math.round(event.nativeEvent.contentOffset.x / windowWidth);
    setCurrentIndex(index);
  };

  const renderPageIndicator = () => {
    if (!showIndicators || images.length <= 1) return null;

    return (
      <View style={styles.pageIndicator}>
        {images.map((_, index) => (
          <View
            key={index}
            style={[styles.dot, currentIndex === index && styles.activeDot]}
          />
        ))}
      </View>
    );
  };

  const handleLeftTap = () => {
    if (currentIndex > 0) {
      const newIndex = currentIndex - 1;
      setCurrentIndex(newIndex);
      flatListRef.current?.scrollToIndex({
        index: newIndex,
        animated: true,
      });
    }
  };

  const handleRightTap = () => {
    if (currentIndex < images.length - 1) {
      const newIndex = currentIndex + 1;
      setCurrentIndex(newIndex);
      flatListRef.current?.scrollToIndex({
        index: newIndex,
        animated: true,
      });
    }
  };

  return (
    <View style={{ marginBottom: 20 }}>
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

        {/* Page indicator with shadow */}
        <View style={styles.pageIndicatorContainer}>
          {renderPageIndicator()}
        </View>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: "relative",
  },
  leftTapArea: {
    position: "absolute",
    left: 0,
    top: 0,
    width: 60,
    height: "100%",
    zIndex: 1,
  },
  rightTapArea: {
    position: "absolute",
    right: 0,
    top: 0,
    width: 60,
    height: "100%",
    zIndex: 1,
  },
  pageIndicatorContainer: {
    position: "absolute",
    top: 20,
    left: 0,
    right: 0,
    zIndex: 2,
    shadowColor: "#000",
    shadowOffset: {
      width: 0,
      height: 6,
    },
    shadowOpacity: 0.8,
    shadowRadius: 12,
    elevation: 15,
  },
  pageIndicator: {
    flexDirection: "row",
    justifyContent: "center",
    paddingHorizontal: 15,
    gap: 8,
  },
  dot: {
    width: "30%",
    height: 4,
    borderRadius: 4,
    backgroundColor: "rgba(255, 255, 255, 0.7)",
  },
  activeDot: {
    backgroundColor: Colors.primary500,
  },
});

export default ImageCarousel;
