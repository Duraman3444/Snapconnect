import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, FlatList, Alert, TextInput, Modal, ScrollView } from 'react-native';
import { useAuth } from '../context/SupabaseAuthContext';
import { useTheme } from '../context/ThemeContext';

export default function MentalHealthScreen({ navigation }) {
  const { currentUser, supabase } = useAuth();
  const { currentTheme } = useTheme();
  const [stressLevel, setStressLevel] = useState(3);
  const [challenges, setChallenges] = useState([]);
  const [supportGroups, setSupportGroups] = useState([]);
  const [showMoodModal, setShowMoodModal] = useState(false);
  const [showBreakModal, setShowBreakModal] = useState(false);
  const [todaysMood, setTodaysMood] = useState(null);

  const stressLevels = [
    { level: 1, emoji: '😌', label: 'Very Calm' },
    { level: 2, emoji: '🙂', label: 'Relaxed' },
    { level: 3, emoji: '😐', label: 'Neutral' },
    { level: 4, emoji: '😟', label: 'Stressed' },
    { level: 5, emoji: '😰', label: 'Very Stressed' }
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
  }, []);

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
        setTodaysMood(data);
        setStressLevel(data.stress_level);
      }
    } catch (error) {
      // No mood logged today, which is fine
    }
  };

  const logMood = async () => {
    try {
      const today = new Date().toISOString().split('T')[0];
      
      if (todaysMood) {
        // Update existing mood
        const { error } = await supabase
          .from('mood_logs')
          .update({ stress_level: stressLevel })
          .eq('id', todaysMood.id);

        if (error) throw error;
      } else {
        // Create new mood log
        const { data, error } = await supabase
          .from('mood_logs')
          .insert({
            user_id: currentUser.id,
            date: today,
            stress_level: stressLevel
          })
          .select()
          .single();

        if (error) throw error;
        setTodaysMood(data);
      }

      setShowMoodModal(false);
      Alert.alert('Thank you!', 'Your mood has been logged. Take care of yourself! 💙');
    } catch (error) {
      Alert.alert('Error', 'Failed to log mood');
    }
  };

  const suggestBreak = () => {
    const breakSuggestions = [
      '🚶‍♀️ Take a 10-minute walk outside',
      '🧘‍♂️ Try a 5-minute breathing exercise',
      '💧 Drink a glass of water and stretch',
      '🎵 Listen to your favorite song',
      '🌱 Step outside and get some fresh air',
      '📱 Call a friend or family member',
      '☕ Make yourself a warm beverage',
      '📖 Read a few pages of a book',
      '🎨 Doodle or do something creative',
      '😺 Watch funny videos for 5 minutes'
    ];
    
    const randomSuggestion = breakSuggestions[Math.floor(Math.random() * breakSuggestions.length)];
    Alert.alert('Study Break Suggestion 🌟', randomSuggestion);
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

  return (
    <View style={[{ flex: 1, backgroundColor: currentTheme.background }]}>
      {/* Header */}
      <View style={[{ 
        backgroundColor: currentTheme.surface, 
        paddingTop: 56, 
        paddingBottom: 24, 
        paddingHorizontal: 24,
        borderBottomWidth: 1,
        borderBottomColor: currentTheme.border
      }]}>
        <View style={[{ flexDirection: 'row', alignItems: 'center', marginBottom: 16 }]}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={[{ color: currentTheme.primary, fontSize: 18, fontWeight: '600' }]}>← Back</Text>
          </TouchableOpacity>
        </View>
        <Text style={[{ fontSize: 28, fontWeight: 'bold', color: currentTheme.primary, textAlign: 'center' }]}>
          🧠 Mental Wellness
        </Text>
        <Text style={[{ color: currentTheme.textSecondary, textAlign: 'center', marginTop: 8 }]}>
          Your mental health matters
        </Text>
      </View>

      <ScrollView style={[{ flex: 1 }]} contentContainerStyle={{ paddingBottom: 100 }}>
        {/* Quick Actions */}
        <View style={[{ padding: 16 }]}>
          <Text style={[{ fontSize: 20, fontWeight: 'bold', color: currentTheme.primary, marginBottom: 16 }]}>
            Quick Actions
          </Text>
          
          <View style={[{ flexDirection: 'row', gap: 12, marginBottom: 24 }]}>
            <TouchableOpacity
              style={[{ backgroundColor: '#dbeafe', borderRadius: 16, padding: 16, flex: 1 }]}
              onPress={() => setShowMoodModal(true)}
            >
              <Text style={[{ fontSize: 24, textAlign: 'center', marginBottom: 8 }]}>😊</Text>
              <Text style={[{ color: '#1e40af', fontWeight: 'bold', textAlign: 'center' }]}>
                Log Mood
              </Text>
            </TouchableOpacity>
            
            <TouchableOpacity
              style={[{ backgroundColor: '#dcfce7', borderRadius: 16, padding: 16, flex: 1 }]}
              onPress={suggestBreak}
            >
              <Text style={[{ fontSize: 24, textAlign: 'center', marginBottom: 8 }]}>☕</Text>
              <Text style={[{ color: '#166534', fontWeight: 'bold', textAlign: 'center' }]}>
                Take Break
              </Text>
            </TouchableOpacity>
          </View>

          {/* Today's Mood */}
          {todaysMood && (
            <View style={[{ backgroundColor: '#f0f9ff', borderRadius: 16, padding: 16, marginBottom: 24 }]}>
              <Text style={[{ fontSize: 16, fontWeight: 'bold', color: '#0369a1', marginBottom: 8 }]}>
                Today's Mood Check-in
              </Text>
              <View style={[{ flexDirection: 'row', alignItems: 'center' }]}>
                <Text style={[{ fontSize: 32, marginRight: 12 }]}>
                  {stressLevels.find(s => s.level === todaysMood.stress_level)?.emoji}
                </Text>
                <Text style={[{ color: '#0369a1', fontSize: 16 }]}>
                  {stressLevels.find(s => s.level === todaysMood.stress_level)?.label}
                </Text>
              </View>
            </View>
          )}

          {/* Wellness Challenges */}
          <Text style={[{ fontSize: 20, fontWeight: 'bold', color: currentTheme.primary, marginBottom: 16 }]}>
            🎯 Wellness Challenges
          </Text>
          
          <FlatList
            data={wellnessChallenges}
            renderItem={renderChallenge}
            keyExtractor={(item) => item.id.toString()}
            scrollEnabled={false}
          />

          {/* Anonymous Support Groups */}
          <Text style={[{ fontSize: 20, fontWeight: 'bold', color: currentTheme.primary, marginBottom: 16 }]}>
            🤝 Anonymous Support Groups
          </Text>
          
          <View style={[{ backgroundColor: '#fef7cd', padding: 16, borderRadius: 12, marginBottom: 16 }]}>
            <Text style={[{ fontSize: 14, color: '#a16207', fontWeight: 'bold', marginBottom: 4 }]}>
              🔒 Safe & Anonymous
            </Text>
            <Text style={[{ fontSize: 12, color: '#a16207' }]}>
              All support groups are completely anonymous. Your identity is protected while you connect with others who understand.
            </Text>
          </View>
          
          <FlatList
            data={anonymousSupportGroups}
            renderItem={renderSupportGroup}
            keyExtractor={(item) => item.id.toString()}
            scrollEnabled={false}
          />
        </View>
      </ScrollView>

      {/* Emergency Button */}
      <TouchableOpacity
        style={[{
          position: 'absolute',
          bottom: 20,
          right: 20,
          backgroundColor: '#ef4444',
          borderRadius: 30,
          width: 60,
          height: 60,
          justifyContent: 'center',
          alignItems: 'center',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.25,
          shadowRadius: 3.84,
          elevation: 5
        }]}
        onPress={() => Alert.alert('Crisis Resources', 'National Suicide Prevention Lifeline: 988\nCrisis Text Line: Text HOME to 741741\n\nPlease reach out for help if you need it. You matter! 💙')}
      >
        <Text style={[{ fontSize: 24, color: 'white' }]}>🆘</Text>
      </TouchableOpacity>

      {/* Mood Modal */}
      <Modal
        visible={showMoodModal}
        animationType="slide"
        transparent={true}
      >
        <View style={[{ flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 20 }]}>
          <View style={[{ backgroundColor: currentTheme.surface, borderRadius: 20, padding: 24 }]}>
            <Text style={[{ fontSize: 24, fontWeight: 'bold', color: currentTheme.primary, marginBottom: 20, textAlign: 'center' }]}>
              😊 How are you feeling?
            </Text>

            <Text style={[{ color: currentTheme.text, fontSize: 16, marginBottom: 16, textAlign: 'center' }]}>
              Rate your current stress level:
            </Text>

            <View style={[{ marginBottom: 24 }]}>
              {stressLevels.map((level) => (
                <TouchableOpacity
                  key={level.level}
                  style={[{
                    flexDirection: 'row',
                    alignItems: 'center',
                    padding: 16,
                    borderRadius: 12,
                    marginBottom: 8,
                    backgroundColor: stressLevel === level.level ? currentTheme.primary : currentTheme.background,
                    borderWidth: 1,
                    borderColor: currentTheme.border
                  }]}
                  onPress={() => setStressLevel(level.level)}
                >
                  <Text style={[{ fontSize: 24, marginRight: 16 }]}>{level.emoji}</Text>
                  <Text style={[{
                    fontSize: 16,
                    color: stressLevel === level.level ? currentTheme.background : currentTheme.text,
                    fontWeight: stressLevel === level.level ? 'bold' : 'normal'
                  }]}>
                    {level.label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <View style={[{ flexDirection: 'row', gap: 12 }]}>
              <TouchableOpacity
                style={[{ backgroundColor: currentTheme.border, borderRadius: 12, padding: 16, flex: 1 }]}
                onPress={() => setShowMoodModal(false)}
              >
                <Text style={[{ color: currentTheme.text, textAlign: 'center', fontWeight: 'bold' }]}>
                  Cancel
                </Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={[{ backgroundColor: currentTheme.primary, borderRadius: 12, padding: 16, flex: 1 }]}
                onPress={logMood}
              >
                <Text style={[{ color: currentTheme.background, textAlign: 'center', fontWeight: 'bold' }]}>
                  Log Mood
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
} 