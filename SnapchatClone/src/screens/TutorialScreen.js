import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  ScrollView,
  Animated,
  Dimensions,
  StyleSheet,
  Modal,
  Alert
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useTheme } from '../context/ThemeContext';
import { useAuth } from '../context/SupabaseAuthContext';
import { markTutorialCompleted } from '../utils/tutorialUtils';

const { width: screenWidth, height: screenHeight } = Dimensions.get('window');

const tutorialSteps = [
  {
    id: 1,
    title: "Welcome to SnapConnect! 🎓",
    subtitle: "Your AI-Powered College Companion",
    description: "SnapConnect uses advanced AI to help you succeed academically and build meaningful connections on campus.",
    emoji: "🤖",
    features: [
      "AI-powered study buddy matching",
      "Smart caption generation", 
      "Personalized campus event discovery",
      "Intelligent conversation starters"
    ]
  },
  {
    id: 2,
    title: "Meet Your AI Assistant 🧠",
    subtitle: "12 Intelligent Functions at Your Service",
    description: "Our AI assistant follows you throughout the app, providing contextual help and personalized recommendations.",
    emoji: "✨",
    features: [
      "Smart study group formation",
      "Campus location recommendations",
      "Content idea generation",
      "Academic success tips"
    ]
  },
  {
    id: 3,
    title: "AI-Enhanced Camera 📸",
    subtitle: "Smart Photo Captions & More",
    description: "Take photos and let AI generate perfect captions that understand your major, interests, and current context.",
    emoji: "📱",
    features: [
      "Context-aware captions",
      "Multiple caption styles",
      "Time-sensitive suggestions",
      "Academic-focused content"
    ]
  },
  {
    id: 4,
    title: "Smart Social Features 💬",
    subtitle: "AI-Powered Connections",
    description: "Find study partners, join relevant groups, and get conversation starters based on your courses and interests.",
    emoji: "🤝",
    features: [
      "Study buddy matching",
      "Course-based connections",
      "Smart message suggestions",
      "Academic group discovery"
    ]
  },
  {
    id: 5,
    title: "Campus Life Intelligence 🏫",
    subtitle: "Personalized Campus Experience", 
    description: "Discover events, find study spots, and get recommendations tailored to your academic schedule and interests.",
    emoji: "🎯",
    features: [
      "Event discovery & matching",
      "Study location suggestions",
      "Academic calendar integration",
      "Campus resource finder"
    ]
  },
  {
    id: 6,
    title: "Ready to Get Started! 🚀",
    subtitle: "Your AI Assistant Awaits",
    description: "Look for the glowing AI button throughout the app - it's your gateway to personalized assistance anytime.",
    emoji: "🌟",
    features: [
      "Universal AI access",
      "Context-aware help",
      "Real-time recommendations",
      "Academic success support"
    ]
  }
];

export default function TutorialScreen({ navigation, route }) {
  const [currentStep, setCurrentStep] = useState(0);
  const [showAIDemo, setShowAIDemo] = useState(false);
  const { currentTheme } = useTheme();
  const { currentUser } = useAuth();
  const slideAnimation = useRef(new Animated.Value(0)).current;
  const fadeAnimation = useRef(new Animated.Value(0)).current;
  const pulseAnimation = useRef(new Animated.Value(1)).current;
  
  const isFromSignup = route?.params?.fromSignup || false;

  useEffect(() => {
    // Entrance animation
    Animated.parallel([
      Animated.timing(slideAnimation, {
        toValue: 1,
        duration: 800,
        useNativeDriver: true,
      }),
      Animated.timing(fadeAnimation, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: true,
      })
    ]).start();

    // Pulse animation for AI button
    const pulse = Animated.loop(
      Animated.sequence([
        Animated.timing(pulseAnimation, {
          toValue: 1.1,
          duration: 1000,
          useNativeDriver: true,
        }),
        Animated.timing(pulseAnimation, {
          toValue: 1,
          duration: 1000,
          useNativeDriver: true,
        }),
      ])
    );
    pulse.start();

    return () => pulse.stop();
  }, [currentStep]);

  const handleNext = () => {
    if (currentStep < tutorialSteps.length - 1) {
      setCurrentStep(currentStep + 1);
      // Reset and restart animations
      slideAnimation.setValue(0);
      fadeAnimation.setValue(0);
      Animated.parallel([
        Animated.timing(slideAnimation, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnimation, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        })
      ]).start();
    } else {
      handleComplete();
    }
  };

  const handlePrevious = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
      slideAnimation.setValue(0);
      fadeAnimation.setValue(0);
      Animated.parallel([
        Animated.timing(slideAnimation, {
          toValue: 1,
          duration: 600,
          useNativeDriver: true,
        }),
        Animated.timing(fadeAnimation, {
          toValue: 1,
          duration: 800,
          useNativeDriver: true,
        })
      ]).start();
    }
  };

  const handleSkip = () => {
    Alert.alert(
      "Skip Tutorial?",
      "You can always access this tutorial later from your profile settings.",
      [
        { text: "Continue Tutorial", style: "cancel" },
        { text: "Skip", onPress: handleComplete }
      ]
    );
  };

  const handleComplete = async () => {
    try {
      // Mark tutorial as completed for this user
      await markTutorialCompleted(currentUser?.id);
      console.log('Tutorial marked as completed');
      
      if (isFromSignup) {
        navigation.navigate('Camera');
      } else {
        navigation.goBack();
      }
    } catch (error) {
      console.error('Error saving tutorial completion:', error);
      // Still navigate even if we can't save the preference
      if (isFromSignup) {
        navigation.navigate('Camera');
      } else {
        navigation.goBack();
      }
    }
  };

  const showAIButtonDemo = () => {
    setShowAIDemo(true);
  };

  const step = tutorialSteps[currentStep];
  const progress = ((currentStep + 1) / tutorialSteps.length) * 100;

  const slideTransform = slideAnimation.interpolate({
    inputRange: [0, 1],
    outputRange: [50, 0],
  });

  return (
    <View style={[styles.container, { backgroundColor: currentTheme.background }]}>
      {/* Header with Progress */}
      <View style={[styles.header, { borderBottomColor: currentTheme.border }]}>
        <View style={styles.headerContent}>
          <TouchableOpacity onPress={handleSkip} style={styles.skipButton}>
            <Text style={[styles.skipText, { color: currentTheme.textSecondary }]}>
              Skip
            </Text>
          </TouchableOpacity>
          
          <View style={styles.progressContainer}>
            <View style={[styles.progressBar, { backgroundColor: currentTheme.border }]}>
              <Animated.View 
                style={[
                  styles.progressFill, 
                  { 
                    backgroundColor: currentTheme.primary,
                    width: `${progress}%`
                  }
                ]} 
              />
            </View>
            <Text style={[styles.progressText, { color: currentTheme.textSecondary }]}>
              {currentStep + 1} of {tutorialSteps.length}
            </Text>
          </View>

          <View style={{ width: 60 }} />
        </View>
      </View>

      {/* Main Content */}
      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        <Animated.View 
          style={[
            styles.stepContainer,
            {
              opacity: fadeAnimation,
              transform: [{ translateY: slideTransform }]
            }
          ]}
        >
          {/* Main Icon */}
          <View style={styles.iconContainer}>
            <Animated.Text 
              style={[
                styles.mainIcon,
                { transform: [{ scale: pulseAnimation }] }
              ]}
            >
              {step.emoji}
            </Animated.Text>
          </View>

          {/* Title and Subtitle */}
          <Text style={[styles.title, { color: currentTheme.primary }]}>
            {step.title}
          </Text>
          <Text style={[styles.subtitle, { color: currentTheme.accent }]}>
            {step.subtitle}
          </Text>

          {/* Description */}
          <Text style={[styles.description, { color: currentTheme.text }]}>
            {step.description}
          </Text>

          {/* Feature List */}
          <View style={styles.featuresContainer}>
            {step.features.map((feature, index) => (
              <Animated.View 
                key={index}
                style={[
                  styles.featureItem,
                  { 
                    backgroundColor: currentTheme.surface,
                    borderColor: currentTheme.border,
                    opacity: fadeAnimation
                  }
                ]}
              >
                <Text style={styles.featureIcon}>✨</Text>
                <Text style={[styles.featureText, { color: currentTheme.text }]}>
                  {feature}
                </Text>
              </Animated.View>
            ))}
          </View>

          {/* Special AI Demo Button for Step 2 */}
          {currentStep === 1 && (
            <TouchableOpacity 
              style={[styles.demoButton, { backgroundColor: currentTheme.primary }]}
              onPress={showAIButtonDemo}
            >
              <Animated.Text 
                style={[
                  styles.demoButtonText,
                  { 
                    color: currentTheme.background,
                    transform: [{ scale: pulseAnimation }]
                  }
                ]}
              >
                🤖 See AI in Action
              </Animated.Text>
            </TouchableOpacity>
          )}
        </Animated.View>
      </ScrollView>

      {/* Navigation Footer */}
      <View style={[styles.footer, { borderTopColor: currentTheme.border }]}>
        <TouchableOpacity 
          onPress={handlePrevious}
          style={[
            styles.navButton,
            styles.previousButton,
            { 
              backgroundColor: currentStep === 0 ? currentTheme.surface : currentTheme.border,
              opacity: currentStep === 0 ? 0.5 : 1
            }
          ]}
          disabled={currentStep === 0}
        >
          <Text style={[styles.navButtonText, { color: currentTheme.text }]}>
            ← Previous
          </Text>
        </TouchableOpacity>

        <TouchableOpacity 
          onPress={handleNext}
          style={[styles.navButton, styles.nextButton, { backgroundColor: currentTheme.primary }]}
        >
          <Text style={[styles.navButtonText, { color: currentTheme.background }]}>
            {currentStep === tutorialSteps.length - 1 ? "Get Started 🚀" : "Next →"}
          </Text>
        </TouchableOpacity>
      </View>

      {/* AI Demo Modal */}
      <Modal
        visible={showAIDemo}
        animationType="slide"
        presentationStyle="pageSheet"
        onRequestClose={() => setShowAIDemo(false)}
      >
        <View style={[styles.modalContainer, { backgroundColor: currentTheme.background }]}>
          <View style={[styles.modalHeader, { borderBottomColor: currentTheme.border }]}>
            <TouchableOpacity onPress={() => setShowAIDemo(false)}>
              <Text style={[styles.modalCloseText, { color: currentTheme.primary }]}>
                Close
              </Text>
            </TouchableOpacity>
            <Text style={[styles.modalTitle, { color: currentTheme.primary }]}>
              AI Assistant Demo
            </Text>
            <View style={{ width: 60 }} />
          </View>

          <ScrollView style={styles.modalContent}>
            <View style={styles.demoSection}>
              <Text style={[styles.demoTitle, { color: currentTheme.primary }]}>
                🤖 Your AI Assistant
              </Text>
              <Text style={[styles.demoDescription, { color: currentTheme.text }]}>
                This floating button appears throughout the app, providing contextual AI assistance wherever you are.
              </Text>

              {/* Simulated AI Button */}
              <View style={styles.aiButtonDemo}>
                <Animated.View 
                  style={[
                    styles.floatingAIButton,
                    { transform: [{ scale: pulseAnimation }] }
                  ]}
                >
                  <Text style={styles.aiButtonEmoji}>🤖</Text>
                </Animated.View>
                <Text style={[styles.aiButtonLabel, { color: currentTheme.textSecondary }]}>
                  Always accessible AI help
                </Text>
              </View>

              <View style={styles.aiFeaturesList}>
                <Text style={[styles.featuresTitle, { color: currentTheme.primary }]}>
                  What Your AI Can Do:
                </Text>
                {[
                  "Generate perfect photo captions",
                  "Find study partners in your courses", 
                  "Suggest campus events you'll love",
                  "Help with conversation starters",
                  "Recommend study locations",
                  "Provide academic tips and motivation"
                ].map((feature, index) => (
                  <View key={index} style={styles.aiFeatureItem}>
                    <Text style={styles.aiFeatureIcon}>⚡</Text>
                    <Text style={[styles.aiFeatureText, { color: currentTheme.text }]}>
                      {feature}
                    </Text>
                  </View>
                ))}
              </View>
            </View>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    paddingTop: 56,
    paddingBottom: 16,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  skipButton: {
    padding: 8,
  },
  skipText: {
    fontSize: 16,
    fontWeight: '600',
  },
  progressContainer: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  progressBar: {
    width: '100%',
    height: 4,
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: 8,
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  progressText: {
    fontSize: 12,
    fontWeight: '500',
  },
  content: {
    flex: 1,
  },
  stepContainer: {
    paddingHorizontal: 32,
    paddingVertical: 40,
    alignItems: 'center',
  },
  iconContainer: {
    marginBottom: 32,
  },
  mainIcon: {
    fontSize: 80,
    textAlign: 'center',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 24,
  },
  description: {
    fontSize: 16,
    lineHeight: 24,
    textAlign: 'center',
    marginBottom: 32,
    paddingHorizontal: 8,
  },
  featuresContainer: {
    width: '100%',
    marginBottom: 32,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 16,
    paddingHorizontal: 20,
    borderRadius: 12,
    marginBottom: 12,
    borderWidth: 1,
  },
  featureIcon: {
    fontSize: 20,
    marginRight: 16,
  },
  featureText: {
    fontSize: 16,
    fontWeight: '500',
    flex: 1,
  },
  demoButton: {
    paddingVertical: 16,
    paddingHorizontal: 32,
    borderRadius: 24,
    marginTop: 16,
  },
  demoButtonText: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
  },
  footer: {
    flexDirection: 'row',
    paddingHorizontal: 20,
    paddingVertical: 20,
    paddingBottom: 40,
    borderTopWidth: 1,
    gap: 12,
  },
  navButton: {
    flex: 1,
    paddingVertical: 16,
    borderRadius: 12,
    alignItems: 'center',
  },
  navButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
  },
  previousButton: {
    marginRight: 6,
  },
  nextButton: {
    marginLeft: 6,
  },
  // Modal Styles
  modalContainer: {
    flex: 1,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 56,
    paddingBottom: 20,
    paddingHorizontal: 20,
    borderBottomWidth: 1,
  },
  modalCloseText: {
    fontSize: 16,
    fontWeight: '600',
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalContent: {
    flex: 1,
    padding: 20,
  },
  demoSection: {
    alignItems: 'center',
  },
  demoTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  demoDescription: {
    fontSize: 16,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 32,
  },
  aiButtonDemo: {
    alignItems: 'center',
    marginBottom: 40,
  },
  floatingAIButton: {
    width: 70,
    height: 70,
    borderRadius: 35,
    backgroundColor: '#4A90E2',
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#4A90E2',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.6,
    shadowRadius: 8,
    elevation: 12,
    marginBottom: 16,
  },
  aiButtonEmoji: {
    fontSize: 32,
  },
  aiButtonLabel: {
    fontSize: 14,
    fontWeight: '500',
  },
  aiFeaturesList: {
    width: '100%',
  },
  featuresTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 20,
  },
  aiFeatureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 4,
  },
  aiFeatureIcon: {
    fontSize: 16,
    marginRight: 12,
  },
  aiFeatureText: {
    fontSize: 16,
    flex: 1,
  },
}); 