import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, Alert, TextInput, Modal, ScrollView, ActivityIndicator } from 'react-native';
import { useAuth } from '../context/SupabaseAuthContext';
import { useTheme } from '../context/ThemeContext';
import ragService from '../services/ragService';
import userProfileService from '../services/userProfileService';

export default function MentalHealthScreen({ navigation }) {
  const { currentUser, supabase } = useAuth();
  const { currentTheme } = useTheme();
  const [stressLevel, setStressLevel] = useState(5);
  const [challenges, setChallenges] = useState([]);
  const [supportGroups, setSupportGroups] = useState([]);
  const [showMoodTracker, setShowMoodTracker] = useState(false);
  const [selectedMood, setSelectedMood] = useState(null);
  const [aiRecommendations, setAiRecommendations] = useState(null);
  const [loadingAI, setLoadingAI] = useState(false);
  const [moodHistory, setMoodHistory] = useState([]);
  const [specificRequest, setSpecificRequest] = useState('');

  const stressLevels = Array.from({ length: 10 }, (_, i) => i + 1);

  // Define moods array that was missing
  const moods = [
    { value: 'terrible', emoji: '😭', color: '#dc2626', label: 'Terrible' },
    { value: 'bad', emoji: '😞', color: '#ea580c', label: 'Bad' },
    { value: 'okay', emoji: '😐', color: '#ca8a04', label: 'Okay' },
    { value: 'good', emoji: '😊', color: '#16a34a', label: 'Good' },
    { value: 'great', emoji: '😄', color: '#2563eb', label: 'Great' },
    { value: 'amazing', emoji: '🤩', color: '#9333ea', label: 'Amazing' }
  ];

  const wellnessChallenges = [
    {
      id: 1,
      title: '7-Day Mindfulness',
      description: 'Meditate for 10 minutes daily',
      emoji: '🧘‍♀️',
      duration: '7 days',
      participants: 24,
      category: 'mindfulness'
    },
    {
      id: 2,
      title: 'Hydration Hero',
      description: 'Drink 8 glasses of water daily',
      emoji: '💧',
      duration: '5 days',
      participants: 18,
      category: 'health'
    },
    {
      id: 3,
      title: 'Sleep Schedule Reset',
      description: 'Sleep 8 hours for a week',
      emoji: '😴',
      duration: '7 days',
      participants: 31,
      category: 'sleep'
    },
    {
      id: 4,
      title: 'Gratitude Journal',
      description: 'Write 3 things you\'re grateful for daily',
      emoji: '📝',
      duration: '14 days',
      participants: 42,
      category: 'mental'
    }
  ];

  const anonymousSupportGroups = [
    {
      id: 1,
      title: 'Exam Anxiety Support',
      description: 'A safe space to discuss test anxiety',
      emoji: '📚',
      members: 15,
      lastActive: '2 hours ago'
    },
    {
      id: 2,
      title: 'Homesickness Circle',
      description: 'For students missing home',
      emoji: '🏠',
      members: 8,
      lastActive: '4 hours ago'
    },
    {
      id: 3,
      title: 'Social Anxiety Hub',
      description: 'Connect with others who understand',
      emoji: '🤝',
      members: 23,
      lastActive: '1 hour ago'
    },
    {
      id: 4,
      title: 'Academic Pressure Relief',
      description: 'Discuss academic stress and coping',
      emoji: '🎓',
      members: 19,
      lastActive: '30 minutes ago'
    }
  ];

  useEffect(() => {
    loadTodaysMood();
    if (currentUser) {
      loadMoodHistory();
    }
  }, [currentUser]);

  const loadTodaysMood = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      const { data, error } = await supabase
        .from('mood_logs')
        .select('*')
        .eq('user_id', currentUser.id)
        .eq('date', today)
        .single();

      if (data) {
        setStressLevel(data.stress_level);
      }
    } catch (error) {
      // No mood logged today, which is fine
    }
  };

  const loadMoodHistory = async () => {
    try {
      // Mock mood history for demonstration
      setMoodHistory([
        { mood: 'good', stress: 4, date: '2024-01-15', ai_used: true },
        { mood: 'okay', stress: 6, date: '2024-01-14', ai_used: false },
        { mood: 'great', stress: 3, date: '2024-01-13', ai_used: true }
      ]);
    } catch (error) {
      console.error('Error loading mood history:', error);
    }
  };

  const generateAIWellnessRecommendations = async () => {
    if (!selectedMood) {
      Alert.alert('Mood Required', 'Please select your current mood first to get personalized recommendations.');
      return;
    }

    setLoadingAI(true);
    try {
      // Provide fallback user profile if service fails
      let userProfile;
      try {
        userProfile = await userProfileService.getMockUserProfile(currentUser.id);
      } catch (error) {
        console.warn('Failed to get user profile, using defaults:', error);
        userProfile = { major: 'General Studies', year: 'Sophomore', interests: ['wellness'] };
      }

      const moodData = {
        current: selectedMood,
        stressors: ['academic pressure', 'social challenges', 'time management'],
        specificRequest: specificRequest.trim() || null
      };

      console.log('Requesting AI wellness recommendations with mood:', selectedMood, 'stress level:', stressLevel, 'specific request:', specificRequest);

      const recommendations = await ragService.generateWellnessRecommendations(
        moodData,
        stressLevel,
        'high' // Could be dynamic based on academic calendar
      );

      console.log('AI recommendations received:', recommendations);

      if (recommendations && Object.keys(recommendations).length > 0) {
        setAiRecommendations(recommendations);

        // Track AI usage
        try {
          await userProfileService.trackActivity(currentUser.id, {
            type: 'ai_wellness_recommendations',
            mood: selectedMood,
            stressLevel: stressLevel,
            success: true
          });
        } catch (trackError) {
          console.warn('Failed to track activity:', trackError);
        }

        // Close the modal so user can see recommendations
        setShowMoodTracker(false);
        
        // Clear the specific request for next time
        setSpecificRequest('');
        
        Alert.alert(
          '🤖 AI Wellness Coach',
          'Personalized wellness recommendations generated based on your current mood and stress level. Check below!',
          [{ text: 'View Recommendations' }]
        );
      } else {
        // Provide fallback recommendations
        const fallbackRecommendations = {
          immediate: {
            activities: [
              'Take 5 deep breaths',
              'Go for a short walk',
              'Listen to calming music'
            ],
            breathing: 'Try the 4-7-8 breathing technique: Inhale for 4, hold for 7, exhale for 8',
            affirmation: 'I am capable of handling whatever comes my way, one step at a time.'
          },
          daily: {
            habits: [
              'Maintain a consistent sleep schedule',
              'Practice gratitude journaling',
              'Stay hydrated throughout the day'
            ]
          },
          resources: {
            campusSupport: [
              'Campus Counseling Center',
              'Student Wellness Services',
              'Peer Support Groups'
            ],
            techniques: [
              'Mindfulness meditation',
              'Progressive muscle relaxation',
              'Journaling'
            ]
          }
        };

        setAiRecommendations(fallbackRecommendations);
        
        // Close the modal so user can see recommendations
        setShowMoodTracker(false);
        setSpecificRequest('');
        
        Alert.alert(
          '🤖 Wellness Support',
          'Here are some general wellness recommendations. For personalized AI advice, please check your internet connection and try again. Check below!',
          [{ text: 'View Recommendations' }]
        );
      }

    } catch (error) {
      console.error('Error generating wellness recommendations:', error);
      
      // Provide helpful fallback recommendations even when AI fails
      const emergencyRecommendations = {
        immediate: {
          activities: [
            'Take slow, deep breaths',
            'Find a quiet space to sit',
            'Drink some water'
          ],
          breathing: 'Focus on your breathing: In for 4 counts, hold for 4, out for 4',
          affirmation: 'This feeling is temporary, and I have the strength to get through it.'
        },
        daily: {
          habits: [
            'Try to get 7-8 hours of sleep',
            'Take breaks between study sessions',
            'Connect with friends or family'
          ]
        },
        resources: {
          campusSupport: [
            'Campus Counseling Center',
            'Student Health Services',
            'Crisis Hotline: 988'
          ],
          techniques: [
            'Deep breathing exercises',
            'Grounding techniques (5-4-3-2-1)',
            'Light physical activity'
          ]
        }
      };

      setAiRecommendations(emergencyRecommendations);
      
      // Close the modal so user can see recommendations
      setShowMoodTracker(false);
      setSpecificRequest('');
      
      Alert.alert(
        'Wellness Support Available',
        'While we couldn\'t connect to our AI service, here are some general wellness strategies that can help. Check below!',
        [{ text: 'View Recommendations' }]
      );
    } finally {
      setLoadingAI(false);
    }
  };

  const logMood = async () => {
    if (!selectedMood) {
      Alert.alert('Error', 'Please select your mood first');
      return;
    }

    try {
      const moodEntry = {
        mood: selectedMood,
        stress: stressLevel,
        date: new Date().toISOString().split('T')[0],
        ai_used: aiRecommendations !== null
      };

      // Track mood entry
      await userProfileService.trackActivity(currentUser.id, {
        type: 'mood_entry',
        mood: selectedMood,
        stressLevel: stressLevel
      });

      setMoodHistory(prev => [moodEntry, ...prev.slice(0, 9)]); // Keep last 10 entries
      setShowMoodTracker(false);
      setSelectedMood(null);
      setStressLevel(5);
      setAiRecommendations(null);

      Alert.alert(
        'Mood Logged! 📝',
        aiRecommendations ? 'Your mood has been logged with AI wellness recommendations.' : 'Your mood has been logged successfully.'
      );
    } catch (error) {
      Alert.alert('Error', 'Failed to log mood');
    }
  };

  const getMoodColor = (mood) => {
    const moodObj = moods.find(m => m.value === mood);
    return moodObj ? moodObj.color : currentTheme.textSecondary;
  };

  const getMoodEmoji = (mood) => {
    const moodObj = moods.find(m => m.value === mood);
    return moodObj ? moodObj.emoji : '😐';
  };

  const renderChallenge = ({ item }) => (
    <View style={[{
      backgroundColor: currentTheme.surface,
      borderRadius: 16,
      padding: 20,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: currentTheme.border
    }]}>
      <View style={[{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }]}>
        <Text style={[{ fontSize: 32, marginRight: 16 }]}>{item.emoji}</Text>
        <View style={[{ flex: 1 }]}>
          <Text style={[{ fontSize: 18, fontWeight: 'bold', color: currentTheme.primary }]}>
            {item.title}
          </Text>
          <Text style={[{ color: currentTheme.textSecondary, fontSize: 14 }]}>
            {item.description}
          </Text>
        </View>
      </View>
      
      <View style={[{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }]}>
        <Text style={[{ color: currentTheme.textSecondary, fontSize: 14 }]}>
          ⏱️ {item.duration}
        </Text>
        <Text style={[{ color: currentTheme.textSecondary, fontSize: 14 }]}>
          👥 {item.participants} participants
        </Text>
      </View>

      <TouchableOpacity
        style={[{ backgroundColor: currentTheme.primary, borderRadius: 12, padding: 12 }]}
        onPress={() => Alert.alert('Coming Soon!', 'Challenge participation will be available soon! 🎯')}
      >
        <Text style={[{ color: currentTheme.background, textAlign: 'center', fontWeight: 'bold' }]}>
          Join Challenge
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderSupportGroup = ({ item }) => (
    <View style={[{
      backgroundColor: currentTheme.surface,
      borderRadius: 16,
      padding: 20,
      marginBottom: 16,
      borderWidth: 1,
      borderColor: currentTheme.border
    }]}>
      <View style={[{ flexDirection: 'row', alignItems: 'center', marginBottom: 12 }]}>
        <Text style={[{ fontSize: 32, marginRight: 16 }]}>{item.emoji}</Text>
        <View style={[{ flex: 1 }]}>
          <Text style={[{ fontSize: 18, fontWeight: 'bold', color: currentTheme.primary }]}>
            {item.title}
          </Text>
          <Text style={[{ color: currentTheme.textSecondary, fontSize: 14 }]}>
            {item.description}
          </Text>
        </View>
      </View>
      
      <View style={[{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }]}>
        <Text style={[{ color: currentTheme.textSecondary, fontSize: 14 }]}>
          👥 {item.members} members
        </Text>
        <Text style={[{ color: currentTheme.textSecondary, fontSize: 14 }]}>
          🕐 Active {item.lastActive}
        </Text>
      </View>

      <TouchableOpacity
        style={[{ backgroundColor: '#6b46c1', borderRadius: 12, padding: 12 }]}
        onPress={() => Alert.alert('Anonymous Support', 'This would connect you to the support group anonymously. Remember: You\'re not alone! 💜')}
      >
        <Text style={[{ color: 'white', textAlign: 'center', fontWeight: 'bold' }]}>
          🔒 Join Anonymously
        </Text>
      </TouchableOpacity>
    </View>
  );

  const renderWellnessResources = () => (
    <ScrollView style={{ padding: 20 }}>
      <Text style={{ fontSize: 24, fontWeight: 'bold', color: currentTheme.primary, marginBottom: 20, textAlign: 'center' }}>
        🧠 Mental Health Resources
      </Text>

      {/* Emergency Resources */}
      <View style={{ backgroundColor: '#fef2f2', borderRadius: 16, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: '#fecaca' }}>
        <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#dc2626', marginBottom: 12 }}>
          🚨 Crisis Resources
        </Text>
        <Text style={{ color: '#7f1d1d', marginBottom: 8, lineHeight: 20 }}>
          If you're experiencing a mental health crisis, please reach out immediately:
        </Text>
        <TouchableOpacity style={{ backgroundColor: '#dc2626', borderRadius: 8, padding: 12, marginBottom: 8 }}>
          <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold' }}>
            📞 Crisis Hotline: 988
          </Text>
        </TouchableOpacity>
        <TouchableOpacity style={{ backgroundColor: '#7f1d1d', borderRadius: 8, padding: 12 }}>
          <Text style={{ color: 'white', textAlign: 'center', fontWeight: 'bold' }}>
            🏥 Campus Emergency: 911
          </Text>
        </TouchableOpacity>
      </View>

      {/* Campus Resources */}
      <View style={{ backgroundColor: currentTheme.surface, borderRadius: 16, padding: 20, marginBottom: 20 }}>
        <Text style={{ fontSize: 18, fontWeight: 'bold', color: currentTheme.primary, marginBottom: 12 }}>
          🏫 Campus Support Services
        </Text>
        {[
          { name: 'Counseling Center', hours: 'Mon-Fri 8AM-5PM', phone: '(555) 123-4567' },
          { name: 'Student Health Services', hours: '24/7 Nurse Line', phone: '(555) 123-4568' },
          { name: 'Academic Success Center', hours: 'Mon-Fri 9AM-6PM', phone: '(555) 123-4569' },
          { name: 'Peer Support Groups', hours: 'Various Times', phone: '(555) 123-4570' }
        ].map((resource, index) => (
          <TouchableOpacity key={index} style={{
            backgroundColor: currentTheme.background,
            borderRadius: 12,
            padding: 16,
            marginBottom: 12,
            borderWidth: 1,
            borderColor: currentTheme.border
          }}>
            <Text style={{ fontSize: 16, fontWeight: 'bold', color: currentTheme.text, marginBottom: 4 }}>
              {resource.name}
            </Text>
            <Text style={{ color: currentTheme.textSecondary, fontSize: 14, marginBottom: 4 }}>
              🕒 {resource.hours}
            </Text>
            <Text style={{ color: currentTheme.primary, fontSize: 14 }}>
              📞 {resource.phone}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Self-Care Tips */}
      <View style={{ backgroundColor: currentTheme.surface, borderRadius: 16, padding: 20, marginBottom: 20 }}>
        <Text style={{ fontSize: 18, fontWeight: 'bold', color: currentTheme.primary, marginBottom: 12 }}>
          🌟 Daily Self-Care Tips
        </Text>
        {[
          '🧘‍♀️ Practice 5 minutes of deep breathing',
          '🚶‍♂️ Take a 10-minute walk outdoors',
          '💧 Stay hydrated - aim for 8 glasses of water',
          '😴 Maintain consistent sleep schedule',
          '📱 Limit social media before bedtime',
          '🤝 Connect with a friend or family member',
          '📝 Write down 3 things you\'re grateful for',
          '🎵 Listen to calming music or nature sounds'
        ].map((tip, index) => (
          <Text key={index} style={{ color: currentTheme.text, marginBottom: 8, fontSize: 16 }}>
            {tip}
          </Text>
        ))}
      </View>

      {/* Coping Strategies */}
      <View style={{ backgroundColor: currentTheme.surface, borderRadius: 16, padding: 20 }}>
        <Text style={{ fontSize: 18, fontWeight: 'bold', color: currentTheme.primary, marginBottom: 12 }}>
          🛠️ Coping Strategies
        </Text>
        <Text style={{ color: currentTheme.text, marginBottom: 12, lineHeight: 20 }}>
          When feeling overwhelmed, try these evidence-based techniques:
        </Text>
        {[
          '🔢 5-4-3-2-1 Grounding: Name 5 things you see, 4 you can touch, 3 you hear, 2 you smell, 1 you taste',
          '🌬️ Box Breathing: Inhale for 4, hold for 4, exhale for 4, hold for 4',
          '💭 Challenge negative thoughts: Ask "Is this thought helpful? Is it realistic?"',
          '⏰ Break tasks into smaller, manageable steps',
          '🎯 Focus on what you can control, let go of what you can\'t'
        ].map((strategy, index) => (
          <Text key={index} style={{ color: currentTheme.text, marginBottom: 12, fontSize: 14, lineHeight: 20 }}>
            {strategy}
          </Text>
        ))}
      </View>
    </ScrollView>
  );

  return (
    <View style={{ flex: 1, backgroundColor: currentTheme.background }}>
      {/* Header */}
      <View style={{ 
        backgroundColor: currentTheme.surface, 
        paddingTop: 56, 
        paddingBottom: 24, 
        paddingHorizontal: 24,
        borderBottomWidth: 1,
        borderBottomColor: currentTheme.border
      }}>
        <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={{ color: currentTheme.primary, fontSize: 18, fontWeight: '600' }}>← Back</Text>
          </TouchableOpacity>
        </View>
        <Text style={{ fontSize: 28, fontWeight: 'bold', color: currentTheme.primary, textAlign: 'center' }}>
          🧠 Mental Wellness
        </Text>
        <Text style={{ color: currentTheme.textSecondary, textAlign: 'center', marginTop: 8 }}>
          AI-powered wellness support for college students
        </Text>
      </View>

      <ScrollView style={{ flex: 1 }}>
        {/* Mood Tracker Section */}
        <View style={{ padding: 20 }}>
          <View style={{ backgroundColor: currentTheme.surface, borderRadius: 16, padding: 20, marginBottom: 20 }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', color: currentTheme.primary, marginBottom: 16, textAlign: 'center' }}>
              📊 Daily Mood Check-in
            </Text>
            
            <TouchableOpacity
              style={{ backgroundColor: currentTheme.primary, borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 16 }}
              onPress={() => setShowMoodTracker(true)}
            >
              <Text style={{ color: currentTheme.background, fontSize: 16, fontWeight: 'bold' }}>
                ✍️ Log Today's Mood & Get AI Recommendations
              </Text>
            </TouchableOpacity>

            <Text style={{ color: currentTheme.textSecondary, fontSize: 14, textAlign: 'center', marginBottom: 16, lineHeight: 20 }}>
              💡 To get personalized AI wellness recommendations, tap "Log Today's Mood", select how you're feeling, and then tap "Get AI Wellness Recommendations"
            </Text>

            {/* Recent Mood History */}
            {moodHistory.length > 0 && (
              <View>
                <Text style={{ fontSize: 16, fontWeight: 'bold', color: currentTheme.text, marginBottom: 12 }}>
                  Recent Check-ins:
                </Text>
                <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
                  {moodHistory.slice(0, 5).map((entry, index) => (
                    <View key={index} style={{
                      backgroundColor: currentTheme.background,
                      borderRadius: 20,
                      paddingHorizontal: 12,
                      paddingVertical: 8,
                      borderWidth: 1,
                      borderColor: getMoodColor(entry.mood),
                      flexDirection: 'row',
                      alignItems: 'center'
                    }}>
                      <Text style={{ fontSize: 16, marginRight: 4 }}>
                        {getMoodEmoji(entry.mood)}
                      </Text>
                      <Text style={{ color: currentTheme.textSecondary, fontSize: 12 }}>
                        {new Date(entry.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })}
                      </Text>
                      {entry.ai_used && (
                        <Text style={{ fontSize: 12, marginLeft: 4 }}>🤖</Text>
                      )}
                    </View>
                  ))}
                </View>
              </View>
            )}
          </View>

          {/* AI Wellness Recommendations */}
          {aiRecommendations && (
            <View style={{ backgroundColor: '#f0f9ff', borderRadius: 16, padding: 20, marginBottom: 20, borderWidth: 1, borderColor: '#0ea5e9' }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: '#0c4a6e', marginBottom: 12 }}>
                🤖 Personalized Wellness Recommendations
              </Text>
              
              <Text style={{ color: '#075985', fontSize: 14, marginBottom: 16, fontStyle: 'italic' }}>
                Generated for: {selectedMood} mood, stress level {stressLevel}/10
                {moodHistory.length > 0 && moodHistory[0].ai_specific_request && (
                  <Text style={{ fontWeight: 'bold' }}> • Addressing your specific concern</Text>
                )}
              </Text>

              {/* Immediate Actions */}
              {aiRecommendations.immediate && (
                <View style={{ marginBottom: 16 }}>
                  <Text style={{ fontWeight: 'bold', color: '#0c4a6e', marginBottom: 8 }}>
                    Right Now:
                  </Text>
                  {aiRecommendations.immediate.activities?.map((activity, index) => (
                    <Text key={index} style={{ color: '#075985', marginBottom: 4, marginLeft: 8 }}>
                      • {activity}
                    </Text>
                  ))}
                  {aiRecommendations.immediate.breathing && (
                    <View style={{ backgroundColor: '#e0f2fe', borderRadius: 8, padding: 12, marginTop: 8 }}>
                      <Text style={{ color: '#0c4a6e', fontWeight: 'bold', marginBottom: 4 }}>
                        🌬️ Breathing Exercise:
                      </Text>
                      <Text style={{ color: '#075985' }}>
                        {aiRecommendations.immediate.breathing}
                      </Text>
                    </View>
                  )}
                  {aiRecommendations.immediate.affirmation && (
                    <View style={{ backgroundColor: '#fef3c7', borderRadius: 8, padding: 12, marginTop: 8 }}>
                      <Text style={{ color: '#92400e', fontWeight: 'bold', marginBottom: 4 }}>
                        💫 Daily Affirmation:
                      </Text>
                      <Text style={{ color: '#92400e', fontStyle: 'italic' }}>
                        "{aiRecommendations.immediate.affirmation}"
                      </Text>
                    </View>
                  )}
                </View>
              )}

              {/* Daily Habits */}
              {aiRecommendations.daily && (
                <View style={{ marginBottom: 16 }}>
                  <Text style={{ fontWeight: 'bold', color: '#0c4a6e', marginBottom: 8 }}>
                    Daily Habits to Build:
                  </Text>
                  {aiRecommendations.daily.habits?.map((habit, index) => (
                    <Text key={index} style={{ color: '#075985', marginBottom: 4, marginLeft: 8 }}>
                      • {habit}
                    </Text>
                  ))}
                </View>
              )}

              {/* Resources */}
              {aiRecommendations.resources && (
                <View>
                  <Text style={{ fontWeight: 'bold', color: '#0c4a6e', marginBottom: 8 }}>
                    Recommended Resources:
                  </Text>
                  {aiRecommendations.resources.campusSupport?.map((resource, index) => (
                    <Text key={index} style={{ color: '#075985', marginBottom: 4, marginLeft: 8 }}>
                      🏫 {resource}
                    </Text>
                  ))}
                  {aiRecommendations.resources.techniques?.map((technique, index) => (
                    <Text key={index} style={{ color: '#075985', marginBottom: 4, marginLeft: 8 }}>
                      🛠️ {technique}
                    </Text>
                  ))}
                </View>
              )}
            </View>
          )}
        </View>

        {renderWellnessResources()}
      </ScrollView>

      {/* Mood Tracker Modal */}
      <Modal
        visible={showMoodTracker}
        animationType="slide"
        presentationStyle="pageSheet"
      >
        <View style={{ flex: 1, backgroundColor: currentTheme.background }}>
          <View style={{
            backgroundColor: currentTheme.surface,
            paddingTop: 20,
            paddingBottom: 16,
            paddingHorizontal: 20,
            borderBottomWidth: 1,
            borderBottomColor: currentTheme.border
          }}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <TouchableOpacity onPress={() => setShowMoodTracker(false)}>
                <Text style={{ color: currentTheme.primary, fontSize: 16, fontWeight: '600' }}>Cancel</Text>
              </TouchableOpacity>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: currentTheme.primary }}>
                Mood Check-in
              </Text>
              <TouchableOpacity onPress={logMood}>
                <Text style={{ color: currentTheme.primary, fontSize: 16, fontWeight: '600' }}>Done</Text>
              </TouchableOpacity>
            </View>
          </View>

          <ScrollView style={{ flex: 1, padding: 20 }}>
            {/* Mood Selection */}
            <View style={{ marginBottom: 32 }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: currentTheme.text, marginBottom: 16, textAlign: 'center' }}>
                How are you feeling today?
              </Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                {moods.map((mood) => (
                  <TouchableOpacity
                    key={mood.value}
                    style={{
                      alignItems: 'center',
                      padding: 12,
                      borderRadius: 16,
                      backgroundColor: selectedMood === mood.value ? mood.color : currentTheme.surface,
                      borderWidth: 2,
                      borderColor: selectedMood === mood.value ? mood.color : currentTheme.border,
                      opacity: selectedMood === mood.value ? 1 : 0.7
                    }}
                    onPress={() => setSelectedMood(mood.value)}
                  >
                    <Text style={{ fontSize: 32, marginBottom: 4 }}>{mood.emoji}</Text>
                    <Text style={{
                      color: selectedMood === mood.value ? 'white' : currentTheme.text,
                      fontSize: 12,
                      fontWeight: 'bold'
                    }}>
                      {mood.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Stress Level */}
            <View style={{ marginBottom: 32 }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: currentTheme.text, marginBottom: 16, textAlign: 'center' }}>
                Stress Level: {stressLevel}/10
              </Text>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between', marginBottom: 16 }}>
                {stressLevels.map((level) => (
                  <TouchableOpacity
                    key={level}
                    style={{
                      width: 30,
                      height: 30,
                      borderRadius: 15,
                      backgroundColor: stressLevel >= level ? '#ef4444' : currentTheme.surface,
                      borderWidth: 1,
                      borderColor: currentTheme.border,
                      justifyContent: 'center',
                      alignItems: 'center'
                    }}
                    onPress={() => setStressLevel(level)}
                  >
                    <Text style={{
                      color: stressLevel >= level ? 'white' : currentTheme.textSecondary,
                      fontSize: 12,
                      fontWeight: 'bold'
                    }}>
                      {level}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={{ flexDirection: 'row', justifyContent: 'space-between' }}>
                <Text style={{ color: currentTheme.textSecondary, fontSize: 12 }}>Low</Text>
                <Text style={{ color: currentTheme.textSecondary, fontSize: 12 }}>High</Text>
              </View>
            </View>

            {/* Specific Request Input */}
            <View style={{ marginBottom: 32 }}>
              <Text style={{ fontSize: 18, fontWeight: 'bold', color: currentTheme.text, marginBottom: 12, textAlign: 'center' }}>
                💬 Specific Request (Optional)
              </Text>
              <Text style={{ color: currentTheme.textSecondary, fontSize: 14, marginBottom: 16, textAlign: 'center', lineHeight: 20 }}>
                Tell the AI about any specific challenges, situations, or areas you'd like personalized advice about
              </Text>
              <TextInput
                style={{
                  backgroundColor: currentTheme.surface,
                  borderRadius: 12,
                  padding: 16,
                  color: currentTheme.text,
                  borderWidth: 1,
                  borderColor: currentTheme.border,
                  fontSize: 16,
                  minHeight: 80,
                  textAlignVertical: 'top'
                }}
                placeholder="e.g., 'I'm struggling with exam anxiety and can't sleep well' or 'Having trouble managing time between work and studies'"
                placeholderTextColor={currentTheme.textSecondary}
                value={specificRequest}
                onChangeText={setSpecificRequest}
                multiline
                maxLength={300}
              />
              <Text style={{ color: currentTheme.textSecondary, fontSize: 12, marginTop: 8, textAlign: 'right' }}>
                {specificRequest.length}/300
              </Text>
            </View>

            {/* AI Recommendation Button */}
            <TouchableOpacity
              style={{
                backgroundColor: '#6366f1',
                borderRadius: 12,
                padding: 16,
                alignItems: 'center',
                marginBottom: 12,
                opacity: loadingAI ? 0.6 : 1
              }}
              onPress={generateAIWellnessRecommendations}
              disabled={loadingAI}
            >
              {loadingAI ? (
                <>
                  <ActivityIndicator size="small" color="white" />
                  <Text style={{ color: 'white', fontWeight: 'bold', marginTop: 8 }}>
                    Generating Wellness Plan...
                  </Text>
                </>
              ) : (
                <Text style={{ color: 'white', fontSize: 16, fontWeight: 'bold' }}>
                  🤖 Get Personalized AI Recommendations
                </Text>
              )}
            </TouchableOpacity>

            {/* Test AI Connection Button (for debugging) */}
            <TouchableOpacity
              style={{
                backgroundColor: currentTheme.surface,
                borderRadius: 8,
                padding: 12,
                alignItems: 'center',
                marginBottom: 20,
                borderWidth: 1,
                borderColor: currentTheme.border
              }}
              onPress={async () => {
                console.log('Testing AI connection...');
                try {
                  const testResult = await ragService.testOpenAIConnection();
                  Alert.alert(
                    'AI Connection Test',
                    testResult.success 
                      ? `✅ Connection successful!\nResponse: ${testResult.response}`
                      : `❌ Connection failed:\n${testResult.error}`,
                    [{ text: 'OK' }]
                  );
                } catch (error) {
                  Alert.alert('Test Error', `Failed to test connection: ${error.message}`);
                }
              }}
            >
              <Text style={{ color: currentTheme.text, fontSize: 14, fontWeight: '600' }}>
                🔧 Test AI Connection
              </Text>
            </TouchableOpacity>

            <Text style={{ color: currentTheme.textSecondary, fontSize: 12, textAlign: 'center', lineHeight: 18 }}>
              AI recommendations are not a substitute for professional medical advice. If you're experiencing persistent mental health challenges, please seek professional support.
            </Text>
          </ScrollView>
        </View>
      </Modal>
    </View>
  );
} 