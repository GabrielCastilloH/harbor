import React from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import Colors from '../constants/Colors';
import { Profile } from '../types/App';
import BasicInfoView from './BasicInfoView';
import AcademicView from './AcademicView';
import PersonalView from './PersonalView';

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
  return (
    <Animated.View
      style={[
        styles.cardStyle,
        isTopCard ? getCardStyle() : {},
        { zIndex: isTopCard ? 1 : 0 },
      ]}
      {...(isTopCard ? panHandlers : {})}
    >
      <View style={styles.contentContainer}>
        {currentView === 0 ? (
          <BasicInfoView profile={profile} currentView={currentView} />
        ) : currentView === 1 ? (
          <AcademicView profile={profile} currentView={currentView} />
        ) : (
          <PersonalView profile={profile} currentView={currentView} />
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
  },
});
