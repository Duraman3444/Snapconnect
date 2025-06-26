import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, ScrollView, Alert, ActivityIndicator } from 'react-native';
import { useAuth } from '../context/SupabaseAuthContext';
import { useTheme } from '../context/ThemeContext';
import ragService from '../services/ragService';
import userProfileService from '../services/userProfileService';

export default function RAGHomeScreen({ navigation }) {
  const { currentUser } = useAuth();
  const { currentTheme } = useTheme();
  const [campusEvents, setCampusEvents] = useState([]);
  const [contentIdeas, setContentIdeas] = useState([]);
  const [campusLocations, setCampusLocations] = useState([]);
  const [studyBuddies, setStudyBuddies] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [userProfile, setUserProfile] = useState(null);
  const [apiConfigured, setApiConfigured] = useState(false);

  useEffect(() => {
    if (currentUser) {
      checkAPIConfiguration();
      loadUserProfile();
    }
  }, [currentUser]);

  const checkAPIConfiguration = () => {
    const apiKey = process.env.EXPO_PUBLIC_OPENAI_API_KEY;
    const configured = apiKey && apiKey !== 'your_openai_api_key_here';
    setApiConfigured(configured);
    
    if (!configured) {
      Alert.alert(
        'API Configuration Required',
        'Please add your OpenAI API key to the .env file to enable RAG features.\n\nAdd: EXPO_PUBLIC_OPENAI_API_KEY=your_actual_key',
        [{ text: 'OK' }]
      );
    }
  };

  const loadUserProfile = async () => {
    try {
      const profile = await userProfileService.getMockUserProfile(currentUser.id);
      setUserProfile(profile);
      
      if (apiConfigured) {
        await loadRAGRecommendations(profile);
      } else {
        loadMockRecommendations();
      }
    } catch (error) {
      console.error('Error loading user profile:', error);
      loadMockRecommendations();
    }
  };

  const loadRAGRecommendations = async (profile = userProfile) => {
    if (!profile || !apiConfigured) {
      loadMockRecommendations();
      return;
    }

    setIsLoading(true);
    try {
      const [events, ideas, locations, studyMatches] = await Promise.all([
        ragService.suggestCampusEvents(profile.interests),
        ragService.generateContentIdeas(profile),
        ragService.recommendCampusLocations(profile),
        ragService.findStudyBuddies(
          { name: 'Data Structures', subject: profile.major },
          profile.studyHabits
        )
      ]);

      setCampusEvents(events.recommendedEvents || []);
      setContentIdeas(ideas.ideas || []);
      setCampusLocations(locations.locations || []);
      setStudyBuddies(studyMatches);
      
    } catch (error) {
      console.error('Error loading RAG recommendations:', error);
      Alert.alert(
        'RAG Error', 
        'Unable to load AI recommendations. Using demo data instead.'
      );
      loadMockRecommendations();
    } finally {
      setIsLoading(false);
    }
  };

  const loadMockRecommendations = () => {
    setCampusEvents([
      {
        title: 'Study Group - Data Structures',
        type: 'academic',
        description: 'Weekly study session for CS students',
        time: 'Tuesday 7PM',
        location: 'Library Study Room 3',
        why: 'Matches your major and study preferences'
      },
      {
        title: 'Tech Talk: AI in Industry', 
        type: 'career',
        description: 'Industry professionals discuss AI careers',
        time: 'Thursday 6PM',
        location: 'Engineering Building',
        why: 'Perfect for your technology interests'
      }
    ]);

    setContentIdeas([
      {
        title: 'Study Setup Showcase',
        description: 'Share your perfect study environment',
        suggestedCaption: 'My productivity zone 📚✨ #studylife #productivity',
        hashtags: ['#studylife', '#productivity', '#college'],
        bestTime: 'Evening',
        engagement: 'High study motivation'
      },
      {
        title: 'Campus Life Moments',
        description: 'Capture everyday college experiences', 
        suggestedCaption: 'Just another day at uni 🎓 #collegelife',
        hashtags: ['#collegelife', '#campus', '#memories'],
        bestTime: 'Afternoon',
        engagement: 'Relatable content'
      }
    ]);

    setCampusLocations([
      {
        location: 'Engineering Library',
        type: 'study',
        description: 'Perfect quiet space for CS students',
        bestTime: 'Evening',
        tip: 'Third floor has the best coding spots',
        reason: 'Matches your major and study habits'
      },
      {
        location: 'Student Recreation Center',
        type: 'recreation', 
        description: 'Great for fitness and stress relief',
        bestTime: 'Late afternoon',
        tip: 'Less crowded after 7PM',
        reason: 'Balances your tech interests with fitness'
      }
    ]);

    setStudyBuddies({
      studyTips: [
        'Form study groups with 3-4 people for optimal discussion',
        'Use active recall techniques instead of passive reading',
        'Schedule regular breaks every 45-50 minutes'
      ],
      partnerTraits: ['Similar study schedule', 'Complementary strengths', 'Reliable attendance'],
      locations: ['Library quiet zones', 'Study rooms', 'Group study areas']
    });
  };

  const handleRAGFeature = (featureName, data) => {
    Alert.alert(
      `🤖 ${featureName}`,
      `AI-powered feature activated!\n\nThis demonstrates how RAG enhances your college experience with personalized recommendations.`,
      [
        { text: 'Try Camera', onPress: () => navigation.navigate('Camera') },
        { text: 'Close' }
      ]
    );
  };

  return (
    <View style={{ flex: 1, backgroundColor: currentTheme.background }}>
      {/* Header */}
      <View style={{ 
        backgroundColor: currentTheme.background, 
        paddingTop: 56, 
        paddingBottom: 24, 
        paddingHorizontal: 24, 
        borderBottomWidth: 1, 
        borderBottomColor: currentTheme.border 
      }}>
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <TouchableOpacity onPress={() => navigation.navigate('Home')}>
            <Text style={{ color: currentTheme.primary, fontSize: 18, fontWeight: '600' }}>← Home</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
            <View style={{ backgroundColor: currentTheme.primary, borderRadius: 20, padding: 8 }}>
              <Text style={{ color: currentTheme.background, fontWeight: 'bold', fontSize: 16 }}>👤</Text>
            </View>
          </TouchableOpacity>
        </View>
        <View style={{ alignItems: 'center' }}>
          <Text style={{ fontSize: 30, fontWeight: 'bold', color: currentTheme.primary, textAlign: 'center', marginBottom: 8 }}>
            🤖 AI Hub
          </Text>
          <Text style={{ color: currentTheme.textSecondary, textAlign: 'center' }}>
            Welcome to your personalized college AI assistant!
          </Text>
        </View>
      </View>

      {/* Content */}
      <ScrollView 
        style={{ flex: 1 }} 
        contentContainerStyle={{ paddingHorizontal: 16, paddingBottom: 120 }}
        showsVerticalScrollIndicator={false}
      >
        {isLoading && (
          <View style={{ alignItems: 'center', paddingVertical: 40 }}>
            <ActivityIndicator size="large" color={currentTheme.primary} />
            <Text style={{ color: currentTheme.text, marginTop: 16, fontSize: 16 }}>
              🤖 AI is thinking...
            </Text>
          </View>
        )}

        {/* Campus Events - RAG Feature #2 */}
        <View style={{ backgroundColor: currentTheme.surface, borderRadius: 16, padding: 20, marginBottom: 20, marginTop: 20 }}>
          <Text style={{ fontSize: 20, fontWeight: 'bold', color: currentTheme.text, marginBottom: 15 }}>
            📅 Smart Campus Events
          </Text>
          <Text style={{ color: currentTheme.textSecondary, fontSize: 14, marginBottom: 15 }}>
            AI-powered event recommendations tailored to your interests
          </Text>
          {campusEvents.slice(0, 2).map((event, index) => (
            <TouchableOpacity 
              key={index}
              style={{ 
                backgroundColor: currentTheme.background, 
                borderRadius: 12, 
                padding: 15, 
                marginBottom: 10,
                borderWidth: 1,
                borderColor: currentTheme.border
              }}
              onPress={() => handleRAGFeature('Campus Events', event)}
            >
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: currentTheme.text }}>
                {event.title}
              </Text>
              <Text style={{ color: currentTheme.textSecondary, fontSize: 14 }}>
                {event.description}
              </Text>
              <Text style={{ color: currentTheme.primary, fontSize: 12, marginTop: 5 }}>
                📍 {event.time} • {event.location}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Content Ideas - RAG Feature #4 */}
        <View style={{ backgroundColor: currentTheme.surface, borderRadius: 16, padding: 20, marginBottom: 20 }}>
          <Text style={{ fontSize: 20, fontWeight: 'bold', color: currentTheme.text, marginBottom: 15 }}>
            💡 AI Content Ideas
          </Text>
          <Text style={{ color: currentTheme.textSecondary, fontSize: 14, marginBottom: 15 }}>
            Personalized content suggestions for your social media
          </Text>
          {contentIdeas.slice(0, 2).map((idea, index) => (
            <TouchableOpacity 
              key={index}
              style={{ 
                backgroundColor: currentTheme.background, 
                borderRadius: 12, 
                padding: 15, 
                marginBottom: 10,
                borderWidth: 1,
                borderColor: currentTheme.border
              }}
              onPress={() => navigation.navigate('Camera')}
            >
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: currentTheme.text }}>
                {idea.title}
              </Text>
              <Text style={{ color: currentTheme.textSecondary, fontSize: 14 }}>
                {idea.description}
              </Text>
              <Text style={{ color: currentTheme.primary, fontSize: 12, marginTop: 5 }}>
                📸 "{idea.suggestedCaption}"
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {/* Campus Locations - RAG Feature #5 */}
        <View style={{ backgroundColor: currentTheme.surface, borderRadius: 16, padding: 20, marginBottom: 20 }}>
          <Text style={{ fontSize: 20, fontWeight: 'bold', color: currentTheme.text, marginBottom: 15 }}>
            📍 Smart Campus Spots
          </Text>
          <Text style={{ color: currentTheme.textSecondary, fontSize: 14, marginBottom: 15 }}>
            Personalized campus location recommendations
          </Text>
          {campusLocations.slice(0, 2).map((location, index) => (
            <View 
              key={index}
              style={{ 
                backgroundColor: currentTheme.background, 
                borderRadius: 12, 
                padding: 15, 
                marginBottom: 10,
                borderWidth: 1,
                borderColor: currentTheme.border
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: 'bold', color: currentTheme.text }}>
                {location.location}
              </Text>
              <Text style={{ color: currentTheme.textSecondary, fontSize: 14 }}>
                {location.description}
              </Text>
              <Text style={{ color: currentTheme.primary, fontSize: 12, marginTop: 5 }}>
                💡 {location.tip}
              </Text>
            </View>
          ))}
        </View>

        {/* Study Buddies - RAG Feature #3 */}
        <View style={{ backgroundColor: currentTheme.surface, borderRadius: 16, padding: 20, marginBottom: 20 }}>
          <Text style={{ fontSize: 20, fontWeight: 'bold', color: currentTheme.text, marginBottom: 15 }}>
            👥 Smart Study Matching
          </Text>
          <Text style={{ color: currentTheme.textSecondary, fontSize: 14, marginBottom: 15 }}>
            AI-powered study buddy recommendations
          </Text>
          {studyBuddies.studyTips?.slice(0, 2).map((tip, index) => (
            <View 
              key={index}
              style={{ 
                backgroundColor: currentTheme.background, 
                borderRadius: 12, 
                padding: 15, 
                marginBottom: 10,
                borderWidth: 1,
                borderColor: currentTheme.border
              }}
            >
              <Text style={{ color: currentTheme.text, fontSize: 14 }}>
                📚 {tip}
              </Text>
            </View>
          ))}
          <TouchableOpacity 
            style={{ alignItems: 'center', marginTop: 10 }}
            onPress={() => handleRAGFeature('Study Buddy Matching', studyBuddies)}
          >
            <Text style={{ color: currentTheme.primary, fontWeight: 'bold' }}>
              🤖 Find Study Partners
            </Text>
          </TouchableOpacity>
        </View>

        {/* Action Buttons */}
        <View style={{ flexDirection: 'row', marginBottom: 20 }}>
          <TouchableOpacity
            style={{ 
              flex: 1, 
              backgroundColor: currentTheme.primary, 
              borderRadius: 15, 
              paddingVertical: 15,
              marginRight: 8
            }}
            onPress={() => navigation.navigate('Camera')}
          >
            <Text style={{ 
              color: currentTheme.background, 
              fontWeight: '600', 
              textAlign: 'center',
              fontSize: 16
            }}>
              📸 Create with AI
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={{ 
              flex: 1, 
              backgroundColor: currentTheme.background, 
              borderRadius: 15, 
              paddingVertical: 15,
              borderWidth: 2,
              borderColor: currentTheme.primary,
              marginLeft: 8
            }}
            onPress={loadRAGRecommendations}
            disabled={isLoading}
          >
            <Text style={{ 
              color: currentTheme.primary, 
              fontWeight: '600', 
              textAlign: 'center',
              fontSize: 16
            }}>
              🔄 Refresh AI
            </Text>
          </TouchableOpacity>
        </View>

        {/* Navigation */}
        <View style={{ flexDirection: 'row', marginBottom: 40 }}>
          <TouchableOpacity
            style={{ 
              flex: 1, 
              backgroundColor: currentTheme.surface, 
              borderRadius: 15, 
              paddingVertical: 15,
              marginRight: 8,
              borderWidth: 1,
              borderColor: currentTheme.border
            }}
            onPress={() => navigation.navigate('Home')}
          >
            <Text style={{ 
              color: currentTheme.text, 
              fontWeight: '600', 
              textAlign: 'center',
              fontSize: 16
            }}>
              🏠 Classic Home
            </Text>
          </TouchableOpacity>
          
          <TouchableOpacity
            style={{ 
              flex: 1, 
              backgroundColor: currentTheme.surface, 
              borderRadius: 15, 
              paddingVertical: 15,
              marginLeft: 8,
              borderWidth: 1,
              borderColor: currentTheme.border
            }}
            onPress={() => navigation.navigate('Friends')}
          >
            <Text style={{ 
              color: currentTheme.text, 
              fontWeight: '600', 
              textAlign: 'center',
              fontSize: 16
            }}>
              👥 Friends
            </Text>
          </TouchableOpacity>
        </View>
      </ScrollView>
    </View>
  );
} 