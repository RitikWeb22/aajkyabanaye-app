import React, { useEffect, useRef } from 'react';
import {
  Animated,
  StyleSheet,
  StyleProp,
  ViewStyle,
} from 'react-native';

export interface SkeletonProps {
  width?: number | `${number}%`;
  height?: number;
  borderRadius?: number;
  circle?: boolean;
  style?: StyleProp<ViewStyle>;
}

export function Skeleton({
  width = '100%',
  height = 20,
  borderRadius = 8,
  circle = false,
  style,
}: SkeletonProps) {
  const pulseAnim = useRef(new Animated.Value(0.3)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnim, {
          toValue: 0.85,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnim, {
          toValue: 0.3,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );
    animation.start();

    return () => animation.stop();
  }, [pulseAnim]);

  const computedRadius = circle && typeof height === 'number' ? height / 2 : borderRadius;
  const computedWidth = circle && typeof height === 'number' ? height : width;

  return (
    <Animated.View
      style={[
        styles.skeleton,
        {
          width: computedWidth,
          height,
          borderRadius: computedRadius,
          opacity: pulseAnim,
        },
        style,
      ]}
    />
  );
}

const styles = StyleSheet.create({
  skeleton: {
    backgroundColor: '#E5E1D8',
  },
});
