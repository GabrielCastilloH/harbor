import React, { useState } from "react";
import { View, Image, FlatList, Text, Dimensions } from "react-native";
import { BlurView } from "expo-blur";

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

  const renderScrollIndicator = () => {
    if (!showIndicators || images.length <= 1) return null;

    return (
      <View
        style={{
          position: "absolute",
          bottom: 20,
          left: "50%",
          transform: [{ translateX: -50 }],
          borderRadius: 12,
          overflow: "hidden",
        }}
      >
        <BlurView
          intensity={50}
          tint="light"
          style={{ paddingHorizontal: 16, paddingVertical: 8 }}
        >
          <View
            style={{
              flexDirection: "row",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            {images.map((_, index) => (
              <View
                key={index}
                style={{
                  height: 8,
                  width: 8,
                  borderRadius: 4,
                  marginHorizontal: 4,
                  backgroundColor: "black",
                  opacity: index === currentIndex ? 1 : 0.3,
                }}
              />
            ))}
          </View>
        </BlurView>
      </View>
    );
  };

  return (
    <View className="relative">
      <FlatList
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
        className="mb-4"
      />
      {renderScrollIndicator()}
    </View>
  );
};

export default ImageCarousel;
