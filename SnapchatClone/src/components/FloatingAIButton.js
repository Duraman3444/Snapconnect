import React, { useState, useEffect } from 'react';
import { TouchableOpacity, StyleSheet, Animated, Dimensions } from 'react-native';
import { useTheme } from '../context/ThemeContext';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

export default function FloatingAIButton({ onPress, visible = true }) {
  const { currentTheme } = useTheme();
  const [scaleAnimation] = useState(new Animated.Value(1));
  const [glowAnimation] = useState(new Animated.Value(0));

  useEffect(() => {
    // Attention-grabbing pulse animation
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(scaleAnimation, {
          toValue: 1.1,
          duration: 800,
          useNativeDriver: true,
        }),
        Animated.timing(scaleAnimation, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        }),
      ])
    );

    // Glow effect
    const glow = Animated.loop(
      Animated.sequence([
        Animated.timing(glowAnimation, {
          toValue: 1,
          duration: 1500,
          useNativeDriver: true,
        }),
        Animated.timing(glowAnimation, {
          toValue: 0,
          duration: 1500,
          useNativeDriver: true,
        }),
      ])
    );

    pulse.start();
    glow.start();

    return () => {
      pulse.stop();
      glow.stop();
    };
  }, []);

  if (!visible) return null;

  const glowColor = glowAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: ['rgba(74, 144, 226, 0.3)', 'rgba(74, 144, 226, 0.8)'],
  });

  const styles = StyleSheet.create({
    container: {
      position: 'absolute',
      bottom: 100,
      right: 20,
      zIndex: 1000,
      shadowColor: '#4A90E2',
      shadowOffset: { width: 0, height: 4 },
      shadowOpacity: 0.6,
      shadowRadius: 8,
      elevation: 12,
    },
    button: {
      width: 65,
      height: 65,
      borderRadius: 32.5,
      backgroundColor: '#4A90E2',
      justifyContent: 'center',
      alignItems: 'center',
      shadowOffset: { width: 0, height: 2 },
      shadowOpacity: 0.8,
      shadowRadius: 4,
      elevation: 8,
    },
    glowEffect: {
      position: 'absolute',
      width: 80,
      height: 80,
      borderRadius: 40,
      top: -7.5,
      left: -7.5,
      borderWidth: 2,
    },
    emoji: {
      fontSize: 28,
    },
  });

  return (
    <Animated.View 
      style={[
        styles.container,
        { transform: [{ scale: scaleAnimation }] }
      ]}
    >
      <Animated.View 
        style={[
          styles.glowEffect,
          { borderColor: glowColor }
        ]}
      />
      <TouchableOpacity
        style={styles.button}
        onPress={onPress}
        activeOpacity={0.8}
      >
        <Animated.Text style={styles.emoji}>🤖</Animated.Text>
      </TouchableOpacity>
    </Animated.View>
  );
} 