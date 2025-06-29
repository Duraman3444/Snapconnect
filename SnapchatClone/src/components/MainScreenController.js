import React, { useState, useEffect } from 'react';
import { View, Text, ActivityIndicator } from 'react-native';
import { useAuth } from '../context/SupabaseAuthContext';
import { useTheme } from '../context/ThemeContext';
import { checkTutorialCompleted } from '../utils/tutorialUtils';
import TutorialScreen from '../screens/TutorialScreen';
import CameraScreen from '../screens/CameraScreen';

export default function MainScreenController({ navigation }) {
  const { currentUser } = useAuth();
  const { currentTheme } = useTheme();
  const [loading, setLoading] = useState(true);
  const [showTutorial, setShowTutorial] = useState(false);

  useEffect(() => {
    checkInitialScreen();
  }, [currentUser]);

  const checkInitialScreen = async () => {
    try {
      if (!currentUser) {
        setLoading(false);
        return;
      }

      const tutorialCompleted = await checkTutorialCompleted(currentUser.id);
      
      // Show tutorial if not completed
      setShowTutorial(!tutorialCompleted);
      
    } catch (error) {
      console.error('Error checking initial screen:', error);
      // Default to showing tutorial if there's an error
      setShowTutorial(true);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <View style={{ 
        flex: 1, 
        justifyContent: 'center', 
        alignItems: 'center', 
        backgroundColor: currentTheme.background 
      }}>
        <ActivityIndicator size="large" color={currentTheme.primary} />
        <Text style={{ 
          color: currentTheme.text, 
          marginTop: 16, 
          fontSize: 16 
        }}>
          Getting things ready...
        </Text>
        <Text style={{ 
          color: currentTheme.textSecondary, 
          marginTop: 8, 
          fontSize: 14 
        }}>
          🤖 Preparing your AI assistant
        </Text>
      </View>
    );
  }

  if (showTutorial) {
    return (
      <TutorialScreen 
        navigation={navigation} 
        route={{ params: { fromSignup: true } }}
      />
    );
  }

  return <CameraScreen navigation={navigation} />;
} 