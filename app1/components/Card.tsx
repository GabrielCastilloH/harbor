import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  Animated,
  Image,
  TouchableOpacity,
} from 'react-native';
import Colors from '../constants/Colors';
import { Profile } from '../types/App';
import BasicInfoView from './BasicInfoView';
import AcademicView from './AcademicView';
import PersonalView from './PersonalView';
import PageIndicator from './PageIndicator';
import { getImageSource } from '../util/imageUtils';

type CardProps = {
  profile: Profile;
  getCardStyle: () => any;
  panHandlers: any;
  isTopCard: boolean;
  currentView: number;
  setCurrentView: (view: number) => void;
};

export default function Card({
  profile,
  getCardStyle,
  panHandlers,
  isTopCard,
  currentView,
  setCurrentView,
}: CardProps) {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  // Handle cycling through profile images
  const nextImage = () => {
    if (profile.images && profile.images.length > 0) {
      setCurrentImageIndex((prev) => (prev + 1) % profile.images.length);
    }
  };

  return (
    <Animated.View
      style={[
        styles.cardStyle,
        isTopCard ? getCardStyle() : {},
        { zIndex: isTopCard ? 1 : 0 },
      ]}
      {...(isTopCard ? panHandlers : {})}
    >
      <PageIndicator currentView={currentView} />
      <View style={styles.contentContainer}>
        {currentView === 0 ? (
          <BasicInfoView profile={profile} />
        ) : currentView === 1 ? (
          <AcademicView profile={profile} />
        ) : (
          <PersonalView profile={profile} />
        )}

        {/* Display the current image from the profile's images array */}
        {profile.images && profile.images.length > 0 && (
          <TouchableOpacity onPress={nextImage} style={styles.imageContainer}>
            <Image
              source={getImageSource(profile.images[currentImageIndex])}
              style={styles.image}
              resizeMode="cover"
            />
          </TouchableOpacity>
        )}
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  cardStyle: {
    position: 'absolute',
    width: '92%',
    height: '92%',
    backgroundColor: Colors.secondary100,
    borderRadius: 24,
    marginHorizontal: '4%',
    marginVertical: 20,
    borderWidth: 3,
    borderColor: `${Colors.primary500}50`,
    overflow: 'hidden',
  },
  gradient: {
    position: 'absolute',
    left: 0,
    right: 0,
    top: 0,
    height: '100%',
  },
  contentContainer: {
    flex: 1,
    padding: 24,
  },
  imageContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: 10,
  },
  image: {
    width: 200,
    height: 200,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: Colors.primary500,
  },
});
