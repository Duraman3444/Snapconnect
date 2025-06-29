import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useAuth } from '../context/SupabaseAuthContext';
import { useTheme } from '../context/ThemeContext';
import AIAssistant from '../components/AIAssistant';
import FloatingAIButton from '../components/FloatingAIButton';
import ragService from '../services/ragService';
import userProfileService from '../services/userProfileService';

export default function SeasonalFeaturesScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState('movein');
  const [loading, setLoading] = useState(false);
  const [currentSeason, setCurrentSeason] = useState('fall');
  // AI integration state - only load when requested
  const [showAIAssistant, setShowAIAssistant] = useState(false);
  const [aiLoading, setAiLoading] = useState(false);
  const [aiSuggestions, setAiSuggestions] = useState({});
  const [expandedAI, setExpandedAI] = useState(null);
  const [userProfile, setUserProfile] = useState({});
  const { currentUser, supabase } = useAuth();
  const { currentTheme } = useTheme();

  useEffect(() => {
    // Determine current season based on date
    const month = new Date().getMonth();
    if (month >= 2 && month <= 4) setCurrentSeason('spring');
    else if (month >= 5 && month <= 7) setCurrentSeason('summer');
    else if (month >= 8 && month <= 10) setCurrentSeason('fall');
    else setCurrentSeason('winter');
    
    // Load user profile without AI recommendations
    loadUserProfile();
  }, []);

  const loadUserProfile = async () => {
    try {
      setLoading(true);
      if (currentUser) {
        const profile = await userProfileService.getMockUserProfile(currentUser.id);
        setUserProfile(profile);
      }
    } catch (error) {
      console.error('Error loading profile:', error);
    } finally {
      setLoading(false);
    }
  };

  // Only generate AI suggestions when user specifically requests them
  const getContextualAISuggestions = async (featureType) => {
    try {
      setAiLoading(true);
      setExpandedAI(featureType);
      
      const result = await ragService.generateSeasonalRecommendations(
        currentSeason,
        featureType,
        userProfile,
        { 
          location: 'campus',
          stressLevel: 'moderate',
          socialLevel: 'active',
          budget: 'student' 
        }
      );
      
      if (result && result.recommendations) {
        const rec = result.recommendations;
        const suggestionData = {
          insight: rec.seasonalInsight || `Great time to focus on ${featureType} activities!`,
          immediateActions: rec.immediateActions || [],
          weeklyPlanning: rec.weeklyPlanning || [],
          personalizedTips: rec.personalizedTips || [],
          budgetFriendly: rec.budgetFriendly || [],
          socialIntegration: rec.socialIntegration || [],
          campusResources: rec.campusResources || []
        };
        
        setAiSuggestions(prev => ({
          ...prev,
          [featureType]: suggestionData
        }));
      }
    } catch (error) {
      console.error('Error getting AI suggestions:', error);
      // Set fallback suggestions
      setAiSuggestions(prev => ({
        ...prev,
        [featureType]: {
          insight: `Here are some quick tips for ${featureType}:`,
          fallbackTips: getQuickTips(featureType).split('\n')
        }
      }));
    } finally {
      setAiLoading(false);
    }
  };

  const getQuickTips = (featureType) => {
    const tips = {
      movein: '🏠 Pack essentials first\n📱 Download campus apps\n🤝 Connect with roommates\n📦 Label everything clearly',
      spring: '🏖️ Plan with friends early\n💰 Set a realistic budget\n📱 Share location with family\n☀️ Research weather conditions',
      finals: '📚 Create study schedule\n👥 Form study groups\n🧘 Take stress breaks\n💡 Use active recall methods',
      graduation: '🎓 Order cap and gown early\n📸 Plan photo sessions\n👨‍👩‍👧‍👦 Coordinate with family\n🎉 Celebrate achievements',
      sports: '🏈 Check game schedules\n🎪 Join tailgate parties\n👕 Get team gear\n📱 Follow team updates'
    };
    return tips[featureType] || 'Great seasonal activity to focus on!';
  };

  const renderAISuggestions = (featureType) => {
    const suggestions = aiSuggestions[featureType];
    if (!suggestions || expandedAI !== featureType) return null;

    return (
      <View style={{ marginBottom: 20 }}>
        <View style={[{ 
          backgroundColor: '#f0f9ff', 
          borderRadius: 12, 
          padding: 16, 
          borderWidth: 1, 
          borderColor: '#0ea5e9',
          marginTop: 12
        }]}>
          <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
            <Text style={[{ fontSize: 16, fontWeight: 'bold', color: '#0c4a6e' }]}>
              🤖 AI Suggestions
            </Text>
            <TouchableOpacity
              onPress={() => setExpandedAI(null)}
              style={{ padding: 4 }}
            >
              <Text style={[{ fontSize: 18, color: '#0c4a6e' }]}>✕</Text>
            </TouchableOpacity>
          </View>
          
          {suggestions.insight && (
            <View style={{ marginBottom: 16 }}>
              <Text style={[{ fontSize: 14, color: '#0c4a6e', fontStyle: 'italic', lineHeight: 20 }]}>
                {suggestions.insight}
              </Text>
            </View>
          )}

          {suggestions.fallbackTips ? (
            <View>
              {suggestions.fallbackTips.map((tip, index) => (
                <Text key={index} style={[{ fontSize: 14, color: '#0c4a6e', marginBottom: 8, lineHeight: 20 }]}>
                  {tip}
                </Text>
              ))}
            </View>
          ) : (
            <View>
              {suggestions.immediateActions?.length > 0 && (
                <View style={{ marginBottom: 12 }}>
                  <Text style={[{ fontSize: 14, fontWeight: 'bold', color: '#0c4a6e', marginBottom: 6 }]}>
                    🎯 Immediate Actions:
                  </Text>
                  {suggestions.immediateActions.slice(0, 3).map((action, index) => (
                    <Text key={index} style={[{ fontSize: 13, color: '#0c4a6e', marginBottom: 4, marginLeft: 12 }]}>
                      • {action}
                    </Text>
                  ))}
                </View>
              )}

              {suggestions.weeklyPlanning?.length > 0 && (
                <View style={{ marginBottom: 12 }}>
                  <Text style={[{ fontSize: 14, fontWeight: 'bold', color: '#0c4a6e', marginBottom: 6 }]}>
                    📅 This Week:
                  </Text>
                  {suggestions.weeklyPlanning.slice(0, 2).map((plan, index) => (
                    <Text key={index} style={[{ fontSize: 13, color: '#0c4a6e', marginBottom: 4, marginLeft: 12 }]}>
                      • {plan}
                    </Text>
                  ))}
                </View>
              )}

              {suggestions.personalizedTips?.length > 0 && (
                <View style={{ marginBottom: 12 }}>
                  <Text style={[{ fontSize: 14, fontWeight: 'bold', color: '#0c4a6e', marginBottom: 6 }]}>
                    💡 Personalized Tips:
                  </Text>
                  {suggestions.personalizedTips.slice(0, 2).map((tip, index) => (
                    <Text key={index} style={[{ fontSize: 13, color: '#0c4a6e', marginBottom: 4, marginLeft: 12 }]}>
                      • {tip}
                    </Text>
                  ))}
                </View>
              )}

              {suggestions.budgetFriendly?.length > 0 && (
                <View style={{ marginBottom: 12 }}>
                  <Text style={[{ fontSize: 14, fontWeight: 'bold', color: '#0c4a6e', marginBottom: 6 }]}>
                    💰 Budget-Friendly Options:
                  </Text>
                  {suggestions.budgetFriendly.slice(0, 2).map((option, index) => (
                    <Text key={index} style={[{ fontSize: 13, color: '#0c4a6e', marginBottom: 4, marginLeft: 12 }]}>
                      • {option}
                    </Text>
                  ))}
                </View>
              )}

              {suggestions.socialIntegration?.length > 0 && (
                <View style={{ marginBottom: 12 }}>
                  <Text style={[{ fontSize: 14, fontWeight: 'bold', color: '#0c4a6e', marginBottom: 6 }]}>
                    👥 Social Ideas:
                  </Text>
                  {suggestions.socialIntegration.slice(0, 2).map((idea, index) => (
                    <Text key={index} style={[{ fontSize: 13, color: '#0c4a6e', marginBottom: 4, marginLeft: 12 }]}>
                      • {idea}
                    </Text>
                  ))}
                </View>
              )}

              {suggestions.campusResources?.length > 0 && (
                <View>
                  <Text style={[{ fontSize: 14, fontWeight: 'bold', color: '#0c4a6e', marginBottom: 6 }]}>
                    🏫 Campus Resources:
                  </Text>
                  {suggestions.campusResources.slice(0, 2).map((resource, index) => (
                    <Text key={index} style={[{ fontSize: 13, color: '#0c4a6e', marginBottom: 4, marginLeft: 12 }]}>
                      • {resource}
                    </Text>
                  ))}
                </View>
              )}
            </View>
          )}
        </View>
      </View>
    );
  };

  const renderMoveInCoordination = () => (
    <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
      <View style={[{ backgroundColor: currentTheme.surface, borderRadius: 16, margin: 16, padding: 20, borderWidth: 1, borderColor: currentTheme.border }]}>
        <Text style={[{ fontSize: 20, fontWeight: 'bold', color: currentTheme.primary, marginBottom: 16, textAlign: 'center' }]}>
          🏠 Move-in Day Coordination
        </Text>
        
        <View style={{ marginBottom: 20 }}>
          <Text style={[{ fontSize: 16, fontWeight: 'bold', color: currentTheme.primary, marginBottom: 8 }]}>
            📅 Your Move-in Schedule
          </Text>
          <View style={[{ backgroundColor: currentTheme.background, borderRadius: 12, padding: 16 }]}>
            <Text style={[{ fontSize: 14, color: currentTheme.textSecondary, marginBottom: 4 }]}>
              Move-in Date: August 20, 2024
            </Text>
            <Text style={[{ fontSize: 14, color: currentTheme.textSecondary, marginBottom: 4 }]}>
              Time Slot: 10:00 AM - 12:00 PM
            </Text>
            <Text style={[{ fontSize: 14, color: currentTheme.textSecondary }]}>
              Dorm: Johnson Hall, Room 302
            </Text>
          </View>
        </View>

        <TouchableOpacity
          style={[{ backgroundColor: currentTheme.primary, borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 16 }]}
          onPress={() => Alert.alert("Move-in Helper", "Find other students moving in the same day!")}
        >
          <Text style={[{ color: currentTheme.background, fontWeight: 'bold', fontSize: 16 }]}>
            🤝 Connect with Fellow Move-ins
          </Text>
        </TouchableOpacity>

        <View style={{ marginBottom: 20 }}>
          <Text style={[{ fontSize: 16, fontWeight: 'bold', color: currentTheme.primary, marginBottom: 12 }]}>
            📦 Move-in Checklist
          </Text>
          {[
            { item: "Confirm move-in time slot", done: true },
            { item: "Pack essential items", done: true },
            { item: "Get parking pass", done: false },
            { item: "Find roommate contact", done: false },
            { item: "Download campus map", done: true }
          ].map((task, index) => (
            <View key={index} style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 8 }}>
              <Text style={{ fontSize: 18, marginRight: 12 }}>
                {task.done ? "✅" : "⬜"}
              </Text>
              <Text style={[{ 
                fontSize: 14, 
                color: task.done ? currentTheme.textSecondary : currentTheme.primary,
                textDecorationLine: task.done ? 'line-through' : 'none'
              }]}>
                {task.item}
              </Text>
            </View>
          ))}
        </View>

        {/* AI-Powered Move-in Tips - On-Demand Only */}
        <View style={{ marginBottom: 20 }}>
          <Text style={[{ fontSize: 16, fontWeight: 'bold', color: currentTheme.primary, marginBottom: 12 }]}>
            🧠 AI Move-in Assistant
          </Text>
          <View style={[{ backgroundColor: '#f0f9ff', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#0ea5e9' }]}>
            <Text style={[{ fontSize: 14, color: '#0c4a6e', lineHeight: 20, marginBottom: 12 }]}>
              Get personalized suggestions for what to bring, packing tips, and move-in day essentials based on your dorm and preferences!
            </Text>
            <TouchableOpacity
              style={[{ 
                backgroundColor: aiLoading ? '#94a3b8' : '#0ea5e9', 
                borderRadius: 8, 
                padding: 12, 
                alignItems: 'center' 
              }]}
              onPress={() => getContextualAISuggestions('movein')}
              disabled={aiLoading}
            >
              <Text style={[{ color: 'white', fontWeight: 'bold', fontSize: 14 }]}>
                {aiLoading ? '🤖 Getting Tips...' : '🤖 Get AI Move-in Tips'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Render AI suggestions inline */}
        {renderAISuggestions('movein')}
      </View>
    </ScrollView>
  );

  const renderSpringBreakPlanning = () => (
    <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
      <View style={[{ backgroundColor: currentTheme.surface, borderRadius: 16, margin: 16, padding: 20, borderWidth: 1, borderColor: currentTheme.border }]}>
        <Text style={[{ fontSize: 20, fontWeight: 'bold', color: currentTheme.primary, marginBottom: 16, textAlign: 'center' }]}>
          🏖️ Spring Break Planning
        </Text>

        <TouchableOpacity
          style={[{ backgroundColor: currentTheme.primary, borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 16 }]}
          onPress={() => Alert.alert("Group Travel", "Start planning your spring break trip!")}
        >
          <Text style={[{ color: currentTheme.background, fontWeight: 'bold', fontSize: 16 }]}>
            ✈️ Create Travel Group
          </Text>
        </TouchableOpacity>

        <View style={{ marginBottom: 20 }}>
          <Text style={[{ fontSize: 16, fontWeight: 'bold', color: currentTheme.primary, marginBottom: 12 }]}>
            🌟 Popular Destinations
          </Text>
          {[
            { destination: "Miami Beach", students: 45, budget: "$800-1200" },
            { destination: "Cancun", students: 32, budget: "$1000-1500" },
            { destination: "California", students: 28, budget: "$600-900" },
            { destination: "New York City", students: 22, budget: "$500-800" }
          ].map((trip, index) => (
            <View key={index} style={[{ 
              backgroundColor: currentTheme.background, 
              borderRadius: 12, 
              padding: 12, 
              marginBottom: 8,
              flexDirection: 'row',
              justifyContent: 'space-between',
              alignItems: 'center'
            }]}>
              <View>
                <Text style={[{ fontSize: 16, fontWeight: '600', color: currentTheme.primary }]}>
                  {trip.destination}
                </Text>
                <Text style={[{ fontSize: 12, color: currentTheme.textSecondary }]}>
                  {trip.students} students interested
                </Text>
              </View>
              <Text style={[{ fontSize: 14, color: currentTheme.textSecondary }]}>
                {trip.budget}
              </Text>
            </View>
          ))}
        </View>

        {/* AI Spring Break Suggestions */}
        <View style={{ marginBottom: 20 }}>
          <Text style={[{ fontSize: 16, fontWeight: 'bold', color: currentTheme.primary, marginBottom: 12 }]}>
            🌺 AI Spring Break Planner
          </Text>
          <View style={[{ backgroundColor: '#f0fdf4', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#22c55e' }]}>
            <Text style={[{ fontSize: 14, color: '#166534', lineHeight: 20, marginBottom: 12 }]}>
              Get personalized spring break ideas based on current trends, your budget, and what's popular this time of year!
            </Text>
            <TouchableOpacity
              style={[{ 
                backgroundColor: aiLoading ? '#94a3b8' : '#22c55e', 
                borderRadius: 8, 
                padding: 12, 
                alignItems: 'center' 
              }]}
              onPress={() => getContextualAISuggestions('spring')}
              disabled={aiLoading}
            >
              <Text style={[{ color: 'white', fontWeight: 'bold', fontSize: 14 }]}>
                {aiLoading ? '🌴 Getting Ideas...' : '🌴 Get Spring Break Ideas'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Render AI suggestions inline */}
        {renderAISuggestions('spring')}
      </View>
    </ScrollView>
  );

  const renderFinalsSupport = () => (
    <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
      <View style={[{ backgroundColor: currentTheme.surface, borderRadius: 16, margin: 16, padding: 20, borderWidth: 1, borderColor: currentTheme.border }]}>
        <Text style={[{ fontSize: 20, fontWeight: 'bold', color: currentTheme.primary, marginBottom: 16, textAlign: 'center' }]}>
          📚 Finals Week Support
        </Text>

        <View style={{ marginBottom: 20 }}>
          <Text style={[{ fontSize: 16, fontWeight: 'bold', color: currentTheme.primary, marginBottom: 12 }]}>
            😰 Stress Level Check
          </Text>
          <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: 16 }}>
            {['😌', '😐', '😰', '😱'].map((emoji, index) => (
              <TouchableOpacity key={index} style={{ alignItems: 'center' }}>
                <Text style={{ fontSize: 32, marginBottom: 4 }}>{emoji}</Text>
                <Text style={[{ fontSize: 12, color: currentTheme.textSecondary }]}>
                  {['Calm', 'Okay', 'Stressed', 'Panic'][index]}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>

        <TouchableOpacity
          style={[{ backgroundColor: currentTheme.primary, borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 16 }]}
          onPress={() => Alert.alert("Study Group", "Form or join a study group!")}
        >
          <Text style={[{ color: currentTheme.background, fontWeight: 'bold', fontSize: 16 }]}>
            👥 Find Study Groups
          </Text>
        </TouchableOpacity>

        <View style={{ marginBottom: 20 }}>
          <Text style={[{ fontSize: 16, fontWeight: 'bold', color: currentTheme.primary, marginBottom: 12 }]}>
            🧘 Stress Relief Activities
          </Text>
          {[
            { activity: "Meditation Session", time: "6:00 PM", location: "Student Center" },
            { activity: "Study Break Yoga", time: "12:00 PM", location: "Recreation Center" },
            { activity: "Therapy Dogs Visit", time: "2:00 PM", location: "Library Lobby" },
            { activity: "Free Massage", time: "4:00 PM", location: "Health Center" }
          ].map((activity, index) => (
            <View key={index} style={[{ 
              backgroundColor: currentTheme.background, 
              borderRadius: 12, 
              padding: 12, 
              marginBottom: 8
            }]}>
              <Text style={[{ fontSize: 16, fontWeight: '600', color: currentTheme.primary }]}>
                {activity.activity}
              </Text>
              <Text style={[{ fontSize: 12, color: currentTheme.textSecondary }]}>
                {activity.time} • {activity.location}
              </Text>
            </View>
          ))}
        </View>

        {/* AI Finals Study Assistant */}
        <View style={{ marginBottom: 20 }}>
          <Text style={[{ fontSize: 16, fontWeight: 'bold', color: currentTheme.primary, marginBottom: 12 }]}>
            📖 AI Study Assistant
          </Text>
          <View style={[{ backgroundColor: '#fef3c7', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#f59e0b' }]}>
            <Text style={[{ fontSize: 14, color: '#92400e', lineHeight: 20, marginBottom: 12 }]}>
              Get personalized study strategies, time management tips, and stress-relief techniques tailored to your subjects and study style!
            </Text>
            <TouchableOpacity
              style={[{ 
                backgroundColor: aiLoading ? '#94a3b8' : '#f59e0b', 
                borderRadius: 8, 
                padding: 12, 
                alignItems: 'center' 
              }]}
              onPress={() => getContextualAISuggestions('finals')}
              disabled={aiLoading}
            >
              <Text style={[{ color: 'white', fontWeight: 'bold', fontSize: 14 }]}>
                {aiLoading ? '📚 Getting Study Tips...' : '📚 Get Study Strategy'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Render AI suggestions inline */}
        {renderAISuggestions('finals')}
      </View>
    </ScrollView>
  );

  const renderGraduationCelebrations = () => (
    <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
      <View style={[{ backgroundColor: currentTheme.surface, borderRadius: 16, margin: 16, padding: 20, borderWidth: 1, borderColor: currentTheme.border }]}>
        <Text style={[{ fontSize: 20, fontWeight: 'bold', color: currentTheme.primary, marginBottom: 16, textAlign: 'center' }]}>
          🎓 Graduation Celebrations
        </Text>

        <View style={{ alignItems: 'center', marginBottom: 20 }}>
          <Text style={{ fontSize: 64, marginBottom: 8 }}>🎓</Text>
          <Text style={[{ fontSize: 18, fontWeight: 'bold', color: currentTheme.primary, marginBottom: 4 }]}>
            Congratulations Class of 2024!
          </Text>
          <Text style={[{ fontSize: 14, color: currentTheme.textSecondary, textAlign: 'center' }]}>
            You made it! Time to celebrate your achievements.
          </Text>
        </View>

        <TouchableOpacity
          style={[{ backgroundColor: currentTheme.primary, borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 16 }]}
          onPress={() => Alert.alert("Senior Events", "Join exclusive senior activities!")}
        >
          <Text style={[{ color: currentTheme.background, fontWeight: 'bold', fontSize: 16 }]}>
            🌟 Senior-Only Events
          </Text>
        </TouchableOpacity>

        <View style={{ marginBottom: 20 }}>
          <Text style={[{ fontSize: 16, fontWeight: 'bold', color: currentTheme.primary, marginBottom: 12 }]}>
            📸 Memory Lane
          </Text>
          <View style={[{ backgroundColor: currentTheme.background, borderRadius: 12, padding: 16 }]}>
            <Text style={[{ fontSize: 14, color: currentTheme.textSecondary, textAlign: 'center', marginBottom: 12 }]}>
              Share your favorite college memories with the class!
            </Text>
            <TouchableOpacity
              style={[{ backgroundColor: currentTheme.border, borderRadius: 8, padding: 12, alignItems: 'center' }]}
            >
              <Text style={[{ color: currentTheme.primary, fontWeight: '600' }]}>
                📱 Upload Memory
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* AI Graduation Planning Assistant */}
        <View style={{ marginBottom: 20 }}>
          <Text style={[{ fontSize: 16, fontWeight: 'bold', color: currentTheme.primary, marginBottom: 12 }]}>
            🎉 AI Graduation Planner
          </Text>
          <View style={[{ backgroundColor: '#f3e8ff', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#8b5cf6' }]}>
            <Text style={[{ fontSize: 14, color: '#5b21b6', lineHeight: 20, marginBottom: 12 }]}>
              Get personalized graduation preparation tips, celebration ideas, and next-step guidance to make the most of this milestone!
            </Text>
            <TouchableOpacity
              style={[{ 
                backgroundColor: aiLoading ? '#94a3b8' : '#8b5cf6', 
                borderRadius: 8, 
                padding: 12, 
                alignItems: 'center' 
              }]}
              onPress={() => getContextualAISuggestions('graduation')}
              disabled={aiLoading}
            >
              <Text style={[{ color: 'white', fontWeight: 'bold', fontSize: 14 }]}>
                {aiLoading ? '🎓 Getting Ideas...' : '🎓 Get Graduation Ideas'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Render AI suggestions inline */}
        {renderAISuggestions('graduation')}
      </View>
    </ScrollView>
  );

  const renderCollegeSports = () => (
    <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
      <View style={[{ backgroundColor: currentTheme.surface, borderRadius: 16, margin: 16, padding: 20, borderWidth: 1, borderColor: currentTheme.border }]}>
        <Text style={[{ fontSize: 20, fontWeight: 'bold', color: currentTheme.primary, marginBottom: 16, textAlign: 'center' }]}>
          🏈 College Sports Hub
        </Text>

        <View style={{ marginBottom: 20 }}>
          <Text style={[{ fontSize: 16, fontWeight: 'bold', color: currentTheme.primary, marginBottom: 12 }]}>
            🗓️ Upcoming Games
          </Text>
          {[
            { sport: "Football", opponent: "vs State University", date: "Saturday 3:00 PM", location: "Home Stadium" },
            { sport: "Basketball", opponent: "@ City College", date: "Tuesday 7:00 PM", location: "Away" },
            { sport: "Soccer", opponent: "vs Tech Institute", date: "Friday 6:00 PM", location: "Home Field" }
          ].map((game, index) => (
            <View key={index} style={[{ 
              backgroundColor: currentTheme.background, 
              borderRadius: 12, 
              padding: 12, 
              marginBottom: 8
            }]}>
              <Text style={[{ fontSize: 16, fontWeight: '600', color: currentTheme.primary }]}>
                {game.sport} {game.opponent}
              </Text>
              <Text style={[{ fontSize: 12, color: currentTheme.textSecondary }]}>
                {game.date} • {game.location}
              </Text>
            </View>
          ))}
        </View>

        <TouchableOpacity
          style={[{ backgroundColor: currentTheme.primary, borderRadius: 12, padding: 16, alignItems: 'center', marginBottom: 16 }]}
          onPress={() => Alert.alert("Tailgate", "Join the pre-game festivities!")}
        >
          <Text style={[{ color: currentTheme.background, fontWeight: 'bold', fontSize: 16 }]}>
            🎪 Organize Tailgate Party
          </Text>
        </TouchableOpacity>

        {/* AI Sports Experience Assistant */}
        <View style={{ marginBottom: 20 }}>
          <Text style={[{ fontSize: 16, fontWeight: 'bold', color: currentTheme.primary, marginBottom: 12 }]}>
            🏆 AI Sports Companion
          </Text>
          <View style={[{ backgroundColor: '#fef2f2', borderRadius: 12, padding: 16, borderWidth: 1, borderColor: '#ef4444' }]}>
            <Text style={[{ fontSize: 14, color: '#991b1b', lineHeight: 20, marginBottom: 12 }]}>
              Get personalized game day tips, tailgate ideas, team traditions, and ways to maximize your college sports experience!
            </Text>
            <TouchableOpacity
              style={[{ 
                backgroundColor: aiLoading ? '#94a3b8' : '#ef4444', 
                borderRadius: 8, 
                padding: 12, 
                alignItems: 'center' 
              }]}
              onPress={() => getContextualAISuggestions('sports')}
              disabled={aiLoading}
            >
              <Text style={[{ color: 'white', fontWeight: 'bold', fontSize: 14 }]}>
                {aiLoading ? '🏈 Getting Tips...' : '🏈 Get Game Day Tips'}
              </Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Render AI suggestions inline */}
        {renderAISuggestions('sports')}
      </View>
    </ScrollView>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'movein':
        return renderMoveInCoordination();
      case 'spring':
        return renderSpringBreakPlanning();
      case 'finals':
        return renderFinalsSupport();
      case 'graduation':
        return renderGraduationCelebrations();
      case 'sports':
        return renderCollegeSports();
      default:
        return renderMoveInCoordination();
    }
  };

  return (
    <View style={[{ flex: 1, backgroundColor: currentTheme.background }]}>
      <View style={[{ backgroundColor: currentTheme.background, paddingTop: 56, paddingBottom: 16, paddingHorizontal: 24, borderBottomWidth: 1, borderBottomColor: currentTheme.border }]}>
        <View style={[{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }]}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={[{ color: currentTheme.primary, fontSize: 18, fontWeight: '600' }]}>← Back</Text>
          </TouchableOpacity>
        </View>
        <View style={[{ alignItems: 'center' }]}>
          <Text style={[{ fontSize: 28, fontWeight: 'bold', color: currentTheme.primary, textAlign: 'center', marginBottom: 8 }]}>
            🌟 Seasonal Features
          </Text>
          <Text style={[{ color: currentTheme.textSecondary, textAlign: 'center' }]}>
            Special features for every college season
          </Text>
        </View>
      </View>

      <View style={[{ backgroundColor: currentTheme.background, paddingHorizontal: 16, paddingVertical: 8 }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={[{ flexDirection: 'row', paddingHorizontal: 8 }]}>
            {[
              { key: 'movein', label: 'Move-in', icon: '🏠' },
              { key: 'spring', label: 'Spring Break', icon: '🏖️' },
              { key: 'finals', label: 'Finals', icon: '📚' },
              { key: 'graduation', label: 'Graduation', icon: '🎓' },
              { key: 'sports', label: 'Sports', icon: '🏈' }
            ].map((tab) => (
              <TouchableOpacity
                key={tab.key}
                style={[{
                  backgroundColor: activeTab === tab.key ? currentTheme.primary : currentTheme.surface,
                  borderRadius: 20,
                  paddingHorizontal: 16,
                  paddingVertical: 8,
                  marginHorizontal: 4,
                  borderWidth: 1,
                  borderColor: activeTab === tab.key ? currentTheme.primary : currentTheme.border
                }]}
                onPress={() => {
                  setActiveTab(tab.key);
                  setExpandedAI(null); // Clear any expanded AI suggestions when switching tabs
                }}
              >
                <Text style={[{
                  color: activeTab === tab.key ? currentTheme.background : currentTheme.primary,
                  fontWeight: activeTab === tab.key ? 'bold' : '600',
                  fontSize: 14
                }]}>
                  {tab.icon} {tab.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </ScrollView>
      </View>

      {loading ? (
        <View style={[{ flex: 1, justifyContent: 'center', alignItems: 'center' }]}>
          <Text style={{ fontSize: 32, marginBottom: 16 }}>⏳</Text>
          <Text style={[{ fontSize: 20, color: currentTheme.primary, fontWeight: '600' }]}>
            Loading seasonal features...
          </Text>
        </View>
      ) : (
        renderTabContent()
      )}
      
      {/* Floating AI Assistant Button */}
      <FloatingAIButton
        onPress={() => setShowAIAssistant(true)}
        visible={true}
      />

      {/* AI Assistant Modal */}
      <AIAssistant
        visible={showAIAssistant}
        onClose={() => setShowAIAssistant(false)}
        context="seasonal_features"
        onSuggestionSelect={(suggestion) => Alert.alert('AI Suggestion', suggestion)}
        userProfile={userProfile}
        conversationData={{
          messages: [],
          chatType: 'assistant',
          relationship: 'ai_helper',
          context: {
            screen: 'seasonal_features',
            currentTab: activeTab,
            season: currentSeason,
            recommendations: aiSuggestions
          }
        }}
      />
    </View>
  );
} 