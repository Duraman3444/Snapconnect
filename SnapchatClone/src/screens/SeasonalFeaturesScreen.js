import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, Alert } from 'react-native';
import { useAuth } from '../context/SupabaseAuthContext';
import { useTheme } from '../context/ThemeContext';

export default function SeasonalFeaturesScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState('movein');
  const [loading, setLoading] = useState(true);
  const [currentSeason, setCurrentSeason] = useState('fall');
  const { currentUser, supabase } = useAuth();
  const { currentTheme } = useTheme();

  useEffect(() => {
    // Determine current season based on date
    const month = new Date().getMonth();
    if (month >= 2 && month <= 4) setCurrentSeason('spring');
    else if (month >= 5 && month <= 7) setCurrentSeason('summer');
    else if (month >= 8 && month <= 10) setCurrentSeason('fall');
    else setCurrentSeason('winter');
    
    setLoading(false);
  }, []);

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
                onPress={() => setActiveTab(tab.key)}
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
    </View>
  );
} 