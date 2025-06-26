import React, { useState, useEffect } from 'react';
import { View, Text, ScrollView, TouchableOpacity, RefreshControl, Alert, Modal } from 'react-native';
import { useAuth } from '../context/SupabaseAuthContext';
import { useTheme } from '../context/ThemeContext';

export default function GamificationScreen({ navigation }) {
  const [activeTab, setActiveTab] = useState('streaks'); // streaks, explorer, challenges, rewards
  const [loading, setLoading] = useState(true);
  const [studyStreak, setStudyStreak] = useState(7);
  const [userPoints, setUserPoints] = useState(1250);
  const [badges, setBadges] = useState([
    { id: 1, name: "Library Explorer", icon: "📚", description: "Visited all campus libraries", earned: true },
    { id: 2, name: "Dining Discoverer", icon: "🍕", description: "Tried all dining halls", earned: true },
    { id: 3, name: "Gym Enthusiast", icon: "💪", description: "Visited gym 10 times", earned: false, progress: 7 }
  ]);
  const [challenges, setChallenges] = useState([]);
  const [rewards, setRewards] = useState([]);
  const [leaderboard, setLeaderboard] = useState([]);
  const [showChallengeModal, setShowChallengeModal] = useState(false);
  const [selectedChallenge, setSelectedChallenge] = useState(null);
  const { currentUser, supabase } = useAuth();
  const { currentTheme } = useTheme();

  useEffect(() => {
    loadGamificationData();
  }, [currentUser]);

  const loadGamificationData = async () => {
    try {
      await Promise.all([
        loadStudyStreak(),
        loadUserPoints(),
        loadBadges(),
        loadChallenges(),
        loadRewards(),
        loadLeaderboard()
      ]);
    } catch (error) {
      console.error('Error loading gamification data:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadStudyStreak = async () => {
    try {
      // Mock data - in real app, this would check database for consecutive study days
      setStudyStreak(7);
    } catch (error) {
      console.error('Error loading study streak:', error);
    }
  };

  const loadUserPoints = async () => {
    try {
      // Mock data - in real app, this would sum up all points from activities
      setUserPoints(1250);
    } catch (error) {
      console.error('Error loading user points:', error);
    }
  };

  const loadBadges = async () => {
    try {
      // Mock data for campus explorer badges
      setBadges([
        { id: 1, name: "Library Explorer", icon: "📚", description: "Visited all campus libraries", earned: true },
        { id: 2, name: "Dining Discoverer", icon: "🍕", description: "Tried all dining halls", earned: true },
        { id: 3, name: "Gym Enthusiast", icon: "💪", description: "Visited gym 10 times", earned: false, progress: 7 },
        { id: 4, name: "Event Attendee", icon: "🎉", description: "Attended 5 campus events", earned: false, progress: 3 },
        { id: 5, name: "Study Warrior", icon: "⚔️", description: "30-day study streak", earned: false, progress: 7 },
        { id: 6, name: "Social Butterfly", icon: "🦋", description: "Made 20 new friends", earned: false, progress: 12 }
      ]);
    } catch (error) {
      console.error('Error loading badges:', error);
    }
  };

  const loadChallenges = async () => {
    try {
      // Mock data for GPA challenges
      setChallenges([
        {
          id: 1,
          title: "GPA Boost Challenge",
          description: "Improve your GPA by 0.1 points this semester",
          type: "gpa",
          reward: 500,
          participants: 23,
          endDate: "2024-05-15",
          joined: false,
          progress: 0
        },
        {
          id: 2,
          title: "Study Streak Master",
          description: "Maintain a 21-day study streak",
          type: "streak",
          reward: 300,
          participants: 45,
          endDate: "2024-02-28",
          joined: true,
          progress: 7
        },
        {
          id: 3,
          title: "Campus Explorer",
          description: "Visit 15 different campus locations",
          type: "exploration",
          reward: 200,
          participants: 67,
          endDate: "2024-03-31",
          joined: false,
          progress: 0
        }
      ]);
    } catch (error) {
      console.error('Error loading challenges:', error);
    }
  };

  const loadRewards = async () => {
    try {
      // Mock data for event attendance rewards
      setRewards([
        { id: 1, event: "Career Fair", points: 100, earned: true, date: "2024-01-10" },
        { id: 2, event: "Study Group", points: 50, earned: true, date: "2024-01-12" },
        { id: 3, event: "Pizza Night", points: 25, earned: true, date: "2024-01-13" },
        { id: 4, event: "Guest Lecture", points: 75, earned: false, date: "2024-01-20" },
        { id: 5, event: "Club Meeting", points: 40, earned: false, date: "2024-01-22" }
      ]);
    } catch (error) {
      console.error('Error loading rewards:', error);
    }
  };

  const loadLeaderboard = async () => {
    try {
      // Mock data for leaderboard
      setLeaderboard([
        { rank: 1, username: "StudyMaster", points: 2150, streak: 21 },
        { rank: 2, username: "CampusExplorer", points: 1890, streak: 14 },
        { rank: 3, username: "EventGoer", points: 1650, streak: 8 },
        { rank: 4, username: currentUser?.username || "You", points: 1250, streak: 7 },
        { rank: 5, username: "BookWorm", points: 1100, streak: 12 }
      ]);
    } catch (error) {
      console.error('Error loading leaderboard:', error);
    }
  };

  const joinChallenge = async (challengeId) => {
    try {
      Alert.alert(
        "Join Challenge",
        "Are you ready to take on this challenge?",
        [
          { text: "Cancel", style: "cancel" },
          {
            text: "Join",
            onPress: () => {
              setChallenges(prev => prev.map(c => 
                c.id === challengeId ? { ...c, joined: true } : c
              ));
              Alert.alert("Success", "You've joined the challenge! Good luck! 🎯");
            }
          }
        ]
      );
    } catch (error) {
      console.error('Error joining challenge:', error);
    }
  };

  const checkInStudy = async () => {
    setStudyStreak(prev => prev + 1);
    setUserPoints(prev => prev + 10);
    Alert.alert("Study Check-in", "Great job! Keep up the streak! 🔥");
  };

  const renderStudyStreaks = () => (
    <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
      <View style={[{ backgroundColor: currentTheme.surface, borderRadius: 16, margin: 16, padding: 20, borderWidth: 1, borderColor: currentTheme.border }]}>
        <View style={{ alignItems: 'center', marginBottom: 20 }}>
          <Text style={{ fontSize: 48, marginBottom: 8 }}>🔥</Text>
          <Text style={[{ fontSize: 32, fontWeight: 'bold', color: currentTheme.primary }]}>
            {studyStreak} Days
          </Text>
          <Text style={[{ fontSize: 16, color: currentTheme.textSecondary, textAlign: 'center' }]}>
            Current Study Streak
          </Text>
        </View>
        <TouchableOpacity
          style={[{ backgroundColor: currentTheme.primary, borderRadius: 12, padding: 16, alignItems: 'center' }]}
          onPress={checkInStudy}
        >
          <Text style={[{ color: currentTheme.background, fontWeight: 'bold', fontSize: 16 }]}>
            ✅ Check In Today's Study
          </Text>
        </TouchableOpacity>
      </View>

      <View style={[{ backgroundColor: currentTheme.surface, borderRadius: 16, margin: 16, padding: 20, borderWidth: 1, borderColor: currentTheme.border }]}>
        <Text style={[{ fontSize: 18, fontWeight: 'bold', color: currentTheme.primary, marginBottom: 16 }]}>
          🎯 Streak Milestones
        </Text>
        {[
          { days: 7, reward: "Study Rookie", achieved: studyStreak >= 7 },
          { days: 14, reward: "Study Veteran", achieved: studyStreak >= 14 },
          { days: 21, reward: "Study Master", achieved: studyStreak >= 21 },
          { days: 30, reward: "Study Legend", achieved: studyStreak >= 30 }
        ].map((milestone, index) => (
          <View key={index} style={[{ flexDirection: 'row', alignItems: 'center', paddingVertical: 12 }]}>
            <Text style={{ fontSize: 24, marginRight: 12 }}>
              {milestone.achieved ? "🏆" : "⭕"}
            </Text>
            <View style={{ flex: 1 }}>
              <Text style={[{ fontSize: 16, fontWeight: '600', color: currentTheme.primary }]}>
                {milestone.days} Day Streak - {milestone.reward}
              </Text>
            </View>
            {milestone.achieved && (
              <Text style={[{ color: '#10b981', fontWeight: 'bold' }]}>Achieved!</Text>
            )}
          </View>
        ))}
      </View>
    </ScrollView>
  );

  const renderCampusExplorer = () => (
    <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
      {/* Progress Overview */}
      <View style={[{ backgroundColor: currentTheme.surface, borderRadius: 16, margin: 16, padding: 20, borderWidth: 1, borderColor: currentTheme.border }]}>
        <Text style={[{ fontSize: 18, fontWeight: 'bold', color: currentTheme.primary, marginBottom: 16 }]}>
          🗺️ Explorer Progress
        </Text>
        <View style={{ flexDirection: 'row', justifyContent: 'space-around', marginBottom: 16 }}>
          <View style={{ alignItems: 'center' }}>
            <Text style={[{ fontSize: 24, fontWeight: 'bold', color: currentTheme.primary }]}>
              {badges.filter(b => b.earned).length}
            </Text>
            <Text style={[{ fontSize: 14, color: currentTheme.textSecondary }]}>Badges Earned</Text>
          </View>
          <View style={{ alignItems: 'center' }}>
            <Text style={[{ fontSize: 24, fontWeight: 'bold', color: currentTheme.primary }]}>
              {badges.length}
            </Text>
            <Text style={[{ fontSize: 14, color: currentTheme.textSecondary }]}>Total Badges</Text>
          </View>
        </View>
      </View>

      {/* Badges Grid */}
      <View style={[{ backgroundColor: currentTheme.surface, borderRadius: 16, margin: 16, padding: 20, borderWidth: 1, borderColor: currentTheme.border }]}>
        <Text style={[{ fontSize: 18, fontWeight: 'bold', color: currentTheme.primary, marginBottom: 16 }]}>
          🏆 Your Badges
        </Text>
        <View style={{ flexDirection: 'row', flexWrap: 'wrap', justifyContent: 'space-between' }}>
          {badges.map((badge) => (
            <View key={badge.id} style={[{ 
              width: '48%', 
              backgroundColor: badge.earned ? currentTheme.primary + '20' : currentTheme.border + '50',
              borderRadius: 12, 
              padding: 16, 
              marginBottom: 12,
              alignItems: 'center',
              borderWidth: badge.earned ? 2 : 1,
              borderColor: badge.earned ? currentTheme.primary : currentTheme.border
            }]}>
              <Text style={{ fontSize: 32, marginBottom: 8, opacity: badge.earned ? 1 : 0.5 }}>
                {badge.icon}
              </Text>
              <Text style={[{ 
                fontSize: 14, 
                fontWeight: 'bold', 
                color: badge.earned ? currentTheme.primary : currentTheme.textSecondary,
                textAlign: 'center',
                marginBottom: 4
              }]}>
                {badge.name}
              </Text>
              <Text style={[{ 
                fontSize: 12, 
                color: currentTheme.textSecondary, 
                textAlign: 'center',
                marginBottom: 8
              }]}>
                {badge.description}
              </Text>
              {badge.earned ? (
                <Text style={[{ fontSize: 10, color: '#10b981', fontWeight: 'bold' }]}>
                  Earned {new Date(badge.date).toLocaleDateString()}
                </Text>
              ) : (
                <Text style={[{ fontSize: 10, color: currentTheme.textSecondary }]}>
                  Progress: {badge.progress}/{badge.description.match(/\d+/)?.[0] || '?'}
                </Text>
              )}
            </View>
          ))}
        </View>
      </View>
    </ScrollView>
  );

  const renderGPAChallenges = () => (
    <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
      {/* Active Challenges */}
      <View style={[{ backgroundColor: currentTheme.surface, borderRadius: 16, margin: 16, padding: 20, borderWidth: 1, borderColor: currentTheme.border }]}>
        <Text style={[{ fontSize: 18, fontWeight: 'bold', color: currentTheme.primary, marginBottom: 16 }]}>
          🎯 Available Challenges
        </Text>
        {challenges.map((challenge) => (
          <View key={challenge.id} style={[{ 
            backgroundColor: challenge.joined ? currentTheme.primary + '20' : currentTheme.background,
            borderRadius: 12, 
            padding: 16, 
            marginBottom: 12,
            borderWidth: 1,
            borderColor: challenge.joined ? currentTheme.primary : currentTheme.border
          }]}>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 }}>
              <View style={{ flex: 1 }}>
                <Text style={[{ fontSize: 16, fontWeight: 'bold', color: currentTheme.primary, marginBottom: 4 }]}>
                  {challenge.title}
                </Text>
                <Text style={[{ fontSize: 14, color: currentTheme.textSecondary, marginBottom: 8 }]}>
                  {challenge.description}
                </Text>
              </View>
              <View style={{ alignItems: 'center', marginLeft: 12 }}>
                <Text style={[{ fontSize: 18, fontWeight: 'bold', color: '#f59e0b' }]}>
                  {challenge.reward}
                </Text>
                <Text style={[{ fontSize: 12, color: currentTheme.textSecondary }]}>points</Text>
              </View>
            </View>
            <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
              <Text style={[{ fontSize: 12, color: currentTheme.textSecondary }]}>
                {challenge.participants} participants • Ends {new Date(challenge.endDate).toLocaleDateString()}
              </Text>
              {challenge.joined ? (
                <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                  <Text style={[{ fontSize: 12, color: currentTheme.primary, marginRight: 8 }]}>
                    Progress: {challenge.progress}%
                  </Text>
                  <Text style={[{ color: '#10b981', fontWeight: 'bold' }]}>Joined ✓</Text>
                </View>
              ) : (
                <TouchableOpacity
                  style={[{ backgroundColor: currentTheme.primary, borderRadius: 6, paddingHorizontal: 12, paddingVertical: 4 }]}
                  onPress={() => joinChallenge(challenge.id)}
                >
                  <Text style={[{ color: currentTheme.background, fontWeight: 'bold', fontSize: 12 }]}>
                    Join Challenge
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </View>
        ))}
      </View>

      {/* Leaderboard */}
      <View style={[{ backgroundColor: currentTheme.surface, borderRadius: 16, margin: 16, padding: 20, borderWidth: 1, borderColor: currentTheme.border }]}>
        <Text style={[{ fontSize: 18, fontWeight: 'bold', color: currentTheme.primary, marginBottom: 16 }]}>
          🏆 Challenge Leaderboard
        </Text>
        {leaderboard.map((user, index) => (
          <View key={index} style={[{ 
            flexDirection: 'row', 
            alignItems: 'center', 
            paddingVertical: 8,
            backgroundColor: user.username === (currentUser?.username || "You") ? currentTheme.primary + '20' : 'transparent',
            borderRadius: 8,
            paddingHorizontal: 8,
            marginBottom: 4
          }]}>
            <View style={[{ 
              backgroundColor: index < 3 ? '#f59e0b' : currentTheme.border,
              borderRadius: 12, 
              width: 24, 
              height: 24, 
              justifyContent: 'center', 
              alignItems: 'center', 
              marginRight: 12 
            }]}>
              <Text style={[{ 
                color: index < 3 ? 'white' : currentTheme.textSecondary, 
                fontWeight: 'bold', 
                fontSize: 12 
              }]}>
                {user.rank}
              </Text>
            </View>
            <View style={{ flex: 1 }}>
              <Text style={[{ fontSize: 16, fontWeight: '600', color: currentTheme.primary }]}>
                {user.username}
              </Text>
              <Text style={[{ fontSize: 12, color: currentTheme.textSecondary }]}>
                {user.streak} day streak
              </Text>
            </View>
            <Text style={[{ fontSize: 16, fontWeight: 'bold', color: currentTheme.primary }]}>
              {user.points}
            </Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );

  const renderEventRewards = () => (
    <ScrollView style={{ flex: 1 }} showsVerticalScrollIndicator={false}>
      {/* Points Summary */}
      <View style={[{ backgroundColor: currentTheme.surface, borderRadius: 16, margin: 16, padding: 20, borderWidth: 1, borderColor: currentTheme.border }]}>
        <View style={{ alignItems: 'center', marginBottom: 16 }}>
          <Text style={{ fontSize: 32, marginBottom: 8 }}>⭐</Text>
          <Text style={[{ fontSize: 28, fontWeight: 'bold', color: currentTheme.primary }]}>
            {userPoints} Points
          </Text>
          <Text style={[{ fontSize: 16, color: currentTheme.textSecondary }]}>
            Total Points Earned
          </Text>
        </View>
      </View>

      {/* Recent Rewards */}
      <View style={[{ backgroundColor: currentTheme.surface, borderRadius: 16, margin: 16, padding: 20, borderWidth: 1, borderColor: currentTheme.border }]}>
        <Text style={[{ fontSize: 18, fontWeight: 'bold', color: currentTheme.primary, marginBottom: 16 }]}>
          🎁 Event Rewards
        </Text>
        {rewards.map((reward) => (
          <View key={reward.id} style={[{ 
            flexDirection: 'row', 
            alignItems: 'center', 
            paddingVertical: 12,
            borderBottomWidth: 1,
            borderBottomColor: currentTheme.border,
            opacity: reward.earned ? 1 : 0.6
          }]}>
            <Text style={{ fontSize: 24, marginRight: 12 }}>
              {reward.earned ? "🏆" : "⏳"}
            </Text>
            <View style={{ flex: 1 }}>
              <Text style={[{ fontSize: 16, fontWeight: '600', color: currentTheme.primary }]}>
                {reward.event}
              </Text>
              <Text style={[{ fontSize: 14, color: currentTheme.textSecondary }]}>
                {new Date(reward.date).toLocaleDateString()}
              </Text>
            </View>
            <View style={{ alignItems: 'center' }}>
              <Text style={[{ fontSize: 16, fontWeight: 'bold', color: '#f59e0b' }]}>
                +{reward.points}
              </Text>
              <Text style={[{ fontSize: 12, color: currentTheme.textSecondary }]}>
                {reward.earned ? "Earned" : "Upcoming"}
              </Text>
            </View>
          </View>
        ))}
      </View>

      {/* Reward Shop */}
      <View style={[{ backgroundColor: currentTheme.surface, borderRadius: 16, margin: 16, padding: 20, borderWidth: 1, borderColor: currentTheme.border }]}>
        <Text style={[{ fontSize: 18, fontWeight: 'bold', color: currentTheme.primary, marginBottom: 16 }]}>
          🛍️ Reward Shop
        </Text>
        {[
          { name: "Free Coffee", cost: 100, icon: "☕" },
          { name: "Library Private Room", cost: 200, icon: "📚" },
          { name: "Parking Pass", cost: 300, icon: "🚗" },
          { name: "Dining Hall Credit", cost: 250, icon: "🍕" }
        ].map((item, index) => (
          <View key={index} style={[{ 
            flexDirection: 'row', 
            alignItems: 'center', 
            paddingVertical: 12,
            borderBottomWidth: index < 3 ? 1 : 0,
            borderBottomColor: currentTheme.border
          }]}>
            <Text style={{ fontSize: 24, marginRight: 12 }}>{item.icon}</Text>
            <View style={{ flex: 1 }}>
              <Text style={[{ fontSize: 16, fontWeight: '600', color: currentTheme.primary }]}>
                {item.name}
              </Text>
            </View>
            <TouchableOpacity
              style={[{ 
                backgroundColor: userPoints >= item.cost ? currentTheme.primary : currentTheme.border,
                borderRadius: 6, 
                paddingHorizontal: 12, 
                paddingVertical: 4 
              }]}
              disabled={userPoints < item.cost}
            >
              <Text style={[{ 
                color: userPoints >= item.cost ? currentTheme.background : currentTheme.textSecondary,
                fontWeight: 'bold', 
                fontSize: 12 
              }]}>
                {item.cost} pts
              </Text>
            </TouchableOpacity>
          </View>
        ))}
      </View>
    </ScrollView>
  );

  const renderTabContent = () => {
    switch (activeTab) {
      case 'streaks':
        return renderStudyStreaks();
      case 'explorer':
        return renderCampusExplorer();
      case 'challenges':
        return renderGPAChallenges();
      case 'rewards':
        return renderEventRewards();
      default:
        return renderStudyStreaks();
    }
  };

  return (
    <View style={[{ flex: 1, backgroundColor: currentTheme.background }]}>
      {/* Header */}
      <View style={[{ backgroundColor: currentTheme.background, paddingTop: 56, paddingBottom: 16, paddingHorizontal: 24, borderBottomWidth: 1, borderBottomColor: currentTheme.border }]}>
        <View style={[{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }]}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Text style={[{ color: currentTheme.primary, fontSize: 18, fontWeight: '600' }]}>← Back</Text>
          </TouchableOpacity>
          <TouchableOpacity onPress={() => navigation.navigate('Profile')}>
            <View style={[{ backgroundColor: currentTheme.primary, borderRadius: 20, padding: 8 }]}>
              <Text style={[{ color: currentTheme.background, fontWeight: 'bold', fontSize: 16 }]}>👤</Text>
            </View>
          </TouchableOpacity>
        </View>
        <View style={[{ alignItems: 'center' }]}>
          <Text style={[{ fontSize: 28, fontWeight: 'bold', color: currentTheme.primary, textAlign: 'center', marginBottom: 8 }]}>
            🎮 Gamification
          </Text>
          <Text style={[{ color: currentTheme.textSecondary, textAlign: 'center' }]}>
            Level up your college experience!
          </Text>
        </View>
      </View>

      {/* Tab Navigation */}
      <View style={[{ backgroundColor: currentTheme.background, paddingHorizontal: 16, paddingVertical: 8 }]}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View style={[{ flexDirection: 'row', paddingHorizontal: 8 }]}>
            {[
              { key: 'streaks', label: 'Study Streaks', icon: '🔥' },
              { key: 'explorer', label: 'Campus Explorer', icon: '🗺️' },
              { key: 'challenges', label: 'GPA Challenges', icon: '🎯' },
              { key: 'rewards', label: 'Event Rewards', icon: '🏆' }
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

      {/* Content */}
      {loading ? (
        <View style={[{ flex: 1, justifyContent: 'center', alignItems: 'center' }]}>
          <Text style={{ fontSize: 32, marginBottom: 16 }}>⏳</Text>
          <Text style={[{ fontSize: 20, color: currentTheme.primary, fontWeight: '600' }]}>
            Loading gamification data...
          </Text>
        </View>
      ) : (
        renderTabContent()
      )}
    </View>
  );
} 