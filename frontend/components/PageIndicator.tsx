import React from 'react';
import { View, StyleSheet } from 'react-native';
import Colors from '../constants/Colors';

export interface PageIndicatorProps {
    currentView: number;
  }

export default function PageIndicator({ currentView }: PageIndicatorProps) {
  return (
    <View style={styles.pageIndicator}>
      <View style={[styles.dot, currentView === 0 && styles.activeDot]} />
      <View style={[styles.dot, currentView === 1 && styles.activeDot]} />
      <View style={[styles.dot, currentView === 2 && styles.activeDot]} />
    </View>
  );
}

const styles = StyleSheet.create({
  pageIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    paddingTop: 16,
    paddingHorizontal: 15,
    gap: 8,
  },
  dot: {
    width: '30%',
    height: 4,
    borderRadius: 4,
    backgroundColor: `${Colors.primary500}10`,
  },
  activeDot: {
    backgroundColor: `${Colors.primary500}99`,
  },
});